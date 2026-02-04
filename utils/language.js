const { Locale } = require("discord.js");

const { get_logger } = require("./logger");

/**
 * all keys are lowercase
 * {0} {1} {2} ... are placeholders
 * 
 * 所有鍵都是小寫的
 * {0} {1} {2} ... 是文字需要的變量
 * @typedef {Object} Translation
 */
const language = {
    [Locale.EnglishUS]: {
        "embed": {
            "footer": "DogBot · Made by hugo",
        },
        "rpg": {
            "fightjob.none": "None",
            "fightjob.transfer_to": "Successfully changed fight job to",
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
        "rpg": {
            "fightjob.none": "無",
            "fightjob.transfer_to": "成功轉職到",
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

/**
 * 檢查所有語言中的翻譯鍵是否完整
 * 收集所有語言中所有分類及其鍵，然後逐個語言檢查每個分類中是否有相應的鍵
 * 如果缺少鍵則使用 logger.warn 記錄警告
 */
function check_language_keys() {
    // 收集所有語言中所有分類及其鍵的集合
    const allCategories = new Set();

    /** @type {Map<string, Set<string>>} */
    const allKeysByCategory = new Map();

    // 第一步：收集所有語言中的所有分類和鍵
    for (const locale of Object.values(Locale)) {
        if (!language[locale]) continue;

        const localeData = language[locale];

        for (const [category, translations] of Object.entries(localeData)) {
            // 添加分類到集合
            allCategories.add(category);

            // 初始化該分類的鍵集合（如果還不存在）
            if (!allKeysByCategory.has(category)) {
                allKeysByCategory.set(category, new Set());
            };

            // 收集該分類下的所有鍵（遞歸處理嵌套對象）
            collectKeys(translations, '', allKeysByCategory.get(category));
        };
    };

    // 第二步：逐個語言檢查每個分類中是否有相應的鍵
    for (const locale of Object.values(Locale)) {
        if (!language[locale]) continue;

        const localeData = language[locale];
        const localeName = getLocaleName(locale);

        // 檢查每個分類
        for (const category of allCategories) {
            const expectedKeys = allKeysByCategory.get(category);
            if (!expectedKeys || expectedKeys.size === 0) continue;

            // 獲取該語言中該分類的翻譯對象
            const categoryTranslations = localeData[category];

            if (!categoryTranslations) {
                // 該語言完全缺少這個分類
                logger.warn(`語言 "${localeName}" (${locale}) 缺少分類 "${category}"`);
                continue;
            };

            // 收集該語言中該分類的所有鍵
            const actualKeys = new Set();
            collectKeys(categoryTranslations, '', actualKeys);

            // 檢查缺少哪些鍵
            for (const expectedKey of expectedKeys) {
                if (!actualKeys.has(expectedKey)) {
                    logger.warn(`語言 "${localeName}" (${locale}) 的分類 "${category}" 缺少鍵 "${expectedKey}"`);
                };
            };

            // 檢查是否有額外的鍵（不在所有鍵集合中的鍵）
            for (const actualKey of actualKeys) {
                if (!expectedKeys.has(actualKey)) {
                    logger.warn(`語言 "${localeName}" (${locale}) 的分類 "${category}" 有多餘的鍵 "${actualKey}"`);
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
 * 獲取語言的名稱（用於日誌輸出）
 * @param {string} locale - 語言代碼
 * @returns {string} 語言名稱
 */
function getLocaleName(locale) {
    const localeNames = {
        [Locale.EnglishUS]: "英文（美式）",
        [Locale.ChineseTW]: "中文（繁體）",
    };

    return localeNames[locale] || locale;
};

/**
 *
 * @param {string} lang
 * @param {string} [default_lang]
 * @returns {object}
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
 * @returns {object}
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
 * @param {string | null} lang
 * @param {string} category
 * @param {string} key
 * @param {string[]} [replace=[]] - 文字中需要的變量
 * @returns {string}
 */
function get_lang_data(lang, category, key, ...replace) {
    const default_lang = Locale.ChineseTW;

    replace = replace.flat();

    lang = (lang && lang in language)
        ? lang
        : default_lang;

    const lang_category = get_lang_category(lang, category, default_lang);
    let lang_value = lang_category[key] ?? language[default_lang][category][key];

    if (replace?.length > 0) {
        for (let i = 0; i < replace.length; i++) {
            lang_value = lang_value.replace(`{${i}}`, replace[i]);
        };
    };

    return lang_value;
};

module.exports = {
    check_language_keys,
    get_lang_data,
};