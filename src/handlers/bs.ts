import type { Handler, HandlerContext, ProcessedMedia } from '../types.js';
import HandlerFlags from '../flags/handler.js';

const handler: Handler = {
  name: 'bs',
  flags: new HandlerFlags(['RETURNS_RAW_URL', 'RUN_ON_MESSAGE']),
  async handle(url, context: HandlerContext): Promise<ProcessedMedia> {
    // ! regex is not global, only replace first occurrence
    return {
      original: url.input,
      raw: url.input.replace(/bsky\.app/, 'bskye.app'),
      type: 'video' // bskye.app returns video embeds
    };
  },
};

export default handler;
