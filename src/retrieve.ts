import { join } from 'path';
import type { HandlerContext, MediaOptions, MediaType, ProcessedMedia, ResolvedURL } from './types.js';
import log from './log.js';
import { exists } from './fs.js';
import env from './env.js';
import { addToUserQueue, removeFromUserQueue } from './queue.js';
import { isValidUrl, isValidMediaType, isValidAudioFormat, isValidVideoQuality } from './utils/validation.js';
import { getHashedFile, saveHash } from './utils/hashStorage.js';

type Initiator = 'interaction' | 'message';

export type Retrieved = ProcessedMedia;

const DEBUG = env.DEBUG;

function validateMediaOptions(options?: MediaOptions): MediaOptions | undefined {
  if (!options) return undefined;

  const validatedOptions: MediaOptions = {};

  if (options.audioOnly !== undefined) {
    validatedOptions.audioOnly = Boolean(options.audioOnly);
  }

  if (options.audioFormat && isValidAudioFormat(options.audioFormat)) {
    validatedOptions.audioFormat = options.audioFormat;
  }

  if (options.quality && isValidVideoQuality(options.quality)) {
    validatedOptions.quality = options.quality;
  }

  return Object.keys(validatedOptions).length > 0 ? validatedOptions : undefined;
}

/**
 * Get file extension based on media type and options
 */
function getExtension(type: MediaType, options?: MediaOptions): string {
  if (type === 'video' && options?.audioOnly) {
    return options.audioFormat ?? 'mp3';
  }
  if (type === 'image' || type === 'gallery') {
    return 'jpg';
  }
  return 'mp4';
}

/**
 * Retrieve media from a single URL using available handlers
 */
export async function retrieveOne(
  url: ResolvedURL,
  initiator: Initiator,
  options?: MediaOptions,
  userId?: string
): Promise<Retrieved> {
  try {
    if (!isValidUrl(url.input)) {
      throw new Error(`Invalid URL: ${url.input}`);
    }

    const validatedOptions = validateMediaOptions(options);

    // Check if the URL has been processed before
    const cachedResult = getHashedFile(url.input);
    if (cachedResult) {
      if (DEBUG) log.debug(`Retrieved cached result for ${url.input}`);
      return JSON.parse(cachedResult);
    }

    log.info(`Retrieving ${url.file}`);
    
    // Get eligible handlers
    const handlers = url.resolver.handlers.filter(handler =>
      handler.flags.has(`RUN_ON_${initiator.toUpperCase() as Uppercase<Initiator>}`)
    );

    if (handlers.length === 0) {
      throw new Error(`No handlers found for ${url.file} initiated by ${initiator}`);
    }

    // Try each handler
    for await (const handler of handlers) {
      try {
        // First try to get media info without downloading
        const result = await handler.handle(url, { fileExists: false, options: validatedOptions });

        if (!isValidMediaType(result.type)) {
          throw new Error(`Invalid media type: ${result.type}`);
        }

        // Handle raw URL returns
        if (handler.flags.has('RETURNS_RAW_URL')) {
          const rawResult = {
            original: url.input,
            raw: result.raw ?? result.file,
            type: result.type
          };
          saveHash(url.input, JSON.stringify(rawResult));
          return rawResult;
        }

        // Check if file exists with correct extension
        const extension = getExtension(result.type, validatedOptions);
        const path = join(env.DOWNLOAD_DIR, `${url.file}.${extension}`);
        const doesFileExist = await exists(path);
    
        if (doesFileExist) {
          log.success(`${url.file}.${extension} already exists`);
          const existingResult = {
            original: url.input,
            file: `${url.file}.${extension}`,
            type: result.type
          };
          saveHash(url.input, JSON.stringify(existingResult));
          return existingResult;
        }
    
        // File doesn't exist, proceed with actual download
        const downloadedResult = await handler.handle(url, { fileExists: doesFileExist, options: validatedOptions });
        
        // For gallery type, ensure we only download each item once
        if (downloadedResult.type === 'gallery' && downloadedResult.files) {
          const uniqueFiles = new Set();
          downloadedResult.files = downloadedResult.files.filter(file => {
            if (uniqueFiles.has(file.file)) {
              return false;
            }
            uniqueFiles.add(file.file);
            return true;
          });
          downloadedResult.total = downloadedResult.files.length;
        }
        
        saveHash(url.input, JSON.stringify(downloadedResult));
        return downloadedResult;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.warn(`Failed to retrieve ${url.file} with ${handler.name}: ${message}`);
        // Continue to next handler
      }
    }

    // All handlers failed
    const error = `No handlers succeeded for ${url.file}`;
    log.warn(error);
    throw new Error(error);
  } catch (error: unknown) {
    // Log and rethrow any unexpected errors
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Unexpected error retrieving ${url.file}: ${message}`);
    throw error instanceof Error ? error : new Error(message);
  }
}

/**
 * Retrieve media from multiple URLs, returning only successful results
 */
export async function retrieveMultiple(
  urls: ResolvedURL[],
  initiator: Initiator,
  options?: MediaOptions,
  userId?: string
): Promise<Retrieved[]> {
  if (urls.length === 0) return [];

  log.info(`Processing ${urls.length} URLs`);

  const validatedOptions = validateMediaOptions(options);

  // If userId is provided, check queue limits
  if (userId) {
    // Only take the first MAX_USER_QUEUE_SIZE URLs
    const maxUrls = parseInt(env.MAX_USER_QUEUE_SIZE, 10);
    if (urls.length > maxUrls) {
      log.warn(`User ${userId} exceeded queue limit. Processing first ${maxUrls} URLs, skipping ${urls.length - maxUrls}`);
      urls = urls.slice(0, maxUrls);
    }
    
    // Add URLs to queue
    urls.forEach(url => {
      if (isValidUrl(url.input)) {
        addToUserQueue(userId, url.file);
      } else {
        log.warn(`Skipping invalid URL: ${url.input}`);
      }
    });
  }
  
  try {
    const results = await Promise.allSettled(
      urls.map((url) => isValidUrl(url.input) ? retrieveOne(url, initiator, validatedOptions, userId) : Promise.reject(new Error(`Invalid URL: ${url.input}`)))
    );

    // Type guard for successful results
    const succeeded = results.filter(
      (result: PromiseSettledResult<Retrieved>): result is PromiseFulfilledResult<Retrieved> =>
        result.status === 'fulfilled'
    );

    const successCount = succeeded.length;
    log.info(`Successfully processed ${successCount}/${urls.length} URLs`);
    
    return succeeded.map((result: PromiseFulfilledResult<Retrieved>) => result.value);
  } finally {
    // Always clean up queue entries
    if (userId) {
      urls.forEach(url => removeFromUserQueue(userId, url.file));
    }
  }
}
