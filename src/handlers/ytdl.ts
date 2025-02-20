import { resolve } from 'path';
import { spawn } from 'child_process';
import type { Handler, HandlerContext, MediaType, ProcessedMedia } from '../types.js';
import log from '../log.js';
import env from '../env.js';
import HandlerFlags from '../flags/handler.js';

const handler: Handler = {
  name: 'ytdl',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url, context: HandlerContext) {
    // Handle existing files
    if (context.fileExists) {
      const ext = context.options?.audioOnly ? (context.options.audioFormat ?? 'mp3') : 'mp4';
      return {
        original: url.input,
        file: `${url.file}.${ext}`,
        type: context.options?.audioOnly ? 'video' : 'video' as MediaType
      };
    }

    // Prepare yt-dlp arguments
    const args = [
      url.input,
      '-P', resolve(env.DOWNLOAD_DIR),
      '-o', `${url.file}.%(ext)s`,
      '--max-filesize', env.MAX_FILE_SIZE,
      ...(context.options?.audioOnly
        ? [
            '-x',
            '--audio-format', context.options.audioFormat ?? 'mp3',
            '-f', 'ba/b'
          ]
        : [
            '-S', 'codec:h264',
            '-f', 'bv*+ba/b'
          ]
      )
    ];

    const bin = env.YTDL_BIN;
    log.info('Spawning `%s %s`', bin, args.join(' '));
    return new Promise((fulfil, reject) => {
      let file: string | undefined;
      const child = spawn(bin, args);
      child.stdout.on('data', (line) => {
        const str = line.toString().trim();
        log.info.ytdl(str);
        
        const fileMatch = str.match(new RegExp(`(${url.file}\\.[a-z0-9]+)(?:"|\\s|$)`));
        if (fileMatch) file = fileMatch[1];
      });

      child.stderr.on('data', (line) => {
        let str = line.toString().trim();
        const isWarning = str.startsWith('WARNING:');
        
        if (isWarning) {
          str = str.substring(9);
        }
        
        log[isWarning ? 'warn' : 'error'].ytdl(str);

        if (str.includes('Unsupported URL')) {
          reject(new Error('Unsupported URL'));
        }
      });
      child.on('close', async (code) => {
        log.info.ytdl('Exited with code', code);
        if (file) {
          fulfil({
            original: url.input,
            file,
            type: context.options?.audioOnly ? 'video' : 'video' as MediaType
          });
        } else {
          reject(new Error('File is missing'));
        }
      });
    });
  },
};

export default handler;
