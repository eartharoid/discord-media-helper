import { config as dotenv } from 'dotenv';
import log from './log.js';
import client from './discord.js';

dotenv();

process.on('unhandledRejection', (error) => {
  if (error instanceof Error) log.warn(`Uncaught ${error.name}`);
  log.error(error);
});

log.info('Connecting to Discord...');
client.login(process.env.DISCORD_TOKEN);
