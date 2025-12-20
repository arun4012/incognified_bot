/**
 * Command handlers for Telegram bot
 * Handles menu buttons, commands, and message routing
 */

import { sendMessage, sendMessageWithKeyboard, sendTypingAction, messages } from './telegram.js';
import matchmaking from './matchmaking.js';
import { isRateLimited, validateMessage } from './utils.js';
import {
    BUTTONS,
    mainMenuKeyboard,
    genderSelectKeyboard,
    genderPreferenceKeyboard,
    inChatKeyboard,
    searchingKeyboard,
    getSettingsKeyboard
} from './menus.js';
import {
    USER_STATES,
    getUserState,
    setUserState,
    clearUserState,
    setUserGender,
    getUserSettings,
    toggleTypingIndicator,
    getUserStats,
    formatDuration,
    isUserBanned,
    getBanRemainingTime,
    reportUser
} from './userState.js';

// Set up matchmaking response handler
matchmaking.setResponseCallback(handleMatchmakingMessage);

/**
 * Handle /start command - show welcome with main menu
 */
export async function handleStart(chatId, userId) {
    clearUserState(userId);
    await sendMessageWithKeyboard(chatId, messages.welcome, mainMenuKeyboard);
}

/**
 * Handle "Find Partner" button - random matching
 */
export async function handleFind(chatId, userId) {
    // Check if banned
    if (isUserBanned(userId)) {
        const remaining = getBanRemainingTime(userId);
        await sendMessageWithKeyboard(chatId, messages.banned(remaining), mainMenuKeyboard);
        return;
    }

    // Send searching message with cancel button
    await sendMessageWithKeyboard(chatId, messages.searching, searchingKeyboard);

    // Join the matchmaking queue (no gender filter)
    matchmaking.handleJoin(userId, chatId, {});
}

/**
 * Handle "Search by Gender" button - show gender selection
 */
export async function handleGenderSelect(chatId, userId) {
    // Check if banned
    if (isUserBanned(userId)) {
        const remaining = getBanRemainingTime(userId);
        await sendMessageWithKeyboard(chatId, messages.banned(remaining), mainMenuKeyboard);
        return;
    }

    setUserState(userId, USER_STATES.SELECTING_GENDER);
    await sendMessageWithKeyboard(chatId, messages.selectGender, genderSelectKeyboard);
}

/**
 * Handle gender selection (Male/Female/Any for user's own gender)
 */
export async function handleGenderChoice(chatId, userId, genderText) {
    let gender = null;
    if (genderText === BUTTONS.GENDER_MALE) gender = 'male';
    else if (genderText === BUTTONS.GENDER_FEMALE) gender = 'female';
    else if (genderText === BUTTONS.GENDER_ANY) gender = 'any';

    if (!gender) {
        await sendMessageWithKeyboard(chatId, 'Please select a valid option.', genderSelectKeyboard);
        return;
    }

    // Save gender and ask for preference
    setUserGender(userId, gender, null);
    setUserState(userId, USER_STATES.SELECTING_PREFERENCE);
    await sendMessageWithKeyboard(chatId, messages.selectPreference, genderPreferenceKeyboard);
}

/**
 * Handle preference selection (who to match with)
 */
export async function handlePreferenceChoice(chatId, userId, prefText) {
    let preference = null;
    if (prefText === BUTTONS.GENDER_MALE) preference = 'male';
    else if (prefText === BUTTONS.GENDER_FEMALE) preference = 'female';
    else if (prefText === BUTTONS.GENDER_ANY) preference = 'any';

    if (!preference) {
        await sendMessageWithKeyboard(chatId, 'Please select a valid option.', genderPreferenceKeyboard);
        return;
    }

    // Get saved gender
    const state = getUserState(userId);
    const gender = state.gender || 'any';

    // Update preference
    setUserGender(userId, gender, preference);

    // Display labels
    const genderLabels = { male: '👨 Male', female: '👩 Female', any: '🎲 Anyone' };

    // Start searching with gender filter
    await sendMessageWithKeyboard(
        chatId,
        messages.searchingGender(genderLabels[gender], genderLabels[preference]),
        searchingKeyboard
    );

    matchmaking.handleJoin(userId, chatId, { gender, preference });
}

