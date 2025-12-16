/**
 * Utility functions for rate limiting and message validation
 * All state is kept in memory - no persistence
 */

// Rate limiter configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const MAX_MESSAGES_PER_WINDOW = 20; // Max messages per window

// In-memory rate limit storage: userId -> { count, windowStart }
const rateLimitStore = new Map();

/**
 * Check if user has exceeded rate limit
 * @param {string} userId - Telegram user ID
 * @returns {boolean} - True if rate limited, false otherwise
 */
export function isRateLimited(userId) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit) {
    // First message from this user
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return false;
  }

  // Check if window has expired
  if (now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Reset window
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return false;
  }

  // Increment count and check limit
  userLimit.count++;
  
  if (userLimit.count > MAX_MESSAGES_PER_WINDOW) {
    return true;
  }

  return false;
}

/**
 * Reset rate limit for a user (e.g., when they leave)
 * @param {string} userId - Telegram user ID
 */
export function resetRateLimit(userId) {
  rateLimitStore.delete(userId);
}

/**
 * Validate incoming message
 * @param {object} message - Telegram message object
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateMessage(message) {
  if (!message) {
    return { valid: false, error: 'Empty message received' };
  }

  // Check if it's a text message
  if (!message.text) {
    return { valid: false, error: 'Only text messages are supported. Please send text only.' };
  }

  // Check for empty text
  if (message.text.trim().length === 0) {
    return { valid: false, error: 'Please send a non-empty message' };
  }

  // Check message length (prevent abuse)
  if (message.text.length > 4096) {
    return { valid: false, error: 'Message too long. Please keep messages under 4096 characters.' };
  }

  return { valid: true };
}

/**
 * Extract user info from Telegram update
 * @param {object} update - Telegram update object
 * @returns {object|null} - User info or null
 */
export function extractUserInfo(update) {
  const message = update.message || update.edited_message;
  
  if (!message || !message.from) {
    return null;
  }

  return {
    id: message.from.id.toString(),
    chatId: message.chat.id.toString(),
    firstName: message.from.first_name || 'Anonymous'
  };
}

/**
 * Check if message is a command
 * @param {string} text - Message text
 * @returns {boolean}
 */
export function isCommand(text) {
  return text && text.startsWith('/');
}

/**
 * Parse command from message text
 * @param {string} text - Message text
 * @returns {{ command: string, args: string }}
 */
export function parseCommand(text) {
  if (!text || !text.startsWith('/')) {
    return { command: '', args: '' };
  }

  const parts = text.split(' ');
  const command = parts[0].toLowerCase().replace('@', '').split('@')[0]; // Handle @botname suffix
  const args = parts.slice(1).join(' ');

  return { command, args };
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  
  for (const [userId, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(userId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

export default {
  isRateLimited,
  resetRateLimit,
  validateMessage,
  extractUserInfo,
  isCommand,
  parseCommand,
  cleanupRateLimits
};
