/* eslint-disable no-unused-vars, no-use-before-define */

export interface Handler {
  name: string;
  handle: (url: ResolvedURL) => Promise<string>;
}

export interface Resolver {
  name: string;
  prefix: string;
  handlers: Handler[];
  regex?: RegExp;
}

export interface ResolvedURL {
  file: string,
  id: string,
  input: string,
  resolver: Resolver,
}
