const { Locale } = require("discord.js")

/**
 * all keys are lowercase
 * @typedef {Object} Language
 */
const language = {
    [Locale.EnglishUS]: {
        "embed": {
            "footer": "DogBot · Made by hugo",
        },
    },

    [Locale.ChineseTW]: {
        "embed": {
            "footer": "狗狗機器犬 ∙ 由哈狗製作",
        },
    },
};

function get_lang_data(lang, k, default_lang = Locale.ChineseTW) {
    const [category, key] = k.split(".");

    return (language[lang]?.[category] ?? language[default_lang]?.[category])?.[key];
};

module.exports = {
    get_lang_data,
};