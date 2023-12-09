/* eslint-disable import/no-extraneous-dependencies */
import PQueue from 'p-queue';
import ms from 'ms';
import download from 'download';
import rapid from '../api/rapid.js';
import type { Handler } from '../types.js';
import { tmpDir } from '../fs.js';
import transcode from '../ffmpeg.js';
import HandlerFlags from '../flags/handler.js';

type J2Response = { // ! non-exhaustive
  error: boolean
  message?: string,
  medias: {
    extension: string,
    url: string,
    type: string,
  }[]
};

// pro plan
const queue = new PQueue({
  concurrency: 3,
  interval: ms('1s'),
  intervalCap: 3,
  throwOnTimeout: true,
});

const handler: Handler = {
  name: 'j2',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url) {
    const API = rapid('auto-download-all-in-one.p.rapidapi.com');
    const data = await queue.add((): Promise<J2Response> => API.post('v1/social/autolink', {
      json: {
        url: url.input,
      },
    }).json());
    if (!data) throw new Error('No data returned');
    if (data.error) throw new Error(data.message);
    const videos = data.medias.filter((m) => m.type === 'video');
    if (videos.length === 0) throw new Error('No videos found');
    const fileName = `${url.file}.${videos[0].extension}`;
    await download(videos[0].url, tmpDir, { filename: fileName });
    await transcode(fileName);
    return fileName;
  },
};

export default handler;
