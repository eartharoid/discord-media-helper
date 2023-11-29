/* eslint-disable no-unused-vars, no-use-before-define */

export interface Handler {
  handle: (url: ResolvedURL) => Promise<string>;
  name: string;
  raw_url?: boolean;
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
