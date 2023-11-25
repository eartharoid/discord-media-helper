import got from 'got';

export default function rapid(api: string) {
  const options = {
    prefixUrl: `https://${api}/`,
    headers: {
      'X-RapidAPI-Key': process.env.RAPID_API_KEY,
      'X-RapidAPI-Host': api,
    },
  };
  const client = got.extend(options);
  return client;
}
