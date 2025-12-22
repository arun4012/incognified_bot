/**
 * Command handlers for Telegram bot
 * Handles menu buttons, commands, and message routing
 */

import { sendMessage, sendMessageWithKeyboard, sendTypingAction, messages, answerCallbackQuery, editMessageReplyMarkup, editMessageText, sendPhoto, sendVideo, sendSticker, sendVoice, sendAnimation, sendVideoNote, sendDocument } from './telegram.js';
import matchmaking from './matchmaking.js';
import { isRateLimited, validateMessage } from './utils.js';
import {
    BUTTONS,
    mainMenuKeyboard,
    genderSelectKeyboard,
    genderPreferenceKeyboard,
    languageSelectKeyboard,
    inChatKeyboard,
    searchingKeyboard,
    reportConfirmKeyboard,
    skippedKeyboard,
    getSettingsInlineKeyboard
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
    reportUser,
    setSkippedPartner,
    getSkippedPartner,
    clearSkippedPartner,
    setUserGenderSetting,
    getUserGenderSetting,
    setRevealRequest,
    getRevealRequest,
    hasUserRequestedReveal,
    clearRevealRequest,
    setUserAge,
    setUserLanguageSetting,
    getUserLanguageSetting
} from './userState.js';

// Set up matchmaking response handler
matchmaking.setResponseCallback(handleMatchmakingMessage);

/**
 * Handle /start command - show welcome with main menu
 */
