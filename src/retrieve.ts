import { join } from 'path';
import type { ResolvedURL } from './types.js';
import log from './log.js';
import { exists } from './fs.js';
import env from './env.js';

type Initiator = 'interaction' | 'message';

export async function retrieveOne(url: ResolvedURL, initiator: Initiator) {
  // assume file extension is mp4 for the purposes of checking if the file exists
  const path = join(env.DOWNLOAD_DIR, `${url.file}.mp4`);
  const fileExists = await exists(path);
  if (fileExists) {
    log.success(`${url.file}.mp4 already exists`);
    return `${env.HOST}${url.file}.mp4`;
  }
  log.info(`Retrieving ${url.file}`);
  const handlers = url.resolver.handlers.filter((handler) => handler.flags.has(`RUN_ON_${initiator.toUpperCase()}` as `RUN_ON_${Uppercase<Initiator>}`));
  if (handlers.length === 0) throw new Error(`No handlers found for ${url.file} initiated by ${initiator}`);
  for await (const handler of handlers) {
    try {
      const result = await handler.handle(url);
      log.success(`Retrieved ${url.file} with ${handler.name}`);
      if (handler.flags.has('RETURNS_RAW_URL')) return result;
      return env.HOST + result;
    } catch (error) {
      log.warn(`Failed to retrieve ${url.file} with ${handler.name}`);
      log.error(error);
    }
  }
  log.warn(`No handlers succeeded for ${url.file}`);
  throw new Error(`No handlers succeeded for ${url.file}`);
}

export async function retrieveMultiple(urls: ResolvedURL[], initiator: Initiator) {
  const results = await Promise.allSettled(urls.map((url) => retrieveOne(url, initiator)));
  const succeeded = results.filter((result) => result.status === 'fulfilled') as PromiseFulfilledResult<string>[];
  return succeeded.map((result) => result.value);
}
