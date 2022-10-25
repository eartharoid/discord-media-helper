const ytdl = require('./ytdl');

module.exports = {
	files: 'tmp', // absolute or relative path (eg. /var/www/html/videos)
	host: 'https://example.com/videos/', // IMPORTANT: MUST end with a trailing slash
	sites: {
		'instagram': {
			handler: ytdl,
			regex: /http(s)?:\/\/(www\.)?(?<site>instagram).com\/(p|reel)\/(?<id>[a-z0-9]+)/gmi,
		},
		'tiktok': {
			handler: ytdl,
			regex: /http(s)?:\/\/(www\.)?(?<site>tiktok).com\/((@[a-z0-9_-]+\/video\/)|t\/)(?<id>[a-z0-9]+)/gmi,
		},
		'tiktok-vm': {
			handler: ytdl,
			regex: /http(s)?:\/\/vm\.(?<site>tiktok).com\/(?<id>[a-z0-9]+)/gmi,
		},
	},
	ytdl: { bin: 'yt-dlp.exe' }, // absolute or relative path to binary/executable
};