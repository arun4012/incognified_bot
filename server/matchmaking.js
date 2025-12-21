/**
 * In-memory matchmaking manager
 * Supports gender-based matching and typing indicators
 */

import {
    setUserState,
    getUserState,
    clearUserState,
    setUserGender,
    getUserGender,
    USER_STATES,
    incrementChatCount,
    incrementMessageCount,
    markChatStart,
    endChatAndRecordDuration,
    clearSessionReports
} from './userState.js';

// Queue of users waiting for a match: { userId, chatId, gender, preference }
const waitingQueue = [];

// Map of active pairs: userId -> { oderId, partnerChatId }
const activePairs = new Map();

// Map of user chatIds: userId -> chatId
const userChatIds = new Map();

// Callback to send responses (set by commands.js)
let responseCallback = null;

/**
 * Set the callback function for sending responses
 */
export function setResponseCallback(callback) {
    responseCallback = callback;
}

/**
 * Send a response back to the server
 */
function sendResponse(message) {
    if (responseCallback) {
        responseCallback(message);
    }
}

/**
 * Check if two users can match based on gender preferences
 */
function canMatch(user1, user2) {
    // If either has no gender preference, they can match with anyone
    if (!user1.gender || !user2.gender) return true;
    if (!user1.preference || user1.preference === 'any') {
        if (!user2.preference || user2.preference === 'any') return true;
        return user2.preference === user1.gender;
    }
    if (!user2.preference || user2.preference === 'any') {
        return user1.preference === user2.gender;
    }
    // Both have preferences - check if they match each other
    return user1.preference === user2.gender && user2.preference === user1.gender;
}

/**
 * Handle user joining the matchmaking queue
 * @param {string} userId - Telegram user ID
 * @param {string} chatId - Telegram chat ID
 * @param {object} options - { gender, preference } optional gender matching options
 */
export function handleJoin(userId, chatId, options = {}) {
    const { gender, preference } = options;

    // Store chatId for this user
    userChatIds.set(userId, chatId);

    // Check if user is already in an active chat
    if (activePairs.has(userId)) {
        sendResponse({
            type: 'already_chatting',
            userId,
            chatId
        });
        return;
    }

    // Check if user is already waiting
    const existingInQueue = waitingQueue.find(u => u.userId === userId);
    if (existingInQueue) {
        sendResponse({
            type: 'already_waiting',
            userId,
            chatId
        });
        return;
    }

    // Update user state
    setUserState(userId, USER_STATES.SEARCHING, { gender, preference });

    // User data object
    const userData = { userId, chatId, gender, preference };

    // Try to match with someone in queue
    if (waitingQueue.length > 0) {
        // Find first compatible user
        const matchIndex = waitingQueue.findIndex(u =>
            u.userId !== userId && canMatch(userData, u)
        );

        if (matchIndex !== -1) {
            const partner = waitingQueue.splice(matchIndex, 1)[0];

            // Create the pair
            activePairs.set(userId, {
                partnerId: partner.userId,
                partnerChatId: partner.chatId
            });
            activePairs.set(partner.userId, {
                partnerId: userId,
                partnerChatId: chatId
            });

            // Update states to IN_CHAT
            setUserState(userId, USER_STATES.IN_CHAT);
            setUserState(partner.userId, USER_STATES.IN_CHAT);

            // Mark chat start for stats
            markChatStart(userId);
            markChatStart(partner.userId);
            incrementChatCount(userId);
            incrementChatCount(partner.userId);

            // Notify both users
            sendResponse({
                type: 'matched',
                userId,
                chatId,
                partnerId: partner.userId,
                partnerChatId: partner.chatId
            });

            console.log(`Matched: ${userId} <-> ${partner.userId}`);
            return;
        }
    }

    // No match found, add to queue
    waitingQueue.push(userData);

    sendResponse({
        type: 'waiting',
        userId,
        chatId,
        gender,
        preference
    });

    console.log(`User ${userId} added to queue. Queue size: ${waitingQueue.length}`);
}

/**
 * Handle user leaving the chat or queue
 */
export function handleLeave(userId) {
    // Remove from queue if present
    const queueIndex = waitingQueue.findIndex(u => u.userId === userId);
    if (queueIndex !== -1) {
        waitingQueue.splice(queueIndex, 1);
        console.log(`User ${userId} removed from queue`);
    }

    // Remove from active pairs and notify partner
    const pair = activePairs.get(userId);
    if (pair) {
        const { partnerId, partnerChatId } = pair;

        // Record chat duration for stats
        endChatAndRecordDuration(userId);
        endChatAndRecordDuration(partnerId);

        // Clear session reports between these users
        clearSessionReports(userId, partnerId);

        // Remove both from pairs
        activePairs.delete(userId);
        activePairs.delete(partnerId);

        // Update partner state
        setUserState(partnerId, USER_STATES.IDLE);

        // Notify partner
        sendResponse({
            type: 'partner_left',
            userId: partnerId,
            chatId: partnerChatId
        });

        console.log(`Pair broken: ${userId} left, notified ${partnerId}`);
    }

    // Clear user state
    clearUserState(userId);
    userChatIds.delete(userId);
}

/**
 * Handle user skipping to next partner
 */
