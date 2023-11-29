import { join } from 'path';
import type { ResolvedURL } from './types.js';
import log from './log.js';
import { exists } from './fs.js';
import env from './env.js';

export async function retrieveOne(url: ResolvedURL) {
  // assume file extension is mp4 for the purposes of checking if the file exists
  const path = join(env.DOWNLOAD_DIR, `${url.file}.mp4`);
  const fileExists = await exists(path);
  if (fileExists) {
    log.success(`${url.file}.mp4 already exists`);
    return `${env.HOST}${url.file}.mp4`;
  }
  log.info(`Retrieving ${url.file}`);
  for await (const handler of url.resolver.handlers) {
    try {
      const result = await handler.handle(url);
      log.success(`Retrieved ${url.file} with ${handler.name}`);
      if (handler.raw_url) return result;
      return env.HOST + result;
    } catch (error) {
      log.warn(`Failed to retrieve ${url.file} with ${handler.name}`);
      log.error(error);
    }
  }
  log.warn(`No handlers succeeded for ${url.file}`);
  throw new Error(`No handlers succeeded for ${url.file}`);
}

export async function retrieveMultiple(urls: ResolvedURL[]) {
  const results = await Promise.allSettled(urls.map((url) => retrieveOne(url)));
  const succeeded = results.filter((result) => result.status === 'fulfilled') as PromiseFulfilledResult<string>[];
  return succeeded.map((result) => result.value);
}
