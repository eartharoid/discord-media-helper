const ytdl = require('./ytdl');

module.exports = {
	files: 'tmp', // absolute or relative path (eg. /var/www/html/videos)
	host: 'https://example.com/videos/', // IMPORTANT: MUST end with a trailing slash
	sites: {
		'instagram': {
			handler: ytdl,
			regex: /http(s)?:\/\/(www\.)?(?<site>instagram).com\/(p|reel)\/(?<id>[a-z0-9_-]+)/gmi,
		},
		'tiktok': {
			handler: ytdl,
			regex: /http(s)?:\/\/(www\.)?(?<site>tiktok).com\/((@[a-z0-9._-]+\/video\/)|t\/)(?<id>[a-z0-9_-]+)/gmi,
		},
		'tiktok-vm': {
			handler: ytdl,
			regex: /http(s)?:\/\/vm\.(?<site>tiktok).com\/(?<id>[a-z0-9_-]+)/gmi,
		},
		'twitter': {
			handler: ytdl,
			regex: /http(s)?:\/\/(www\.)?(?<site>twitter).com\/[a-z0-9._-]+\/status\/(?<id>[a-z0-9_-]+)/gmi,
		},
	},
	ytdl: { bin: 'yt-dlp.exe' }, // absolute or relative path to binary/executable
};