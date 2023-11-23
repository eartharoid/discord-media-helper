import type { Handler } from '../types.js';

const handler: Handler = {
  name: 'j2',
  async handle(url) {
    return true;
  },
};

export default handler;
