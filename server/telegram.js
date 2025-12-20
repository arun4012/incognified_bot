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
 * Send a message with a Reply Keyboard
 * @param {string} chatId - Telegram chat ID
 * @param {string} text - Message text to send
 * @param {object} keyboard - Reply keyboard object
 * @param {object} options - Additional message options
 * @returns {Promise<object>} - Telegram API response
 */
export async function sendMessageWithKeyboard(chatId, text, keyboard, options = {}) {
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
                reply_markup: keyboard,
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
        console.error('Failed to send message with keyboard:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send typing action (shows "typing..." indicator)
 * @param {string} chatId - Telegram chat ID
 * @returns {Promise<object>} - Telegram API response
 */
export async function sendTypingAction(chatId) {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/sendChatAction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                action: 'typing'
            })
        });

        const data = await response.json();
        return { success: data.ok };
    } catch (error) {
        console.error('Failed to send typing action:', error.message);
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

export const messages = {
    welcome: `🎭 <b>Welcome to Incognified Bot!</b>

Chat anonymously with random strangers. Your identity is completely private.

Use the menu below to get started! 👇`,

    searching: `🔍 <b>Searching for a partner...</b>

Please wait while we find someone for you.`,

    searchingGender: (gender, pref) => `🔍 <b>Searching for a partner...</b>

Your gender: ${gender}
Looking for: ${pref}

Please wait...`,

    partnerFound: `🎉 <b>Partner found!</b>

You are now connected with a random stranger. Say hi!

Use the buttons below to navigate.`,

    partnerLeft: `👋 <b>Your partner has left the chat.</b>

Tap "🚀 Find Partner" to chat with someone new.`,

    youLeft: `✅ <b>You have left the chat.</b>

Tap "🚀 Find Partner" when you want to chat again.`,

    skipped: `⏭️ <b>Skipped!</b>

Looking for a new partner...`,

    notInChat: `❌ You're not currently in a chat.

Tap "🚀 Find Partner" to connect with someone.`,

    alreadySearching: `⏳ You're already searching for a partner.

Please wait or tap "🛑 Stop Chat" to cancel.`,

    alreadyInChat: `💬 You're already in a chat!

Use the buttons to skip or leave.`,

    rateLimited: `⚠️ <b>Slow down!</b>

You're sending messages too fast. Please wait a moment.`,

    error: `❌ Something went wrong. Please try again.`,

    textOnly: `📝 Only text messages are supported for privacy reasons.`,

    selectGender: `👤 <b>Select your gender:</b>`,

    selectPreference: `🎯 <b>Who would you like to chat with?</b>`,

    settings: (typingEnabled) => `⚙️ <b>Settings</b>

Typing Indicator: ${typingEnabled ? '✅ ON' : '❌ OFF'}

<i>When ON, your partner will see when you're typing.</i>`,

    settingsUpdated: (setting, value) => `✅ ${setting} is now ${value ? 'ON' : 'OFF'}`,

    stats: (stats) => `📊 <b>Your Anonymous Stats</b>

💬 Total Chats: ${stats.chats}
📨 Messages Sent: ${stats.messages}
⏱️ Total Chat Time: ${stats.totalDuration}

<i>Stats are stored locally and reset when bot restarts.</i>`,

    help: `❓ <b>How to use Incognified Bot</b>

🚀 <b>Find Partner</b> - Match with a random stranger
👩👨 <b>Search by Gender</b> - Choose who to match with
⚙️ <b>Settings</b> - Toggle typing indicators
📊 <b>My Stats</b> - View your chat statistics

<b>While chatting:</b>
⏭️ <b>Next Partner</b> - Skip to someone new
🛑 <b>Stop Chat</b> - Leave the conversation
⚠️ <b>Report</b> - Report inappropriate behavior

<i>Your identity is always private!</i>`,

    reported: `⚠️ <b>Report Submitted</b>

Thank you for helping keep the community safe. You can continue chatting or find a new partner.`,

    alreadyReported: `You have already reported this user in this session.`,

    banned: (minutes) => `🚫 <b>Temporarily Restricted</b>

Due to reports from other users, you cannot search for partners for ${minutes} minutes.

Please be respectful to others.`,

    backToMenu: `👋 Returning to main menu...`
};

export default {
    sendMessage,
    sendMessageWithKeyboard,
    sendTypingAction,
    setWebhook,
    deleteWebhook,
    getWebhookInfo,
    getMe,
    messages
};
