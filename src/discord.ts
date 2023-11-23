// eslint-disable-next-line import/no-extraneous-dependencies
import ms from 'ms';
import {
  ActivityType,
  Client,
  GatewayIntentBits,
} from 'discord.js';
import log from './log.js';
import { resolve } from './resolvers.js';
import { downloadMultiple } from './download.js';

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
  setInterval(setPresence, ms('1h'));
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const urls = resolve(message.content, false);
  if (urls.length === 0) return;
  log.info(`Message ${message.id} from ${message.author.username} contains ${urls.length} processable URLs`);

  message.channel.sendTyping();
  message.suppressEmbeds().catch((error) => {
    log.warn('Failed to suppress embeds');
    log.error(error);
  });

  try {
    const downloaded = await downloadMultiple(urls);
    message.reply({
      allowedMentions: { repliedUser: false },
      content: downloaded.join('\n'),
    });
  } catch (error) {
    log.error(error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isMessageContextMenuCommand()) return;
  if (interaction.commandName !== 'Embed media') return;
  log.info(`${interaction.user.username} requested to embed media from message ${interaction.targetMessage.id}`);
  const urls = resolve(interaction.targetMessage.content, false);
  if (urls.length === 0) {
    interaction.reply({
      content: ':x: There are no valid URLs in this message.',
      ephemeral: true,
    });
  } else {
    log.info(`Message ${interaction.targetMessage.id} from ${interaction.targetMessage.author.username} contains ${urls.length} processable URLs`);
    try {
      await interaction.deferReply();
      const downloaded = await downloadMultiple(urls);
      if (downloaded.length === 0) {
        interaction.editReply({ content: ':x: None of the URLs in this message are supported.' });
      } else {
        interaction.editReply({ content: downloaded.join('\n') }).then(() => {
          interaction.targetMessage.suppressEmbeds().catch((error) => {
            log.warn('Failed to suppress embeds');
            log.error(error);
          });
        }).catch((error) => {
          log.warn('Failed to reply to message');
          log.error(error);
        });
      }
    } catch (error) {
      log.error(error);
    }
  }
});

export default client;
