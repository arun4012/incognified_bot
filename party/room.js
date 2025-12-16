/**
 * PartyKit Matchmaking Room
 * Handles user matching, pair management, and message routing
 * 
 * This runs on PartyKit edge servers, not on your Express server
 */

// State is kept in memory per room instance
// PartyKit handles the persistence automatically

export default class MatchmakingRoom {
    constructor(room) {
        this.room = room;

        // Queue of users waiting for a match
        // Array of { userId, chatId, connection }
        this.waitingQueue = [];

        // Map of active pairs: userId -> { partnerId, partnerChatId }
        this.activePairs = new Map();

        // Map of connections: oderId -> { connection, chatId }
        this.connections = new Map();
    }

    /**
     * Called when a WebSocket connection is established
     */
    onConnect(connection, ctx) {
        console.log('New connection established');
    }

    /**
     * Called when a connection is closed
     */
    onClose(connection) {
        console.log('Connection closed');
        // Note: Individual user cleanup happens via 'leave' messages
        // The Express server maintains the connection, not individual users
    }

    /**
     * Called when a message is received
     */
    onMessage(message, sender) {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data.type, data.userId);

            switch (data.type) {
                case 'join':
                    this.handleJoin(data, sender);
                    break;
                case 'leave':
                    this.handleLeave(data, sender);
                    break;
                case 'next':
                    this.handleNext(data, sender);
                    break;
                case 'message':
                    this.handleMessage(data, sender);
                    break;
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }

    /**
     * Handle user joining the matchmaking queue
     */
    handleJoin(data, sender) {
        const { userId, chatId } = data;

        // Check if user is already in an active chat
        if (this.activePairs.has(userId)) {
            sender.send(JSON.stringify({
                type: 'already_chatting',
                userId,
                chatId
            }));
            return;
        }

        // Check if user is already waiting
        const existingInQueue = this.waitingQueue.find(u => u.userId === userId);
        if (existingInQueue) {
            sender.send(JSON.stringify({
                type: 'already_waiting',
                userId,
                chatId
            }));
            return;
        }

        // Store connection info
        this.connections.set(userId, { connection: sender, chatId });

        // Try to match with someone in queue
        if (this.waitingQueue.length > 0) {
            // Find first user that isn't the same person (prevent self-pairing)
            const matchIndex = this.waitingQueue.findIndex(u => u.userId !== userId);

            if (matchIndex !== -1) {
                const partner = this.waitingQueue.splice(matchIndex, 1)[0];

                // Create the pair
                this.activePairs.set(userId, {
                    partnerId: partner.userId,
                    partnerChatId: partner.chatId
                });
                this.activePairs.set(partner.userId, {
                    partnerId: userId,
                    partnerChatId: chatId
                });

                // Notify both users
                sender.send(JSON.stringify({
                    type: 'matched',
                    userId,
                    chatId,
                    partnerId: partner.userId,
                    partnerChatId: partner.chatId
                }));

                // Also send matched notification for partner
                sender.send(JSON.stringify({
                    type: 'matched',
                    userId: partner.userId,
                    chatId: partner.chatId,
                    partnerId: userId,
                    partnerChatId: chatId
                }));

                console.log(`Matched: ${userId} <-> ${partner.userId}`);
                return;
            }
        }

        // No match found, add to queue
        this.waitingQueue.push({ userId, chatId, connection: sender });

        sender.send(JSON.stringify({
            type: 'waiting',
            userId,
            chatId
        }));

        console.log(`User ${userId} added to queue. Queue size: ${this.waitingQueue.length}`);
    }

    /**
     * Handle user leaving the chat or queue
     */
    handleLeave(data, sender) {
        const { userId } = data;

        // Remove from queue if present
        const queueIndex = this.waitingQueue.findIndex(u => u.userId === userId);
        if (queueIndex !== -1) {
            this.waitingQueue.splice(queueIndex, 1);
            console.log(`User ${userId} removed from queue`);
        }

        // Remove from active pairs and notify partner
        const pair = this.activePairs.get(userId);
        if (pair) {
            const { partnerId, partnerChatId } = pair;

            // Remove both from pairs
            this.activePairs.delete(userId);
            this.activePairs.delete(partnerId);

            // Notify partner
            sender.send(JSON.stringify({
                type: 'partner_left',
                userId: partnerId,
                chatId: partnerChatId
            }));

            console.log(`Pair broken: ${userId} left, notified ${partnerId}`);
        }

        // Remove connection
        this.connections.delete(userId);
    }

    /**
     * Handle user skipping to next partner
     */
    handleNext(data, sender) {
        const { userId, chatId } = data;

        // First, leave current chat
        const pair = this.activePairs.get(userId);
        if (pair) {
            const { partnerId, partnerChatId } = pair;

            // Remove both from pairs
            this.activePairs.delete(userId);
            this.activePairs.delete(partnerId);

            // Notify partner they were skipped
            sender.send(JSON.stringify({
                type: 'partner_left',
                userId: partnerId,
                chatId: partnerChatId
            }));

            console.log(`User ${userId} skipped ${partnerId}`);
        }

        // Remove from queue if they were waiting
        const queueIndex = this.waitingQueue.findIndex(u => u.userId === userId);
        if (queueIndex !== -1) {
            this.waitingQueue.splice(queueIndex, 1);
        }

        // Send skipped notification
        sender.send(JSON.stringify({
            type: 'skipped',
            userId,
            chatId
        }));

        // Now rejoin the queue
        this.handleJoin({ userId, chatId }, sender);
    }

    /**
     * Handle forwarding message to partner
     */
    handleMessage(data, sender) {
        const { userId, text } = data;

        // Find partner
        const pair = this.activePairs.get(userId);
        if (!pair) {
            // User not in a chat
            const conn = this.connections.get(userId);
            if (conn) {
                sender.send(JSON.stringify({
                    type: 'not_in_chat',
                    userId,
                    chatId: conn.chatId
                }));
            }
            return;
        }

        const { partnerId, partnerChatId } = pair;

        // Forward message to partner via the Express server
        sender.send(JSON.stringify({
            type: 'forward_message',
            userId: partnerId,
            chatId: partnerChatId,
            text,
            fromUserId: userId
        }));

        console.log(`Message from ${userId} forwarded to ${partnerId}`);
    }

    /**
     * Get room status (for debugging)
     */
    getStatus() {
        return {
            queueSize: this.waitingQueue.length,
            activePairs: this.activePairs.size / 2, // Divide by 2 since we store both directions
            connections: this.connections.size
        };
    }
}
