import rapid from '../api/rapid.js';
import download from '../stream.js';
import type { Handler } from '../types.js';

type J2Response = { // ! non-exhaustive
  error: boolean
  message?: string,
  medias: {
    extension: string,
    url: string,
    type: string,
  }[]
};

const handler: Handler = {
  name: 'j2',
  async handle(url) {
    const API = rapid('auto-download-all-in-one.p.rapidapi.com');
    const data: J2Response = await API.post('v1/social/autolink', {
      json: {
        url: url.input,
      },
    }).json();
    if (data.error) throw new Error(data.message);
    const videos = data.medias.filter((m) => m.type === 'video');
    if (videos.length === 0) throw new Error('No videos found');
    const fileName = `${url.file}.${videos[0].extension}`;
    await download(videos[0].url, fileName);
    return fileName;
  },
};

export default handler;
