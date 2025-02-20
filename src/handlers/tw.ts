import type { Handler, HandlerContext, ProcessedMedia } from '../types.js';
import HandlerFlags from '../flags/handler.js';

const handler: Handler = {
  name: 'tw',
  flags: new HandlerFlags(['RETURNS_RAW_URL', 'RUN_ON_MESSAGE']),
  async handle(url, context: HandlerContext): Promise<ProcessedMedia> {
    return {
      original: url.input,
      raw: url.input.replace(/(twitter|x)\.com/, 'fxtwitter.com'),
      type: 'video' // fxtwitter always returns video embeds
    };
  },
};

export default handler;
