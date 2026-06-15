import {
    Locale,
    PermissionFlagsBits,
} from "discord.js";

import {
    get_logger,
} from "./logger.js";

/**
 * all keys are lowercase
 * {0} {1} {2} ... are placeholders
 * 
 * 所有鍵都是小寫的
 * {0} {1} {2} ... 是文字需要的變量
 * @type {{ [k: Locale[any]]: { [k: string]: { [k: string]: string } } }}
 */
const language = {
    [Locale.EnglishUS]: {
        "embed": {
            "footer": "DogBot · Made by hugo",
        },
        "permissions": {
            "add_reactions": "Add Reactions",
            "administrator": "Administrator",
            "attach_files": "Attach Files",
            "ban_members": "Ban Members",
            "bypass_slowmode": "Bypass Slowmode",
            "change_nickname": "Change Nickname",
            "connect": "Connect",
            "create_events": "Create Events",
            "create_guild_expressions": "Create Expressions",
            "create_instant_invite": "Create Invite",
            "create_private_threads": "Create Private Threads",
            "create_public_threads": "Create Public Threads",
            "deafen_members": "Deafen Members",
            "embed_links": "Embed Links",
            "kick_members": "Kick Members",
            "manage_channels": "Manage Channels",
            "manage_events": "Manage Events",
            "manage_guild": "Manage Server",
            "manage_guild_expressions": "Manage Expressions",
            "manage_messages": "Manage Messages",
            "manage_nicknames": "Manage Nicknames",
            "manage_roles": "Manage Roles",
            "manage_threads": "Manage Threads and Posts",
            "manage_webhooks": "Manage Webhooks",
            "mention_everyone": "Mention @everyone, @here, and All Roles",
            "moderate_members": "Timeout Members",
            "move_members": "Move Members",
            "mute_members": "Mute Members",
            "pin_messages": "Pin Messages",
            "priority_speaker": "Priority Speaker",
            "read_message_history": "Read Message History",
            "request_to_speak": "Request to Speak",
            "send_messages": "Send Messages and Create Posts",
            "send_messages_in_threads": "Send Messages in Threads and Posts",
            "send_polls": "Create Polls",
            "send_tts_messages": "Send Text-to-Speech Messages",
            "send_voice_messages": "Send Voice Messages",
            "speak": "Speak",
            "stream": "Video",
            "use_application_commands": "Use Application Commands",
            "use_embedded_activities": "Use Activities",
            "use_external_apps": "Use External Apps",
            "use_external_emojis": "Use External Emoji",
            "use_external_sounds": "Use External Sounds",
            "use_external_stickers": "Use External Stickers",
            "use_soundboard": "Use Soundboard",
            "use_vad": "Use Voice Activity",
            "view_audit_log": "View Audit Log",
            "view_channel": "View Channels",
            "view_creator_monetization_analytics": "View Creator Monetization Analytics",
            "view_guild_insights": "View Server Insights",
        },
        "fightjob_name": {
            "soldier": "soldier",
            "magician": "magician",
            "ninja": "ninja",
            "tank": "tank",
        },
        "job_name": {
            "fisher": "Fisher",
            "pharmacist": "Pharmacist",
            "farmer": "Farmer",
            "cook": "Cook",
            "miner": "Miner",
            "herder": "Herder",
            "blacksmith": "Blacksmith",
            "lumberjack": "Lumberjack",
        },
        "rpg": {
            "fightjob.none": "None",
            "fightjob.transfer_to": "Successfully changed adventure job to",
        },
        "/info": {
            "user.id": "ID",
            "user.created_at": "Created At",
            "user.job": "Job",
            "user.adventure_job": "Adventure Job",
            "user.hunger": "Hunger",
            "user.money": "Money",
            "user.badge": "Badge",
            "user.relationship": "Relationship",
            "user.no_data": "No Data",
            "user.none": "None",
            "user.privacy": "Privacy disabled",
            "user.single": "Single",
            "user.marry_info": `Married with <@{0}>
Since <t:{1}:R>`,
            "user.sign_count": "Signed in {0} times in a row",

            "guild.id": "ID",
            "guild.members": "Members",
            "guild.boosts": "Boosts",
            "guild.boosts_value": "{0} Boosts / Tier {1}",
            "guild.created_at": "Created At",
            "guild.owner": "Owner",
            "guild.icon": "Icon",
            "guild.banner": "Banner",
            "guild.splash": "Splash",

            "bot.guilds": "Guilds",
            "bot.members": "Members",
            "bot.uptime": "Uptime",
            "bot.memory": "Memory Usage (Used / Total / RSS)",
            "bot.footer": "We made this with discord.js",
            "bot.refresh": "Refresh",

            "message.id": "Message ID",
            "message.channel": "Channel",
            "message.author": "Author",
            "message.content": "Content",
            "message.no_content": "`Empty`",
            "message.message_info": "Message Info",
            "message.jump_to_msg": "Jump to Message",
            "message.clickhere": "Click Here",
            "message.attachment": "Attachment",
            "message.no_attachment": "No Attachment",
            "message.created_at": "Created At",
            "message.edited_at": "Edited At",
            "message.unedited": "Unedited",
            "message.unknown": "Unknown",
            "message.update": "Update",
        },
        "/queue": {
            "list.no_track_in_queue": "There is no tracks in the queue",
            "list.playing": "Now Playing",
            "list.queue": "Queue",
            "list.page": "Page {0} of {1}",
            "list.prev_page": "Previous Page",
            "list.next_page": "Next Page",
            "list.update": "Update",
            "list.empty": "The list is empty",

            "remove.invalid_track": "Invalid track index",
            "remove.success": "Removed track",
        },
    },

    [Locale.ChineseTW]: {
        "embed": {
            "footer": "狗狗機器犬 ∙ 由哈狗製作",
        },
        "permissions": {
            "add_reactions": "新增反應",
            "administrator": "管理者",
            "attach_files": "附加檔案",
            "ban_members": "對成員停權",
            "bypass_slowmode": "略過慢速模式",
            "change_nickname": "更改暱稱",
            "connect": "連接",
            "create_events": "建立活動",
            "create_guild_expressions": "建立表情符號",
            "create_instant_invite": "建立邀請",
            "create_private_threads": "建立私人討論串",
            "create_public_threads": "建立公開討論串",
            "deafen_members": "讓成員拒聽",
            "embed_links": "嵌入連結",
            "kick_members": "踢出成員",
            "manage_channels": "管理頻道",
            "manage_events": "管理活動",
            "manage_guild": "管理伺服器",
            "manage_guild_expressions": "管理表情符號",
            "manage_messages": "管理訊息",
            "manage_nicknames": "管理暱稱",
            "manage_roles": "管理身分組",
            "manage_threads": "管理討論串和貼文",
            "manage_webhooks": "管理 Webhooks",
            "mention_everyone": "提及 @everyone、@here 和所有身分組",
            "moderate_members": "禁言成員",
            "move_members": "移動成員",
            "mute_members": "將成員靜音",
            "pin_messages": "釘選訊息",
            "priority_speaker": "優先發言者",
            "read_message_history": "讀取訊息歷史",
            "request_to_speak": "請求發言",
            "send_messages": "傳送訊息和建立貼文",
            "send_messages_in_threads": "在討論串和貼文中傳送訊息",
            "send_polls": "建立投票",
            "send_tts_messages": "傳送文字朗讀訊息",
            "send_voice_messages": "傳送語音訊息",
            "speak": "說話",
            "stream": "視訊",
            "use_application_commands": "使用應用程式指令",
            "use_embedded_activities": "使用活動",
            "use_external_apps": "使用外部應用程式",
            "use_external_emojis": "使用外部表情符號",
            "use_external_sounds": "使用外部音效",
            "use_external_stickers": "使用外部貼圖",
            "use_soundboard": "使用音效板",
            "use_vad": "使用語音活動",
            "view_audit_log": "檢視審核記錄",
            "view_channel": "檢視頻道",
            "view_creator_monetization_analytics": "檢視創作者營利分析",
            "view_guild_insights": "檢視 Server Insights"
        },
        "fightjob_name": {
            "soldier": "戰士",
            "magician": "魔法師",
            "ninja": "刺客",
            "tank": "坦克",
        },
        "job_name": {
            "fisher": "漁夫",
            "pharmacist": "藥劑師",
            "farmer": "農夫",
            "cook": "廚師",
            "miner": "礦工",
            "herder": "牧農",
            "blacksmith": "鐵匠",
            "lumberjack": "伐木工",
        },
        "rpg": {
            "fightjob.none": "無",
            "fightjob.transfer_to": "成功轉職為",
        },
        "/info": {
            "user.id": "ID",
            "user.created_at": "創建時間",
            "user.job": "民生職業",
            "user.adventure_job": "冒險職業",
            "user.hunger": "體力",
            "user.money": "金錢",
            "user.badge": "稱號",
            "user.relationship": "感情狀態",
            "user.no_data": "無資料",
            "user.none": "無",
            "user.privacy": "隱私設定關閉",
            "user.single": "單身",
            "user.marry_info": `和 <@{0}>
結婚紀念日 <t:{1}:R>`,
            "user.sign_count": "連續每日簽到了 {0} 次",

            "guild.id": "ID",
            "guild.members": "成員",
            "guild.boosts": "加成狀態",
            "guild.boosts_value": "{0} 個加成 / {1} 級",
            "guild.created_at": "創建時間",
            "guild.owner": "擁有者",
            "guild.icon": "圖標",
            "guild.banner": "橫幅",
            "guild.splash": "邀請背景",

            "bot.guilds": "伺服器",
            "bot.members": "成員",
            "bot.uptime": "開機時間",
            "bot.memory": "記憶體狀況 (Used / Total / RSS)",
            "bot.footer": "我們使用 discord.js 製作這個機器人",
            "bot.refresh": "更新",

            "message.id": "訊息ID",
            "message.channel": "頻道",
            "message.author": "作者",
            "message.content": "內容",
            "message.no_content": "無內容",
            "message.message_info": "訊息資訊",
            "message.jump_to_msg": "跳轉至訊息",
            "message.clickhere": "點擊此處",
            "message.attachment": "附件",
            "message.no_attachment": "無附件",
            "message.created_at": "建立時間",
            "message.edited_at": "編輯時間",
            "message.unedited": "未編輯",
            "message.unknown": "未知",
            "message.update": "更新",
        },
        "/queue": {
            "list.no_track_in_queue": "沒有音樂在佇列裡",
            "list.playing": "正在播放",
            "list.queue": "播放佇列",
            "list.page": "第 {0} / {1} 頁",
            "list.prev_page": "上一頁",
            "list.next_page": "下一頁",
            "list.update": "更新",
            "list.empty": "清單是空的",

            "remove.invalid_track": "沒有這首歌",
            "remove.success": "成功移除",
        },
    },
};

