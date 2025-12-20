/**
 * Express Webhook Server for Telegram Bot
 * Main entry point - handles incoming webhook requests
 * Uses in-memory matchmaking with menu-based UI
 */

import 'dotenv/config';
import express from 'express';
import { extractUserInfo, isCommand, parseCommand } from './utils.js';
import {
    handleStart,
    handleFind,
    handleNext,
    handleStop,
    handleTextMessage,
    handleTypingFromUser,
    handleSettings,
    handleStats,
    handleHelp,
    handleCallbackQuery
} from './commands.js';
import matchmaking from './matchmaking.js';
import { setWebhook, getMe } from './telegram.js';

// Load environment variables
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Validate required environment variables
if (!BOT_TOKEN) {
    console.error('ERROR: BOT_TOKEN environment variable is required');
    process.exit(1);
}

// Create Express app
const app = express();

// Parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    if (req.path !== '/health') {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    }
    next();
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    const status = matchmaking.getStatus();
    res.json({
        status: 'ok',
        matchmaking: status,
        timestamp: new Date().toISOString()
    });
});

/**
 * Root endpoint - basic info
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Incognified Bot',
        description: 'Anonymous Telegram Chat Bot',
        version: '2.0.0',
        features: ['Menu UI', 'Gender Matching', 'Typing Indicators', 'Stats', 'Reports'],
        endpoints: {
            health: '/health',
            webhook: '/webhook (POST)'
        }
    });
});

/**
 * Telegram Webhook endpoint
 * Receives all updates from Telegram
 */
app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;

        // Immediately respond to Telegram (prevents timeout)
        res.sendStatus(200);

        // Extract user info
        const userInfo = extractUserInfo(update);
        if (!userInfo) {
            console.log('No user info in update');
            return;
        }

        const { id: userId, chatId } = userInfo;
        const message = update.message;

        if (!message) {
            // Check for callback_query (inline button clicks)
            if (update.callback_query) {
                await handleCallbackQuery(update.callback_query);
            }
            return;
        }

        // Check if it's a command
        if (message.text && isCommand(message.text)) {
            const { command } = parseCommand(message.text);

            switch (command) {
                case '/start':
                    await handleStart(chatId, userId);
                    break;
                case '/find':
                    await handleFind(chatId, userId);
                    break;
                case '/next':
                    await handleNext(chatId, userId);
                    break;
                case '/stop':
                    await handleStop(chatId, userId);
                    break;
                case '/settings':
                    await handleSettings(chatId, userId);
                    break;
                case '/stats':
                    await handleStats(chatId, userId);
                    break;
                case '/help':
                    await handleHelp(chatId, userId);
                    break;
                default:
                    // Unknown command - treat as text message (might be menu button)
                    await handleTextMessage(message, userId, chatId);
                    break;
            }
        } else if (message.text) {
            // Regular text message or menu button - unified handler
            // Also trigger typing indicator for partner
            handleTypingFromUser(userId);
            await handleTextMessage(message, userId, chatId);
        }

    } catch (error) {
        console.error('Webhook error:', error);
        // Don't throw - already sent 200 response
    }
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

/**
 * Start the server
 */
async function start() {
    try {
        // Get bot info
        const botInfo = await getMe();
        if (botInfo) {
            console.log(`Bot: @${botInfo.username} (${botInfo.first_name})`);
        }

        console.log('Using in-memory matchmaking');

        // Set webhook if URL is provided
        if (WEBHOOK_URL) {
            console.log('Setting webhook...');
            await setWebhook(WEBHOOK_URL);
        } else {
            console.log('WEBHOOK_URL not set - skipping webhook configuration');
            console.log('Set WEBHOOK_URL environment variable for production');
        }

        // Start Express server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('Ready to receive webhook updates');
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down...');
    process.exit(0);
});

// Start the server
start();
