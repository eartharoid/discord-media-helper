export interface Handler {
  name: string;
  // eslint-disable-next-line no-unused-vars
  handle: (url: string) => Promise<boolean>;
}

export interface Resolver {
  name: string;
  prefix: string;
  handlers: Handler[];
  regex?: RegExp;
}

export interface ResolvedURL {
  id: string,
  input: string,
  resolver: Resolver,
}
