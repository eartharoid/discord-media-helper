const { spawn } = require('child_process');
const { resolve } = require('path');

/**
 * @param {import("discord.js").Message} message
 * @param {RegExpExecArray } data
 */
function ytdl(message, data, attempt = 0)  {
	const { client } = message;
	const proxy = client.proxies.getProxy();
	if (!proxy) return client.log.error('No proxies available');
	let file;
	const args = [
		data[0],
		'-P',
		resolve(client.config.files),
		'-o',
		`${data.groups.id}.${data.groups.site}.%(ext)s`,
		'-S',
		'codec:h264',
		'--proxy',
		proxy,
	];

	const child = spawn(client.config.ytdl.bin, args);

	child.stdout.on('data', line => {
		const str = line.toString().replace(/\n$/, '');
		client.log.info.ytdl(str);
		const regex = new RegExp(`${data.groups.id}\\.${data.groups.site}\\.[a-z0-9]+(\\s|$)`);
		const match = str.match(regex);
		if (match) file = match[0];
	});

	child.stderr.on('data', line => {
		let str = line.toString().replace(/\n$/, '');
		let level = 'error';
		if (str.startsWith('WARNING:')) {
			level = 'warn';
			str = str.substring(9);
		}
		client.log[level].ytdl(str);

		// getaddrinfo failed, timed out connection closed without response etc, or rate limit
		if (str.includes('urlopen error') || str.includes('rate-limit')) {
			if (str.includes('urlopen error')) { // don't report proxy for rate limit
				client.proxies.reportProxy(proxy);
			}

			if (attempt === 5) {
				client.log.warn(`Failed to download ${data.groups.id}.${data.groups.site} after 5 attempts, giving up`);
			} else {
				client.log.info(`Retrying download for ${data.groups.id}.${data.groups.site}`);
				ytdl(message, data, attempt + 1);
			}

		}
	});

	child.on('close', async code => {
		client.log.info.ytdl('Exited with code', code);

		if (file) {
			try {
				message.suppressEmbeds(); // don't await, not important
				await message.reply(client.config.host + file);
			} catch (error) {
				client.log.error(error);
			}
		} else {
			return client.log.warn('File is missing');
		}
	});
}

module.exports = ytdl;