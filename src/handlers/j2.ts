/* eslint-disable import/no-extraneous-dependencies */
import PQueue from 'p-queue';
import ms from 'ms';
import download from 'download';
import rapid from '../api/rapid.js';
import type { Handler, HandlerContext, MediaInfo, MediaOptions, MediaType, GalleryItem } from '../types.js';
import { tmpDir, exists } from '../fs.js';
import { join } from 'path';
import env from '../env.js';
import transcode from '../ffmpeg.js';
import HandlerFlags from '../flags/handler.js';
import log from '../log.js';

// Get file extension based on media type
function getMediaExtension(type: MediaType, originalExt: string, options?: MediaOptions): string {
  if (type === 'video' && options?.audioOnly) {
    return options.audioFormat ?? 'mp3';
  }
  if (type === 'image' || type === 'gallery') {
    return 'jpg';
  }
  return originalExt || 'mp4';
}

type J2Response = { // ! non-exhaustive
  error: boolean
  message?: string,
  medias: {
    extension: string,
    url: string,
    type: string,
  }[]
};

// pro plan
const queue = new PQueue({
  concurrency: 3,
  interval: ms('1s'),
  intervalCap: 3,
  throwOnTimeout: true,
});

const handler: Handler = {
  name: 'j2',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url, context: HandlerContext) {
    try {
      const API = rapid('auto-download-all-in-one.p.rapidapi.com');
      const data = await queue.add((): Promise<J2Response> =>
        API.post('v1/social/autolink', { json: { url: url.input } }).json()
      );

      if (!data) throw new Error('No data returned');
      if (data.error) throw new Error(data.message ?? 'Unknown error');

      // Check if we have multiple media items
      if (data.medias.length > 1) {
        const items = data.medias.map((media, index) => {
          const type = media.type === 'video' ? 'video' : 'image' as MediaType;
          const ext = getMediaExtension(type, media.extension, context.options);
          return { type, url: media.url, extension: ext };
        });

        if (!context.fileExists) {
          log.info('Downloading gallery with %d items', items.length);
          
          // Download all gallery items
          const processedItems: GalleryItem[] = [];
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemName = `${url.file}_${i + 1}.${item.extension}`;
            const downloadDir = item.type === 'video' ? tmpDir : env.DOWNLOAD_DIR;
            
            log.info('Downloading gallery item %d to %s: %s', i + 1, downloadDir, itemName);
            try {
              await download(item.url, downloadDir, { filename: itemName });
              log.success('Downloaded gallery item %d: %s', i + 1, itemName);

              if (item.type === 'video') {
                await transcode(itemName, context.options);
              }

              processedItems.push({
                file: itemName,
                type: item.type,
                index: i + 1
              });
            } catch (error) {
              log.error('Failed to download gallery item %d: %s', i + 1, error instanceof Error ? error.message : 'Unknown error');
              throw error;
            }
          }

          log.success('Successfully downloaded all %d gallery items', processedItems.length);
          return {
            original: url.input,
            type: 'gallery',
            file: processedItems[0].file,
            files: processedItems,
            total: processedItems.length
          };
        }

        // Check existing gallery items
        log.info('Checking existing gallery items');
        const processedItems: GalleryItem[] = [];
        
        // Verify each item exists and download if needed
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemName = `${url.file}_${i + 1}.${item.extension}`;
          const itemPath = join(item.type === 'video' ? tmpDir : env.DOWNLOAD_DIR, itemName);
          
          if (!(await exists(itemPath))) {
            log.info('Downloading missing gallery item %d: %s', i + 1, itemName);
            const downloadDir = item.type === 'video' ? tmpDir : env.DOWNLOAD_DIR;
            await download(item.url, downloadDir, { filename: itemName });
            
            if (item.type === 'video') {
              await transcode(itemName, context.options);
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
          type: 'gallery',
          file: processedItems[0].file,
          files: processedItems,
          total: processedItems.length
        };
      }

      // Handle single media
      const media = data.medias[0];
      if (!media) throw new Error('No media found');

      const type = media.type === 'video' ? 'video' : 'image' as MediaType;
      const ext = getMediaExtension(type, media.extension, context.options);
      const fileName = `${url.file}.${ext}`;

      if (!context.fileExists) {
        // Download to appropriate directory based on type
        const downloadDir = type === 'video' ? tmpDir : env.DOWNLOAD_DIR;
        await download(media.url, downloadDir, { filename: fileName });

        // Only transcode videos
        if (type === 'video') {
          await transcode(fileName, context.options);
        }
      }

      return {
        original: url.input,
        file: fileName,
        type
      };
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  },
};

export default handler;
