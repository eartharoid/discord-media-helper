// eslint-disable-next-line import/no-extraneous-dependencies
import ms from 'ms';
import {
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  CacheType,
  Client,
  GatewayIntentBits,
  Message,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
  Interaction
} from 'discord.js';
import log from './log.js';
import { resolve } from './resolvers.js';
import { retrieveMultiple } from './retrieve.js';
import formatRetrieved from './fmt.js';
import type { MediaOptions, ProcessedMedia } from './types.js';
import env from './env.js';

const DEBUG = env.DEBUG;

function debugLog(...args: any[]) {
  if (DEBUG) {
    log.debug(...args);
  }
}

// Track gallery states and cooldowns
const galleryStates = new Map<string, {
  currentIndex: number;
  items: ProcessedMedia;
  lastInteraction: number;
}>();

const GALLERY_COOLDOWN = 1000; // 1 second cooldown between interactions

/**
 * Create navigation buttons for gallery
 */
function createGalleryButtons(messageId: string, currentIndex: number, total: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`prev_${messageId}`)
        .setLabel('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentIndex === 0),
      new ButtonBuilder()
        .setCustomId(`next_${messageId}`)
        .setLabel('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentIndex === total - 1)
    );
}

/**
 * Update gallery message with new index
 */
async function updateGalleryMessage(messageId: string, interaction: ButtonInteraction<CacheType>) {
  const state = galleryStates.get(messageId);
  if (!state) return;

  const { items: gallery, currentIndex } = state;
  if (!gallery.files || !gallery.total) return;

  // Update file to show
  gallery.file = gallery.files[currentIndex].file;

  // Create updated buttons
  const row = createGalleryButtons(messageId, currentIndex, gallery.total);

  // Update message
  await interaction.update({
    content: formatRetrieved([gallery]),
    components: [row]
  });
}

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
  debugLog(`Received message: ${message.id} from ${message.author.username}`);
  const urls = resolve(message.content, false);
  if (urls.length === 0) return;
  log.info(`Message ${message.id} from ${message.author.username} contains ${urls.length} processable URLs`);
  debugLog(`Resolved URLs:`, urls);
  try {
    message.channel.sendTyping(); // don't await
    debugLog(`Retrieving multiple URLs for message ${message.id}`);
    const downloaded = await retrieveMultiple(urls, 'message', undefined, message.author.id);
    if (downloaded.length === 0) {
      log.info('None of the processable URLs were successfully retrieved');
      debugLog(`No URLs were successfully retrieved for message ${message.id}`);
    } else {
      debugLog(`Successfully retrieved ${downloaded.length} items for message ${message.id}`);
      // Send initial message
      const hasGallery = downloaded.some(item => item.type === 'gallery' && item.files && item.files.length > 1);
      const messageContent = formatRetrieved(downloaded);
      
      // First send without components
      debugLog(`Sending reply for message ${message.id}`);
      const reply = await message.reply({
        allowedMentions: { repliedUser: false },
        content: messageContent
      });

      // If it's a gallery, update with navigation buttons
      if (hasGallery) {
        debugLog(`Updating reply with gallery navigation for message ${message.id}`);
        // Store gallery state
        galleryStates.set(reply.id, {
          currentIndex: 0,
          items: downloaded[0],
          lastInteraction: Date.now()
        });

        // Add navigation buttons
        await reply.edit({
          content: messageContent,
          components: [createGalleryButtons(reply.id, 0, downloaded[0].total ?? 1)]
        });
      }

      message.suppressEmbeds().catch((error) => {
        log.warn('Failed to suppress embeds');
        log.error(error);
        debugLog(`Failed to suppress embeds for message ${message.id}`, error);
      });
    }
  } catch (error) {
    log.error(error);
    debugLog(`Error processing message ${message.id}:`, error);
  }
});

// Handle button interactions for gallery navigation
async function handleGalleryNavigation(interaction: ButtonInteraction<CacheType>) {
  debugLog(`Handling gallery navigation for interaction ${interaction.id}`);
  try {
    const [action, messageId] = interaction.customId.split('_');
    debugLog(`Gallery navigation action: ${action}, messageId: ${messageId}`);
    if ((action === 'prev' || action === 'next') && messageId) {
      const state = galleryStates.get(messageId);
      if (state && state.items.files) {
        const now = Date.now();
        if (now - state.lastInteraction < GALLERY_COOLDOWN) {
          debugLog(`Interaction cooldown for gallery ${messageId}`);
          await interaction.deferUpdate();
          return;
        }
        
        log.info(`Navigating gallery ${messageId} ${action}, current index: ${state.currentIndex}`);
        debugLog(`Gallery state found for message ${messageId}`, state);
        
        // Update current index
        state.currentIndex = action === 'next'
          ? Math.min(state.currentIndex + 1, state.items.files.length - 1)
          : Math.max(state.currentIndex - 1, 0);
        
        log.info(`New index: ${state.currentIndex}`);
        debugLog(`Updated gallery index to ${state.currentIndex}`);
        
        // Update gallery state
        state.lastInteraction = now;
        galleryStates.set(messageId, state);
        
        // Update message with new content
        debugLog(`Updating gallery message for ${messageId}`);
        await updateGalleryMessage(messageId, interaction);
      } else {
        log.warn(`Gallery state not found for message ${messageId}`);
        debugLog(`Gallery state not found for message ${messageId}`);
        await interaction.reply({
          content: '❌ Gallery state not found. Please try the command again.',
          ephemeral: true
        });
      }
    }
  } catch (error) {
    log.error('Error handling gallery navigation:', error);
    debugLog(`Error handling gallery navigation for interaction ${interaction.id}:`, error);
    await interaction.reply({
      content: '❌ Failed to navigate gallery. Please try again.',
      ephemeral: true
    }).catch(() => {
      // If reply fails, try to update
      debugLog(`Failed to reply, attempting to update interaction ${interaction.id}`);
      interaction.update({
        content: '❌ Failed to navigate gallery. Please try again.'
      }).catch(e => {
        log.error('Failed to handle navigation error:', e);
        debugLog(`Failed to handle navigation error for interaction ${interaction.id}:`, e);
      });
    });
  }
}

