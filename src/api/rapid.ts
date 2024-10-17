import got from 'got';
import ms from 'ms';
import env from '../env.js';

export default function rapid(api: string) {
  const options = {
    prefixUrl: `https://${api}/`,
    headers: {
      'X-RapidAPI-Key': env.RAPID_API_KEY,
      'X-RapidAPI-Host': api,
    },
    timeout: {
      request: ms('10s'),
    },
  };
  const client = got.extend(options);
  return client;
}