const logger = get_logger();

/** @type {Omit<Record<keyof typeof PermissionFlagsBits, string>, "ManageEmojisAndStickers">} */
export const PermissionTranslationKeyMapping = {
    AddReactions: 'add_reactions',
    Administrator: 'administrator',
    AttachFiles: 'attach_files',
    BanMembers: 'ban_members',
    BypassSlowmode: 'bypass_slowmode',
    ChangeNickname: 'change_nickname',
    Connect: 'connect',
    CreateEvents: 'create_events',
    CreateGuildExpressions: 'create_guild_expressions',
    CreateInstantInvite: 'create_instant_invite',
    CreatePrivateThreads: 'create_private_threads',
    CreatePublicThreads: 'create_public_threads',
    DeafenMembers: 'deafen_members',
    EmbedLinks: 'embed_links',
    KickMembers: 'kick_members',
    ManageChannels: 'manage_channels',
    ManageEvents: 'manage_events',
    ManageGuild: 'manage_guild',
    ManageGuildExpressions: 'manage_guild_expressions',
    ManageMessages: 'manage_messages',
    ManageNicknames: 'manage_nicknames',
    ManageRoles: 'manage_roles',
    ManageThreads: 'manage_threads',
    ManageWebhooks: 'manage_webhooks',
    MentionEveryone: 'mention_everyone',
    ModerateMembers: 'moderate_members',
    MoveMembers: 'move_members',
    MuteMembers: 'mute_members',
    PinMessages: 'pin_messages',
    PrioritySpeaker: 'priority_speaker',
    ReadMessageHistory: 'read_message_history',
    RequestToSpeak: 'request_to_speak',
    SendMessages: 'send_messages',
    SendMessagesInThreads: 'send_messages_in_threads',
    SendPolls: 'send_polls',
    SendTTSMessages: 'send_tts_messages',
    SendVoiceMessages: 'send_voice_messages',
    Speak: 'speak',
    Stream: 'stream',
    UseApplicationCommands: 'use_application_commands',
    UseEmbeddedActivities: 'use_embedded_activities',
    UseExternalApps: 'use_external_apps',
    UseExternalEmojis: 'use_external_emojis',
    UseExternalSounds: 'use_external_sounds',
    UseExternalStickers: 'use_external_stickers',
    UseSoundboard: 'use_soundboard',
    UseVAD: 'use_vad',
    ViewAuditLog: 'view_audit_log',
    ViewChannel: 'view_channel',
    ViewCreatorMonetizationAnalytics: 'view_creator_monetization_analytics',
    ViewGuildInsights: 'view_guild_insights',
};

