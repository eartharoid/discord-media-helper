/* eslint-disable import/no-extraneous-dependencies */
import PQueue from 'p-queue';
import ms from 'ms';
import download from 'download';
import rapid from '../api/rapid.js';
import type { Handler } from '../types.js';
import { tmpDir } from '../fs.js';
import transcode from '../ffmpeg.js';
import HandlerFlags from '../flags/handler.js';

type IGResponse = { // ! non-exhaustive
  data: {
    is_video: boolean,
    detail?: string,
    video_url?: string,
  }
};

const queue = new PQueue({
  concurrency: 24,
  interval: ms('1m'),
  intervalCap: 240,
  throwOnTimeout: true,
});

const handler: Handler = {
  name: 'ig',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url) {
    // const API = rapid('instagram-scraper-2022.p.rapidapi.com');
    // API.get(`ig/post_info/?shortcode=${url.id}`)
    const API = rapid('instagram-scraper-api2.p.rapidapi.com');
    const data = await queue.add((): Promise<IGResponse> => API.get(`v1/post_info?code_or_id_or_url=${encodeURI(url.input)}`).json());
    if (!data?.data) throw new Error('No data returned');
    if (!data.data.is_video) throw new Error('Post is not a video');
    if (!data.data.video_url) throw new Error('No video found');
    const extension = new URL(data.data.video_url).pathname.split('.').pop();
    const fileName = `${url.file}.${extension}`;
    await download(data.data.video_url, tmpDir, { filename: fileName });
    await transcode(fileName);
    return fileName;
  },
};

export default handler;
