import { rmSync } from 'fs';
import env from './env.js';
import log from './log.js';
import client from './discord.js';
import { tmpDir } from './fs.js';

function cleanup(signal: string) {
  log.warn(`Received ${signal}`);
  log.info('Deleting temporary directory (%s)', tmpDir);
  rmSync(tmpDir, { recursive: true });
  client.destroy();
  process.exit(0);
}

process.on('SIGTERM', () => cleanup('SIGTERM'));

process.on('SIGINT', () => cleanup('SIGINT'));

process.on('unhandledRejection', (error) => {
  if (error instanceof Error) log.warn(`Uncaught ${error.name}`);
  log.error(error);
});

log.info('Connecting to Discord...');
client.login(env.DISCORD_TOKEN);