/**
 * Handle /next or Next button - skip current partner
 */
export async function handleNext(chatId, userId) {
    matchmaking.handleNext(userId, chatId);
}

/**
 * Handle /stop or Stop button - leave chat
 */
export async function handleStop(chatId, userId) {
    matchmaking.handleLeave(userId);
    clearUserState(userId);
    await sendMessageWithKeyboard(chatId, messages.youLeft, mainMenuKeyboard);
}

/**
 * Handle Settings button
 */
export async function handleSettings(chatId, userId) {
    const settings = getUserSettings(userId);
    const keyboard = getSettingsKeyboard(settings);
    await sendMessageWithKeyboard(chatId, messages.settings(settings.typingIndicator), keyboard);
}

/**
 * Handle settings toggle
 */
export async function handleSettingsToggle(chatId, userId, buttonText) {
    if (buttonText === BUTTONS.TYPING_ON || buttonText === BUTTONS.TYPING_OFF) {
        const newValue = toggleTypingIndicator(userId);
        const settings = getUserSettings(userId);
        const keyboard = getSettingsKeyboard(settings);
        await sendMessageWithKeyboard(
            chatId,
            messages.settingsUpdated('Typing Indicator', newValue) + '\n\n' + messages.settings(newValue),
            keyboard
        );
    }
}

/**
 * Handle Stats button
 */
export async function handleStats(chatId, userId) {
    const stats = getUserStats(userId);
    const formattedStats = {
        chats: stats.chats,
        messages: stats.messages,
        totalDuration: formatDuration(stats.totalDuration)
    };
    await sendMessageWithKeyboard(chatId, messages.stats(formattedStats), mainMenuKeyboard);
}

/**
 * Handle Help button
 */
export async function handleHelp(chatId, userId) {
    await sendMessageWithKeyboard(chatId, messages.help, mainMenuKeyboard);
}

/**
 * Handle Report button
 */
export async function handleReport(chatId, userId) {
    const partner = matchmaking.getPartner(userId);
    if (!partner) {
        await sendMessageWithKeyboard(chatId, messages.notInChat, mainMenuKeyboard);
        return;
    }

    const result = reportUser(userId, partner.partnerId);
    if (result.alreadyReported) {
        await sendMessage(chatId, messages.alreadyReported);
    } else {
        await sendMessageWithKeyboard(chatId, messages.reported, inChatKeyboard);
    }
}

/**
 * Handle Back button - return to main menu
 */
export async function handleBack(chatId, userId) {
    clearUserState(userId);
    await sendMessageWithKeyboard(chatId, messages.backToMenu, mainMenuKeyboard);
}

/**
 * Handle regular text message - forward to partner or process as menu
 */
