/* eslint-disable no-unused-vars, no-use-before-define */

import type HandlerFlags from './flags/handler.js';

export interface MediaOptions {
  quality?: 'best' | '1080' | '720' | '480';
  audioOnly?: boolean;
  audioFormat?: 'mp3' | 'm4a' | 'wav' | 'ogg';
}

export interface HandlerContext {
  fileExists: boolean;
  options?: MediaOptions;
}

export interface Handler {
  handle: (url: ResolvedURL, context: HandlerContext) => Promise<string>;
  name: string;
  flags: HandlerFlags;
}

export interface Resolver {
  name: string;
  prefix: string;
  handlers: Handler[];
  regex: RegExp | null;
}

export interface ResolvedURL {
  file: string,
  id: string,
  input: string,
  resolver: Resolver,
}
