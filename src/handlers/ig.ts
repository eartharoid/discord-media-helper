import PQueue from 'p-queue';
import ms from 'ms';
import { join } from 'node:path';
import rapid from '../api/rapid.js';
import download from '../stream.js';
import type { Handler } from '../types.js';
import { tmpDir } from '../fs.js';
import transcode from '../ffmpeg.js';

type IGResponse = { // ! non-exhaustive
  is_video: boolean,
  message?: string,
  video_url?: string,
};

const queue = new PQueue({
  concurrency: 1,
  interval: ms('1m'),
  intervalCap: 15,
  throwOnTimeout: true,
});

const handler: Handler = {
  name: 'ig',
  async handle(url) {
    const API = rapid('instagram-scraper-2022.p.rapidapi.com');
    const data = await queue.add((): Promise<IGResponse> => API.get(`ig/post_info/?shortcode=${url.id}`).json());
    if (!data) throw new Error('No data returned');
    if (data.message === 'Page not found') throw new Error(data.message);
    if (!data.is_video) throw new Error('Post is not a video');
    if (!data.video_url) throw new Error('No video found');
    const extension = new URL(data.video_url).pathname.split('.').pop();
    const fileName = `${url.file}.${extension}`;
    await download(data.video_url, join(tmpDir, fileName));
    await transcode(fileName);
    return fileName;
  },
};

export default handler;
