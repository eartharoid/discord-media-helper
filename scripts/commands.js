// https://discordjs.guide/creating-your-bot/command-deployment.html

/* eslint-disable no-console */

import { config } from 'dotenv';
import {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	REST,
	Routes,
  InteractionContextType,
  ApplicationIntegrationType,
  SlashCommandBuilder,
} from 'discord.js'

config();

const commands = [
	new ContextMenuCommandBuilder()
		.setName('Embed media')
		.setType(ApplicationCommandType.Message)
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
    ])
		.toJSON(),
  new SlashCommandBuilder()
    .setName('embed-media')
    .setDescription('Embed a video from the given URL')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('The URL of a video on TikTok, Instagram, etc')
        .setRequired(true)
    )
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
    ])
    .toJSON(),
];

console.log(commands);

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

console.log(`Updating ${commands.length} application (/) commands.`);
await rest.put(
  Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
  { body: commands },
);

console.log(`Success.`);