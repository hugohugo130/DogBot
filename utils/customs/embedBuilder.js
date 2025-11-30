const { EmbedBuilder: djsEmbedBuilder } = require('discord.js');
const { setEmbedFooter, setEmbedAuthor } = require("../../cogs/rpg/msg_handler.js");
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
        return setEmbedFooter(client, this, text, rpg_data, force);
    };

    /**
     * 
     * @param {string} author 
     * @param {DogClient} client
     * @returns {EmbedBuilder} 
     */
    setEmbedAuthor(author = "", client = global._client) {
        return setEmbedAuthor(client, this, author);
    };
};

module.exports = EmbedBuilder;
