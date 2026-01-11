const { Locale } = require("discord.js");
const { get_logger, getCallerModuleName } = require("./logger");

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
    },

    [Locale.ChineseTW]: {
        "embed": {
            "footer": "狗狗機器犬 ∙ 由哈狗製作",
        },
        "rpg": {

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
    },
};

const logger = get_logger();

/**
 * 檢查所有語言是否都有相同的 key
 */
function check_language_keys() {
    // 收集所有語言的所有category和key
    const all_keys = new Set();
    for (const lang in language) {
        for (const category in language[lang]) {
            for (const key in language[lang][category]) {
                all_keys.add(`${category}.${key}`);
            };
        };
    };

    // 檢查每個語言是否都有相應category中的key
    for (const lang in language) {
        for (const category in language[lang]) {
            for (const key of all_keys) {
                if (!language[lang][category][key]) {
                    logger.warn(`Language ${lang} is missing key ${category}.${key}`);
                };
            };
        };
    };
};

// 想問一個問題，像上面check language keys是一個sync function
// 那麼我直接加上async讓他變成async function，但沒有用到任何await的話，他是不是也會在await func() 的時候不阻塞主執行緒？
// 回答我: 

/**
 * 
 * @param {string} lang
 * @param {Locale | string} [default_lang]
 * @returns {object}
 */
function get_lang(lang, default_lang = Locale.ChineseTW) {
    return (lang in language)
        ? language[lang]
        : language[default_lang];
};

/**
 * 
 * @param {Locale | string} lang
 * @param {string} category
 * @param {Locale | string} [default_lang]
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
 * 
 * @param {Locale | string | null} lang
 * @param {string} category
 * @param {Locale | string} key
 * @param {string[]} replace - 文字中需要的變量
 * @returns {string}
 */
function get_lang_data(lang, category, key, ...replace) {
    const default_lang = Locale.ChineseTW;

    if (!lang) lang = default_lang;

    const lang_category = get_lang_category(lang, category, default_lang);
    let lang_value = lang_category[key];

    if (!lang_value) lang_value = language[default_lang][category][key];

    if (replace.length > 0) {
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