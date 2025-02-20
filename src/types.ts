import type HandlerFlags from './flags/handler.js';

/**
 * Supported media types
 */
export type MediaType = 'video' | 'image' | 'gallery';

/**
 * Media processing options for video quality and audio extraction
 */
export interface MediaOptions {
  /** Video quality setting (only used for videos) */
  quality?: 'best' | '1080' | '720' | '480';
  /** Whether to extract audio only (only for videos) */
  audioOnly?: boolean;
  /** Audio format when extracting audio */
  audioFormat?: 'mp3' | 'm4a' | 'wav' | 'ogg';
}

/**
 * Media URL information
 */
export interface MediaInfo {
  /** Type of media */
  type: MediaType;
  /** URL to the media */
  url: string;
  /** Original extension if available */
  extension?: string;
  /** For galleries, additional media items */
  items?: MediaInfo[];
}

/**
 * Context passed to handlers for processing media
 */
export interface HandlerContext {
  /** Whether the target file already exists */
  fileExists: boolean;
  /** Media processing options */
  options?: MediaOptions;
}

/**
 * Gallery item information
 */
export interface GalleryItem {
  /** Filename of the item */
  file: string;
  /** Type of media */
  type: MediaType;
  /** Index in gallery (1-based) */
  index: number;
}

/**
 * Result of media processing
 */
export interface ProcessedMedia {
  /** Original URL that was processed */
  original: string;
  /** For single files, the processed filename */
  file?: string;
  /** For URL rewriters, the raw URL */
  raw?: string;
  /** For galleries, multiple processed files with metadata */
  files?: GalleryItem[];
  /** Type of media that was processed */
  type: MediaType;
  /** For galleries, total number of items */
  total?: number;
}

/**
 * Media handler implementation
 */
export interface Handler {
  /** Process a URL and extract media information */
  handle: (url: ResolvedURL, context: HandlerContext) => Promise<ProcessedMedia>;
  /** Unique identifier for the handler */
  name: string;
  /** Handler capabilities and restrictions */
  flags: HandlerFlags;
}

/**
 * URL pattern resolver with associated handlers
 */
export interface Resolver {
  /** Service name (e.g., 'instagram', 'twitter') */
  name: string;
  /** File prefix for the service */
  prefix: string;
  /** Handlers to try in order */
  handlers: Handler[];
  /** URL pattern to match, or null for fallback */
  regex: RegExp | null;
}

/**
 * Processed URL with resolver information
 */
export interface ResolvedURL {
  /** Generated filename without extension */
  file: string;
  /** Extracted ID from URL */
  id: string;
  /** Original input URL */
  input: string;
  /** Matched resolver */
  resolver: Resolver;
}
