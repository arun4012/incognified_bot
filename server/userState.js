/**
 * User state management
 * Handles user settings, stats, reports, and state tracking
 * Settings and stats persist to Redis when available
 */

import {
    getUserSettingsFromRedis,
    saveUserSettingsToRedis,
    getUserStatsFromRedis,
    saveUserStatsToRedis
} from './redis.js';

// User states
export const USER_STATES = {
    IDLE: 'idle',
    SELECTING_GENDER: 'selecting_gender',
    SELECTING_PREFERENCE: 'selecting_preference',
    SEARCHING: 'searching',
    IN_CHAT: 'in_chat',
    CONFIRMING_REPORT: 'confirming_report',
    SETTING_AGE: 'setting_age'
};

// In-memory storage
const userStates = new Map();      // userId -> { state, gender, preference, chatStartTime }
const userSettings = new Map();    // userId -> { typingIndicator: true/false }
const userStats = new Map();       // userId -> { chats, messages, totalDuration }
const reportedUsers = new Map();   // oderId -> { count, lastReportTime, banUntil }
const reportsInSession = new Set(); // Set of `${reporterId}_${reportedId}` to prevent duplicate reports

// Ban configuration
const TEMP_BAN_THRESHOLD = 3;      // Reports needed for 30 min ban
const LONG_BAN_THRESHOLD = 5;      // Reports needed for 24 hour ban
const TEMP_BAN_DURATION = 30 * 60 * 1000;       // 30 minutes
const LONG_BAN_DURATION = 24 * 60 * 60 * 1000;  // 24 hours

// Skipped partner tracking for undo feature
const skippedPartners = new Map(); // userId -> { partnerId, partnerChatId, timestamp }
const UNDO_TIMEOUT = 10 * 1000; // 10 seconds

// Reveal request tracking
const revealRequests = new Map(); // `${userA}_${userB}` (sorted) -> { requesterId, timestamp }

// ============ State Management ============

/**
 * Get user's current state
 */
export function getUserState(userId) {
    return userStates.get(userId) || { state: USER_STATES.IDLE };
}

/**
 * Set user's state
 */
export function setUserState(userId, state, extra = {}) {
    const current = userStates.get(userId) || {};
    userStates.set(userId, { ...current, state, ...extra });
}

/**
 * Clear user's state (reset to idle)
 */
export function clearUserState(userId) {
    userStates.delete(userId);
}

/**
 * Set user's gender and preference
 */
export function setUserGender(userId, gender, preference) {
    const current = userStates.get(userId) || { state: USER_STATES.IDLE };
    userStates.set(userId, { ...current, gender, preference });
}

/**
 * Get user's gender info
 */
export function getUserGender(userId) {
    const state = userStates.get(userId);
    return state ? { gender: state.gender, preference: state.preference } : null;
}

// ============ Settings Management ============

/**
 * Get user settings (from in-memory cache)
 * Settings are loaded from Redis on first interaction via loadUserFromRedis
 */
export function getUserSettings(userId) {
    return userSettings.get(userId) || { typingIndicator: true, gender: 'any' };
}

/**
 * Update user settings (writes to both memory and Redis)
 */
export function updateUserSettings(userId, updates) {
    const current = getUserSettings(userId);
    const newSettings = { ...current, ...updates };
    userSettings.set(userId, newSettings);

    // Persist to Redis in background (fire and forget)
    saveUserSettingsToRedis(userId, newSettings).catch(err => {
        console.error('Failed to save settings to Redis:', err);
    });
}

/**
 * Load user settings from Redis into memory cache
 * Call this when user first interacts
 */
export async function loadUserSettingsFromRedis(userId) {
    try {
        const redisSettings = await getUserSettingsFromRedis(userId);
        if (redisSettings) {
            // Parse if string, otherwise use as-is
            const settings = typeof redisSettings === 'string'
                ? JSON.parse(redisSettings)
                : redisSettings;
            userSettings.set(userId, settings);
            return settings;
        }
    } catch (error) {
        console.error('Failed to load settings from Redis:', error);
    }
    return null;
}

/**
 * Toggle typing indicator setting
 */
