import { join } from 'path';
import type { ResolvedURL } from './types.js';
import log from './log.js';
import { exists } from './fs.js';

export async function downloadOne(url: ResolvedURL) {
  const file = `${url.resolver.prefix}-${url.id}`;
  const path = join(process.env.DOWNLOAD_DIR, file);
  const fileExists = await exists(path);
  if (fileExists) {
    log.success(`${file} already exists`);
    return file;
  }
  log.info(`Downloading ${file}`);
  for await (const handler of url.resolver.handlers) {
    try {
      await handler.handle(url.input);
      log.success(`Downloaded ${file} with ${handler.name}`);
      return file;
    } catch (error) {
      log.warn(`Failed to download ${file} with ${handler.name}`);
      log.error(error);
    }
  }
  log.warn(`No handlers succeeded for ${url}`);
  throw new Error(`No handlers succeeded for ${url}`);
}

export async function downloadMultiple(urls: ResolvedURL[]) {
  const results = await Promise.allSettled(urls.map((url) => downloadOne(url)));
  const succeeded = results.filter((result) => result.status === 'fulfilled') as PromiseFulfilledResult<string>[];
  return succeeded.map((result) => process.env.HOST + result.value);
}
