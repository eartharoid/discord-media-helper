import { resolve } from 'path';
import { spawn } from 'child_process';
import type { Handler } from '../types.js';
import log from '../log.js';
import env from '../env.js';
import HandlerFlags from '../flags/handler.js';

const handler: Handler = {
  name: 'ytdl',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url) {
    const bin = env.YTDL_BIN;
    const args = [
      url.input,
      '-P',
      resolve(env.DOWNLOAD_DIR),
      '-o',
      `${url.file}.%(ext)s`,
      '-S',
      'codec:h264',
      '-f',
      'bv*+ba/b',
      '--max-filesize',
      env.MAX_FILE_SIZE,
    ];
    log.info('Spawning `%s %s`', bin, args.join(' '));
    return new Promise((fulfil, reject) => {
      let file: string | undefined;
      const child = spawn(bin, args);
      child.stdout.on('data', (line) => {
        const str = line.toString().replace(/\n$/, '');
        log.info.ytdl(str);
        const regex = new RegExp(`(${url.file}\\.[a-z0-9]+)("|\\s|$)`);
        const match = str.match(regex);
        // eslint-disable-next-line prefer-destructuring
        if (match) file = match[1];
      });
      child.stderr.on('data', (line) => {
        let str = line.toString().replace(/\n$/, '');
        let level: 'error' | 'warn' = 'error';
        if (str.startsWith('WARNING:')) {
          level = 'warn';
          str = str.substring(9);
        }
        log[level].ytdl(str);
        if (str.includes('Unsupported URL')) reject(new Error('Unsupported URL'));
      });
      child.on('close', async (code) => {
        log.info.ytdl('Exited with code', code);
        if (file) {
          fulfil(file);
        } else {
          reject(new Error('File is missing'));
        }
      });
    });
  },
};

export default handler;
