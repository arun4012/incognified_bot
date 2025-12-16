/**
 * Command handlers for Telegram bot
 * Handles /start, /find, /next, /stop and text messages
 * Uses local matchmaking for development, PartyKit for production
 */

import { sendMessage, messages } from './telegram.js';
import matchmaking from './matchmaking.js';
import { isRateLimited, validateMessage } from './utils.js';

// Set up matchmaking response handler
matchmaking.setResponseCallback(handleMatchmakingMessage);

/**
 * Handle /start command
 * @param {string} chatId - Telegram chat ID
 * @param {string} userId - Telegram user ID
 */
export async function handleStart(chatId, userId) {
    await sendMessage(chatId, messages.welcome);
}

/**
 * Handle /find command - join matchmaking queue
 * @param {string} chatId - Telegram chat ID
 * @param {string} userId - Telegram user ID
 */
export async function handleFind(chatId, userId) {
    // Send searching message immediately
    await sendMessage(chatId, messages.searching);

    // Join the matchmaking queue
    matchmaking.handleJoin(userId, chatId);
}

/**
 * Handle /next command - skip current partner
 * @param {string} chatId - Telegram chat ID
 * @param {string} userId - Telegram user ID
 */
export async function handleNext(chatId, userId) {
    // Request to skip and find new partner
    matchmaking.handleNext(userId, chatId);
}

/**
 * Handle /stop command - leave chat
 * @param {string} chatId - Telegram chat ID
 * @param {string} userId - Telegram user ID
 */
export async function handleStop(chatId, userId) {
    // Leave the chat/queue
    matchmaking.handleLeave(userId);

    // Confirm to user
    await sendMessage(chatId, messages.youLeft);
}

/**
 * Handle regular text message - forward to partner
 * @param {object} message - Telegram message object
 * @param {string} userId - Telegram user ID
 * @param {string} chatId - Telegram chat ID
 */
export async function handleTextMessage(message, userId, chatId) {
    // Rate limit check
    if (isRateLimited(userId)) {
        await sendMessage(chatId, messages.rateLimited);
        return;
    }

    // Validate message
    const validation = validateMessage(message);
    if (!validation.valid) {
        await sendMessage(chatId, validation.error || messages.textOnly);
        return;
    }

    // Send to partner via matchmaking
    matchmaking.handleMessage(userId, message.text);
}

/**
 * Process matchmaking response messages
 * Routes responses from matchmaking to appropriate Telegram chats
 * @param {object} message - Message from matchmaking
 */
export async function handleMatchmakingMessage(message) {
    const { type, userId, chatId, text, partnerId, partnerChatId } = message;

    switch (type) {
        case 'matched':
            // Both users matched - notify both
            if (chatId) {
                await sendMessage(chatId, messages.partnerFound);
            }
            if (partnerChatId) {
                await sendMessage(partnerChatId, messages.partnerFound);
            }
            break;

        case 'waiting':
            // User added to queue, already sent "searching" message
            break;

        case 'already_chatting':
            // User tried to /find while already in chat
            if (chatId) {
                await sendMessage(chatId, messages.alreadyInChat);
            }
            break;

        case 'already_waiting':
            // User tried to /find while already in queue
            if (chatId) {
                await sendMessage(chatId, messages.alreadySearching);
            }
            break;

        case 'not_in_chat':
            // User tried to send message without being in a chat
            if (chatId) {
                await sendMessage(chatId, messages.notInChat);
            }
            break;

        case 'partner_left':
            // Partner disconnected or left
            if (chatId) {
                await sendMessage(chatId, messages.partnerLeft);
            }
            break;

        case 'forward_message':
            // Forward message to the target chat
            if (chatId && text) {
                // Send as anonymous message (no sender info)
                await sendMessage(chatId, `💬 ${text}`);
            }
            break;

        case 'skipped':
            // User skipped, now searching again
            if (chatId) {
                await sendMessage(chatId, messages.skipped);
            }
            break;

        case 'error':
            // Generic error
            if (chatId) {
                await sendMessage(chatId, messages.error);
            }
            break;

        default:
            console.log('Unknown matchmaking message type:', type);
    }
}

export default {
    handleStart,
    handleFind,
    handleNext,
    handleStop,
    handleTextMessage,
    handleMatchmakingMessage
};