/**
 * 檢查所有語言中的翻譯鍵是否完整
 * 收集所有語言中所有分類及其鍵，然後逐個語言檢查每個分類中是否有相應的鍵
 */
export function check_language_keys() {
    /** @type {string[]} */
    const locales = Object.values(Locale);

    // 收集所有語言中所有分類及其鍵的集合
    const allCategories = new Set();

    /** @type {Map<string, Set<string>>} */
    const allKeysByCategory = new Map();

    // 第一步：收集所有語言中的所有分類和鍵
    for (const locale of locales) {
        const localeData = locale in language
            ? language[locale]
            : null;

        if (!localeData) return;

        for (const [category, translations] of Object.entries(localeData)) {
            // 添加分類到集合
            allCategories.add(category);

            // 初始化該分類的鍵集合（如果還不存在）
            if (!allKeysByCategory.has(category)) {
                allKeysByCategory.set(category, new Set());
            };

            const keyset = allKeysByCategory.get(category);

            // 收集該分類下的所有鍵（遞歸處理嵌套對象）
            if (keyset) collectKeys(translations, '', keyset);
        };
    };

    // 第二步：逐個語言檢查每個分類中是否有相應的鍵
    for (const locale of Object.values(Locale)) {
        if (!(locale in language)) continue;

        const localeData = language[locale];

        // 檢查每個分類
        for (const category of allCategories) {
            const expectedKeys = allKeysByCategory.get(category);
            if (!expectedKeys || expectedKeys.size === 0) continue;

            // 獲取該語言中該分類的翻譯對象
            const categoryTranslations = localeData[category];

            if (!categoryTranslations) {
                // 該語言完全缺少這個分類
                logger.warn(`語言 "${locale}" (${locale}) 缺少分類 "${category}"`);
                continue;
            };

            // 收集該語言中該分類的所有鍵
            const actualKeys = new Set();
            collectKeys(categoryTranslations, '', actualKeys);

            // 檢查缺少哪些鍵
            for (const expectedKey of expectedKeys) {
                if (!actualKeys.has(expectedKey)) {
                    logger.warn(`語言 "${locale}" (${locale}) 的分類 "${category}" 缺少鍵 "${expectedKey}"`);
                };
            };

            // 檢查是否有額外的鍵（不在所有鍵集合中的鍵）
            for (const actualKey of actualKeys) {
                if (!expectedKeys.has(actualKey)) {
                    logger.warn(`語言 "${locale}" (${locale}) 的分類 "${category}" 有多餘的鍵 "${actualKey}"`);
                };
            };
        };
    };
};

