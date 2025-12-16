/**
 * PartyKit WebSocket client
 * Maintains persistent connection to the matchmaking room
 * Handles reconnection and message routing
 */

import WebSocket from 'ws';

const PARTYKIT_HOST = process.env.PARTYKIT_HOST || 'localhost:1999';
const ROOM_NAME = 'matchmaking';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

let ws = null;
let reconnectAttempts = 0;
let messageHandler = null;
let isConnecting = false;

/**
 * Build WebSocket URL for PartyKit
 * @returns {string} WebSocket URL
 */
function getWebSocketUrl() {
    const protocol = PARTYKIT_HOST.includes('localhost') ? 'ws' : 'wss';
    return `${protocol}://${PARTYKIT_HOST}/party/${ROOM_NAME}`;
}

/**
 * Connect to PartyKit room
 * @param {function} onMessage - Callback for incoming messages
 * @returns {Promise<void>}
 */
export function connect(onMessage) {
    if (isConnecting) {
        console.log('Already connecting to PartyKit...');
        return Promise.resolve();
    }

    messageHandler = onMessage;

    return new Promise((resolve, reject) => {
        try {
            isConnecting = true;
            const url = getWebSocketUrl();
            console.log('Connecting to PartyKit:', url);

            ws = new WebSocket(url);

            ws.on('open', () => {
                console.log('Connected to PartyKit matchmaking room');
                reconnectAttempts = 0;
                isConnecting = false;
                resolve();
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log('Received from PartyKit:', message.type);

                    if (messageHandler) {
                        messageHandler(message);
                    }
                } catch (error) {
                    console.error('Failed to parse PartyKit message:', error);
                }
            });

            ws.on('close', () => {
                console.log('Disconnected from PartyKit');
                isConnecting = false;
                ws = null;
                attemptReconnect();
            });

            ws.on('error', (error) => {
                console.error('PartyKit WebSocket error:', error.message);
                isConnecting = false;

                if (reconnectAttempts === 0) {
                    reject(error);
                }
            });

        } catch (error) {
            isConnecting = false;
            console.error('Failed to connect to PartyKit:', error);
            reject(error);
        }
    });
}

/**
 * Attempt to reconnect after disconnect
 */
function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        return;
    }

    reconnectAttempts++;
    console.log(`Reconnecting to PartyKit (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    setTimeout(() => {
        connect(messageHandler).catch((error) => {
            console.error('Reconnection failed:', error.message);
        });
    }, RECONNECT_DELAY_MS);
}

/**
 * Send a message to PartyKit
 * @param {object} message - Message object to send
 * @returns {boolean} - True if sent successfully
 */
export function send(message) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('PartyKit not connected, cannot send message');
        return false;
    }

    try {
        ws.send(JSON.stringify(message));
        return true;
    } catch (error) {
        console.error('Failed to send to PartyKit:', error);
        return false;
    }
}

/**
 * Request to join the matchmaking queue
 * @param {string} oderId - Telegram user ID
 * @param {string} chatId - Telegram chat ID (for sending responses)
 */
export function joinQueue(userId, chatId) {
    return send({
        type: 'join',
        userId,
        chatId
    });
}

/**
 * Request to leave the queue or current chat
 * @param {string} userId - Telegram user ID
 */
export function leave(userId) {
    return send({
        type: 'leave',
        userId
    });
}

/**
 * Request to skip current partner and find new one
 * @param {string} userId - Telegram user ID
 * @param {string} chatId - Telegram chat ID
 */
export function next(userId, chatId) {
    return send({
        type: 'next',
        userId,
        chatId
    });
}

/**
 * Send a message to partner
 * @param {string} userId - Sender's Telegram user ID
 * @param {string} text - Message text
 */
export function sendToPartner(userId, text) {
    return send({
        type: 'message',
        userId,
        text
    });
}

/**
 * Check if connected to PartyKit
 * @returns {boolean}
 */
export function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
}

/**
 * Disconnect from PartyKit
 */
export function disconnect() {
    if (ws) {
        ws.close();
        ws = null;
    }
}

export default {
    connect,
    send,
    joinQueue,
    leave,
    next,
    sendToPartner,
    isConnected,
    disconnect
};
