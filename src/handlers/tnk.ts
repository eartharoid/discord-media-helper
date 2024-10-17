import download from 'download';
import got from 'got';
import type { Handler, ResolvedURL } from '../types.js';
import { tmpDir } from '../fs.js';
import transcode from '../ffmpeg.js';
import HandlerFlags from '../flags/handler.js';

const handler: Handler = {
  name: 'tnk',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url: ResolvedURL) {
    // download(`https://d.tnktok.com/...`) // less explicit, more error prone
    const regex = /<meta property="og:video" content="(?<video>[^"]+)"\/><meta property="og:video:type" content="video\/(?<ext>[a-z0-9_-]+)"/i;
    const html = await got(new URL(new URL(url.input).pathname, 'https://tnktok.com').toString()).text();
    const result = regex.exec(html);
    const ext = result?.groups?.ext;
    const fileName = `${url.file}.${ext}`;
    const video = result?.groups?.video;
    if (!video) throw new Error('No video found');

    await download(
      video,
      tmpDir,
      { filename: fileName },
    );
    await transcode(fileName);

    return fileName;
  },
};

export default handler;
