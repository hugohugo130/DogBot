const { SlashCommandBuilder, EmbedBuilder, SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, User, Client, ChatInputCommandInteraction } = require("discord.js");

/*
fisher
pharmacist
farmer
cook
miner
herder
blacksmith
lumberjack
*/
const job_emojis = {
    "fisher": "fisher",
    "pharmacist": "potion",
    "farmer": "farmer",
    "cook": "cook",
    "miner": "ore",
    "herder": "cow",
    "blacksmith": "anvil",
    "lumberjack": "wood",
};

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
        .addSubcommand(new SlashCommandSubcommandBuilder() // user
            .setName("user")
            .setNameLocalizations({
                "zh-TW": "使用者",
                "zh-CN": "用户",
            })
            .setDescription("Getting user's information")
            .setDescriptionLocalizations({
                "zh-TW": "取得使用者資訊",
                "zh-CN": "取得用户資訊",
            })
            .addUserOption(option =>
                option.setName("user")
                    .setNameLocalizations({
                        "zh-TW": "使用者",
                        "zh-CN": "用户",
                    })
                    .setDescription("Getting user's information")
                    .setDescriptionLocalizations({
                        "zh-TW": "取得使用者資訊",
                        "zh-CN": "取得用户資訊",
                    })
            )
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // guild
            .setName("guild")
            // .setNameLocalizations({
            //     "zh-TW": "資訊",
            //     "zh-CN": "資訊",
            //     "en-US": "info",
            // })
            .setDescription("Getting guild's information")
            // .setDescriptionLocalizations({
            //     "zh-TW": "檢視目前農田狀態",
            //     "zh-CN": "查看目前农田状态",
            //     "en-US": "Getting guild's information",
            // }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // bot
            .setName("bot")
            // .setNameLocalizations({
            //     "zh-TW": "採收",
            //     "zh-CN": "采集",
            //     "en-US": "get",
            // })
            .setDescription("Getting bot's information")
            .setDescriptionLocalizations({
                "zh-TW": "採收農作物",
                "zh-CN": "采集农作物",
                "en-US": "Getting bot's information",
            }),
        ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const { load_rpg_data } = require("../utils/file.js");
        const { get_emoji } = require("../utils/rpg.js");
        const { convertToSecond } = require("../utils/timestamp.js");
        const { embed_default_color } = require("../utils/config.js");

        await interaction.deferReply();

        const client = interaction.client;
        const subcommand = interaction.options.getSubcommand();

        const emoji_idCard = await get_emoji(client, "idCard");
        const emoji_timer = await get_emoji(client, "timer");
        const emoji_job = await get_emoji(client, "job");
        const emoji_adventure = await get_emoji(client, "adventure");

        if (subcommand === "user") {
            const user = interaction.options.getUser("user") ?? interaction.user;
            const userTag = user.tag;
            const userId = user.id;
            const createdAt = convertToSecond(user.createdAt.getTime());
            const rpg_data = await load_rpg_data(userId);
            const job = rpg_data.job || "無";
            // const job_emoji = await get_emoji(client, job_emojis[job]);

            const user_data_embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(userTag)
                .setFields(
                    {
                        name: `${emoji_idCard} ID`,
                        value: `\`${userId}\``,
                    },
                    {
                        name: `${emoji_timer} 創建時間`,
                        value: `<t:${createdAt}:F> (<t:${createdAt}:R>}`,
                    },
                );

            const rpg_data_embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setFields(
                    {
                        name: "民生職業",
                        value: job,
                        inline: true,
                    },
                    {
                        name: "冒險職業",
                        value: "未開放",
                        inline: true,
                    },
                    {
                        name: "沒做完",
                        value: "不~沒時間了，先做作業 D:\n先這樣吧",
                        inline: false,
                    },
                );

            await interaction.editReply({
                embeds: [user_data_embed, rpg_data_embed],
            });
        };
    },
};
