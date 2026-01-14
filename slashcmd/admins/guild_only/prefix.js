const { SlashCommandBuilder, SlashCommandSubcommandBuilder, EmbedBuilder } = require("discord.js");

const { addPrefix, rmPrefix, getPrefixes } = require("../../../utils/file.js");
const { embed_default_color, reserved_prefixes } = require("../../../utils/config.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("prefix")
        .setDescription("prefix")
        .setNameLocalizations({
            "zh-CN": "前綴",
            "zh-TW": "前綴",
        })
        .setDescriptionLocalizations({
            "zh-CN": "RPG游戏的前缀",
            "zh-TW": "RPG遊戲的前綴",
        })
        .addSubcommand(new SlashCommandSubcommandBuilder() // add
            .setName("add")
            .setDescription("新增前綴")
            .setNameLocalizations({
                "zh-CN": "新增前綴",
                "zh-TW": "新增前綴",
            })
            .setDescriptionLocalizations({
                "zh-CN": "新增前綴",
                "zh-TW": "新增前綴",
            })
            .addStringOption(option =>
                option.setName("prefix")
                    .setDescription("前綴")
                    .setNameLocalizations({
                        "zh-CN": "前綴",
                        "zh-TW": "前綴",
                    })
                    .setDescriptionLocalizations({
                        "zh-CN": "前綴",
                        "zh-TW": "前綴",
                    })
                    .setMinLength(1)
                    .setRequired(true),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // remove
            .setName("remove")
            .setDescription("移除前綴")
            .setNameLocalizations({
                "zh-CN": "移除前綴",
                "zh-TW": "移除前綴",
            })
            .setDescriptionLocalizations({
                "zh-CN": "移除前綴",
                "zh-TW": "移除前綴",
            })
            .addStringOption(option =>
                option.setName("prefix")
                    .setDescription("前綴")
                    .setNameLocalizations({
                        "zh-CN": "前綴",
                        "zh-TW": "前綴",
                    })
                    .setDescriptionLocalizations({
                        "zh-CN": "前綴",
                        "zh-TW": "前綴",
                    })
                    .setMinLength(1)
                    .setRequired(true),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // list
            .setName("list")
            .setDescription("列出所有前綴")
            .setNameLocalizations({
                "zh-CN": "列出所有前綴",
                "zh-TW": "列出所有前綴",
            })
            .setDescriptionLocalizations({
                "zh-CN": "列出所有前綴",
                "zh-TW": "列出所有前綴",
            }),
        )
        .setDefaultMemberPermissions(0), // 只有管理員可以使用這個指令
    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();

        if (!interaction.guild) return interaction.editReply({ content: "你不在伺服器內執行這個指令！" })

        if (subcommand === "add") {
            const prefix = interaction.options.getString("prefix")?.trim();
            if (!prefix) return;

            const guildID = interaction.guildId;

            const res = addPrefix(guildID, prefix);

            if (!res) return await interaction.editReply({ content: "這個前綴已經存在了！" });

            await interaction.editReply({ content: `已增加前綴：${prefix}` });
        } else if (subcommand === "remove") {
            const prefix = interaction.options.getString("prefix")?.trim();
            if (!prefix) return;

            const guildID = interaction.guildId;

            if (reserved_prefixes.includes(prefix)) {
                return await interaction.editReply({ content: "這是一個已保留的前綴，無法移除。" });
            };

            const res = rmPrefix(guildID, prefix);

            if (!res) return await interaction.editReply({ content: "這個前綴不存在！" });

            await interaction.editReply({ content: `已移除前綴：${prefix}` });
        } else if (subcommand === "list") {
            const guildID = interaction.guildId;
            const prefixes = reserved_prefixes
                .concat(getPrefixes(guildID))
                .map((prefix, index) => `${index + 1}. ${prefix}`);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("前綴")
                .setDescription(prefixes.join("\n"))
                .setFooter({ text: `${prefixes.length} 個前綴` })

            // if (prefixes.length === 0) {
            // await interaction.editReply({ content: "此伺服器沒有設定任何前綴！" });
            // } else {
            await interaction.editReply({ embeds: [embed] });
            // };
        }
    },
};