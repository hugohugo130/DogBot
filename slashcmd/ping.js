import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
} from "discord.js";

import {
    embed_default_color,
} from "../utils/config.ts";
import {
    get_lang_data,
} from "../utils/language.js";
import {
    get_emoji,
} from "../utils/rpg.js";
import EmbedBuilder from "../utils/customs/embedBuilder.js";

/** @type {import("../utils/types").Slash} */
export const pingSlash = {
    builder: new SlashCommandBuilder()
        .setName("ping")
        .setNameLocalizations({
            "zh-CN": "ping",
            "zh-TW": "ping"
        })
        .setDescription("Shows the bot's latency")
        .setDescriptionLocalizations({
            "zh-CN": "取得机器人延迟",
            "zh-TW": "取得機器人延遲"
        }),
    allowedContext: ["dm", "guild"],
    stage: "beta",

    async execute(interaction, client) {
        const start = Date.now();

        await interaction.deferReply();

        const globalPing = Date.now() - start;

        const lang_update = get_lang_data(interaction.locale, "/ping", "update");
        const emoji_refresh = await get_emoji("refresh", client);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .addFields(
                { name: '🔗 API延遲', value: `${client.ws.ping}ms` },
                { name: '🌐 Global 全域延遲', value: `${globalPing}ms` }
            )
            .setEmbedFooter(interaction);

        const row =
            /** @type {ActionRowBuilder<ButtonBuilder>} */
            (new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId("refresh|any|ping")
                        .setLabel(lang_update)
                        .setEmoji(emoji_refresh)
                        .setStyle(ButtonStyle.Success),
                ));

        return await interaction.editReply({ content: `Pong! ${client.ws.ping}ms`, embeds: [embed], components: [row] });
    },
};