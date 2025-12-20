/**
 * Keyboard menu definitions for Telegram bot
 * Contains all Reply Keyboard and Inline Keyboard configurations
 */

// Button text constants (used for matching user input)
export const BUTTONS = {
    // Main menu
    FIND_PARTNER: '🚀 Find Partner',
    SEARCH_GENDER: '👩👨 Search by Gender',

    // Gender selection
    GENDER_MALE: '👨 Male',
    GENDER_FEMALE: '👩 Female',
    GENDER_ANY: '🎲 Anyone',
    BACK: '◀️ Back',

    // In-chat menu
    NEXT_PARTNER: '⏭️ Next Partner',
    STOP_CHAT: '🛑 Stop Chat',
    REPORT: '⚠️ Report',

    // Settings
    TYPING_ON: '✅ Typing Indicator: ON',
    TYPING_OFF: '❌ Typing Indicator: OFF',

    // Report confirmation
    CONFIRM_REPORT: '✅ Yes, Report',
    CANCEL_REPORT: '❌ Cancel',

    // Undo skip
    UNDO_SKIP: '🔄 Undo Skip'
};

/**
 * Main menu keyboard - shown on /start and after leaving chat
 * Simplified: only Find Partner and Search by Gender
 */
export const mainMenuKeyboard = {
    keyboard: [
        [{ text: BUTTONS.FIND_PARTNER }],
        [{ text: BUTTONS.SEARCH_GENDER }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};

/**
 * Gender selection keyboard
 */
export const genderSelectKeyboard = {
    keyboard: [
        [{ text: BUTTONS.GENDER_MALE }, { text: BUTTONS.GENDER_FEMALE }],
        [{ text: BUTTONS.GENDER_ANY }],
        [{ text: BUTTONS.BACK }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
};

/**
 * Gender preference keyboard (who do you want to match with)
 */
export const genderPreferenceKeyboard = {
    keyboard: [
        [{ text: BUTTONS.GENDER_MALE }, { text: BUTTONS.GENDER_FEMALE }],
        [{ text: BUTTONS.GENDER_ANY }],
        [{ text: BUTTONS.BACK }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
};

/**
 * In-chat keyboard - shown when user is matched with partner
 */
export const inChatKeyboard = {
    keyboard: [
        [{ text: BUTTONS.NEXT_PARTNER }, { text: BUTTONS.STOP_CHAT }],
        [{ text: BUTTONS.REPORT }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};

/**
 * Searching keyboard - shown while waiting for match
 */
export const searchingKeyboard = {
    keyboard: [
        [{ text: BUTTONS.STOP_CHAT }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};

/**
 * Report confirmation keyboard
 */
export const reportConfirmKeyboard = {
    keyboard: [
        [{ text: BUTTONS.CONFIRM_REPORT }, { text: BUTTONS.CANCEL_REPORT }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
};

/**
 * Skipped keyboard - shown after skipping a partner (with undo option)
 */
export const skippedKeyboard = {
    keyboard: [
        [{ text: BUTTONS.UNDO_SKIP }],
        [{ text: BUTTONS.FIND_PARTNER }],
        [{ text: BUTTONS.BACK }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};

/**
 * Generate INLINE settings keyboard (appears in message)
 * @param {object} settings - User's current settings
 * @returns {object} Inline keyboard object
 */
export function getSettingsInlineKeyboard(settings = {}) {
    const typingEnabled = settings.typingIndicator !== false;

    return {
        inline_keyboard: [
            [{
                text: typingEnabled ? '✅ Typing Indicator: ON' : '❌ Typing Indicator: OFF',
                callback_data: 'toggle_typing'
            }]
        ]
    };
}

/**
 * Remove keyboard (hide it)
 */
export const removeKeyboard = {
    remove_keyboard: true
};

/**
 * Check if text matches a button
 * @param {string} text - User's message text
 * @param {string} button - Button constant to match
 * @returns {boolean}
 */
export function isButton(text, button) {
    return text === button;
}

/**
 * Check if text is any known button
 * @param {string} text - User's message text
 * @returns {boolean}
 */
export function isAnyButton(text) {
    return Object.values(BUTTONS).includes(text);
}

export default {
    BUTTONS,
    mainMenuKeyboard,
    genderSelectKeyboard,
    genderPreferenceKeyboard,
    inChatKeyboard,
    searchingKeyboard,
    reportConfirmKeyboard,
    skippedKeyboard,
    getSettingsKeyboard,
    removeKeyboard,
    isButton,
    isAnyButton
};