export async function handleStart(chatId, userId) {
    // Check if already in a chat
    if (matchmaking.isInChat(userId)) {
        await sendMessageWithKeyboard(chatId, messages.alreadyInChat, inChatKeyboard);
        return;
    }

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
 * Handle "Search by Gender" button - show preference selection directly
 */
export async function handleGenderSelect(chatId, userId) {
    // Check if banned
    if (isUserBanned(userId)) {
        const remaining = getBanRemainingTime(userId);
        await sendMessageWithKeyboard(chatId, messages.banned(remaining), mainMenuKeyboard);
        return;
    }

    // Skip gender selection, go directly to preference
    setUserState(userId, USER_STATES.SELECTING_PREFERENCE);
    await sendMessageWithKeyboard(chatId, messages.selectPreference, genderPreferenceKeyboard);
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

    // Get gender from persistent settings (defaults to 'any')
    console.log(`[PreferenceChoice] userId: ${userId}, type: ${typeof userId}`);
    const gender = getUserGenderSetting(userId);
    console.log(`[PreferenceChoice] Retrieved gender: ${gender}`);

    // Update session preference for matchmaking
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
 * Handle "Search by Language" button - show language selection
 */
export async function handleLanguageSelect(chatId, userId) {
    // Check if banned
    if (isUserBanned(userId)) {
        const remaining = getBanRemainingTime(userId);
        await sendMessageWithKeyboard(chatId, messages.banned(remaining), mainMenuKeyboard);
        return;
    }

    setUserState(userId, USER_STATES.SELECTING_LANGUAGE);
    await sendMessageWithKeyboard(chatId, messages.selectLanguage, languageSelectKeyboard);
}

/**
 * Handle language selection (what language to chat in)
 */
export async function handleLanguageChoice(chatId, userId, langText) {
    let language = null;
    if (langText === BUTTONS.LANG_ENGLISH) language = 'english';
    else if (langText === BUTTONS.LANG_HINDI) language = 'hindi';
    else if (langText === BUTTONS.LANG_TAMIL) language = 'tamil';
    else if (langText === BUTTONS.LANG_TELUGU) language = 'telugu';
    else if (langText === BUTTONS.LANG_ANY) language = 'any';

    if (!language) {
        await sendMessageWithKeyboard(chatId, 'Please select a valid option.', languageSelectKeyboard);
        return;
    }

    // Language labels for display
    const langLabels = {
        english: '🇬🇧 English',
        hindi: '🇮🇳 Hindi',
        tamil: '🇮🇳 Tamil',
        telugu: '🇮🇳 Telugu',
        any: '🎲 Any Language'
    };

    // Start searching with language filter
    await sendMessageWithKeyboard(
        chatId,
        messages.searchingLanguage(langLabels[language]),
        searchingKeyboard
    );

    matchmaking.handleJoin(userId, chatId, { language });
}

/**
 * Handle /next or Next button - skip current partner
 */
export async function handleNext(chatId, userId) {
    // Get current partner info before skipping
    const partner = matchmaking.getPartner(userId);

    // If we have a partner, save their info for undo
    if (partner) {
        setSkippedPartner(userId, partner.partnerId, partner.partnerChatId);
    }

    matchmaking.handleNext(userId, chatId);

    // Clear user state before showing skipped keyboard
    clearUserState(userId);
}

/**
 * Handle Undo Skip button - reconnect with previous partner
 */
export async function handleUndoSkip(chatId, userId) {
    // Get skipped partner (will be null if expired or not found)
    const skippedPartner = getSkippedPartner(userId);

    if (!skippedPartner) {
        // Undo expired or no partner to reconnect with
        await sendMessageWithKeyboard(
            chatId,
            '⏰ Undo time expired! You can only undo within 10 seconds of skipping.',
            mainMenuKeyboard
        );
        return;
    }

    const { partnerId, partnerChatId } = skippedPartner;

    // Try to reconnect
    const result = matchmaking.reconnectPair(userId, partnerId, chatId, partnerChatId);

    if (result.success) {
        // Clear skipped partner data
        clearSkippedPartner(userId);

        // Notify both users
        await sendMessageWithKeyboard(chatId, '🔄 Reconnected with your previous partner!', inChatKeyboard);
        await sendMessageWithKeyboard(partnerChatId, '🔄 Your previous partner reconnected!', inChatKeyboard);
    } else {
        // Partner is busy or unavailable
        clearSkippedPartner(userId);
        await sendMessageWithKeyboard(
            chatId,
            '❌ Sorry, your previous partner is now in another chat.',
            mainMenuKeyboard
        );
    }
}

/**
 * Handle /stop or Stop button - leave chat
 */
export async function handleStop(chatId, userId) {
    // Check if user is actually in a chat or searching
    const isInChat = matchmaking.isInChat(userId);
    const isInQueue = matchmaking.isInQueue(userId);

    if (isInChat || isInQueue) {
        matchmaking.handleLeave(userId);
        clearUserState(userId);
        clearSkippedPartner(userId); // Clear any skipped partner data when stopping

        if (isInChat) {
            await sendMessageWithKeyboard(chatId, messages.youLeft, mainMenuKeyboard);
        } else {
            await sendMessageWithKeyboard(chatId, '🛑 Search cancelled.', mainMenuKeyboard);
        }
    } else {
        // Not in chat or queue
        await sendMessageWithKeyboard(chatId, messages.notInChat, mainMenuKeyboard);
    }
}

/**
 * Handle /reveal command - mutual identity reveal with username requirement
 */
export async function handleReveal(chatId, userId, username) {
    // Check if user has a username
    if (!username) {
        await sendMessage(chatId, messages.noUsername);
        return;
    }

    // Check if in a chat
    const partner = matchmaking.getPartner(userId);
    if (!partner) {
        await sendMessageWithKeyboard(chatId, messages.notInChat, mainMenuKeyboard);
        return;
    }

    const partnerId = partner.partnerId;
    const partnerChatId = partner.partnerChatId;

    // Check if already sent a reveal request
    if (hasUserRequestedReveal(userId, partnerId)) {
        await sendMessage(chatId, messages.alreadyRequested);
        return;
    }

    // Check if partner already sent a reveal request (mutual accept!)
    const existingRequest = getRevealRequest(userId, partnerId);
    if (existingRequest && existingRequest.requesterId === partnerId) {
        // Partner already requested - mutual acceptance!
        clearRevealRequest(userId, partnerId);

        // Get partner's stored username (we need to store it when they request)
        const partnerUsername = existingRequest.username || 'unknown';

        // Notify both users with each other's usernames
        await sendMessageWithKeyboard(chatId, messages.revealSuccess(username, partnerUsername), inChatKeyboard);
        await sendMessageWithKeyboard(partnerChatId, messages.revealSuccess(partnerUsername, username), inChatKeyboard);
        return;
    }

    // Store reveal request with username
    setRevealRequest(userId, partnerId, username);

    // Notify the user who sent the request
    await sendMessage(chatId, messages.revealSent);

    // Notify partner that someone wants to reveal
    await sendMessage(partnerChatId, messages.revealReceived());
}

/**
 * Handle Settings command - show settings with inline keyboard
 */
export async function handleSettings(chatId, userId) {
    const settings = getUserSettings(userId);
    const inlineKeyboard = getSettingsInlineKeyboard(settings);
    await sendMessageWithKeyboard(chatId, messages.settings(settings.typingIndicator, settings.gender, settings.age, settings.language), inlineKeyboard);
}

/**
 * Handle Stats command - show user statistics
 */
export async function handleStats(chatId, userId) {
    const stats = getUserStats(userId);
    const formattedStats = {
        chats: stats.chats,
        messages: stats.messages,
        totalDuration: formatDuration(stats.totalDuration)
    };
    await sendMessage(chatId, messages.stats(formattedStats));
}

/**
 * Handle Help command - show help text
 */
export async function handleHelp(chatId, userId) {
    await sendMessage(chatId, messages.help);
}

/**
 * Handle callback query (inline button clicks)
 */
export async function handleCallbackQuery(callbackQuery) {
    const { id: queryId, from, message, data } = callbackQuery;
    // Convert to string for consistency with extractUserInfo
    const userId = from.id.toString();
    const chatId = message.chat.id.toString();
    const messageId = message.message_id;

    // Labels for user-friendly messages
    const genderLabels = { male: '👨 Male', female: '👩 Female', any: '🎲 Anyone' };

    switch (data) {
        case 'toggle_typing': {
            // Toggle typing indicator setting
            const newValue = toggleTypingIndicator(userId);
            const settings = getUserSettings(userId);
            const newKeyboard = getSettingsInlineKeyboard(settings);

            // Show toast notification
            await answerCallbackQuery(queryId, `✅ Typing Indicator ${newValue ? 'ON' : 'OFF'}`);

            // Refresh full settings message
            await editMessageText(chatId, messageId, messages.settings(settings.typingIndicator, settings.gender, settings.age, settings.language), newKeyboard);
            break;
        }

        case 'set_gender_male':
        case 'set_gender_female':
        case 'set_gender_any': {
            // Extract gender from callback data
            const gender = data.replace('set_gender_', '');
            setUserGenderSetting(userId, gender);
            const settings = getUserSettings(userId);
            const newKeyboard = getSettingsInlineKeyboard(settings);

            // Show toast notification with gender label
            await answerCallbackQuery(queryId, `✅ Gender set to ${genderLabels[gender]}`);

            // Refresh full settings message
            await editMessageText(chatId, messageId, messages.settings(settings.typingIndicator, settings.gender, settings.age, settings.language), newKeyboard);
            break;
        }

        case 'set_lang_english':
        case 'set_lang_hindi':
        case 'set_lang_tamil':
        case 'set_lang_telugu':
        case 'set_lang_any': {
            // Extract language from callback data
            const language = data.replace('set_lang_', '');
            setUserLanguageSetting(userId, language);
            const settings = getUserSettings(userId);
            const newKeyboard = getSettingsInlineKeyboard(settings);

            // Language labels for toast
            const langLabels = {
                english: '🇬🇧 English',
                hindi: '🇮🇳 Hindi',
                tamil: '🇮🇳 Tamil',
                telugu: '🇮🇳 Telugu',
                any: '🎲 Any Language'
            };

            await answerCallbackQuery(queryId, `✅ Language set to ${langLabels[language]}`);
            await editMessageText(chatId, messageId, messages.settings(settings.typingIndicator, settings.gender, settings.age, settings.language), newKeyboard);
            break;
        }

        case 'set_age': {
            // Set user state to awaiting age input
            setUserState(userId, USER_STATES.SETTING_AGE);
            await answerCallbackQuery(queryId, '🎂 Enter your age');
            await sendMessage(chatId, messages.enterAge);
            break;
        }

        default:
            await answerCallbackQuery(queryId);
            console.log('Unknown callback data:', data);
    }
}

/**
 * Handle Report button - show confirmation dialog
 */
export async function handleReport(chatId, userId) {
    const partner = matchmaking.getPartner(userId);
    if (!partner) {
        await sendMessageWithKeyboard(chatId, messages.notInChat, mainMenuKeyboard);
        return;
    }

    // Set state to confirming report
    setUserState(userId, USER_STATES.CONFIRMING_REPORT);
    await sendMessageWithKeyboard(
        chatId,
        '⚠️ Are you sure you want to report this user?\n\nReporting will be recorded and may result in a ban for the reported user if multiple reports are received.',
        reportConfirmKeyboard
    );
}

/**
 * Handle Report confirmation
 */
export async function handleReportConfirm(chatId, userId) {
    const partner = matchmaking.getPartner(userId);
    if (!partner) {
        clearUserState(userId);
        await sendMessageWithKeyboard(chatId, messages.notInChat, mainMenuKeyboard);
        return;
    }

    const result = reportUser(userId, partner.partnerId);
    clearUserState(userId);

    if (result.alreadyReported) {
        await sendMessageWithKeyboard(chatId, messages.alreadyReported, inChatKeyboard);
    } else {
        await sendMessageWithKeyboard(chatId, messages.reported, inChatKeyboard);
    }
}

/**
 * Handle Report cancellation
 */
export async function handleReportCancel(chatId, userId) {
    clearUserState(userId);
    await sendMessageWithKeyboard(chatId, '❌ Report cancelled.', inChatKeyboard);
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
    if (text === BUTTONS.CONFIRM_REPORT) {
        return handleReportConfirm(chatId, userId);
    }
    if (text === BUTTONS.CANCEL_REPORT) {
        return handleReportCancel(chatId, userId);
    }
    if (text === BUTTONS.UNDO_SKIP) {
        return handleUndoSkip(chatId, userId);
    }
    if (text === BUTTONS.SEARCH_LANGUAGE) {
        return handleLanguageSelect(chatId, userId);
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

    // Handle language selection state
    if (userState.state === USER_STATES.SELECTING_LANGUAGE) {
        if (text === BUTTONS.LANG_ENGLISH || text === BUTTONS.LANG_HINDI ||
            text === BUTTONS.LANG_TAMIL || text === BUTTONS.LANG_TELUGU ||
            text === BUTTONS.LANG_ANY) {
            return handleLanguageChoice(chatId, userId, text);
        }
        await sendMessageWithKeyboard(chatId, messages.selectLanguage, languageSelectKeyboard);
        return;
    }

    // Handle age input state
    if (userState.state === USER_STATES.SETTING_AGE) {
        const age = parseInt(text, 10);
        if (isNaN(age) || age < 13 || age > 99) {
            await sendMessage(chatId, messages.invalidAge);
            return;
        }

        // Save age and clear state
        setUserAge(userId, age);
        clearUserState(userId);
        await sendMessage(chatId, messages.ageSet(age));
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

    // Send to partner via matchmaking with media info
    matchmaking.handleMessage(userId, {
        text: message.text,
        mediaType: validation.mediaType,
        fileId: validation.fileId,
        caption: validation.caption
    });
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
            if (chatId) {
                const { mediaType, fileId, caption, text } = message;

                switch (mediaType) {
                    case 'photo':
                        await sendPhoto(chatId, fileId, caption);
                        break;
                    case 'video':
                        await sendVideo(chatId, fileId, caption);
                        break;
                    case 'sticker':
                        await sendSticker(chatId, fileId);
                        break;
                    case 'voice':
                        await sendVoice(chatId, fileId);
                        break;
                    case 'animation':
                        await sendAnimation(chatId, fileId, caption);
                        break;
                    case 'video_note':
                        await sendVideoNote(chatId, fileId);
                        break;
                    case 'document':
                        await sendDocument(chatId, fileId, caption);
                        break;
                    case 'text':
                    default:
                        if (text) {
                            await sendMessage(chatId, text);
                        }
                        break;
                }
            }
            break;

        case 'skipped':
            if (chatId) {
                await sendMessageWithKeyboard(
                    chatId,
                    '⏭️ Partner skipped!\n\n🔄 Click "Undo Skip" within 10 seconds to reconnect.',
                    skippedKeyboard
                );
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
    handleMatchmakingMessage,
    handleCallbackQuery
};
