import type { Handler } from '../types.js';

const handler: Handler = {
  name: 'tw',
  raw_url: true,
  async handle(url) {
    return url.input.replace(/(twitter|x).com/, 'fxtwitter.com');
  },
};

export default handler;
