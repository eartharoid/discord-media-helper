import env from './env.js';
import type { Retrieved } from './retrieve.js';

export default function formatRetrieved(downloaded: Retrieved[]): string {
  return downloaded.map((retrieved) => {
    if (retrieved.raw) {
      return `-# ${retrieved.raw}`;
    }
    if (retrieved.file) {
      return `-# [View original](<${retrieved.original}>) • [\`${retrieved.file}\`](${new URL(retrieved.file, env.HOST)})`;
    }
    return '';
  }).join('\n');
}
