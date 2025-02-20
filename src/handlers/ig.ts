import PQueue from 'p-queue';
import ms from 'ms';
import download from 'download';
import got from 'got';
import rapid from '../api/rapid.js';
import type { Handler, HandlerContext, MediaInfo, MediaType, GalleryItem } from '../types.js';
import env from '../env.js';
import { tmpDir, exists } from '../fs.js';
import path, { join } from 'path';
import log from '../log.js';
import transcode from '../ffmpeg.js';
import HandlerFlags from '../flags/handler.js';
import { isValidContentType, isValidFileSize } from '../utils/validation.js';
import { promises as fs } from 'fs';
import { md5Hash } from '../utils/hash.js';
import { saveHash, getHashedFile } from '../utils/hashStorage.js';

// Queue configuration for rate limiting
const QUEUE_CONFIG = {
  concurrency: 24,
  interval: ms('1m'),
  intervalCap: 240,
  throwOnTimeout: true,
} as const;

// Instagram media item type
interface IGMediaItem {
  is_video: boolean;
  video_url?: string;
  display_url: string;
  url: string;
}

// Comprehensive Instagram API response type
interface IGResponse {
  data: {
    is_video: boolean;
    detail?: string;
    video_url?: string;
    display_url?: string;
    caption?: string;
    owner?: {
      username: string;
      full_name?: string;
    };
    taken_at_timestamp?: number;
    media_type?: string;
    carousel_media?: IGMediaItem[];
  };
}

// Extract media information from API response
async function getMediaInfo(data: IGResponse['data']): Promise<MediaInfo> {
  if (!data) {
    throw new Error('No data returned from Instagram API');
  }

  // Handle video posts
  if (data.is_video) {
    if (!data.video_url) {
      throw new Error('No video URL found');
    }
    return {
      type: 'video',
      url: data.video_url,
      extension: getFileExtension(data.video_url, 'video')
    };
  }

  // Handle image posts
  if (!data.is_video) {
    if (!data.display_url) {
      throw new Error('No display URL found for image');
    }
    return {
      type: 'image' as MediaType,
      url: data.display_url,
      extension: getFileExtension(data.display_url, 'image')
    };
  }

  // Handle carousel/gallery posts
  if (data.media_type === 'carousel' || (data.carousel_media && data.carousel_media.length > 0)) {
    log.info('Processing Instagram carousel with %d items', data.carousel_media?.length ?? 0);
    
    if (!data.carousel_media || data.carousel_media.length === 0) {
      throw new Error('No carousel items found');
    }

    const items = data.carousel_media.map((item, index) => {
      const url = item.is_video ? item.video_url : item.display_url;
      if (!url) {
        throw new Error(`No URL found for carousel item ${index + 1}`);
      }
      log.info('Found carousel item %d: %s', index + 1, item.is_video ? 'video' : 'image');
      return {
        type: item.is_video ? 'video' : 'image' as MediaType,
        url,
        extension: getFileExtension(url, item.is_video ? 'video' : 'image')
      };
    });

    // Use first item's URL for the main file
    const firstUrl = items[0].url;
    return {
      type: 'gallery',
      url: firstUrl,
      extension: getFileExtension(firstUrl, 'gallery'),
      items
    };
  }

  throw new Error('Unsupported media type');
}

// Get file extension based on media type and URL
function getFileExtension(url: string, type: MediaType): string {
  if (type === 'image' || type === 'gallery') {
    return 'jpg';
  }
  try {
    const extension = new URL(url).pathname.split('.').pop();
    return extension && /^[a-zA-Z0-9]+$/.test(extension) ? extension : 'mp4';
  } catch {
    return 'mp4';
  }
}

const queue = new PQueue(QUEUE_CONFIG);

async function validateAndDownload(url: string, downloadDir: string, fileName: string, expectedType: MediaType): Promise<string> {
  const existingFile = await getHashedFile(url);

  if (existingFile) {
    log.info(`File already exists for URL: ${url}`);
    return existingFile;
  }

  const fullPath = join(downloadDir, fileName);
  
  if (await exists(fullPath)) {
    log.info(`File already exists at path: ${fullPath}`);
    await saveHash(url, fullPath);
    return fullPath;
  }

  const response = await got(url, { responseType: 'buffer' });
  const contentType = response.headers['content-type'];
  const fileSize = parseInt(response.headers['content-length'] || '0', 10);

  if (expectedType !== 'gallery') {
    if (!isValidContentType(contentType || '', expectedType)) {
      throw new Error(`Invalid content type: ${contentType}`);
    }
  } else {
    // For gallery, we'll accept either image or video content types
    if (!isValidContentType(contentType || '', 'image') && !isValidContentType(contentType || '', 'video')) {
      throw new Error(`Invalid content type for gallery item: ${contentType}`);
    }
  }

  if (!isValidFileSize(fileSize, parseInt(env.MAX_FILE_SIZE, 10))) {
    throw new Error(`File size exceeds limit: ${fileSize} bytes`);
  }

  await download(url, downloadDir, { filename: fileName });
  await saveHash(url, fullPath);

  return fullPath;
}

