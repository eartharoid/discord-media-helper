import type { Handler } from '../types.js';
import HandlerFlags from '../flags/handler.js';

const handler: Handler = {
  name: 'bs',
  flags: new HandlerFlags(['RETURNS_RAW_URL', 'RUN_ON_MESSAGE']),
  async handle(url) {
    // ! regex is not global, only replace first occurrence
    return url.input.replace(/bsky\.app/, 'bskye.app');
  },
};

export default handler;
