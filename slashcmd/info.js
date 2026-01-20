const { SlashCommandBuilder, SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, escapeMarkdown, Locale } = require("discord.js");

const { convertToSecondTimestamp } = require("../utils/timestamp.js");
const { load_rpg_data } = require("../utils/file.js");
const { get_emojis, jobs } = require("../utils/rpg.js");
const { get_lang_data } = require("../utils/language.js");
const { max_hunger } = require("../cogs/rpg/msg_handler.js");
const { embed_default_color } = require("../utils/config.js");
const EmbedBuilder = require("../utils/customs/embedBuilder.js");
const DogClient = require("../utils/customs/client.js");

/**
 * 
 * @param {Locale | string} locale
 * @param {DogClient} client
 * @returns {Promise<EmbedBuilder>}
 */
async function getBotInfoEmbed(locale = null, client = global.client) {
    const fix = (num) => {
        num = num / 1024 / 1024;
        return Math.floor(num);
    };

    const [emoji_timer, emoji_user, emoji_server, emoji_memory] = await get_emojis(["timer", "user", "server", "memory"], client);

    const lang_guild = get_lang_data(locale, "/info", "bot.guilds");
    const lang_members = get_lang_data(locale, "/info", "bot.members");
    const lang_uptime = get_lang_data(locale, "/info", "bot.uptime");
    const lang_memory = get_lang_data(locale, "/info", "bot.memory");
    const lang_footer = get_lang_data(locale, "/info", "bot.footer");

    const memUsage = process.memoryUsage();

    const serverCount = client.guilds.cache.size;
    const userCount = client.users.cache.size;
    const readyAt = convertToSecondTimestamp(client.readyAt.getTime());

    return new EmbedBuilder()
        .setColor(embed_default_color)
        .addFields(
            {
                name: `${emoji_server} ${lang_guild}`,
                value: `\`${serverCount}\``,
                inline: true,
            },
            {
                name: `${emoji_user} ${lang_members}`,
                value: `\`${userCount}\``,
                inline: true,
            },
            {
                name: `${emoji_timer} ${lang_uptime}`,
                value: `<t:${readyAt}:R>`,
                inline: true,
            },
            {
                name: `${emoji_memory} ${lang_memory}`,
                value: `\`${fix(memUsage.heapUsed)} MB\` / \`${fix(memUsage.heapTotal)} MB\` / \`${fix(memUsage.rss)} MB\``,
            },
        )
        .setFooter({ text: lang_footer })
        .setEmbedAuthor(`${client.user.tag} 🤖`);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("info")
        .setNameLocalizations({
            "zh-TW": "取得資訊",
            "zh-CN": "取得资讯",
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
                "zh-TW": "查詢使用者的資訊",
                "zh-CN": "查询用户的資訊",
            })
            .addUserOption(option =>
                option.setName("user")
                    .setNameLocalizations({
                        "zh-TW": "使用者",
                        "zh-CN": "用户",
                    })
                    .setDescription("Getting user's information")
                    .setDescriptionLocalizations({
                        "zh-TW": "查詢使用者的資訊",
                        "zh-CN": "查询用户的資訊",
                    }),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // guild
            .setName("guild")
            .setNameLocalizations({
                "zh-TW": "伺服器",
                "zh-CN": "服务器",
            })
            .setDescription("Getting guild's information")
            .setDescriptionLocalizations({
                "zh-TW": "查詢伺服器的資訊",
                "zh-CN": "查询服务器的資訊",
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // bot
            .setName("bot")
            .setNameLocalizations({
                "zh-TW": "機器人",
                "zh-CN": "机器人",
            })
            .setDescription("Getting bot information")
            .setDescriptionLocalizations({
                "zh-TW": "查詢機器人的資訊",
                "zh-CN": "查询机器人的資訊",
            }),
        ),
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {DogClient} client
     */
    async execute(interaction, client) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();

        const [
            emoji_idCard,
            emoji_timer,
            emoji_job,
            emoji_adventure,
            emoji_drumstick,
            emoji_badge,
            emoji_user,
            emoji_boost2,
            emoji_robot,
        ] = await get_emojis([
            "idCard",
            "timer",
            "job",
            "adventure",
            "drumstick",
            "badge",
            "user",
            "boost2",
            "robot",
        ], client);

        const locale = interaction.locale;

        switch (subcommand) {
            case "user": {
                const [
                    lang_no_data, // 無資料
                    lang_none, // 無
                    lang_privacy, // 隱私設定關閉
                    lang_single, // 單身
                    lang_id, // ID
                    lang_created_at, // 創建時間
                    lang_money, // 金錢
                    lang_hunger, // 飽食度
                    lang_job, // 民生職業
                    lang_fightjob, // 冒險職業
                    lang_badge, // 稱號
                    lang_relationship, // 感情狀態
                ] = await Promise.all([
                    get_lang_data(locale, "/info", "user.no_data"),
                    get_lang_data(locale, "/info", "user.none"),
                    get_lang_data(locale, "/info", "user.privacy"),
                    get_lang_data(locale, "/info", "user.single"),
                    get_lang_data(locale, "/info", "user.id"),
                    get_lang_data(locale, "/info", "user.created_at"),
                    get_lang_data(locale, "/info", "user.money"),
                    get_lang_data(locale, "/info", "user.hunger"),
                    get_lang_data(locale, "/info", "user.job"),
                    get_lang_data(locale, "/info", "user.adventure_job"),
                    get_lang_data(locale, "/info", "user.badge"),
                    get_lang_data(locale, "/info", "user.relationship"),
                ]);

                const user = interaction.options.getUser("user") ?? interaction.user;
                const userTag = user.tag;
                const userId = user.id;

                const rpg_data = await load_rpg_data(userId);
                const marry_data = rpg_data.marry || {};
                const lang_marry_info = get_lang_data(locale, "/info", "user.marry_info", marry_data.with, convertToSecondTimestamp(marry_data.time));

                const show_money = rpg_data.privacy.includes("money");
                let money = show_money ? rpg_data.money ?? lang_no_data : lang_privacy;
                if (typeof money === "number") money = `\`${money}$\``

                const hunger = rpg_data.hunger ?? lang_no_data;
                const job = rpg_data.job || lang_none;
                const fightjob = rpg_data.fightjob || lang_none;
                const badge = rpg_data.badge || lang_none;

                const marry_str = marry_data.status
                    ? lang_marry_info
                    : lang_single;

                const createdAt = convertToSecondTimestamp(user.createdAt.getTime());
                const emojiOfTheJob = jobs[job]?.emoji ? `${jobs[job]?.emoji} ` : "";
                const nameOfTheJob = jobs[job]?.name ? jobs[job]?.name : job;

                const user_data_embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setThumbnail(user.displayAvatarURL({ size: 1024 }))
                    .setTitle(escapeMarkdown(userTag))
                    .setFields(
                        {
                            name: `${emoji_idCard} ${lang_id}`,
                            value: `\`${userId}\``,
                        },
                        {
                            name: `${emoji_timer} ${lang_created_at}`,
                            value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`,
                        },
                    );

                const rpg_data_embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setFields(
                        {
                            name: `${emoji_job} ${lang_job}`,
                            value: `${emojiOfTheJob}${nameOfTheJob}`,
                            inline: true,
                        },
                        {
                            name: `${emoji_adventure} ${lang_fightjob}`,
                            value: fightjob,
                            inline: true,
                        },
                        {
                            name: `${emoji_drumstick} ${lang_hunger}`,
                            value: `\`${hunger}\` / \`${max_hunger}\``,
                            inline: true,
                        },
                        {
                            name: `💰 ${lang_money}`,
                            value: money,
                            inline: true,
                        },
                        {
                            name: `${emoji_badge} ${lang_badge}`,
                            value: badge,
                            inline: true,
                        },
                        {
                            name: `❤️ ${lang_relationship}`,
                            value: marry_str,
                            inline: false,
                        },
                    );

                await interaction.editReply({
                    embeds: [user_data_embed, rpg_data_embed],
                });
                break;
            };

            case "guild": {
                const [
                    lang_id, // ID
                    lang_members, // Members 成員
                    lang_boosts, // Boosts 加成狀態
                    lang_owner, // Owner 擁有者
                    lang_created_at, // Created At 創建時間
                    lang_icon, // Icon 圖標
                    lang_banner, // Banner 橫幅
                    lang_splash, // Splash 邀請背景
                ] = await Promise.all([
                    get_lang_data(locale, "/info", "guild.id"),
                    get_lang_data(locale, "/info", "guild.members"),
                    get_lang_data(locale, "/info", "guild.boosts"),
                    get_lang_data(locale, "/info", "guild.owner"),
                    get_lang_data(locale, "/info", "guild.created_at"),
                    get_lang_data(locale, "/info", "guild.icon"),
                    get_lang_data(locale, "/info", "guild.banner"),
                    get_lang_data(locale, "/info", "guild.splash"),
                ]);

                const guild = interaction.guild;
                const guildId = guild.id;
                const guildName = guild.name;
                const guildMembers = guild.memberCount;
                const boosts = guild.premiumSubscriptionCount ?? 0;
                const boostLevel = guild.premiumTier;
                const ownerId = guild.ownerId;
                const serverIconURL = guild.iconURL({ dynamic: true });
                const serverBanner = guild.bannerURL({ dynamic: true });
                const serverSplash = guild.splashURL({ dynamic: true });
                const createdAt = convertToSecondTimestamp(interaction.guild.createdAt.getTime());

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(guildName)
                    .setThumbnail(serverIconURL)
                    .setFields(
                        {
                            name: `${emoji_idCard} ${lang_id}`,
                            value: `\`${guildId}\``,
                            inline: true,
                        },
                        {
                            name: `${emoji_user} ${lang_members}`,
                            value: `\`${guildMembers}\``,
                            inline: true,
                        },
                        {
                            name: `${emoji_boost2} ${lang_boosts}`,
                            value: `${boosts} 個加成 / ${boostLevel} 級`,
                            inline: true,
                        },
                        {
                            name: `${emoji_timer} ${lang_created_at}`,
                            value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`,
                            inline: true,
                        },
                        {
                            name: `👑 ${lang_owner}`,
                            value: `<@${ownerId}>`,
                            inline: true,
                        },
                    );

                const BtnLinks = [];

                if (serverIconURL) {
                    BtnLinks.push(new ButtonBuilder()
                        .setLabel(lang_icon)
                        .setStyle(ButtonStyle.Link)
                        .setURL(serverIconURL)
                    );
                };

                if (serverBanner) {
                    BtnLinks.push(new ButtonBuilder()
                        .setLabel(lang_banner)
                        .setStyle(ButtonStyle.Link)
                        .setURL(serverBanner)
                    );
                };

                if (serverSplash) {
                    BtnLinks.push(new ButtonBuilder()
                        .setLabel(lang_splash)
                        .setStyle(ButtonStyle.Link)
                        .setURL(serverSplash)
                    );
                };

                const row = BtnLinks.length ?
                    new ActionRowBuilder()
                        .addComponents(BtnLinks)
                    : null;

                await interaction.editReply({ embeds: [embed], components: row ? [row] : [] });
                break;
            };

            case "bot": {
                const [embed, lang_refresh] = await Promise.all([
                    getBotInfoEmbed(locale, client),
                    get_lang_data(locale, "/info", "bot.refresh"),
                ]);

                const refreshButton = new ButtonBuilder()
                    .setCustomId(`refresh|any|/info bot`)
                    .setEmoji(emoji_robot)
                    .setLabel(lang_refresh)
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder()
                    .addComponents(refreshButton);

                await interaction.editReply({ embeds: [embed], components: [row] });
            };
        };
    },
    getBotInfoEmbed,
};
