/* eslint-disable no-unused-vars, no-use-before-define */

import type HandlerFlags from './flags/handler.js';

export interface Handler {
  handle: (url: ResolvedURL) => Promise<string>;
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
