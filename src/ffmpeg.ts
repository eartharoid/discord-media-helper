import { spawn } from 'child_process';
import { join } from 'node:path';
import { rm } from 'fs/promises';
import log from './log.js';
import env from './env.js';
import { exists, tmpDir } from './fs.js';
import { sleep } from './utils.js';

export default async function transcode(fileName: string): Promise<void> {
  log.verbose('Waiting 100ms for temporary file');
  await sleep(100);
  const bin = env.FFMPEG_BIN;
  const args = [
    '-i',
    join(tmpDir, fileName),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    // '-tune',
    // 'zerolatency', // this adds several MB to the file size
    '-c:a',
    'copy', // don't waste time re-encoding audio
    '-hide_banner',
    '-v',
    'warning',
    join(env.DOWNLOAD_DIR, fileName),
  ];
  log.verbose('Spawning `%s %s`', bin, args.join(' '));
  return new Promise((fulfil, reject) => {
    log.info('Transcoding %s', fileName);
    const child = spawn(bin, args);
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
  });
}
