const { spawn } = require('child_process');
const { resolve } = require('path');

/**
 * @param {import("discord.js").Message} message
 * @param {RegExpExecArray } data
 */
module.exports = (message, data) => {
	const { client } = message;

	let file;
	const args = [
		data[0],
		'-P',
		resolve(client.config.files),
		'-o',
		`${data.groups.id}.${data.groups.site}.%(ext)s`,
		'-S',
		'codec:h264',
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
};