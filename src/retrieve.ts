import { join } from 'path';
import type { HandlerContext, MediaOptions, ResolvedURL } from './types.js';
import log from './log.js';
import { exists } from './fs.js';
import env from './env.js';

type Initiator = 'interaction' | 'message';

export type Retrieved = {
  original: string;
  file?: string;
  raw?: string;
};

export async function retrieveOne(
  url: ResolvedURL,
  initiator: Initiator,
  options?: MediaOptions
): Promise<Retrieved> {
  // Get file extension based on options
  const getExtension = (options?: MediaOptions) => {
    if (options?.audioOnly) {
      return options.audioFormat || 'mp3';
    }
    return 'mp4';
  };

  const extension = getExtension(options);
  const path = join(env.DOWNLOAD_DIR, `${url.file}.${extension}`);
  const fileExists = await exists(path);
  if (fileExists) {
    log.success(`${url.file}.${extension} already exists`);
    // return `${env.HOST}${url.file}.mp4`;
    return {
      original: url.input,
      file: `${url.file}.${extension}`,
    };
  }
  log.info(`Retrieving ${url.file}`);
  const handlers = url.resolver.handlers.filter((handler) => handler.flags.has(`RUN_ON_${initiator.toUpperCase() as Uppercase<Initiator>}`));
  if (handlers.length === 0) throw new Error(`No handlers found for ${url.file} initiated by ${initiator}`);
  for await (const handler of handlers) {
    try {
      const context: HandlerContext = {
        fileExists,
        options
      };
      const result = await handler.handle(url, context);
      log.success(`Retrieved ${url.file} with ${handler.name}`);
      if (handler.flags.has('RETURNS_RAW_URL')) {
        return {
          original: url.input,
          raw: result,
        };
      }
      // If result already has an extension, use it, otherwise use our computed extension
      const hasExtension = result.includes('.');
      return {
        original: url.input,
        file: hasExtension ? result : `${result}.${extension}`,
      };
    } catch (error) {
      log.warn(`Failed to retrieve ${url.file} with ${handler.name}`);
      log.error(error);
    }
  }
  log.warn(`No handlers succeeded for ${url.file}`);
  throw new Error(`No handlers succeeded for ${url.file}`);
}

export async function retrieveMultiple(
  urls: ResolvedURL[],
  initiator: Initiator,
  options?: MediaOptions
) {
  const results = await Promise.allSettled(
    urls.map((url) => retrieveOne(url, initiator, options))
  );
  const succeeded = results.filter((result) => result.status === 'fulfilled') as PromiseFulfilledResult<Retrieved>[];
  return succeeded.map((result) => result.value);
}
