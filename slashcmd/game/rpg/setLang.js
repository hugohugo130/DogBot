import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
} from "discord.js";

import EmbedBuilder from "../../../utils/customs/embedBuilder.js";

/** @type {import("../../../utils/types").Slash} */
export const setLangSlash = {
    builder: new SlashCommandBuilder()
        .setName("set_language")
        .setDescription("Set bot display language")
        .setNameLocalizations({
            "zh-TW": "設定語言",
            "zh-CN": "设置语言",
            "en-US": "set_language",
        })
        .setDescriptionLocalizations({
            "zh-TW": "設定機器人顯示語言",
            "zh-CN": "设置机器人显示语言",
            "en-US": "set bot display language",
        }),
    allowedContext: ["dm", "guild"],
    stage: "beta",

    async execute(interaction) {
        // const { get_emoji } = require("../../../utils/rpg.ts");

        // const emoji = await get_emoji("top", interaction.client));
        // const embed = new EmbedBuilder()
        //     .setColor(0x00BBFF)
        //     .setTitle(`${emoji} | 設定語言`)
        //     .setDescription(`請選擇要設定的語言`)
        //     .setEmbedFooter(interaction);

        // const row = new ActionRowBuilder()

        // for (const [key, value] of Object.entries(client.available_languages)) {
        //     row.addComponents(
        //         new ButtonBuilder()
        //             .setCustomId(`setLang|${interaction.user.id}|${key}`)
        //             .setLabel(value)
        //             .setStyle(ButtonStyle.Success)
        //     );
        // }

        // await interaction.editReply({ embeds: [embed], components: [row] });
        await interaction.reply("已放棄，小孩很累。");
    },
};
