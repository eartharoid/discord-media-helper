import PQueue from 'p-queue';
import ms from 'ms';
import { spawn } from 'child_process';
import { join } from 'node:path';
import { rm } from 'fs/promises';
import log from './log.js';
import env from './env.js';
import { exists, tmpDir } from './fs.js';

const timeout = ms(process.env.FFMPEG_TIMEOUT || '5m');

const queue = new PQueue({
  concurrency: parseInt(process.env.FFMPEG_MAX_CONCURRENCY || '4', 10),
  timeout: timeout + 1000,
  throwOnTimeout: true,
});

import type { MediaOptions } from './types.js';

export default async function transcode(fileName: string, options?: MediaOptions): Promise<void> {
  const bin = env.FFMPEG_BIN;
  const args = ['-y', '-i', join(tmpDir, fileName)];

  if (options?.audioOnly) {
    // Audio extraction
    args.push(
      '-vn', // No video
      '-c:a', // Audio codec
      options.audioFormat === 'mp3' ? 'libmp3lame' :
      options.audioFormat === 'm4a' ? 'aac' :
      options.audioFormat === 'wav' ? 'pcm_s16le' :
      options.audioFormat === 'ogg' ? 'libvorbis' :
      'libmp3lame', // default to mp3
      '-q:a', '0', // Best quality
    );
  } else {
    // Video transcoding
    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-c:a',
      'copy', // don't waste time re-encoding audio
    );
  }

  args.push(
    '-hide_banner',
    '-v',
    'warning',
    join(env.DOWNLOAD_DIR, fileName)
  );
  log.info('Queueing `%s %s`', bin, args.join(' '));
  return queue.add(() => new Promise((fulfil, reject) => {
    log.info('Spawning `%s %s`', bin, args.join(' '));
    log.info('Transcoding %s', fileName);
    const child = spawn(bin, args, { timeout });
    child.stdout.on('data', (line) => {
      const str = line.toString();
      log.info.ffmpeg(str);
    });
    child.stderr.on('data', (line) => {
      const str = line.toString();
      log.error.ffmpeg(str);
    });
    child.on('close', async (code) => {
      if (code === 0 && await exists(join(env.DOWNLOAD_DIR, fileName))) {
        log.success('Transcoded %s', fileName);
        fulfil();
      } else {
        log.warn.ffmpeg('Exited with code', code);
        reject(new Error('File is missing'));
      }
      log.verbose('Removing temporary %s file', fileName);
      await rm(join(tmpDir, fileName));
    });
  }));
}
