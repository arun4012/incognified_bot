/**
 * Keyboard menu definitions for Telegram bot
 * Contains all Reply Keyboard and Inline Keyboard configurations
 */

// Button text constants (used for matching user input)
export const BUTTONS = {
    // Main menu
    FIND_PARTNER: '🚀 Find Partner',
    SEARCH_GENDER: '👩👨 Search by Gender',
    SEARCH_LANGUAGE: '🌐 Search by Language',

    // Language selection
    LANG_ENGLISH: '🇬🇧 English',
    LANG_HINDI: '🇮🇳 Hindi',
    LANG_TAMIL: '🇮🇳 Tamil',
    LANG_TELUGU: '🇮🇳 Telugu',
    LANG_ANY: '🎲 Any Language',
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
    UNDO_SKIP: '🔄 Undo Skip',
    UNDO_STOP: '🔄 Undo Stop'
};

/**
 * Main menu keyboard - shown on /start and after leaving chat
 * Simplified: only Find Partner and Search by Gender
 */
export const mainMenuKeyboard = {
    keyboard: [
        [{ text: BUTTONS.FIND_PARTNER }],
        [{ text: BUTTONS.SEARCH_GENDER }],
        [{ text: BUTTONS.SEARCH_LANGUAGE }]
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
 * Language selection keyboard (what language to chat in)
 */
export const languageSelectKeyboard = {
    keyboard: [
        [{ text: BUTTONS.LANG_ENGLISH }, { text: BUTTONS.LANG_HINDI }],
        [{ text: BUTTONS.LANG_TAMIL }, { text: BUTTONS.LANG_TELUGU }],
        [{ text: BUTTONS.LANG_ANY }],
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
 * Stopped keyboard - shown after stopping a chat (with undo option)
 */
export const stoppedKeyboard = {
    keyboard: [
        [{ text: BUTTONS.UNDO_STOP }],
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
    const currentGender = settings.gender || 'any';
    const currentAge = settings.age;
    const currentLanguage = settings.language || 'any';

    // Gender button labels with checkmark for selected
    const maleLabel = currentGender === 'male' ? '✅ Male' : '👨 Male';
    const femaleLabel = currentGender === 'female' ? '✅ Female' : '👩 Female';
    const anyGenderLabel = currentGender === 'any' ? '✅ Anyone' : '🎲 Anyone';

    // Language button labels with checkmark for selected
    const langLabels = {
        english: currentLanguage === 'english' ? '✅ English' : '🇬🇧 English',
        hindi: currentLanguage === 'hindi' ? '✅ Hindi' : '🇮🇳 Hindi',
        tamil: currentLanguage === 'tamil' ? '✅ Tamil' : '🇮🇳 Tamil',
        telugu: currentLanguage === 'telugu' ? '✅ Telugu' : '🇮🇳 Telugu',
        any: currentLanguage === 'any' ? '✅ Any' : '🎲 Any'
    };

    // Age label
    const ageLabel = currentAge ? `🎂 Age: ${currentAge}` : '🎂 Set Age';

    return {
        inline_keyboard: [
            // Gender selection row
            [
                { text: maleLabel, callback_data: 'set_gender_male' },
                { text: femaleLabel, callback_data: 'set_gender_female' },
                { text: anyGenderLabel, callback_data: 'set_gender_any' }
            ],
            // Language selection row
            [
                { text: langLabels.english, callback_data: 'set_lang_english' },
                { text: langLabels.hindi, callback_data: 'set_lang_hindi' }
            ],
            [
                { text: langLabels.tamil, callback_data: 'set_lang_tamil' },
                { text: langLabels.telugu, callback_data: 'set_lang_telugu' },
                { text: langLabels.any, callback_data: 'set_lang_any' }
            ],
            // Age setting row
            [{ text: ageLabel, callback_data: 'set_age' }],
            // Typing indicator toggle
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
    languageSelectKeyboard,
    inChatKeyboard,
    searchingKeyboard,
    reportConfirmKeyboard,
    skippedKeyboard,
    stoppedKeyboard,
    getSettingsInlineKeyboard,
    removeKeyboard,
    isButton,
    isAnyButton
};