export function toggleTypingIndicator(userId) {
    const current = getUserSettings(userId);
    const newValue = !current.typingIndicator;
    updateUserSettings(userId, { typingIndicator: newValue });
    return newValue;
}

/**
 * Set user's gender in settings (persistent)
 */
export function setUserGenderSetting(userId, gender) {
    updateUserSettings(userId, { gender });
}

/**
 * Get user's gender from settings (defaults to 'any')
 */
export function getUserGenderSetting(userId) {
    const settings = getUserSettings(userId);
    return settings.gender || 'any';
}

/**
 * Set user's age in settings
 */
export function setUserAge(userId, age) {
    updateUserSettings(userId, { age });
}

// ============ Stats Management ============

/**
 * Get user stats (from in-memory cache)
 */
export function getUserStats(userId) {
    return userStats.get(userId) || { chats: 0, messages: 0, totalDuration: 0 };
}

/**
 * Update and persist stats helper
 */
function updateAndPersistStats(userId, newStats) {
    userStats.set(userId, newStats);
    saveUserStatsToRedis(userId, newStats).catch(err => {
        console.error('Failed to save stats to Redis:', err);
    });
}

/**
 * Increment chat count
 */
export function incrementChatCount(userId) {
    const current = getUserStats(userId);
    updateAndPersistStats(userId, { ...current, chats: current.chats + 1 });
}

/**
 * Increment message count
 */
export function incrementMessageCount(userId) {
    const current = getUserStats(userId);
    updateAndPersistStats(userId, { ...current, messages: current.messages + 1 });
}

/**
 * Add chat duration (in seconds)
 */
export function addChatDuration(userId, durationMs) {
    const current = getUserStats(userId);
    updateAndPersistStats(userId, { ...current, totalDuration: current.totalDuration + durationMs });
}

/**
 * Load user stats from Redis into memory cache
 */
export async function loadUserStatsFromRedis(userId) {
    try {
        const redisStats = await getUserStatsFromRedis(userId);
        if (redisStats) {
            const stats = typeof redisStats === 'string'
                ? JSON.parse(redisStats)
                : redisStats;
            userStats.set(userId, stats);
            return stats;
        }
    } catch (error) {
        console.error('Failed to load stats from Redis:', error);
    }
    return null;
}

/**
 * Mark chat start time
 */
export function markChatStart(userId) {
    const current = userStates.get(userId) || { state: USER_STATES.IDLE };
    userStates.set(userId, { ...current, chatStartTime: Date.now() });
}

/**
 * End chat and record duration
 */
export function endChatAndRecordDuration(userId) {
    const state = userStates.get(userId);
    if (state && state.chatStartTime) {
        const duration = Date.now() - state.chatStartTime;
        addChatDuration(userId, duration);
        // Clear chat start time
        const { chatStartTime, ...rest } = state;
        userStates.set(userId, rest);
    }
}

/**
 * Format duration for display
 */
export function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// ============ Report Management ============

/**
 * Check if user is banned
 */
export function isUserBanned(userId) {
    const report = reportedUsers.get(userId);
    if (!report || !report.banUntil) {
        return false;
    }
    if (Date.now() > report.banUntil) {
        // Ban expired, clear it
        report.banUntil = null;
        return false;
    }
    return true;
}

/**
 * Get ban remaining time in minutes
 */
export function getBanRemainingTime(userId) {
    const report = reportedUsers.get(userId);
    if (!report || !report.banUntil) return 0;
    const remaining = report.banUntil - Date.now();
    return Math.ceil(remaining / 60000); // Return minutes
}

/**
 * Report a user
 * @returns {{ success: boolean, message: string, alreadyReported?: boolean }}
 */
