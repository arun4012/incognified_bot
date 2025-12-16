# 🎭 Incognified Bot

An anonymous 1-to-1 Telegram chat bot with realtime matchmaking powered by PartyKit.

## Features

- 🔒 **Completely Anonymous** - No identity storage, no message persistence
- ⚡ **Realtime Matching** - Instant pairing via WebSocket
- 🆓 **Free Tier Compatible** - Runs on Railway/Render + PartyKit free tiers
- 🛡️ **Abuse Prevention** - Rate limiting, text-only messages

## Architecture

```
Telegram User → Webhook → Express Server ↔ PartyKit Room ↔ Express Server → Telegram User
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with instructions |
| `/find` | Find a random anonymous partner |
| `/next` | Skip current partner, find new one |
| `/stop` | Leave the current chat |

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd Incognified_bot
npm install
```

### 2. Create Telegram Bot

1. Open Telegram, search for `@BotFather`
2. Send `/newbot` and follow prompts
3. Copy your **BOT_TOKEN**
4. Set commands (optional):
   ```
   /setcommands
   start - Start the bot
   find - Find an anonymous partner
   next - Skip to next partner
   stop - Leave current chat
   ```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your BOT_TOKEN
```

### 4. Local Development

**Terminal 1 - PartyKit:**
```bash
npm run party:dev
```

**Terminal 2 - Express Server:**
```bash
npm run dev
```

**Terminal 3 - Expose to Internet (for webhook):**

Since you don't have ngrok, here are free alternatives:

**Option A: localtunnel**
```bash
npx localtunnel --port 3000
```

**Option B: Cloudflare Tunnel**
```bash
# Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
cloudflared tunnel --url http://localhost:3000
```

**Set webhook with your tunnel URL:**
```bash
# PowerShell
$env:BOT_TOKEN="your_token"; $env:WEBHOOK_URL="https://your-tunnel-url/webhook"; node scripts/set-webhook.js
```

## Deployment

### Deploy PartyKit

```bash
npx partykit login
npx partykit deploy
```

Copy the URL (e.g., `incognified-matchmaking.username.partykit.dev`)

### Deploy Express Server (Railway)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Create new project from GitHub repo
4. Add environment variables:
   - `BOT_TOKEN` = your Telegram bot token
   - `PARTYKIT_HOST` = your PartyKit URL (without https://)
   - `WEBHOOK_URL` = (leave empty, Railway will set automatically)
5. Deploy
6. Copy Railway URL and set webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.railway.app/webhook"
   ```

### Deploy to Render (Alternative)

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service from GitHub repo
4. Set environment variables (same as Railway)
5. Deploy and set webhook

## Project Structure

```
Incognified_bot/
├── server/
│   ├── server.js       # Express webhook server
│   ├── telegram.js     # Telegram API wrapper
│   ├── commands.js     # Command handlers
│   ├── partyClient.js  # PartyKit WebSocket client
│   └── utils.js        # Rate limiting, validation
├── party/
│   └── room.js         # PartyKit matchmaking room
├── scripts/
│   └── set-webhook.js  # Webhook setup helper
├── .env.example        # Environment template
├── package.json        # Dependencies
├── partykit.json       # PartyKit config
└── README.md           # This file
```

## How It Works

1. **User sends `/find`** → Express server receives webhook
2. **Server tells PartyKit** → User joins matchmaking queue
3. **Another user sends `/find`** → PartyKit matches them
4. **Both get notified** → "Partner found!"
5. **User sends message** → Express forwards to PartyKit → PartyKit sends to partner's chat

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Telegram bot token | `123456:ABC-DEF...` |
| `WEBHOOK_URL` | Your server's webhook URL | `https://app.railway.app/webhook` |
| `PARTYKIT_HOST` | PartyKit server address | `incognified.user.partykit.dev` |
| `PORT` | Server port (auto-set by hosting) | `3000` |

## Common Issues

| Issue | Solution |
|-------|----------|
| Webhook not receiving | Verify URL ends with `/webhook` |
| 401 Unauthorized | Check BOT_TOKEN is correct |
| PartyKit disconnect | Check PARTYKIT_HOST, ensure deployed |
| Rate limit errors | Wait 60 seconds between message bursts |

## License

MIT
