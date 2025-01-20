import PQueue from 'p-queue';
import ms from 'ms';
import download from 'download';
import rapid from '../api/rapid.js';
import type { Handler, HandlerContext } from '../types.js';
import { tmpDir } from '../fs.js';
import transcode from '../ffmpeg.js';
import HandlerFlags from '../flags/handler.js';

// Queue configuration for rate limiting
const QUEUE_CONFIG = {
  concurrency: 24,
  interval: ms('1m'),
  intervalCap: 240,
  throwOnTimeout: true,
} as const;

// Comprehensive Instagram API response type
interface IGResponse {
  data: {
    is_video: boolean;
    detail?: string;
    video_url?: string;
    caption?: string;
    owner?: {
      username: string;
      full_name?: string;
    };
    taken_at_timestamp?: number;
    media_type?: string;
  };
}

// Custom error class for Instagram-specific errors
class InstagramError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'InstagramError';
  }
}

// Validate and extract video URL
function validateVideoResponse(data: IGResponse['data']): string {
  if (!data) {
    throw new InstagramError('No data returned from Instagram API', 'NO_DATA');
  }
  if (!data.is_video) {
    throw new InstagramError('Post is not a video', 'NOT_VIDEO');
  }
  if (!data.video_url) {
    throw new InstagramError('No video URL found', 'NO_VIDEO_URL');
  }
  return data.video_url;
}

// Extract file extension safely
function getFileExtension(url: string): string {
  try {
    const extension = new URL(url).pathname.split('.').pop();
    return extension && /^[a-zA-Z0-9]+$/.test(extension) ? extension : 'mp4';
  } catch {
    return 'mp4';
  }
}

const queue = new PQueue(QUEUE_CONFIG);

const handler: Handler = {
  name: 'ig',
  flags: new HandlerFlags(['RUN_ON_INTERACTION', 'RUN_ON_MESSAGE']),
  async handle(url, context: HandlerContext) {
    try {
      const API = rapid('instagram-scraper-api2.p.rapidapi.com');
      const data = await queue.add((): Promise<IGResponse> =>
        API.get(`v1/post_info?code_or_id_or_url=${encodeURIComponent(url.input)}`).json()
      );

      if (!data) throw new InstagramError('API returned no data', 'NO_RESPONSE');

      const videoUrl = validateVideoResponse(data.data);
      const extension = context.options?.audioOnly
        ? context.options.audioFormat ?? 'mp3'
        : getFileExtension(videoUrl);
      const fileName = `${url.file}.${extension}`;

      if (!context.fileExists) {
        await download(videoUrl, tmpDir, { filename: fileName });
        await transcode(fileName, context.options);
      }
      
      return fileName;
    } catch (error: unknown) {
      if (error instanceof InstagramError) throw error;
      
      throw new InstagramError(
        `Failed to process Instagram video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROCESSING_ERROR'
      );
    }
  },
};

export default handler;
