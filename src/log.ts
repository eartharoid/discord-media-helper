import {
  ConsoleTransport,
  FileTransport,
  Logger,
} from 'leekslazylogger';

export default new Logger({
  namespaces: ['ffmpeg', 'ytdl'],
  transports: [
    new ConsoleTransport(),
    new FileTransport({
      level: 'verbose',
    }),
  ],
});
