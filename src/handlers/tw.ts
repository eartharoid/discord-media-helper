import type { Handler } from '../types.js';
import HandlerFlags from '../flags/handler.js';

const handler: Handler = {
  name: 'tw',
  flags: new HandlerFlags(['RETURNS_RAW_URL', 'RUN_ON_MESSAGE']),
  async handle(url) {
    return url.input.replace(/(twitter|x).com/, 'fxtwitter.com');
  },
};

export default handler;
