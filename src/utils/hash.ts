import crypto from 'crypto';

export function md5Hash(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}