/**
 * 遞歸收集對象中的所有鍵（使用點號表示法）
 * @param {Object} obj - 要收集鍵的對象
 * @param {string} prefix - 當前鍵的前綴
 * @param {Set<string>} keysSet - 存儲鍵的集合
 * @returns {void}
 */
function collectKeys(obj, prefix, keysSet) {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // 如果是嵌套對象，遞歸收集
            collectKeys(value, fullKey, keysSet);
        } else {
            // 如果是葉子節點，添加鍵到集合
            keysSet.add(fullKey);
        };
    };
};

/**
 *
 * @param {string} lang
 * @param {string} [default_lang]
 * @returns {{ [k: string]: any }}
 */
function get_lang(lang, default_lang = Locale.ChineseTW) {
    return (lang in language)
        ? language[lang]
        : language[default_lang];
};

/**
 *
 * @param {string} lang
 * @param {string} category
 * @param {string} [default_lang]
 * @returns {{ [k: string]: any }}
 */
function get_lang_category(lang, category, default_lang = Locale.ChineseTW) {
    const lang_data = get_lang(lang, default_lang);
    const lang_category = lang_data[category];

    return lang_category
        ? lang_category
        : language[default_lang][category];
};

/**
 * 獲取語言資料
 * @param {Locale | null | undefined} lang
 * @param {string} category
 * @param {string} key
 * @param {...any} replace - 文字中需要的變量
 * @returns {string}
 */
export function get_lang_data(lang, category, key, ...replace) {
    const default_lang = Locale.ChineseTW;

    if (!replace) replace = [];
    replace = replace.flat();

    lang = (lang && lang in language)
        ? lang
        : default_lang;

    const lang_category = get_lang_category(lang, category, default_lang);

    /** @type {string} */
    let lang_value = lang_category[key] ?? language[default_lang]?.[category]?.[key] ?? `${lang}.${category}.${key}`;

    if (replace?.length > 0) {
        for (let i = 0; i < replace.length; i++) {
            lang_value = lang_value.replaceAll(`{${i}}`, replace[i]);
        };
    };

    return lang_value;
};