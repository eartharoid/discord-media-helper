import {
  ConsoleTransport,
  FileTransport,
  Logger,
} from 'leekslazylogger';
import env from './env.js';

const DEBUG = env.DEBUG;

export default new Logger({
  namespaces: ['ffmpeg', 'ytdl'],
  transports: [
    new ConsoleTransport({
      level: DEBUG ? 'debug' : 'info',
    }),
    new FileTransport({
      level: 'verbose',
    }),
  ],
});
