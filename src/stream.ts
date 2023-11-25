import got from 'got';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';

export default async function streamFile(url: string, fileName: string) {
  const readStream = got.stream(url, { throwHttpErrors: false });
  const onError = (error: unknown) => {
    throw error;
  };
  readStream.on('response', async () => {
    readStream.off('error', onError); // prevent `onError` being called twice
    try {
      await streamPipeline(
        readStream,
        createWriteStream(join(process.env.DOWNLOAD_DIR, fileName)),
      );
    } catch (error) {
      onError(error);
    }
  });
  readStream.once('error', onError);
}
