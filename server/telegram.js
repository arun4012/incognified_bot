/**
 * Telegram Bot API utility functions
 * Handles all communication with Telegram servers
 */

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Send a text message to a chat
 * @param {string} chatId - Telegram chat ID
 * @param {string} text - Message text to send
 * @param {object} options - Additional message options
 * @returns {Promise<object>} - Telegram API response
 */
export async function sendMessage(chatId, text, options = {}) {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: options.parseMode || 'HTML',
                disable_web_page_preview: options.disablePreview ?? true,
                ...options
            })
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('Telegram API error:', data.description);
            return { success: false, error: data.description };
        }

        return { success: true, data: data.result };
    } catch (error) {
        console.error('Failed to send message:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Set the webhook URL for the bot
 * @param {string} webhookUrl - Full webhook URL (e.g., https://your-app.railway.app/webhook)
 * @returns {Promise<object>} - Telegram API response
 */
export async function setWebhook(webhookUrl) {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/setWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message'], // Only receive message updates
                drop_pending_updates: true // Ignore old messages on restart
            })
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('Failed to set webhook:', data.description);
            return { success: false, error: data.description };
        }

        console.log('Webhook set successfully:', webhookUrl);
        return { success: true };
    } catch (error) {
        console.error('Failed to set webhook:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Delete the webhook (useful for switching to polling during dev)
 * @returns {Promise<object>} - Telegram API response
 */
export async function deleteWebhook() {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/deleteWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                drop_pending_updates: true
            })
        });

        const data = await response.json();
        return { success: data.ok };
    } catch (error) {
        console.error('Failed to delete webhook:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get webhook info
 * @returns {Promise<object>} - Webhook info
 */
export async function getWebhookInfo() {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/getWebhookInfo`);
        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Failed to get webhook info:', error.message);
        return null;
    }
}

/**
 * Get bot info
 * @returns {Promise<object>} - Bot info
 */
export async function getMe() {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/getMe`);
        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Failed to get bot info:', error.message);
        return null;
    }
}

/**
 * Pre-built message templates
 */
export const messages = {
    welcome: `🎭 <b>Welcome to Incognified Bot!</b>

This is an anonymous 1-to-1 chat bot. You can chat with random strangers completely anonymously.

<b>Commands:</b>
/find - Find a random chat partner
/next - Skip current partner and find new one
/stop - Leave the current chat

Your identity is completely private. Stay safe and be respectful! 💬`,

    searching: `🔍 <b>Searching for a partner...</b>

Please wait while we find someone for you to chat with. This may take a moment.`,

    partnerFound: `🎉 <b>Partner found!</b>

You are now connected with a random stranger. Say hi!

Send /next to find a new partner
Send /stop to leave the chat`,

    partnerLeft: `👋 <b>Your partner has left the chat.</b>

Send /find to connect with someone new.`,

    youLeft: `✅ <b>You have left the chat.</b>

Send /find whenever you want to chat again.`,

    skipped: `⏭️ <b>Skipped!</b>

Looking for a new partner...`,

    notInChat: `❌ You're not currently in a chat.

Send /find to connect with someone.`,

    alreadySearching: `⏳ You're already searching for a partner.

Please wait or send /stop to cancel.`,

    alreadyInChat: `💬 You're already in a chat!

Send /next to find a new partner
Send /stop to leave`,

    rateLimited: `⚠️ <b>Slow down!</b>

You're sending messages too fast. Please wait a moment.`,

    error: `❌ Something went wrong. Please try again.`,

    textOnly: `📝 Only text messages are supported for privacy reasons.`
};

export default {
    sendMessage,
    setWebhook,
    deleteWebhook,
    getWebhookInfo,
    getMe,
    messages
};
