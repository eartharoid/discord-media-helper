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
- A local web server to serve files
- `yt-dlp`
- `ffmpeg`

### Installation

Clone the repository:
```
git clone https://github.com/eartharoid/discord-mediahelper.git bot && cd bot
```

Then create a `.env` file with the following contents:
```
DISCORD_TOKEN=
DOWNLOAD_DIR=
HOST=
MAX_FILE_SIZE=50M
```

> e.g.
> ```bash
> echo "DISCORD_TOKEN=\nDOWNLOAD_DIR=\nHOST=\nMAX_FILE_SIZE=50M" > .env
> ```

Create a Discord application and bot **with the message content privileged intent enabled** and paste the token into the `.env` file.

Also, set the other environment variables:

- `DOWNLOAD_DIR`: the directory which is served by a web server (e.g. `/var/www/html/videos`) where videos will be downloaded to
- `HOST`: the web server URL, which must end with a `/` (e.g. `https://example.com/videos/`)

Create the config files:
```bash
mkdir config && touch config/.netrc && touch config cookies.txt && touch config/proxies.txt
```

Install Node.js dependencies:
```bash
npm i
```

Download `yt-dlp`:
```bash
mkdir bin && curl -o bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
```

And then [install `ffmpeg` globally](https://www.ffmpeg.org/download.html).

### Avoiding rate limits

#### Proxies

> **Warning** It is likely better to use authentication, with at most a few proxies.

Add proxy addresses to `config/proxies.txt`, one per line

> e.g.
> ```
> 12.345.678.90:8900
> 23.456.789.123:7000
> ```

#### Authentication

##### `.netrc`

Refer to the [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp#authentication-with-netrc-file).

##### `cookies.txt` (recommended)

1. Log into a supported website **in a Chromium-based browser**
2. Open the developer tools (F12)
3. Go to *Application* > *Cookies* and select the domain
4. Select and copy the data in the table
5. Paste it into a temporary file, e.g. `in.txt`
6. Run [`node scripts/cookies in.txt >> cookies.txt`](https://github.com/dandv/convert-chrome-cookies-to-netscape-format) to correctly format the cookies
