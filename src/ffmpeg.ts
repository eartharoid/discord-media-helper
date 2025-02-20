// External dependencies
import PQueue from 'p-queue';
import ms from 'ms';
import { spawn } from 'child_process';
import { join } from 'node:path';
import { rm } from 'fs/promises';

// Internal dependencies
import type { MediaOptions } from './types.js';
import log from './log.js';
import env from './env.js';
import { exists, tmpDir } from './fs.js';

// FFmpeg process configuration
const timeout = ms(process.env.FFMPEG_TIMEOUT || '5m');
const queue = new PQueue({
  concurrency: parseInt(process.env.FFMPEG_MAX_CONCURRENCY || '4', 10),
  timeout: timeout + 1000,
  throwOnTimeout: true,
});

// Audio codec mapping for different formats
const AUDIO_CODECS = {
  mp3: 'libmp3lame',
  m4a: 'aac',
  wav: 'pcm_s16le',
  ogg: 'libvorbis'
} as const;

/**
 * Transcodes a media file using FFmpeg, optionally extracting audio.
 * @param fileName Name of the file to transcode
 * @param options Media options including audio extraction settings
 */
export default async function transcode(fileName: string, options?: MediaOptions): Promise<void> {
  const bin = env.FFMPEG_BIN;
  const inputPath = join(tmpDir, fileName);
  const outputPath = join(env.DOWNLOAD_DIR, fileName);

  // Base FFmpeg arguments
  const args = ['-y', '-i', inputPath];

  // Add encoding arguments based on options
  if (options?.audioOnly) {
    args.push(
      '-vn',                                           // No video
      '-c:a',                                         // Audio codec
      AUDIO_CODECS[options.audioFormat ?? 'mp3'],     // Get codec or default to mp3
      '-q:a', '0'                                     // Best quality
    );
  } else {
    args.push(
      '-c:v', 'libx264',                             // Video codec
      '-preset', 'veryfast',                         // Encoding speed
      '-c:a', 'copy'                                 // Copy audio stream
    );
  }

  // Add output options
  args.push('-hide_banner', '-v', 'warning', outputPath);

  // Log the queued operation
  log.info('Queueing FFmpeg operation for %s', fileName);
  log.verbose('Command: %s %s', bin, args.join(' '));

  return queue.add(() => new Promise((resolve, reject) => {
    const child = spawn(bin, args, { timeout });
    log.info('Transcoding %s', fileName);

    // Handle process output
    child.stdout.on('data', data => log.info.ffmpeg(data.toString().trim()));
    child.stderr.on('data', data => log.error.ffmpeg(data.toString().trim()));

    // Handle process completion
    child.on('close', async (code) => {
      try {
        const outputExists = await exists(outputPath);
        if (code === 0 && outputExists) {
          log.success('Transcoded %s', fileName);
          resolve();
        } else {
          const error = new Error(`FFmpeg failed with code ${code}`);
          log.warn.ffmpeg('Transcoding failed:', error.message);
          reject(error);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        reject(new Error(`Failed to verify output: ${message}`));
      } finally {
        // Clean up temporary file
        try {
          await rm(inputPath);
          log.verbose('Removed temporary file %s', fileName);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log.warn('Failed to remove temporary file:', message);
        }
      }
    });

    // Handle process errors
    child.on('error', (error: Error) => {
      log.error.ffmpeg('Process error:', error.message);
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  }));
}
