require('dotenv').config();
const log = require('./logger');
const {
	ActivityType,
	Client,
	GatewayIntentBits,
} = require('discord.js');
const getFirstSite = require('./sites');

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

log.info('Connecting to Discord...');
client.login();
