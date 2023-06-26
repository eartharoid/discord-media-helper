const log = require('../logger');
const proxies = require('../proxies');
const { resolve } = require('path');
const { spawn } = require('child_process');

/**
 * @param {RegExpExecArray} data
 */
function ytdl(data, attempt = 0) {
	const args = [
		data[0],
		'-P',
		resolve(process.env.DOWNLOAD_DIR),
		'-o',
		`${data.groups.id}.${data.groups.site}.%(ext)s`,
		'-S',
		'codec:h264',
		'-f',
		'bv*+ba/b',
		'--max-filesize',
		process.env.MAX_FILE_SIZE,
		'-n',
		'--netrc-location',
		'config/.netrc',
		'--cookies',
		'config/cookies.txt',
	];

	const proxy = proxies.getProxy();
	if (proxy) args.push('--proxy', proxy);
	else log.warn('No proxies available');

	let file;

	const bin = 'bin/yt-dlp' + (process.platform === 'win32' && '.exe' || '');

	log.info('Spawning `%s %s`', bin, args.join(' '));

	return new Promise((resolve, reject) => {
		const child = spawn(bin, args);

		child.stdout.on('data', line => {
			const str = line.toString().replace(/\n$/, '');
			log.info.ytdl(str);
			const regex = new RegExp(`(${data.groups.id}\\.${data.groups.site}\\.[a-z0-9]+)("|\\s|$)`);
			const match = str.match(regex);
			if (match) file = match[1];
		});

		child.stderr.on('data', line => {
			let str = line.toString().replace(/\n$/, '');
			let level = 'error';
			if (str.startsWith('WARNING:')) {
				level = 'warn';
				str = str.substring(9);
			}
			log[level].ytdl(str);

			if (str.includes('Unsupported URL')) return reject(data);

			// getaddrinfo failed, timed out connection closed without response etc, or rate limit
			if (str.includes('urlopen error') || str.includes('rate-limit')) {
				if (str.includes('urlopen error')) { // don't report proxy for rate limit
					proxies.reportProxy(proxy);
				}

				if (attempt === 5) {
					log.warn(`Failed to download ${data.groups.id}.${data.groups.site} after 5 attempts, giving up`);
				} else {
					log.info(`Retrying download for ${data.groups.id}.${data.groups.site}`);
					ytdl(data, attempt + 1);
				}

			}
		});

		child.on('close', async code => {
			log.info.ytdl('Exited with code', code);
			if (file) {
				resolve(file);
			} else {
				reject(new Error('File is missing'));
			}
		});
	});
}

module.exports = ytdl;