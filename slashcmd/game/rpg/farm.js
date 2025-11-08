const { SlashCommandBuilder, EmbedBuilder, SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { get_id_of_name } = require("../../../utils/rpg.js");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("farm")
        .setDescription("farm related commands")
        .setNameLocalizations({
            "zh-TW": "種田",
            "zh-CN": "種田",
            "en-US": "farm",
        })
        .setDescriptionLocalizations({
            "zh-TW": "農田相關指令",
            "zh-CN": "农田相关指令",
            "en-US": "farm related commands",
        })
        .addSubcommand(new SlashCommandSubcommandBuilder() // info
            .setName("info")
            .setNameLocalizations({
                "zh-TW": "資訊",
                "zh-CN": "資訊",
                "en-US": "info",
            })
            .setDescription("View current farming status")
            .setDescriptionLocalizations({
                "zh-TW": "檢視目前農田狀態",
                "zh-CN": "查看目前农田状态",
                "en-US": "View current farming status",
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // get
            .setName("get")
            .setNameLocalizations({
                "zh-TW": "採收",
                "zh-CN": "采集",
                "en-US": "get",
            })
            .setDescription("Harvest crops")
            .setDescriptionLocalizations({
                "zh-TW": "採收農作物",
                "zh-CN": "采集农作物",
                "en-US": "Harvest crops",
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // plant
            .setName("plant")
            .setNameLocalizations({
                "zh-TW": "種植",
                "zh-CN": "种植",
                "en-US": "plant",
            })
            .setDescription("Use a hoe to plant crops")
            .setDescriptionLocalizations({
                "zh-TW": "使用鋤頭種植農作物",
                "zh-CN": "使用锄头种植农作物",
                "en-US": "Use a hoe to plant crops",
            })
            .addStringOption(option =>
                option.setName("hoe")
                    .setNameLocalizations({
                        "zh-TW": "鋤頭",
                        "zh-CN": "锄头",
                        "en-US": "hoe",
                    })
                    .setDescription("The hoe to be used")
                    .setDescriptionLocalizations({
                        "zh-TW": "要使用的锄头",
                        "zh-CN": "要使用的鋤頭",
                        "en-US": "The hoe to be used",
                    })
                    .setRequired(true)
                    .addChoices([
                        { name: "木鋤", value: get_id_of_name("木鋤", "wooden_hoe") },
                        { name: "鐵鋤", value: get_id_of_name("鐵鋤", "iron_hoe") },
                    ]),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // water
            .setName("water")
            .setNameLocalizations({
                "zh-TW": "澆水",
                "zh-CN": "浇水",
                "en-US": "water",
            })
            .setDescription("Water the farmland")
            .setDescriptionLocalizations({
                "zh-TW": "幫農田澆水",
                "zh-CN": "帮农田浇水",
                "en-US": "Water the farmland",
            })
        ),
    async execute(interaction) {
        return interaction.reply("該功能還沒完善！敬請期待！");
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();
        const { load_rpg_data, save_rpg_data, load_farm_data, save_farm_data} = require("../../../utils/file.js");
        const { name, oven_slots } = require("../../../utils/rpg.js");
        const { setEmbedFooter, get_emoji, rpg_cooldown } = require("../../../cogs/rpg/msg_handler.js");

        if (subcommand === "bake") {
        } else if (subcommand === "info") {
        } else if (subcommand === "get") {
        };
    },
};
