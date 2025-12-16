/**
 * In-memory matchmaking manager
 * Used for local development when PartyKit isn't available
 * Same logic as party/room.js but runs in-process
 */

// Queue of users waiting for a match: { oderId, chatId }
const waitingQueue = [];

// Map of active pairs: userId -> { partnerId, partnerChatId }
const activePairs = new Map();

// Map of user chatIds: userId -> chatId
const userChatIds = new Map();

// Callback to send responses (set by server.js)
let responseCallback = null;

/**
 * Set the callback function for sending responses
 * @param {function} callback - Function to call with response messages
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
 * Handle user joining the matchmaking queue
 * @param {string} userId - Telegram user ID
 * @param {string} chatId - Telegram chat ID
 */
export function handleJoin(userId, chatId) {
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

    // Try to match with someone in queue
    if (waitingQueue.length > 0) {
        // Find first user that isn't the same person (prevent self-pairing)
        const matchIndex = waitingQueue.findIndex(u => u.userId !== userId);

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
    waitingQueue.push({ userId, chatId });

    sendResponse({
        type: 'waiting',
        userId,
        chatId
    });

    console.log(`User ${userId} added to queue. Queue size: ${waitingQueue.length}`);
}

/**
 * Handle user leaving the chat or queue
 * @param {string} userId - Telegram user ID
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

        // Remove both from pairs
        activePairs.delete(userId);
        activePairs.delete(partnerId);

        // Notify partner
        sendResponse({
            type: 'partner_left',
            userId: partnerId,
            chatId: partnerChatId
        });

        console.log(`Pair broken: ${userId} left, notified ${partnerId}`);
    }

    // Remove chatId
    userChatIds.delete(userId);
}

/**
 * Handle user skipping to next partner
 * @param {string} userId - Telegram user ID
 * @param {string} chatId - Telegram chat ID
 */
export function handleNext(userId, chatId) {
    // First, leave current chat
    const pair = activePairs.get(userId);
    if (pair) {
        const { partnerId, partnerChatId } = pair;

        // Remove both from pairs
        activePairs.delete(userId);
        activePairs.delete(partnerId);

        // Notify partner they were skipped
        sendResponse({
            type: 'partner_left',
            userId: partnerId,
            chatId: partnerChatId
        });

        console.log(`User ${userId} skipped ${partnerId}`);
    }

    // Remove from queue if they were waiting
    const queueIndex = waitingQueue.findIndex(u => u.userId === userId);
    if (queueIndex !== -1) {
        waitingQueue.splice(queueIndex, 1);
    }

    // Send skipped notification
    sendResponse({
        type: 'skipped',
        userId,
        chatId
    });

    // Now rejoin the queue
    handleJoin(userId, chatId);
}

/**
 * Handle forwarding message to partner
 * @param {string} userId - Sender's user ID
 * @param {string} text - Message text
 */
export function handleMessage(userId, text) {
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

    // Forward message to partner
    sendResponse({
        type: 'forward_message',
        userId: partnerId,
        chatId: partnerChatId,
        text,
        fromUserId: userId
    });

    console.log(`Message from ${userId} forwarded to ${partnerId}`);
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
    getStatus
};
