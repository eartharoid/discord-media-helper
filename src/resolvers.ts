import type { ResolvedURL, Resolver } from './types.js';
import bs from './handlers/bs.js';
import dd from './handlers/dd.js';
import ig from './handlers/ig.js';
import j2 from './handlers/j2.js';
import ytdl from './handlers/ytdl.js';
import tnk from './handlers/tnk.js';
import tw from './handlers/tw.js';
import rewrite from './rewrite.js';
import md5 from './md5.js';
import env from './env.js';
import log from './log.js';

export const resolvers: Resolver[] = [
  {
    name: 'bsky',
    prefix: 'bs',
    handlers: [bs],
    regex: /(?<!!)http(s)?:\/\/(www\.)?bsky.app\/profile\/[a-z0-9._-]+\/post\/(?<id>[a-z0-9_-]+)/i,
  },
  {
    name: 'facebook',
    prefix: 'fb',
    handlers: [j2, ytdl],
    regex: /(?<!!)http(s)?:\/\/(www\.)?facebook.com\/((share\/r)|([a-z0-9._-]+\/videos)|reel)\/(?<id>[a-z0-9_-]+)/i,
  },
  {
    name: 'facebook',
    prefix: 'fbw',
    handlers: [j2, ytdl],
    regex: /(?<!!)http(s)?:\/\/fb\.watch\/(?<id>[a-z0-9_-]+)/i,
  },
  {
    name: 'ifunny',
    prefix: 'if',
    handlers: [j2, ytdl],
    regex: /(?<!!)http(s)?:\/\/(www\.)?ifunny.co\/video\/(?<id>[a-z0-9_-]+)/i,
  },
  {
    name: 'instagram',
    prefix: 'ig',
    handlers: [dd, j2, ig, ytdl],
    regex: /(?<!!)http(s)?:\/\/(www\.)?instagram.com\/(p|tv)\/(?<id>[a-z0-9_-]+)/i,
  },
  {
    name: 'instagram',
    prefix: 'igr',
    handlers: [ig, j2],
    regex: /(?<!!)http(s)?:\/\/(www\.)?instagram.com(\/[a-z0-9._-]+)?\/reels?\/(?<id>[a-z0-9_-]+)/i,
  },
  // Stories are private and require auth cookies
  {
    name: 'instagram',
    prefix: 'igs',
    handlers: [dd],
    regex: /(?<!!)http(s)?:\/\/(www\.)?instagram.com\/stories\/[a-z0-9_-]+\/(?<id>[0-9]+)/i,
  },
  {
    name: 'reddit',
    prefix: 'rdt',
    handlers: [j2, ytdl],
    regex: /(?<!!)http(s)?:\/\/(www\.)?reddit.com\/r\/[a-z0-9._-]+\/comments\/(?<id>[a-z0-9]+)/i,
  },
  // Long URLs have an embedded player like YouTube now
  // {
  //   name: 'tiktok',
  //   prefix: 'tik',
  //   handlers: [tnk, j2, ytdl],
  //   regex: /(?<!!)http(s)?:\/\/(www\.)?tiktok.com\/((@[a-z0-9._-]+\/video\/)|t\/)(?<id>[a-z0-9_-]+)/i,
  // },
  {
    name: 'tiktok',
    prefix: 'tik',
    handlers: [tnk, j2, ytdl],
    regex: /(?<!!)http(s)?:\/\/v(m|t)\.tiktok.com\/(?<id>[a-z0-9_-]+)/i,
  },
  {
    name: 'twitter',
    prefix: 'tw',
    handlers: [tw, j2, ytdl],
    regex: /(?<!!)http(s)?:\/\/(www\.)?(twitter|x).com\/[a-z0-9._-]+\/status\/(?<id>[a-z0-9_-]+)/i,
  },
  // ! this **must** be last
  {
    name: 'unknown',
    prefix: '-',
    handlers: [j2, ytdl],
    regex: null,
  },
];

function getURLs(content: string) {
  const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,12}\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/gm;
  const urls = (content.match(regex) || []).map((url: string) => rewrite(url));
  return urls;
}

export function resolve(content: string, unknown = false) {
  const resolved: ResolvedURL[] = [];
  const urls = getURLs(content);
  forUrls: for (const url of urls) {
    if (url.startsWith(env.HOST)) {
      log.warn(`Ignoring "${url}"`);
      continue;
    }
    for (const resolver of resolvers) {
      if (resolver.regex === null) {
        if (unknown) {
          const id = md5(url);
          const file = `${resolver.prefix}-${id}`;
          resolved.push({
            file,
            id,
            input: url,
            resolver,
          });
          continue forUrls;
        }
      } else {
        const match = resolver.regex.exec(url);
        if (match && match.groups) {
          const { id } = match.groups;
          const file = `${resolver.prefix}-${id}`;
          resolved.push({
            file,
            id,
            input: url,
            resolver,
          });
          continue forUrls;
        }
      }
    }
  }
  return resolved;
}
