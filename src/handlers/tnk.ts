import download from 'download';
import got from 'got';
import type { Handler, HandlerContext, MediaType, ProcessedMedia, ResolvedURL } from '../types.js';
import { tmpDir } from '../fs.js';
import transcode from '../ffmpeg.js';
import HandlerFlags from '../flags/handler.js';

const handler: Handler = {
  name: 'tnk',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url: ResolvedURL, context: HandlerContext) {
    try {
      const tnkUrl = new URL(url.input);
      tnkUrl.hostname = 'tnktok.com';
      const html = await got(tnkUrl).text();

      const regex = /<meta property="og:video" content="(?<video>[^"]+)"(.+)<meta property="og:video:type" content="video\/(?<ext>[a-z0-9_-]+)"/is;
      const { groups } = regex.exec(html) ?? {};
      if (!groups?.video) {
        throw new Error('No video found');
      }

      // TikTok is always video content
      const ext = context.options?.audioOnly
        ? context.options.audioFormat ?? 'mp3'
        : groups.ext ?? 'mp4';
      const fileName = `${url.file}.${ext}`;

      if (!context.fileExists) {
        await download(groups.video, tmpDir, { filename: fileName });
        await transcode(fileName, context.options);
      }

      return {
        original: url.input,
        file: fileName,
        type: 'video' as MediaType
      };
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Failed to process TikTok video');
    }
  },
};

export default handler;
