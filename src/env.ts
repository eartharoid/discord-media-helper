import { config as dotenv } from 'dotenv';

dotenv();

const {
  // DISCORD_CLIENT_ID,
  DISCORD_TOKEN,
  DOWNLOAD_DIR,
  FFMPEG_BIN,
  HOST,
  MAX_FILE_SIZE,
  RAPID_API_KEY,
  YTDL_BIN,
} = process.env;

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
  RAPID_API_KEY: string;
  YTDL_BIN: string;
}

const env: Env = {
  // DISCORD_CLIENT_ID,
  DISCORD_TOKEN,
  DOWNLOAD_DIR,
  FFMPEG_BIN,
  HOST,
  MAX_FILE_SIZE,
  RAPID_API_KEY,
  YTDL_BIN,
};

export default env;
