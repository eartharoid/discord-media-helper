# MediaHelper

This bot watches chat for video links and replies to messages containing supported links with an embedded video,
so you don't need to click the link to watch shared videos.

Idea and hosting by [@RTCFlyer](https://github.com/RTCFlyer).

[**Click here to add MediaHelper**](https://discord.com/oauth2/authorize?client_id=1026547091121655808&permissions=274878032960&scope=bot%20applications.commands)

## Supported links

- Facebook
- iFunny
- Instagram
- Reddit
- TikTok
- Twitter

## Self-hosting

### Requirements

- Node.js v18 or higher
- A local webserver to serve static files
- `yt-dlp`
- `ffmpeg`
- https://rapidapi.com/arraybobo/api/instagram-scraper-2022/pricing
- https://rapidapi.com/nguyenmanhict-MuTUtGWD7K/api/auto-download-all-in-one/pricing

### Installation

Clone the repository:
```
git clone https://github.com/eartharoid/discord-mediahelper.git bot && cd bot
```

Then create a `.env` file with the following contents:
```
DISCORD_CLIENT_ID=
DISCORD_TOKEN=
DOWNLOAD_DIR=
HOST=
MAX_FILE_SIZE=50M
RAPID_API_KEY=
```

> e.g.
> ```bash
> echo "DISCORD_CLIENT_ID=\nDISCORD_TOKEN=\nDOWNLOAD_DIR=\nHOST=\nMAX_FILE_SIZE=50M\nRAPID_API_KEY=" > .env
> ```

Create a Discord application and bot **with the message content privileged intent enabled** and paste the token into the `.env` file.

Also, set the other environment variables:

- `DISCORD_CLIENT_ID`: the client ID of the Discord application
- `DOWNLOAD_DIR`: the directory which is served by a web server (e.g. `/var/www/html/videos`) where videos will be downloaded to
- `HOST`: the web server URL, which must end with a `/` (e.g. `https://example.com/videos/`)

Install Node.js dependencies:
```bash
npm i
```
Compile:
```bash
npm run build
```


Download `yt-dlp`:
```bash
mkdir bin && curl -o bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
```

And then [install `ffmpeg` globally](https://www.ffmpeg.org/download.html).

Finally, register the commands:
```bash
node scripts/commands
```