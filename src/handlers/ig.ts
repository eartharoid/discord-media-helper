import rapid from '../api/rapid.js';
import download from '../stream.js';
import type { Handler } from '../types.js';

type IGResponse = { // ! non-exhaustive
  is_video: boolean,
  message?: string,
  video_url?: string,
};

const handler: Handler = {
  name: 'ig',
  async handle(url) {
    const API = rapid('instagram-scraper-2022.p.rapidapi.com');
    const data: IGResponse = await API.get(`ig/post_info/?shortcode=${url.id}`).json();
    if (data.message === 'Page not found') throw new Error(data.message);
    if (!data.is_video) throw new Error('Post is not a video');
    if (!data.video_url) throw new Error('No video found');
    const extension = new URL(data.video_url).pathname.split('.').pop();
    const fileName = `${url.file}.${extension}`;
    await download(data.video_url, fileName);
    return fileName;
  },
};

export default handler;
