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
        .setName("info")
        .setDescription("info")
        .setNameLocalizations({
            "zh-TW": "資訊",
            "zh-CN": "资讯",
        })
        .setDescriptionLocalizations({
            "zh-TW": "取得資訊",
            "zh-CN": "取得资讯",
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
        const { setEmbedFooter, setEmbedAuthor } = require("../cogs/rpg/msg_handler.js");
        const { convertToSecond } = require("../utils/timestamp.js");
        const { embed_default_color } = require("../utils/config.js");

        await interaction.deferReply();

        const client = interaction.client;
        const subcommand = interaction.options.getSubcommand();

        const emoji_idCard = await get_emoji(client, "idCard");
        const emoji_timer = await get_emoji(client, "timer");
        const emoji_job = await get_emoji(client, "job");
        const emoji_adventure = await get_emoji(client, "adventure");
        const emoji_user = await get_emoji(client, "user");
        const emoji_boost2 = await get_emoji(client, "boost2");
        const emoji_server = await get_emoji(client, "server");
        const emoji_memory = await get_emoji(client, "memory");

        const memUsage = process.memoryUsage();

        const fix = (num) => {
            num = num / 1024 / 1024;
            return num;
        };

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
        } else if (subcommand === "guild") {
            const guild = interaction.guild;
            const guildId = guild.id;
            const guildName = guild.name;
            const guildMembers = guild.memberCount;
            const boosts = guild.premiumSubscriptionCount ?? 0;
            const boostLevel = guild.premiumTier;
            const ownerId = guild.ownerId;
            const serverIconURL = guild.iconURL({ dynamic: true });
            const serverBanner = guild.bannerURL({ dynamic: true });
            const serverInviteBG = guild.splashURL({ dynamic: true });
            const createdAt = convertToSecond(interaction.guild.createdAt.getTime());

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(guildName)
                .setThumbnail(serverIconURL)
                .setFields(
                    {
                        name: `${emoji_idCard} ID`,
                        value: `\`${guildId}\``,
                        inline: true,
                    },
                    {
                        name: `${emoji_user} 成員`,
                        value: `\`${guildMembers}\``,
                        inline: true,
                    },
                    {
                        name: `${emoji_boost2} 加成狀態`,
                        value: `${boosts} 個加成 / ${boostLevel} 級`,
                        inline: true,
                    },
                    {
                        name: `${emoji_timer} 創建時間`,
                        value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`,
                        inline: true,
                    },
                    {
                        name: `👑 擁有者`,
                        value: `<@${ownerId}>`,
                        inline: true,
                    },
                );

            const BtnLinks = [];

            BtnLinks.push(new ButtonBuilder()
                .setLabel("圖標")
                .setStyle(ButtonStyle.Link)
                .setURL(serverIconURL)
            );

            if (serverBanner) {
                BtnLinks.push(new ButtonBuilder()
                    .setLabel("橫幅")
                    .setStyle(ButtonStyle.Link)
                    .setURL(serverBanner)
                );
            };

            if (serverInviteBG) {
                BtnLinks.push(new ButtonBuilder()
                    .setLabel("邀請背景")
                    .setStyle(ButtonStyle.Link)
                    .setURL(serverInviteBG)
                );
            };

            const row = new ActionRowBuilder()
                .addComponents(BtnLinks);

            await interaction.editReply({ embeds: [embed], components: [row] });
        } else if (subcommand === "bot") {
            const serverCount = interaction.client.guilds.cache.size;
            const userCount = interaction.client.users.cache.size;
            const readyAt = convertToSecond(interaction.client.readyAt.getTime());

            let embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .addFields(
                    {
                        name: `${emoji_server} 伺服器`,
                        value: `\`${serverCount}\``,
                        inline: true,
                    },
                    {
                        name: `${emoji_user} 成員`,
                        value: `\`${userCount}\``,
                        inline: true,
                    },
                    {
                        name: `${emoji_timer} 開機時間`,
                        value: `<t:${readyAt}:R>`,
                        inline: true,
                    },
                    {
                        name: `${emoji_memory} 記憶體狀況 (Used / Total / RSS)`,
                        value: `\`${fix(memUsage.heapUsed)} MB\` / \`${fix(memUsage.heapTotal)} MB\` / \`${fix(memUsage.rss)} MB\``,
                    },
                );

            embed = setEmbedFooter(client, embed, "我們使用 discord.js 製作這個機器人", null, true);
            embed = setEmbedAuthor(client, embed, `${client.tag}🤖`);

            await interaction.editReply({ embeds: [embed] });
        };
    },
};
