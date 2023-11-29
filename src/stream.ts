// https://github.com/sindresorhus/got/blob/main/documentation/3-streams.md

import got from 'got';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

export default async function streamFile(url: string, path: string) {
  const readStream = got.stream(url, { throwHttpErrors: false });
  const onError = (error: unknown) => {
    throw error;
  };
  readStream.on('response', async () => {
    readStream.off('error', onError); // prevent `onError` being called twice
    try {
      await streamPipeline(
        readStream,
        createWriteStream(path),
      );
    } catch (error) {
      onError(error);
    }
  });
  readStream.once('error', onError);
}
