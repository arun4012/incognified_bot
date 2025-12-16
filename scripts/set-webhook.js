/**
 * Helper script to set Telegram webhook
 * Run with: node scripts/set-webhook.js
 */

import 'dotenv/config';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) {
    console.error('ERROR: BOT_TOKEN environment variable is required');
    process.exit(1);
}

if (!WEBHOOK_URL) {
    console.error('ERROR: WEBHOOK_URL environment variable is required');
    console.error('Example: WEBHOOK_URL=https://your-app.railway.app/webhook');
    process.exit(1);
}

async function setWebhook() {
    console.log('Setting webhook to:', WEBHOOK_URL);

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: WEBHOOK_URL,
                    allowed_updates: ['message'],
                    drop_pending_updates: true
                })
            }
        );

        const data = await response.json();

        if (data.ok) {
            console.log('✅ Webhook set successfully!');
            console.log('Description:', data.description);
        } else {
            console.error('❌ Failed to set webhook:', data.description);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

setWebhook();
