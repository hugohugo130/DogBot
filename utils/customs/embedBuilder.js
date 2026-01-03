const { EmbedBuilder: djsEmbedBuilder, BaseInteraction, Locale } = require("discord.js");
const { load_rpg_data } = require("../file.js");
const { get_lang_data } = require("../language.js");
const DogClient = require("./client.js");

class EmbedBuilder extends djsEmbedBuilder {
    constructor(data) {
        super(data);
    };

    /**
     * 
     * @param {import("discord.js").Interaction | string} [interaction="zh-TW"] 盡量提供此參數 (為了獲取語言)
     * @param {{text?: string, rpg_data?: object | string | null, force?: boolean, client?: DogClient}} [param1]
     * @remark rpg_data 為 rpg_data 或 user id (顯示剩餘飽食度)
     * @remark force: text參數是否不會增加飽食度或機器犬文字
     * @returns {EmbedBuilder}
     */
    setEmbedFooter(interaction = null, { text = "", rpg_data = null, force = false, client = global._client } = {}) {
        if (interaction && typeof interaction === "object" && !(interaction instanceof BaseInteraction)) { // interaction應為config
            const { text: _text = "", rpg_data: _rpg_data = null, force: _force = false, client: _client = global._client } = interaction;

            text = _text;
            rpg_data = _rpg_data;
            force = _force;
            client = _client;
        };

        if (!interaction) interaction = Locale.ChineseTW;

        if (text.includes("飽食度剩餘")) {
            const { get_logger, getCallerModuleName } = require("../logger.js");

            const logger = get_logger({ nodc: true });
            logger.warn(`[DEPRECATED] give rpg_data or user id instead add to the text\ncalled from ${getCallerModuleName(null)}`);
        };

        let data;
        if (rpg_data) {
            if (rpg_data instanceof String) { // userid
                data = load_rpg_data(rpg_data);
            } else if (rpg_data instanceof Object) { // rpg_data
                data = rpg_data;
            };
        };

        let locale;
        if (interaction instanceof String) locale = interaction;
        else if (interaction?.locale) locale = interaction.locale;
        else locale = "zh-TW"; // default

        if (!force && data) text += `飽食度剩餘 ${data.hunger}`;
        if (!force) text += `\n${get_lang_data(locale, "embed", "footer")}`;
        text = text.trim();

        this.setFooter({
            text,
            iconURL: client?.user?.displayAvatarURL({ dynamic: true }),
        });

        return this;
    };

    /**
     * 
     * @param {string} author 
     * @param {DogClient} client
     * @returns {EmbedBuilder} 
     */
    setEmbedAuthor(author = "", client = global._client) {
        if (!author) author = client.name;

        this.setAuthor({
            name: author,
            iconURL: client?.user?.displayAvatarURL({ dynamic: true }),
        });

        return this;
    };
};

module.exports = EmbedBuilder;
