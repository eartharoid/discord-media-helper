import download from 'download';
import got from 'got';
import type { Handler, ResolvedURL } from '../types.js';
import { tmpDir } from '../fs.js';
import transcode from '../ffmpeg.js';
import HandlerFlags from '../flags/handler.js';
import env from '../env.js';

const handler: Handler = {
  name: 'dd',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url: ResolvedURL) {
    const html = await got(
      new URL(new URL(url.input).pathname, 'https://ddinstagram.com').toString(),
    ).text();
    const regex = /(<meta name="twitter:player:stream" content="(?<video>\/videos\/[a-z0-9_-]+\/\d)"\/><meta name="twitter:player:stream:content_type" content="video\/(?<ext>[a-z0-9_-]+)")|(<meta name="twitter:image" content="(?<image>\/images\/[a-z0-9_-]+\/\d)")/i;
    const result = regex.exec(html);
    const ext = result?.groups?.ext || 'png';
    const fileName = `${url.file}.${ext}`;
    const path = result?.groups?.video || result?.groups?.image;

    if (!path) throw new Error('No video or image found');

    await download(
      new URL(path, 'https://ddinstagram.com').toString(),
      result?.groups?.video ? tmpDir : env.DOWNLOAD_DIR,
      { filename: fileName },
    );

    if (result?.groups?.video) {
      await transcode(fileName);
    }

    return fileName;
  },
};

export default handler;
