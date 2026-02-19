const { SlashCommandBuilder, SlashCommandSubcommandBuilder, MessageFlags, ChatInputCommandInteraction } = require("discord.js");

const { addPrefix, rmPrefix, getPrefixes } = require("../../../utils/file.js");
const { embed_default_color, reserved_prefixes } = require("../../../utils/config.js");
const EmbedBuilder = require("../../../utils/customs/embedBuilder.js");

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
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @returns {Promise<any>}
     */
    async execute(interaction) {
        if (!interaction.guild) return await interaction.reply({ content: "你不在伺服器內執行這個指令！", flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();

        const prefix = interaction.options.getString("prefix")?.trim();

        if (subcommand === "add") {
            if (!prefix) return;

            const guildID = interaction.guild.id;

            const res = await addPrefix(guildID, prefix);

            if (!res) return await interaction.reply({ content: "這個前綴已經存在了！", flags: MessageFlags.Ephemeral });

            await interaction.reply({ content: `已增加前綴：${prefix}` });
        } else if (subcommand === "remove") {
            if (!prefix) return;

            const guildID = interaction.guild.id;

            if (reserved_prefixes.includes(prefix)) {
                return await interaction.reply({ content: "這是一個已保留的前綴，無法移除。", flags: MessageFlags.Ephemeral });
            };

            const res = await rmPrefix(guildID, prefix);

            if (!res) return await interaction.reply({ content: "這個前綴不存在！", flags: MessageFlags.Ephemeral });

            await interaction.reply({ content: `已移除前綴：${prefix}` });
        } else if (subcommand === "list") {
            await interaction.deferReply();

            const guildID = interaction.guild.id;
            const prefixes = reserved_prefixes
                .concat(await getPrefixes(guildID))
                .map((prefix, index) => `${index + 1}. ${prefix}`);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("前綴")
                .setDescription(prefixes.join("\n"))
                .setFooter({ text: `${prefixes.length} 個前綴` })

            await interaction.editReply({ embeds: [embed] });
        }
    },
};