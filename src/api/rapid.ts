import got from 'got';
import env from '../env.js';

export default function rapid(api: string) {
  const options = {
    prefixUrl: `https://${api}/`,
    headers: {
      'X-RapidAPI-Key': env.RAPID_API_KEY,
      'X-RapidAPI-Host': api,
    },
  };
  const client = got.extend(options);
  return client;
}
