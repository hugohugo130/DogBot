const { EmbedBuilder: djsEmbedBuilder } = require('discord.js');
const DogClient = require("./client.js");

class EmbedBuilder extends djsEmbedBuilder {
    constructor(data) {
        super(data);
    };

    /**
     * 
     * @param {string} [text=""]
     * @param {object | string | null} [rpg_data=null] 顯示飽食度，傳入rpg_data或user id
     * @param {boolean} [force=false] text參數將不會增加飽食度或機器犬文字
     * @param {DogClient} [client=global._client]
     * @returns {EmbedBuilder}
     */
    setEmbedFooter(text = "", rpg_data = null, force = false, client = global._client) {
        const { load_rpg_data } = require("../file.js");
        
        if (text.includes("飽食度剩餘")) {
            const { get_logger, getCallerModuleName } = require("../logger.js");
            const logger = get_logger({ nodc: true });
            logger.warn(`[DEPRECATED] give rpg_data or user id instead add to the text\ncalled from ${getCallerModuleName(null)}`);
        }
        
        let data;
        if (rpg_data) {
            if (rpg_data instanceof String) { // userid
                data = load_rpg_data(rpg_data);
            } else if (rpg_data instanceof Object) { // rpg_data
                data = rpg_data;
            };
        };

        if (!force && data) text += `飽食度剩餘 ${data.hunger}`;
        if (!force) text += "\n狗狗機器犬 ∙ 由哈狗製作";
        text = text.trim();

        if (!this.setFooter) {
            const { get_logger, getCallerModuleName } = require("../logger.js");
            const logger = get_logger({ nodc: true });
            logger.warn(`？為什麼阿，embed沒有setFooter方法？\n${this.toJSON?.() || this.toString?.() || String(this)}\ncalled from ${getCallerModuleName(null)}`);
            return this;
        };

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
