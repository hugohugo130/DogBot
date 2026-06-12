import {
    SlashCommandBuilder,
} from "discord.js";

import {
    setRPG,
} from "../../../utils/file.js";

/** @type {import("../../../utils/types.js").Slash<["guild"]>} */
export const setRPGSlash = {
    builder: new SlashCommandBuilder()
        .setName("setrpg")
        .setDescription("Enable or disable the RPG system for this server")
        .setNameLocalizations({
            "zh-CN": "启用或禁用rpg游戏",
            "zh-TW": "啟用或停用rpg遊戲",
        })
        .setDescriptionLocalizations({
            "zh-CN": "启用或禁用服务器的RPG游戏",
            "zh-TW": "啟用或停用伺服器的RPG遊戲",
        })
        .addBooleanOption(option =>
            option.setName("enable")
                .setDescription("Enable or disable the RPG system")
                .setNameLocalizations({
                    "zh-CN": "启用或禁用",
                    "zh-TW": "啟用或停用",
                })
                .setDescriptionLocalizations({
                    "zh-CN": "启用或禁用RPG游戏",
                    "zh-TW": "啟用或停用RPG遊戲",
                })
                .setRequired(true),
        ),
        // .setDefaultMemberPermissions(0), // 只有管理員可以使用這個指令
    permissions: {
        user: ["ManageGuild"],
    },
    allowedContext: ["guild"],
    stage: "beta",

    async execute(interaction) {
        await interaction.deferReply();

        const enable = interaction.options.getBoolean("enable") ?? false;
        const guildID = interaction.guild.id;

        await setRPG(guildID, enable);

        await interaction.editReply({ content: `已${enable ? "啟用" : "停用"}RPG遊戲` });
    },
};