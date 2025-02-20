import { config as dotenv } from 'dotenv';

dotenv();

const {
  // DISCORD_CLIENT_ID,
  DISCORD_TOKEN,
  DOWNLOAD_DIR,
  FFMPEG_BIN,
  HOST,
  MAX_FILE_SIZE,
  MAX_USER_QUEUE_SIZE = '3',
  RAPID_API_KEY,
  TMP_DIR = '/tmp',
  YTDL_BIN,
  DEBUG: debugString = 'false',
} = process.env;

const DEBUG = debugString.toLowerCase() === 'true';

// if (!DISCORD_CLIENT_ID) throw new Error('DISCORD_CLIENT_ID is not set');
if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is not set');
if (!DOWNLOAD_DIR) throw new Error('DOWNLOAD_DIR is not set');
if (!FFMPEG_BIN) throw new Error('FFMPEG_BIN is not set');
if (!HOST) throw new Error('HOST is not set');
if (!MAX_FILE_SIZE) throw new Error('MAX_FILE_SIZE is not set');
if (!RAPID_API_KEY) throw new Error('RAPID_API_KEY is not set');
if (!YTDL_BIN) throw new Error('YTDL_BIN is not set');
type Env = {
  // DISCORD_CLIENT_ID: string;
  DISCORD_TOKEN: string;
  DOWNLOAD_DIR: string;
  FFMPEG_BIN: string;
  HOST: string;
  MAX_FILE_SIZE: string;
  MAX_USER_QUEUE_SIZE: string;
  RAPID_API_KEY: string;
  TMP_DIR: string;
  YTDL_BIN: string;
  DEBUG: boolean;
}

const env: Env = {
  // DISCORD_CLIENT_ID,
  DISCORD_TOKEN,
  DOWNLOAD_DIR,
  FFMPEG_BIN,
  HOST,
  MAX_FILE_SIZE,
  MAX_USER_QUEUE_SIZE,
  RAPID_API_KEY,
  TMP_DIR,
  YTDL_BIN,
  DEBUG,
};

export default env;
