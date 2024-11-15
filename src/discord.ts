// eslint-disable-next-line import/no-extraneous-dependencies
import ms from 'ms';
import {
  ActivityType,
  Client,
  GatewayIntentBits,
} from 'discord.js';
import log from './log.js';
import { resolve } from './resolvers.js';
import { retrieveMultiple } from './retrieve.js';
import formatRetrieved from './fmt.js';

const client = new Client({
  intents: [
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// eslint-disable-next-line no-shadow
client.once('ready', (client) => {
  log.success('Connected to Discord as', client.user.tag);
  function setPresence() {
    client.user.setActivity({
      name: `${client.guilds.cache.size} servers`,
      type: ActivityType.Watching,
    });
  }
  setPresence();
  setInterval(setPresence, ms('1h'));
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const urls = resolve(message.content, false);
  if (urls.length === 0) return;
  log.info(`Message ${message.id} from ${message.author.username} contains ${urls.length} processable URLs`);
  try {
    message.channel.sendTyping(); // don't await
    const downloaded = await retrieveMultiple(urls, 'message');
    if (downloaded.length === 0) {
      log.info('None of the processable URLs were successfully retrieved');
    } else {
      message.reply({
        allowedMentions: { repliedUser: false },
        content: formatRetrieved(downloaded),
      });
      message.suppressEmbeds().catch((error) => {
        log.warn('Failed to suppress embeds');
        log.error(error);
      });
    }
  } catch (error) {
    log.error(error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isMessageContextMenuCommand()) return;
  if (interaction.commandName !== 'Embed media') return;
  log.info(`${interaction.user.username} requested to embed media from message ${interaction.targetMessage.id}`);
  const urls = resolve(interaction.targetMessage.content, true);
  try {
    if (urls.length === 0) {
      await interaction.reply({
        content: ':x: There are no valid URLs in this message.',
        ephemeral: true,
      });
    } else {
      log.info(`Message ${interaction.targetMessage.id} from ${interaction.targetMessage.author.username} contains ${urls.length} processable URLs`);
      await interaction.deferReply();
      const downloaded = await retrieveMultiple(urls, 'interaction');
      if (downloaded.length === 0) {
        log.info('None of the processable URLs were successfully retrieved');
        await interaction.editReply({ content: ':x: Sorry, we couldn\'t retrieve any media from these URLs.' });
      } else {
        await Promise.all([
          interaction.editReply({ content: formatRetrieved(downloaded) }),
          interaction.targetMessage.suppressEmbeds().catch((error) => {
            log.warn('Failed to suppress embeds');
            log.error(error);
          }),
        ]);
      }
    }
  } catch (error) {
    log.error(error);
  }
});

export default client;
