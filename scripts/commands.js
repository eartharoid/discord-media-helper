// https://discordjs.guide/creating-your-bot/command-deployment.html

/* eslint-disable no-console */

import { config } from 'dotenv';
import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';

config();

const commands = [
	 new ContextMenuCommandBuilder()
	   .setName('Embed media')
	   .setType(ApplicationCommandType.Message)
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
    .addStringOption((option) =>
      option
        .setName('format')
        .setDescription('Format to download/convert to')
        .setRequired(false)
        .addChoices(
          { name: 'Video (Best Quality)', value: 'video_best' },
          { name: 'Video (1080p)', value: 'video_1080' },
          { name: 'Video (720p)', value: 'video_720' },
          { name: 'Video (480p)', value: 'video_480' },
          { name: 'Audio (MP3)', value: 'audio_mp3' },
          { name: 'Audio (M4A)', value: 'audio_m4a' },
          { name: 'Audio (WAV)', value: 'audio_wav' },
          { name: 'Audio (OGG)', value: 'audio_ogg' }
        )
    )
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