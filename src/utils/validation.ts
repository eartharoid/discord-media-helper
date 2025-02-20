import { URL } from 'url';

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9.-]/gi, '_');
}

export function isValidMediaType(type: string): boolean {
  return ['video', 'image', 'gallery'].includes(type);
}

export function isValidAudioFormat(format: string): boolean {
  return ['mp3', 'm4a', 'wav', 'ogg'].includes(format);
}

export function isValidVideoQuality(quality: string): boolean {
  return ['best', '1080', '720', '480'].includes(quality);
}

export function isValidContentType(contentType: string, expectedType: 'video' | 'image'): boolean {
  if (expectedType === 'video') {
    return contentType.startsWith('video/') || contentType === 'application/octet-stream';
  } else if (expectedType === 'image') {
    return contentType.startsWith('image/');
  }
  return false;
}

export function isValidFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize;
}