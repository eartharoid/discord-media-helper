# MediaHelper

This bot watches chat for video links and replies to messages containing supported links with an embedded video,
so you don't need to click the link to watch shared videos.

Idea and hosting by @RTCFlyer.

[**Click here to add MediaHelper**](https://discord.com/oauth2/authorize?client_id=1026547091121655808&permissions=274878032960&scope=bot%20applications.commands)

## Supported links

- Facebook
- Instagram
- Reddit
- TikTok
- Twitter

## Self-hosting

**Requires message content privileged intent to be enabled** 

1. Create a `.env` file and paste `DISCORD_TOKEN=` followed by the token
2. Download [yt-dlp](https://github.com/yt-dlp/yt-dlp)
3. edit `config.js` (directory, host, and executable)
4. `npm i`
5. `node .` (daemonize it if you're smart)
