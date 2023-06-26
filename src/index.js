require('dotenv').config();
const log = require('./logger');
const {
	ActivityType,
	Client,
	GatewayIntentBits,
} = require('discord.js');
const { getFirstSite, rewrite } = require('./sites');
const crypto = require('crypto');
const ytdl = require('./handlers/ytdl');

process.on('unhandledRejection', error => {
	if (error instanceof Error) log.warn(`Uncaught ${error.name}`);
	log.error(error);
});

const client = new Client({
	intents: [
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
	],
});

client.once('ready', () => {
	log.success('Connected to Discord as', client.user.tag);

	function setPresence() {
		client.user.setActivity({
			name: `${client.guilds.cache.size} servers`,
			type: ActivityType.Watching,
		});
	}

	setPresence();
	setInterval(setPresence, 1000 * 60 * 60); // update every hour
});

client.on('messageCreate', async message => {
	const site = getFirstSite(message.content);
	if (!site) return;
	const { data, handler } = site;

	log.info(`${data.groups.site} match from ${message.author.tag}: ${data.groups.id} (${data[0]})`);
	message.channel.sendTyping();

	try {
		const file = await handler(data);

		message.suppressEmbeds().catch(error => {
			log.warn('Failed to suppress embeds');
			log.error(error);
		});

		message.reply({
			allowedMentions: { repliedUser: false },
			content: process.env.HOST + file,
		}).catch(error => {
			log.warn('Failed to reply to message');
			log.error(error);
		});
	} catch (error) {
		log.error(error);
	}
});

client.on('interactionCreate', async interaction => {
	if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Embed media') {
		const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/gm;
		const urls = interaction.targetMessage.content.match(regex).map(url => rewrite(url));

		if (urls.length === 0) {
			return interaction.reply({
				content: ':x: There are no valid URLs in this message.',
				ephemeral: true,
			});
		}

		try {
			interaction.deferReply();
			const triable = [];

			for (const url of urls) {
				const site = getFirstSite(url);
				if (site) {
					triable.push(site);
				} else {
					const data = [url];
					data.groups = {
						id: crypto.createHash('md5').update(encodeURIComponent(url)).digest('hex'),
						site: 'unknown',
					};
					triable.push({
						data,
						handler: ytdl,
					});
				}
			}

			log.info(triable);
			const results = await Promise.allSettled(triable.map(site => site.handler(site.data)));
			log.info(results);
			const embeddable = results.filter(result => result.status === 'fulfilled').map(result => process.env.HOST + result.value);

			if (embeddable.length === 0) {
				interaction.editReply({ content: ':x: None of the URLs in this message are supported.' });
			} else {
				interaction.editReply({ content: embeddable.join('\n') }).then(() => {
					interaction.targetMessage.suppressEmbeds().catch(error => {
						log.warn('Failed to suppress embeds');
						log.error(error);
					});
				}).catch(error => {
					log.warn('Failed to reply to message');
					log.error(error);
				});
			}
		} catch (error) {
			log.error(error);
		}
	}
});

log.info('Connecting to Discord...');
client.login();
