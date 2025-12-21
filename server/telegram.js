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
 * Send a photo to a chat
 */
export async function sendPhoto(chatId, photoFileId, caption = '') {
    try {
        const body = { chat_id: chatId, photo: photoFileId };
        if (caption) body.caption = caption;

        const response = await fetch(`${TELEGRAM_API_BASE}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        return { success: data.ok, data: data.result };
    } catch (error) {
        console.error('Failed to send photo:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send a video to a chat
 */
export async function sendVideo(chatId, videoFileId, caption = '') {
    try {
        const body = { chat_id: chatId, video: videoFileId };
        if (caption) body.caption = caption;

        const response = await fetch(`${TELEGRAM_API_BASE}/sendVideo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        return { success: data.ok, data: data.result };
    } catch (error) {
        console.error('Failed to send video:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send a sticker to a chat
 */
export async function sendSticker(chatId, stickerFileId) {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/sendSticker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, sticker: stickerFileId })
        });
        const data = await response.json();
        return { success: data.ok, data: data.result };
    } catch (error) {
        console.error('Failed to send sticker:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send a voice message to a chat
 */
export async function sendVoice(chatId, voiceFileId) {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/sendVoice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, voice: voiceFileId })
        });
        const data = await response.json();
        return { success: data.ok, data: data.result };
    } catch (error) {
        console.error('Failed to send voice:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send an animation (GIF) to a chat
 */
export async function sendAnimation(chatId, animationFileId, caption = '') {
    try {
        const body = { chat_id: chatId, animation: animationFileId };
        if (caption) body.caption = caption;

        const response = await fetch(`${TELEGRAM_API_BASE}/sendAnimation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        return { success: data.ok, data: data.result };
    } catch (error) {
        console.error('Failed to send animation:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send a video note (round video) to a chat
 */
export async function sendVideoNote(chatId, videoNoteFileId) {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/sendVideoNote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, video_note: videoNoteFileId })
        });
        const data = await response.json();
        return { success: data.ok, data: data.result };
    } catch (error) {
        console.error('Failed to send video note:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send a document/file to a chat
 */
export async function sendDocument(chatId, documentFileId, caption = '') {
    try {
        const body = { chat_id: chatId, document: documentFileId };
        if (caption) body.caption = caption;

        const response = await fetch(`${TELEGRAM_API_BASE}/sendDocument`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        return { success: data.ok, data: data.result };
    } catch (error) {
        console.error('Failed to send document:', error.message);
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
                allowed_updates: ['message', 'callback_query'], // Receive messages and inline button clicks
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
 * Answer a callback query (required when user clicks inline button)
 * @param {string} callbackQueryId - ID from the callback query
 * @param {string} text - Optional popup text to show
 */
export async function answerCallbackQuery(callbackQueryId, text = '') {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/answerCallbackQuery`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: text
            })
        });

        const data = await response.json();
        return { success: data.ok };
    } catch (error) {
        console.error('Failed to answer callback query:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Edit the inline keyboard of an existing message
 * @param {string} chatId - Chat ID
 * @param {number} messageId - Message ID to edit
 * @param {object} replyMarkup - New inline keyboard
 */
export async function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
    try {
        const response = await fetch(`${TELEGRAM_API_BASE}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: replyMarkup
            })
        });

        const data = await response.json();
        return { success: data.ok, data: data.result };
    } catch (error) {
        console.error('Failed to edit message reply markup:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Edit an existing message's text and keyboard
 * @param {string} chatId - Chat ID
 * @param {number} messageId - Message ID to edit
 * @param {string} text - New message text
 * @param {object} replyMarkup - New inline keyboard (optional)
 */
export async function editMessageText(chatId, messageId, text, replyMarkup = null) {
    try {
        const body = {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'HTML'
        };
        if (replyMarkup) {
            body.reply_markup = replyMarkup;
        }

        const response = await fetch(`${TELEGRAM_API_BASE}/editMessageText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return { success: data.ok, data: data.result };
    } catch (error) {
        console.error('Failed to edit message text:', error.message);
        return { success: false, error: error.message };
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

    selectPreference: `🎯 <b>Who would you like to chat with?</b>

💡 <i>Tip: Set your gender in /settings for better matching!</i>`,

    settings: (typingEnabled, gender) => {
        const genderLabels = { male: '👨 Male', female: '👩 Female', any: '🎲 Anyone' };
        return `⚙️ <b>Settings</b>

👤 Your Gender: ${genderLabels[gender] || '🎲 Anyone'}
🔤 Typing Indicator: ${typingEnabled ? '✅ ON' : '❌ OFF'}

<i>Tap buttons below to change settings.</i>`;
    },

    settingsUpdated: (setting, value) => `✅ ${setting} is now ${value ? 'ON' : 'OFF'}`,

    stats: (stats) => `📊 <b>Your Anonymous Stats</b>

💬 Total Chats: ${stats.chats}
📨 Messages Sent: ${stats.messages}
⏱️ Total Chat Time: ${stats.totalDuration}

<i>Stats are stored locally and reset when bot restarts.</i>`,

    help: `❓ <b>How to use Incognified Bot</b>

🚀 <b>Find Partner</b> - Match with a random stranger
👩👨 <b>Search by Gender</b> - Choose who to match with
⚙️ <b>Settings</b> - Set your gender & typing indicators
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
    sendPhoto,
    sendVideo,
    sendSticker,
    sendVoice,
    sendAnimation,
    sendVideoNote,
    sendDocument,
    sendTypingAction,
    setWebhook,
    deleteWebhook,
    getWebhookInfo,
    getMe,
    answerCallbackQuery,
    editMessageReplyMarkup,
    editMessageText,
    messages
};
