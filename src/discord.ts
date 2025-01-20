// eslint-disable-next-line import/no-extraneous-dependencies
import ms from 'ms';
import {
  ActivityType,
  ActionRowBuilder,
  Client,
  GatewayIntentBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType
} from 'discord.js';
import log from './log.js';
import { resolve } from './resolvers.js';
import { retrieveMultiple } from './retrieve.js';
import formatRetrieved from './fmt.js';
import type { MediaOptions } from './types.js';

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
  if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Embed media') {
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
  } else if (interaction.isChatInputCommand() && interaction.commandName === 'embed-media') {
    log.info(`${interaction.user.username} requested to embed media with interaction ${interaction.id}`);
    const urls = resolve(interaction.options.getString('url') || '', true);
    try {
      if (urls.length === 0) {
        await interaction.reply({
          content: ':x: There are no valid URLs in this message.',
          ephemeral: true,
        });
      } else {
        log.info(`Interaction ${interaction.id} from ${interaction.user.username} contains ${urls.length} processable URLs`);
        
        // Create select menu for options
        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('media_options')
              .setPlaceholder('Select download options')
              .addOptions([
                {
                  label: 'Video (Best Quality)',
                  description: 'Download video in best available quality',
                  value: 'video_best',
                },
                {
                  label: 'Video (1080p)',
                  description: 'Download video in 1080p',
                  value: 'video_1080',
                },
                {
                  label: 'Video (720p)',
                  description: 'Download video in 720p',
                  value: 'video_720',
                },
                {
                  label: 'Video (480p)',
                  description: 'Download video in 480p',
                  value: 'video_480',
                },
                {
                  label: 'Audio (MP3)',
                  description: 'Extract audio in MP3 format',
                  value: 'audio_mp3',
                },
                {
                  label: 'Audio (M4A)',
                  description: 'Extract audio in M4A format',
                  value: 'audio_m4a',
                },
                {
                  label: 'Audio (WAV)',
                  description: 'Extract audio in WAV format',
                  value: 'audio_wav',
                },
                {
                  label: 'Audio (OGG)',
                  description: 'Extract audio in OGG format',
                  value: 'audio_ogg',
                },
              ]),
          );

        await interaction.reply({
          content: 'Choose download options:',
          components: [row],
          ephemeral: true
        });

        try {
          if (!interaction.channel) {
            throw new Error('Channel not found');
          }

          const filter = (i: StringSelectMenuInteraction) =>
            i.customId === 'media_options' && i.user.id === interaction.user.id;

          const response = await interaction.channel.awaitMessageComponent({
            filter,
            time: 30000,
            componentType: ComponentType.StringSelect
          });

          if (response.isStringSelectMenu()) {
            // Parse selected option
            const [type, format] = response.values[0].split('_') as ['video' | 'audio', string];
            const options: MediaOptions = type === 'video'
              ? { quality: format as MediaOptions['quality'] }
              : { audioOnly: true, audioFormat: format as MediaOptions['audioFormat'] };

            await response.update({
              content: '⚙️ Processing...',
              components: []
            });

            const downloaded = await retrieveMultiple(urls, 'interaction', options);

            if (downloaded.length === 0) {
              log.info('None of the processable URLs were successfully retrieved');
              await response.editReply({
                content: '❌ Sorry, we couldn\'t retrieve any media from these URLs.'
              });
            } else {
              await response.editReply({
                content: formatRetrieved(downloaded) +
                  (options.audioOnly ? '\n🎵 Audio Only' : '') +
                  (options.quality ? `\n📹 Quality: ${options.quality}` : '')
              });
            }
          }
        } catch (error: unknown) {
          if (error instanceof Error && 'code' in error && error.code === 'INTERACTION_COLLECTOR_ERROR') {
            await interaction.editReply({
              content: '⏰ Selection timed out. Please try again.',
              components: []
            });
          } else {
            log.error(error);
            await interaction.editReply({
              content: '❌ An error occurred. Please try again.',
              components: []
            });
          }
        }
      }
    } catch (error) {
      log.error(error);
    }
  }
});

export default client;
