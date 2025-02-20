import env from './env.js';
import type { Retrieved } from './retrieve.js';

export default function formatRetrieved(downloaded: Retrieved[]): string {
  return downloaded.map((retrieved) => {
    if (retrieved.raw) {
      return `-# ${retrieved.raw}`;
    }
    if (retrieved.file) {
      const baseText = `-# [View original](<${retrieved.original}>)`;
      
      if (retrieved.type === 'gallery' && retrieved.files && retrieved.total) {
        // For galleries, show current item and total
        const currentFile = retrieved.file;
        return `${baseText} • Gallery (1/${retrieved.total}) • [\`${currentFile}\`](${new URL(currentFile, env.HOST)})`;
      }
      
      // For single files
      return `${baseText} • [\`${retrieved.file}\`](${new URL(retrieved.file, env.HOST)})`;
    }
    return '';
  }).join('\n');
}
