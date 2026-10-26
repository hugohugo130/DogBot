import {
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";

import type {
    Slash,
} from "../../../utils/types.d.ts";
import {
    get_transaction_embed,
} from "../../../cogs/rpg/interactions.js";

export const transactionSlash: Slash = {
    builder: new SlashCommandBuilder()
        .setName("transactions")
        .setNameLocalizations({
            "zh-CN": "交易记录",
            "zh-TW": "交易記錄",
        })
        .setDescription("Get your transaction history")
        .setDescriptionLocalizations({
            "zh-CN": "取得你的交易记录",
            "zh-TW": "取得你的交易記錄",
        })
        .addBooleanOption(option => // hide
            option.setName("hide")
                .setNameLocalizations({
                    "zh-CN": "隐藏",
                    "zh-TW": "隱藏",
                })
                .setDescription("Whether to hide your transactions (Default: true)")
                .setDescriptionLocalizations({
                    "zh-CN": "是否隐藏你的交易记录（默认启用）",
                    "zh-TW": "是否隱藏你的交易記錄（預設啟用）",
                })
                .setRequired(false),
        ),
    allowedContext: ["dm", "guild"],
    stage: "beta",

    async execute(interaction) {
        const hide = interaction.options.getBoolean("hide") ?? true;
        const embed = await get_transaction_embed(interaction);

        await interaction.reply({
            embeds: [embed],
            flags: hide
                ? MessageFlags.Ephemeral
                : undefined,
        });
    },
};