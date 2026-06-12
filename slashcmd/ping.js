import {
    SlashCommandBuilder,
} from "discord.js";

import {
    embed_default_color,
} from "../utils/config.js";
import EmbedBuilder from "../utils/customs/embedBuilder.js";

/** @type {import("../utils/types.js").Slash} */
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

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .addFields(
                { name: '🔗 API延遲', value: `${client.ws.ping}ms` },
                { name: '🌐 Global 全域延遲', value: `${globalPing}ms` }
            )
            .setEmbedFooter(interaction);

        return await interaction.editReply({ content: `Pong! ${client.ws.ping}ms`, embeds: [embed] });
    },
};