const handler: Handler = {
  name: 'ig',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url, context: HandlerContext) {
    try {
      const existingFile = await getHashedFile(url.input);
      if (existingFile) {
        log.info(`File already exists for URL: ${url.input}`);
        return {
          original: url.input,
          file: existingFile,
          type: path.extname(existingFile).slice(1) === 'mp4' ? 'video' : 'image'
        };
      }

      const API = rapid('instagram-scraper-api2.p.rapidapi.com');
      const data = await queue.add((): Promise<IGResponse> =>
        API.get(`v1/post_info?code_or_id_or_url=${encodeURIComponent(url.input)}`).json()
      );

      if (!data) throw new Error('API returned no data');

      // Check media type
      const mediaInfo = await getMediaInfo(data.data);
      const extension = context.options?.audioOnly
        ? context.options.audioFormat ?? 'mp3'
        : getFileExtension(mediaInfo.url, mediaInfo.type);
      const fileName = `${url.file}.${extension}`;

      if (!context.fileExists) {
        if (mediaInfo.type === 'gallery' && mediaInfo.items && mediaInfo.items.length > 0) {
          log.info('Downloading %d gallery items', mediaInfo.items.length);
          
          // Process and download all gallery items
          const processedItems: GalleryItem[] = [];
          
          for (let i = 0; i < mediaInfo.items.length; i++) {
            const item = mediaInfo.items[i];
            const itemExt = item.type === 'video' ? 'mp4' : 'jpg';
            const itemName = `${url.file}_${i + 1}.${itemExt}`;
            
            // Download to appropriate directory
            const downloadDir = item.type === 'video' ? tmpDir : env.DOWNLOAD_DIR;
            log.info('Downloading gallery item %d to %s: %s', i + 1, downloadDir, itemName);
            
            try {
              const filePath = await validateAndDownload(item.url, downloadDir, itemName, item.type);
              log.success('Downloaded gallery item %d: %s', i + 1, filePath);

              // Transcode videos if necessary
              if (item.type === 'video') {
                const transcodedPath = join(env.DOWNLOAD_DIR, path.basename(filePath));
                if (!await exists(transcodedPath)) {
                  await transcode(filePath, context.options);
                } else {
                  log.info(`Transcoded file already exists: ${transcodedPath}`);
                }
              }

              // Add to processed items
              processedItems.push({
                file: filePath,
                type: item.type,
                index: i + 1
              });
            } catch (error) {
              log.error('Failed to download gallery item %d: %s', i + 1, error instanceof Error ? error.message : 'Unknown error');
              // Continue with the next item instead of throwing
            }
          }

          log.success('Successfully downloaded all %d gallery items', processedItems.length);

          return {
            original: url.input,
            file: processedItems[0].file, // First file as main
            type: 'gallery',
            files: processedItems,
            total: processedItems.length
          };
        } else {
          // Handle single media item
          const downloadDir = mediaInfo.type === 'video' ? tmpDir : env.DOWNLOAD_DIR;
          const filePath = await validateAndDownload(mediaInfo.url, downloadDir, fileName, mediaInfo.type);

          if (mediaInfo.type === 'video') {
            const transcodedPath = join(env.DOWNLOAD_DIR, fileName);
            if (!await exists(transcodedPath)) {
              await transcode(filePath, context.options);
            } else {
              log.info(`Transcoded file already exists: ${transcodedPath}`);
            }
          }

          return {
            original: url.input,
            file: filePath,
            type: mediaInfo.type
          };
        }
      }
      
      // File exists, check gallery items
      if (mediaInfo.type === 'gallery' && mediaInfo.items) {
        log.info('Checking existing gallery items');
        const processedItems: GalleryItem[] = [];
        
        // Check each item exists
        for (let i = 0; i < mediaInfo.items.length; i++) {
          const item = mediaInfo.items[i];
          const itemExt = item.type === 'video' ? 'mp4' : 'jpg';
          const itemName = `${url.file}_${i + 1}.${itemExt}`;
          const itemPath = join(item.type === 'video' ? tmpDir : env.DOWNLOAD_DIR, itemName);
          
          // If item doesn't exist, download it
          if (!await exists(itemPath)) {
            log.info('Downloading missing gallery item %d: %s', i + 1, itemName);
            const downloadDir = item.type === 'video' ? tmpDir : env.DOWNLOAD_DIR;
            try {
              await validateAndDownload(item.url, downloadDir, itemName, item.type);
              log.success('Downloaded missing gallery item %d: %s', i + 1, itemName);

              if (item.type === 'video') {
                await transcode(itemName, context.options);
              }
            } catch (error) {
              log.error('Failed to download missing gallery item %d: %s', i + 1, error instanceof Error ? error.message : 'Unknown error');
              // Continue with the next item instead of throwing
            }
          }
          
          processedItems.push({
            file: itemName,
            type: item.type,
            index: i + 1
          });
        }

        log.info('Gallery has %d items', processedItems.length);
        return {
          original: url.input,
          file: processedItems[0].file,
          type: 'gallery',
          files: processedItems,
          total: processedItems.length
        };
      }

      // Single file response
      return {
        original: url.input,
        file: fileName,
        type: mediaInfo.type
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.startsWith('Invalid content type') || error.message.startsWith('File size exceeds limit')) {
          log.warn(`Validation error: ${error.message}`);
        } else {
          log.error(`Failed to process Instagram media: ${error.message}`);
        }
      } else {
        log.error('An unknown error occurred while processing Instagram media');
      }
      throw error;
    }
  },
};

export default handler;