export async function handleTextMessage(message, userId, chatId) {
    const text = message.text;
    const userState = getUserState(userId);

    // Check if it's a menu button press
    if (text === BUTTONS.FIND_PARTNER) {
        return handleFind(chatId, userId);
    }
    if (text === BUTTONS.SEARCH_GENDER) {
        return handleGenderSelect(chatId, userId);
    }
    if (text === BUTTONS.SETTINGS) {
        return handleSettings(chatId, userId);
    }
    if (text === BUTTONS.STATS) {
        return handleStats(chatId, userId);
    }
    if (text === BUTTONS.HELP) {
        return handleHelp(chatId, userId);
    }
    if (text === BUTTONS.BACK) {
        return handleBack(chatId, userId);
    }
    if (text === BUTTONS.NEXT_PARTNER) {
        return handleNext(chatId, userId);
    }
    if (text === BUTTONS.STOP_CHAT) {
        return handleStop(chatId, userId);
    }
    if (text === BUTTONS.REPORT) {
        return handleReport(chatId, userId);
    }
    if (text === BUTTONS.TYPING_ON || text === BUTTONS.TYPING_OFF) {
        return handleSettingsToggle(chatId, userId, text);
    }

    // Handle gender selection state
    if (userState.state === USER_STATES.SELECTING_GENDER) {
        if (text === BUTTONS.GENDER_MALE || text === BUTTONS.GENDER_FEMALE || text === BUTTONS.GENDER_ANY) {
            return handleGenderChoice(chatId, userId, text);
        }
        // Invalid selection, re-show menu
        await sendMessageWithKeyboard(chatId, messages.selectGender, genderSelectKeyboard);
        return;
    }

    // Handle preference selection state
    if (userState.state === USER_STATES.SELECTING_PREFERENCE) {
        if (text === BUTTONS.GENDER_MALE || text === BUTTONS.GENDER_FEMALE || text === BUTTONS.GENDER_ANY) {
            return handlePreferenceChoice(chatId, userId, text);
        }
        await sendMessageWithKeyboard(chatId, messages.selectPreference, genderPreferenceKeyboard);
        return;
    }

    // If not in chat, show not in chat message
    if (!matchmaking.isInChat(userId)) {
        await sendMessageWithKeyboard(chatId, messages.notInChat, mainMenuKeyboard);
        return;
    }

    // Rate limit check
    if (isRateLimited(userId)) {
        await sendMessage(chatId, messages.rateLimited);
        return;
    }

    // Validate message
    const validation = validateMessage(message);
    if (!validation.valid) {
        await sendMessage(chatId, validation.error || messages.textOnly);
        return;
    }

    // Send to partner via matchmaking
    matchmaking.handleMessage(userId, text);
}

/**
 * Handle typing indicator from user
 */
export async function handleTypingFromUser(userId) {
    // Check if partner has typing indicators enabled
    const partner = matchmaking.getPartner(userId);
    if (!partner) return;

    const partnerSettings = getUserSettings(partner.partnerId);
    if (partnerSettings.typingIndicator) {
        matchmaking.handleTyping(userId);
    }
}

/**
 * Process matchmaking response messages
 */
export async function handleMatchmakingMessage(message) {
    const { type, userId, chatId, text, partnerId, partnerChatId } = message;

    switch (type) {
        case 'matched':
            // Both users matched - notify both with in-chat keyboard
            if (chatId) {
                await sendMessageWithKeyboard(chatId, messages.partnerFound, inChatKeyboard);
            }
            if (partnerChatId) {
                await sendMessageWithKeyboard(partnerChatId, messages.partnerFound, inChatKeyboard);
            }
            break;

        case 'waiting':
            // User added to queue, already sent "searching" message
            break;

        case 'already_chatting':
            if (chatId) {
                await sendMessageWithKeyboard(chatId, messages.alreadyInChat, inChatKeyboard);
            }
            break;

        case 'already_waiting':
            if (chatId) {
                await sendMessageWithKeyboard(chatId, messages.alreadySearching, searchingKeyboard);
            }
            break;

        case 'not_in_chat':
            if (chatId) {
                await sendMessageWithKeyboard(chatId, messages.notInChat, mainMenuKeyboard);
            }
            break;

        case 'partner_left':
            if (chatId) {
                await sendMessageWithKeyboard(chatId, messages.partnerLeft, mainMenuKeyboard);
            }
            break;

        case 'forward_message':
            if (chatId && text) {
                await sendMessage(chatId, text);
            }
            break;

        case 'skipped':
            if (chatId) {
                await sendMessageWithKeyboard(chatId, messages.skipped, searchingKeyboard);
            }
            break;

        case 'typing':
            if (chatId) {
                await sendTypingAction(chatId);
            }
            break;

        case 'error':
            if (chatId) {
                await sendMessageWithKeyboard(chatId, messages.error, mainMenuKeyboard);
            }
            break;

        default:
            console.log('Unknown matchmaking message type:', type);
    }
}

export default {
    handleStart,
    handleFind,
    handleNext,
    handleStop,
    handleGenderSelect,
    handleSettings,
    handleStats,
    handleHelp,
    handleReport,
    handleBack,
    handleTextMessage,
    handleTypingFromUser,
    handleMatchmakingMessage
};
