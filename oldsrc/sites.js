const ytdl = require('./handlers/ytdl');

const rewrites = [
	[/instagram.com\/reels\//i, 'instagram.com/reel/'],
];

const sites = [
	{
		handler: ytdl,
		regex: /(?<!!)http(s)?:\/\/(www\.)?(?<site>facebook).com\/[a-z0-9._-]+\/videos\/(?<id>[a-z0-9_-]+)/i,
	},
	{
		handler: ytdl,
		regex: /(?<!!)http(s)?:\/\/(?<site>fb)\.watch\/(?<id>[a-z0-9_-]+)/i,
	},
	{
		handler: ytdl,
		regex: /(?<!!)http(s)?:\/\/(www\.)?(?<site>ifunny).co\/video\/(?<id>[a-z0-9_-]+)/i,
	},
	{
		handler: ytdl,
		regex: /(?<!!)http(s)?:\/\/(www\.)?(?<site>instagram).com\/(p|reel)\/(?<id>[a-z0-9_-]+)/i,
	},
	{
		handler: ytdl,
		regex: /(?<!!)http(s)?:\/\/(www\.)?(?<site>instagram).com\/stories\/[a-z0-9_-]+\/(?<id>[0-9]+)/i,
	},
	{
		handler: ytdl,
		regex: /(?<!!)http(s)?:\/\/(www\.)?(?<site>reddit).com\/r\/[a-z0-9._-]+\/comments\/(?<id>[a-z0-9]+)/i,
	},
	{
		handler: ytdl,
		regex: /(?<!!)http(s)?:\/\/(www\.)?(?<site>tiktok).com\/((@[a-z0-9._-]+\/video\/)|t\/)(?<id>[a-z0-9_-]+)/i,
	},
	{
		handler: ytdl,
		regex: /(?<!!)http(s)?:\/\/vm\.(?<site>tiktok).com\/(?<id>[a-z0-9_-]+)/i,
	},
	{
		handler: ytdl,
		regex: /(?<!!)http(s)?:\/\/(www\.)?(?<site>twitter).com\/[a-z0-9._-]+\/status\/(?<id>[a-z0-9_-]+)/i,
	},
];

function rewrite(content) {
	for (const rewrite of rewrites) content = content.replace(rewrite[0], rewrite[1]);
	return content;
}

function getFirstSite(content) {
	content = rewrite(content);

	for (const { handler, regex } of sites) {
		const data = regex.exec(content);
		if (data) {
			return {
				data,
				handler,
			};
		}
	}

	return null;
}

module.exports = {
	getFirstSite,
	rewrite,
};