export function reportUser(reporterId, reportedId) {
    const sessionKey = `${reporterId}_${reportedId}`;

    // Check if already reported in this session
    if (reportsInSession.has(sessionKey)) {
        return { success: false, alreadyReported: true, message: 'You have already reported this user.' };
    }

    // Mark as reported in this session
    reportsInSession.add(sessionKey);

    // Increment report count
    const current = reportedUsers.get(reportedId) || { count: 0 };
    current.count++;
    current.lastReportTime = Date.now();

    // Check for ban thresholds
    if (current.count >= LONG_BAN_THRESHOLD) {
        current.banUntil = Date.now() + LONG_BAN_DURATION;
    } else if (current.count >= TEMP_BAN_THRESHOLD) {
        current.banUntil = Date.now() + TEMP_BAN_DURATION;
    }

    reportedUsers.set(reportedId, current);

    return { success: true, message: 'Report submitted. Thank you for keeping the community safe.' };
}

/**
 * Clear session reports (call when chat ends)
 */
export function clearSessionReports(userId1, userId2) {
    reportsInSession.delete(`${userId1}_${userId2}`);
    reportsInSession.delete(`${userId2}_${userId1}`);
}

// ============ Skipped Partner (Undo) Management ============

/**
 * Save skipped partner for undo feature
 */
export function setSkippedPartner(userId, partnerId, partnerChatId) {
    skippedPartners.set(userId, {
        partnerId,
        partnerChatId,
        timestamp: Date.now()
    });
}

/**
 * Get skipped partner if still valid (within 10 seconds)
 * @returns {object|null} Partner info or null if expired/not found
 */
export function getSkippedPartner(userId) {
    const data = skippedPartners.get(userId);
    if (!data) return null;

    // Check if expired
    if (Date.now() - data.timestamp > UNDO_TIMEOUT) {
        skippedPartners.delete(userId);
        return null;
    }

    return data;
}

/**
 * Clear skipped partner data
 */
export function clearSkippedPartner(userId) {
    skippedPartners.delete(userId);
}


// ============ Reveal Feature ============

/**
 * Generate a pair key for two users (order-independent)
 */
function getPairKey(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
}

/**
 * Set a reveal request from one user to their partner
 */
export function setRevealRequest(requesterId, partnerId, username = null) {
    const key = getPairKey(requesterId, partnerId);
    revealRequests.set(key, { requesterId, username, timestamp: Date.now() });
}

/**
 * Get reveal request between two users
 */
export function getRevealRequest(userId1, userId2) {
    const key = getPairKey(userId1, userId2);
    return revealRequests.get(key) || null;
}

/**
 * Check if user has already sent a reveal request
 */
export function hasUserRequestedReveal(requesterId, partnerId) {
    const request = getRevealRequest(requesterId, partnerId);
    return request && request.requesterId === requesterId;
}

/**
 * Clear reveal request between two users
 */
export function clearRevealRequest(userId1, userId2) {
    const key = getPairKey(userId1, userId2);
    revealRequests.delete(key);
}


// ============ Cleanup ============

/**
 * Cleanup old data periodically
 */
export function cleanup() {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Clean up expired bans
    for (const [userId, report] of reportedUsers.entries()) {
        if (report.banUntil && now > report.banUntil) {
            report.banUntil = null;
        }
        // Remove very old reports (older than 7 days)
        if (report.lastReportTime && now - report.lastReportTime > 7 * ONE_DAY) {
            reportedUsers.delete(userId);
        }
    }

    // Clean old session reports
    // (In a real app, you'd clear these when chats end)
}

// Run cleanup every hour
setInterval(cleanup, 60 * 60 * 1000);

export default {
    USER_STATES,
    getUserState,
    setUserState,
    clearUserState,
    setUserGender,
    getUserGender,
    getUserSettings,
    updateUserSettings,
    toggleTypingIndicator,
    setUserGenderSetting,
    getUserGenderSetting,
    getUserStats,
    incrementChatCount,
    incrementMessageCount,
    addChatDuration,
    markChatStart,
    endChatAndRecordDuration,
    formatDuration,
    isUserBanned,
    getBanRemainingTime,
    reportUser,
    clearSessionReports,
    setSkippedPartner,
    getSkippedPartner,
    clearSkippedPartner,
    setRevealRequest,
    getRevealRequest,
    hasUserRequestedReveal,
    clearRevealRequest,
    setUserAge,
    loadUserSettingsFromRedis,
    loadUserStatsFromRedis,
    cleanup
};
