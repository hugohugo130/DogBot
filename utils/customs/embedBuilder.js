import {
    BaseInteraction,
    EmbedBuilder as djsEmbedBuilder,
    Locale,
} from "discord.js";

import {
    isDigit,
} from "../message.js";
import {
    RPGDatabase,
} from "../config.js";
import {
    get_lang_data,
} from "../language.js";
import DogClient from "./client.js";

export default class EmbedBuilder extends djsEmbedBuilder {
    /**
     * @param {import('discord.js').EmbedData | import('discord.js').APIEmbed} [data]
     */
    constructor(data) {
        super(data);
    };

    /**
     * set customize footer
     * @param {BaseInteraction | Locale | string | null | { text?: string, rpg_data?: RPGDatabase | null, force?: boolean, client?: DogClient }} [interaction="zh-TW"] 盡量提供此參數 (為了獲取語言)
     * @param {Object} options
     * @param {string} [options.text=""]
     * @param {RPGDatabase | null} [options.rpg_data=null]
     * @param {boolean} [options.force=false]
     * @param {DogClient | null} [options.client]
     * @remark force: text參數是否不會增加飽食度和機器犬文字
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

        /** @type {Locale} */
        let locale = Locale.ChineseTW;

        if (
            typeof interaction === "string"
            && isDigit(interaction)
        ) {
            const userid = interaction;

            const cached_locale = client?.get_user_locale(userid);
            if (cached_locale) locale = cached_locale;
        };

        if (interaction instanceof BaseInteraction) {
            locale = interaction.locale;

            const userid = interaction.user.id;
            client?.save_user_locale(userid, locale);
        };

        if (!force && rpg_data) text += `飽食度剩餘 ${rpg_data.hunger}`;
        if (!force) text += `\n${get_lang_data(locale, "embed", "footer")}`;
        text = text.trim();

        this.setFooter({
            text,
            iconURL: client?.user?.displayAvatarURL(),
        });

        return this;
    };

    /**
     *
     * @param {DogClient} client
     * @param {string} [author=""] - defaults to "", and convert to client.name
     * @returns {EmbedBuilder}
     */
    setEmbedAuthor(client, author = "") {
        if (!author) author = client.name;

        this.setAuthor({
            name: author,
            iconURL: client?.user?.displayAvatarURL(),
        });

        return this;
    };
};
