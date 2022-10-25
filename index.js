require('dotenv').config();
const config = require('./config');

const Logger = require('leekslazylogger');
const log = new Logger({ namespaces: ['ytdl'] });

process.on('unhandledRejection', error => {
	if (error instanceof Error) log.warn(`Uncaught ${error.name}`);
	log.error(error);
});

const {
	ActivityType,
	Client,
	GatewayIntentBits,
} = require('discord.js');
const client = new Client({
	intents: [
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
	],
});
client.config = config;
client.log = log;

function setPresence() {
	client.user.setActivity({
		name: `${client.guilds.cache.size} servers`,
		type: ActivityType.Watching,
	});
}

client.once('ready', () => {
	log.success('Connected to Discord as', client.user.tag);
	setPresence();
	setInterval(setPresence, 1000 * 60 * 60); // update every hour
});

client.on('messageCreate', message => {
	const sites = Object.entries(config.sites);
	for (const [s, site] of sites) {
		const data = site.regex.exec(message.content);
		if (data) {
			log.info(`${s} match from ${message.author.tag}: ${data.groups.id} (${data[0]})`);
			message.channel.sendTyping();
			try {
				site.handler(message, data);
			} catch (error) {
				log.error(error);
			}
		}
	}
});

client.login();
