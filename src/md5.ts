import { createHash } from 'crypto';

export default function md5(input: string): string {
  return createHash('md5').update(input).digest('hex');
}