client.on('interactionCreate', async (interaction) => {
  debugLog(`Interaction created: ${interaction.id}, type: ${interaction.type}`);
  if (interaction.isButton()) {
    debugLog(`Button interaction: ${interaction.customId}`);
    await handleGalleryNavigation(interaction);
  } else if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Embed media') {
    log.info(`${interaction.user.username} requested to embed media from message ${interaction.targetMessage.id}`);
    debugLog(`Context menu command: Embed media, targetMessage: ${interaction.targetMessage.id}`);
    const urls = resolve(interaction.targetMessage.content, true);
    try {
      if (urls.length === 0) {
        debugLog(`No valid URLs found in message ${interaction.targetMessage.id}`);
        await interaction.reply({
          content: ':x: There are no valid URLs in this message.',
          ephemeral: true,
        });
      } else {
        log.info(`Message ${interaction.targetMessage.id} from ${interaction.targetMessage.author.username} contains ${urls.length} processable URLs`);
        debugLog(`Resolving URLs for message ${interaction.targetMessage.id}:`, urls);
        await interaction.deferReply();
        debugLog(`Retrieving multiple URLs for interaction ${interaction.id}`);
        const downloaded = await retrieveMultiple(urls, 'interaction', undefined, interaction.user.id);
        if (downloaded.length === 0) {
          log.info('None of the processable URLs were successfully retrieved');
          debugLog(`No URLs were successfully retrieved for interaction ${interaction.id}`);
          await interaction.editReply({ content: ':x: Sorry, we couldn\'t retrieve any media from these URLs.' });
        } else {
          debugLog(`Successfully retrieved ${downloaded.length} items for interaction ${interaction.id}`);
          // Check for gallery content
          const hasGallery = downloaded.some(item => item.type === 'gallery' && item.files && item.files.length > 1);
          const messageContent = formatRetrieved(downloaded);

          // Send reply with gallery navigation if needed
          debugLog(`Sending reply for interaction ${interaction.id}, hasGallery: ${hasGallery}`);
          const reply = await interaction.editReply({
            content: messageContent,
            components: hasGallery ? [createGalleryButtons(interaction.id, 0, downloaded[0].total ?? 1)] : []
          });

          // Store gallery state if needed
          if (hasGallery) {
            debugLog(`Storing gallery state for interaction ${interaction.id}`);
            galleryStates.set(reply.id, {
              currentIndex: 0,
              items: downloaded[0],
              lastInteraction: Date.now()
            });
          }

          // Suppress original embeds
          debugLog(`Suppressing embeds for message ${interaction.targetMessage.id}`);
          await interaction.targetMessage.suppressEmbeds().catch((error) => {
            log.warn('Failed to suppress embeds');
            log.error(error);
            debugLog(`Failed to suppress embeds for message ${interaction.targetMessage.id}:`, error);
          });
        }
      }
    } catch (error) {
      log.error(error);
      debugLog(`Error processing context menu command for interaction ${interaction.id}:`, error);
    }
  } else if (interaction.isChatInputCommand() && interaction.commandName === 'embed-media') {
    log.info(`${interaction.user.username} requested to embed media with interaction ${interaction.id}`);
    debugLog(`Chat input command: embed-media, interaction: ${interaction.id}`);
    const urls = resolve(interaction.options.getString('url') || '', true);
    try {
      if (urls.length === 0) {
        debugLog(`No valid URLs found in embed-media command for interaction ${interaction.id}`);
        await interaction.reply({
          content: ':x: There are no valid URLs in this message.',
          ephemeral: true,
        });
      } else {
        log.info(`Interaction ${interaction.id} from ${interaction.user.username} contains ${urls.length} processable URLs`);
        debugLog(`Resolving URLs for embed-media command:`, urls);
        await interaction.deferReply();

        // Parse format option if provided
        const formatOption = interaction.options.getString('format');
        let options: MediaOptions | undefined;
        
        if (formatOption) {
          const [type, format] = formatOption.split('_') as ['video' | 'audio', string];
          options = type === 'video'
            ? { quality: format as MediaOptions['quality'] }
            : { audioOnly: true, audioFormat: format as MediaOptions['audioFormat'] };
          debugLog(`Format option provided for interaction ${interaction.id}:`, options);
        }

        debugLog(`Retrieving multiple URLs for interaction ${interaction.id}`);
        const downloaded = await retrieveMultiple(urls, 'interaction', options, interaction.user.id);

        if (downloaded.length === 0) {
          log.info('None of the processable URLs were successfully retrieved');
          debugLog(`No URLs were successfully retrieved for interaction ${interaction.id}`);
          await interaction.editReply({
            content: '❌ Sorry, we couldn\'t retrieve any media from these URLs.'
          });
        } else {
          debugLog(`Successfully retrieved ${downloaded.length} items for interaction ${interaction.id}`);
          await interaction.editReply({
            content: formatRetrieved(downloaded) +
              (options?.audioOnly ? '\n🎵 Audio Only' : '') +
              (options?.quality ? `\n📹 Quality: ${options.quality}` : '')
          });
        }
      }
    } catch (error) {
      log.error(error);
      debugLog(`Error processing embed-media command for interaction ${interaction.id}:`, error);
    }
  }
});

export default client;