export function handleNext(userId, chatId) {
    // Get current gender preferences to reuse
    const genderInfo = getUserGender(userId);

    // First, leave current chat
    const pair = activePairs.get(userId);
    if (pair) {
        const { partnerId, partnerChatId } = pair;

        // Record chat duration
        endChatAndRecordDuration(userId);
        endChatAndRecordDuration(partnerId);

        // Clear session reports
        clearSessionReports(userId, partnerId);

        // Remove both from pairs
        activePairs.delete(userId);
        activePairs.delete(partnerId);

        // Update partner state
        setUserState(partnerId, USER_STATES.IDLE);

        // Notify partner they were skipped
        sendResponse({
            type: 'partner_left',
            userId: partnerId,
            chatId: partnerChatId
        });

        console.log(`User ${userId} skipped ${partnerId}`);

        // Send skipped notification only when there was a partner
        sendResponse({
            type: 'skipped',
            userId,
            chatId
        });

        // Now rejoin the queue with same preferences
        handleJoin(userId, chatId, genderInfo || {});
    } else {
        // User wasn't in a chat - check if they were in queue
        const queueIndex = waitingQueue.findIndex(u => u.userId === userId);
        if (queueIndex !== -1) {
            // They were searching, just cancel and go back to menu
            waitingQueue.splice(queueIndex, 1);
            sendResponse({
                type: 'not_in_chat',
                userId,
                chatId
            });
        } else {
            // Not in chat or queue
            sendResponse({
                type: 'not_in_chat',
                userId,
                chatId
            });
        }
    }
}

/**
 * Handle forwarding message/media to partner
 * @param {string} userId - Sender user ID
 * @param {object} messageData - { text, mediaType, fileId, caption }
 */
export function handleMessage(userId, messageData) {
    const chatId = userChatIds.get(userId);

    // Find partner
    const pair = activePairs.get(userId);
    if (!pair) {
        // User not in a chat
        if (chatId) {
            sendResponse({
                type: 'not_in_chat',
                userId,
                chatId
            });
        }
        return;
    }

    const { partnerId, partnerChatId } = pair;

    // Increment message stats
    incrementMessageCount(userId);

    // Forward message/media to partner
    sendResponse({
        type: 'forward_message',
        userId: partnerId,
        chatId: partnerChatId,
        ...messageData,
        fromUserId: userId
    });

    console.log(`Message (${messageData.mediaType || 'text'}) from ${userId} forwarded to ${partnerId}`);
}

/**
 * Handle typing indicator
 * @param {string} userId - User who is typing
 */
export function handleTyping(userId) {
    const pair = activePairs.get(userId);
    if (!pair) return;

    const { partnerId, partnerChatId } = pair;

    // Send typing indicator to partner
    sendResponse({
        type: 'typing',
        userId: partnerId,
        chatId: partnerChatId,
        fromUserId: userId
    });
}

/**
 * Get partner info for a user
 */
export function getPartner(userId) {
    return activePairs.get(userId) || null;
}

/**
 * Check if user is in a chat
 */
export function isInChat(userId) {
    return activePairs.has(userId);
}

/**
 * Check if user is in queue
 */
export function isInQueue(userId) {
    return waitingQueue.some(u => u.userId === userId);
}

/**
 * Reconnect two users who were previously paired
 * @returns {boolean} true if reconnected successfully
 */
export function reconnectPair(userId, partnerId, chatId, partnerChatId) {
    // Check if partner is available (not in chat, not in queue)
    if (activePairs.has(partnerId)) {
        return { success: false, reason: 'partner_busy' };
    }

    // Remove both from queue if present
    const userQueueIndex = waitingQueue.findIndex(u => u.userId === userId);
    if (userQueueIndex !== -1) {
        waitingQueue.splice(userQueueIndex, 1);
    }

    const partnerQueueIndex = waitingQueue.findIndex(u => u.userId === partnerId);
    if (partnerQueueIndex !== -1) {
        waitingQueue.splice(partnerQueueIndex, 1);
    }

    // Store chatIds
    userChatIds.set(userId, chatId);
    userChatIds.set(partnerId, partnerChatId);

    // Create the pair
    activePairs.set(userId, {
        partnerId: partnerId,
        partnerChatId: partnerChatId
    });
    activePairs.set(partnerId, {
        partnerId: userId,
        partnerChatId: chatId
    });

    // Update states
    setUserState(userId, USER_STATES.IN_CHAT);
    setUserState(partnerId, USER_STATES.IN_CHAT);

    // Mark chat start for stats
    markChatStart(userId);
    markChatStart(partnerId);
    incrementChatCount(userId);
    incrementChatCount(partnerId);

    console.log(`Reconnected: ${userId} <-> ${partnerId}`);

    return { success: true };
}

/**
 * Get current status
 */
export function getStatus() {
    return {
        queueSize: waitingQueue.length,
        activePairs: activePairs.size / 2,
        users: userChatIds.size
    };
}

export default {
    setResponseCallback,
    handleJoin,
    handleLeave,
    handleNext,
    handleMessage,
    handleTyping,
    getPartner,
    isInChat,
    isInQueue,
    reconnectPair,
    getStatus
};

