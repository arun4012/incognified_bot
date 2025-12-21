/**
 * Redis client for Upstash
 * Provides persistence for user settings and stats
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars)
let redis = null;

try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN
        });
        console.log('✅ Redis connected');
    } else {
        console.log('⚠️ Redis not configured - using in-memory storage');
    }
} catch (error) {
    console.error('❌ Redis connection error:', error);
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable() {
    return redis !== null;
}

/**
 * Get user settings from Redis
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getUserSettingsFromRedis(userId) {
    if (!redis) return null;
    try {
        const data = await redis.get(`user:settings:${userId}`);
        return data || null;
    } catch (error) {
        console.error('Redis get error:', error);
        return null;
    }
}

/**
 * Save user settings to Redis
 * @param {string} userId
 * @param {object} settings
 */
export async function saveUserSettingsToRedis(userId, settings) {
    if (!redis) return;
    try {
        await redis.set(`user:settings:${userId}`, JSON.stringify(settings));
    } catch (error) {
        console.error('Redis set error:', error);
    }
}

/**
 * Get user stats from Redis
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getUserStatsFromRedis(userId) {
    if (!redis) return null;
    try {
        const data = await redis.get(`user:stats:${userId}`);
        return data || null;
    } catch (error) {
        console.error('Redis get error:', error);
        return null;
    }
}

/**
 * Save user stats to Redis
 * @param {string} userId
 * @param {object} stats
 */
export async function saveUserStatsToRedis(userId, stats) {
    if (!redis) return;
    try {
        await redis.set(`user:stats:${userId}`, JSON.stringify(stats));
    } catch (error) {
        console.error('Redis set error:', error);
    }
}

export default {
    isRedisAvailable,
    getUserSettingsFromRedis,
    saveUserSettingsToRedis,
    getUserStatsFromRedis,
    saveUserStatsToRedis
};
