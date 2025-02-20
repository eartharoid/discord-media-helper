import download from 'download';
import got from 'got';
import type { Handler, HandlerContext, MediaOptions, MediaType, ProcessedMedia, ResolvedURL } from '../types.js';
import { tmpDir } from '../fs.js';
import transcode from '../ffmpeg.js';
import HandlerFlags from '../flags/handler.js';
import env from '../env.js';

const handler: Handler = {
  name: 'dd',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url: ResolvedURL, context: HandlerContext) {
    const ddUrl = new URL(url.input);
    ddUrl.hostname = 'ddinstagram.com';
    const html = await got(ddUrl).text();

    const regex = /(<meta name="twitter:player:stream" content="(?<video>\/videos\/[a-z0-9_-]+\/\d)"\/><meta name="twitter:player:stream:content_type" content="video\/(?<ext>[a-z0-9_-]+)")|(<meta name="twitter:image" content="(?<image>\/images\/[a-z0-9_-]+\/\d)")/i;
    const { groups } = regex.exec(html) ?? {};
    if (!groups?.video && !groups?.image) {
      throw new Error('No video or image found');
    }

    // Determine media type
    const isVideo = !!groups.video;
    const type = isVideo ? 'video' : 'image' as MediaType;

    // Get extension based on type
    const ext = isVideo && context.options?.audioOnly
      ? context.options.audioFormat ?? 'mp3'
      : isVideo ? (groups.ext ?? 'mp4') : 'jpg';
    const fileName = `${url.file}.${ext}`;

    if (!context.fileExists) {
      const mediaUrl = new URL(groups.video ?? groups.image, 'https://ddinstagram.com');
      const downloadDir = isVideo ? tmpDir : env.DOWNLOAD_DIR;
      
      await download(
        mediaUrl.toString(),
        downloadDir,
        { filename: fileName }
      );

      if (isVideo) {
        await transcode(fileName, context.options);
      }
    }

    return {
      original: url.input,
      file: fileName,
      type: isVideo ? 'video' : 'image' as MediaType
    };
  },
};

export default handler;
