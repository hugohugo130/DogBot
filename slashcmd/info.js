import {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    escapeMarkdown,
    Locale,
    ContainerBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    Message,
    ChannelType,
    NewsChannel,
    StageChannel,
    ThreadChannel,
} from "discord.js";

import {
    convertToSecondTimestamp,
} from "../utils/timestamp.js";
import {
    load_rpg_data,
    load_user_privacy,
} from "../utils/db/rpg.js";
import {
    get_emojis,
    get_emoji,
    get_job_name,
    get_fightjob_name,
    valid_job_id,
} from "../utils/rpg.js";
import {
    get_lang_data,
} from "../utils/language.js";
import {
    wait_for_client,
} from "../utils/wait_for_client.js";
import {
    embed_default_color,
    max_hunger,
    jobs,
    fightjobs,
    container_default_color,
} from "../utils/config.js";
import EmbedBuilder from "../utils/customs/embedBuilder.js";
import DogClient from "../utils/customs/client.js";

/**
 * @param {Locale | null} [locale=null]
 * @param {DogClient | null} [client]
 * @returns {Promise<EmbedBuilder>}
 */
export async function getBotInfoEmbed(locale = null, client = global._client) {
    if (!client) client = await wait_for_client();

    const fix =
        /**
         * divide a number by 1024*1024 and floor or fix it
         * @overload
         * @param {number} num
         * @param {number} tofix
         * @returns {string}
         *
         * @overload
         * @param {number} num
         * @param {null} tofix
         * @returns {number}
         *
         * @overload
         * @param {number} num
         * @param {number | null} [tofix=null]
         * @returns {number | string}
         *
         * @param {number} num
         * @param {number | null} [tofix=null]
         */
        (num, tofix = null) => {
            num = num / 1024 / 1024;
            return tofix ? num.toFixed(tofix) : Math.floor(num);
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
    const readyAt = client.readyAt
        ? convertToSecondTimestamp(client.readyAt.getTime())
        : "無法獲取資料";

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
                value: `\`${fix(memUsage.heapUsed, 1).replace(".0", "")} MB\` / \`${fix(memUsage.heapTotal)} MB\` / \`${fix(memUsage.rss)} MB\``,
            },
        )
        .setFooter({ text: lang_footer })
        .setEmbedAuthor(client, `${client.user?.tag} 🤖`);
};

/**
 * @param {Message} message
 * @param {Locale | null} [locale=null]
 * @returns {ContainerBuilder}
 */
export function getMsgInfoContainer(message, locale = null) {
    const messageId = message.id;
    const author = message.author;
    const msg_channel = message.channel;
    const msg_channel_id = msg_channel.id;
    const createdAt = Math.floor(message.createdAt.getTime() / 1000);
    const editedAt = message.editedAt ? Math.floor(message.editedAt.getTime() / 1000) : null;

    const jump_url = `https://discord.com/channels/${message.guildId}/${msg_channel_id}/${messageId}`;

    /*
    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle("訊息資訊")
        .addFields(
            { name: "訊息ID", value: messageId, inline: true },
            { name: "頻道", value: `${msg_channel.toString()} (${msg_channel_id})`, inline: true },
            { name: "作者", value: `${author.toString()} (${author.id})`, inline: true },
            { name: "內容", value: message.content?escapeMarkdown(message.content) : "無內容", inline: false },
            { name: "跳轉至訊息", value: `[點擊此處](${jump_url})`, inline: false },
            { name: "附件", value: message.attachments.size ? message.attachments.map(a => a.url).join("\n") : "無附件", inline: false },
            { name: "建立時間", value: createdAt ? `<t:${createdAt}:D><t:${createdAt}:T>\n(<t:${createdAt}:R>)` : "未知", inline: true },
            { name: "編輯時間", value: editedAt ? `<t:${editedAt}:D><t:${editedAt}:T>\n(<t:${editedAt}:R>)` : "未編輯", inline: true }
        );
    */

    const lang_id = get_lang_data(locale, "/info", "message.id");
    const lang_author = get_lang_data(locale, "/info", "message.author");
    const lang_channel = get_lang_data(locale, "/info", "message.channel");
    const lang_content = get_lang_data(locale, "/info", "message.content");
    const lang_clickhere = get_lang_data(locale, "/info", "message.clickhere");
    const lang_no_content = get_lang_data(locale, "/info", "message.no_content");
    const lang_jump_to_msg = get_lang_data(locale, "/info", "message.jump_to_msg");
    const lang_attachment = get_lang_data(locale, "/info", "message.attachment");
    const lang_message_info = get_lang_data(locale, "/info", "message.message_info");
    const lang_no_attachment = get_lang_data(locale, "/info", "message.no_attachment");
    const lang_created_at = get_lang_data(locale, "/info", "message.created_at");
    const lang_edited_at = get_lang_data(locale, "/info", "message.edited_at");
    const lang_unedited = get_lang_data(locale, "/info", "message.unedited");
    const lang_unknown = get_lang_data(locale, "/info", "message.unknown");
    const lang_update = get_lang_data(locale, "/info", "message.update");

    return new ContainerBuilder()
        .setAccentColor(container_default_color)
        .addSectionComponents((section) =>
            section
                .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### **${lang_message_info}**`))
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setCustomId(`refresh|any|/info message|${message.id}`)
                        .setEmoji("💬")
                        .setLabel(lang_update)
                        .setStyle(ButtonStyle.Primary)
                ),
        )
        .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**${lang_id}**:\n${messageId}`))
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**${lang_channel}**:\n${msg_channel.toString()} (${msg_channel_id})`))
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**${lang_author}**:\n${author.toString()} (${author.id})`))
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**${lang_content}**:\n${message.content ? escapeMarkdown(message.content) : lang_no_content}`))
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**${lang_jump_to_msg}**:\n[${lang_clickhere}](${jump_url})`))
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**${lang_attachment}**:\n${message.attachments.size ? message.attachments.map(a => a.url).join("\n") : lang_no_attachment}`))
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**${lang_created_at}**:\n${createdAt ? `<t:${createdAt}:D><t:${createdAt}:T>\n(<t:${createdAt}:R>)` : lang_unknown}`))
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**${lang_edited_at}**:\n${editedAt ? `<t:${editedAt}:D><t:${editedAt}:T>\n(<t:${editedAt}:R>)` : lang_unedited}`))
};

/**
 * @param {Exclude<import("discord.js").TextBasedChannel, import("discord.js").PublicThreadChannel | import("discord.js").PrivateThreadChannel | NewsChannel | StageChannel>} channel
 * @param {Locale | null} [locale]
 * @returns {Promise<[EmbedBuilder, ActionRowBuilder<ButtonBuilder>]>}
*/
export async function getChannelInfoEmbedRows(channel, locale = null) {
    const emoji_refresh = await get_emoji("refresh");

    const lang_id = get_lang_data(locale, "/info", "channel.id");
    const lang_none = get_lang_data(locale, "/info", "channel.none");
    const lang_update = get_lang_data(locale, "/info", "channel.update");
    const lang_category = get_lang_data(locale, "/info", "channel.category");
    const lang_created_at = get_lang_data(locale, "/info", "channel.created_at");
    const lang_dm_channel = get_lang_data(locale, "/info", "channel.dm_channel");
    const lang_description = get_lang_data(locale, "/info", "channel.description");
    const lang_channel_info = get_lang_data(locale, "/info", "channel.channel_info");
    const lang_text_channel = get_lang_data(locale, "/info", "channel.text_channel");
    const lang_channel_type = get_lang_data(locale, "/info", "channel.channel_type");
    const lang_channel_name = get_lang_data(locale, "/info", "channel.channel_name");
    const lang_channel_position = get_lang_data(locale, "/info", "channel.position");
    const lang_voice_channel = get_lang_data(locale, "/info", "channel.voice_channel");

    const { id: channelID, createdAt } = channel;
    const DMBased = channel.isDMBased();
    const VoiceBased = channel.isVoiceBased();
    const createdAtTimestamp = Math.floor((createdAt?.getTime() ?? 0) / 1000);
    const type = channel.isDMBased()
        ? lang_dm_channel
        : channel.isVoiceBased()
            ? lang_voice_channel
            : lang_text_channel;

    /** @type {Record<string, string>} */
    const fields = {
        [lang_id]: channelID,
        [lang_channel_type]: type,
    };

    if (!DMBased) {
        fields[lang_channel_name] = channel.name;
    };

    if (!DMBased && !VoiceBased) {
        fields[lang_description] = channel.topic || lang_none;
    };

    if (createdAt) {
        fields[lang_created_at] = `<t:${createdAtTimestamp}:D><t:${createdAtTimestamp}:T>`;
    };

    if (!DMBased) {
        fields[lang_category] = channel.parent?.name ?? lang_none;
        fields[lang_channel_position] = channel.position.toString();
    };

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(lang_channel_info)
        .setEmbedFooter(locale);

    const row = /** @type {ActionRowBuilder<ButtonBuilder>} */
        (new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("refresh|any|/info channel")
                    .setLabel(lang_update)
                    .setEmoji(emoji_refresh)
                    .setStyle(ButtonStyle.Success)
            ));

    for (const [name, value] of Object.entries(fields).slice(0, 25)) {
        embed.addFields({ name, value, inline: false });
    };

    return [embed, row];
};

/** @type {import("../utils/types").Slash} */
export const infoSlash = {
    builder: new SlashCommandBuilder()
        .setName("info")
        .setNameLocalizations({
            "zh-TW": "取得資訊",
            "zh-CN": "取得资讯",
        })
        .setDescription("info")
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
                "zh-TW": "查看使用者的資訊",
                "zh-CN": "查看用户的資訊",
            })
            .addUserOption(option =>
                option.setName("user")
                    .setNameLocalizations({
                        "zh-TW": "使用者",
                        "zh-CN": "用户",
                    })
                    .setDescription("Getting user's information")
                    .setDescriptionLocalizations({
                        "zh-TW": "查看使用者的資訊",
                        "zh-CN": "查看用户的資訊",
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
                "zh-TW": "查看伺服器的資訊",
                "zh-CN": "查看服务器的資訊",
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
                "zh-TW": "查看機器人的資訊",
                "zh-CN": "查看机器人的資訊",
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // message
            .setName("message")
            .setNameLocalizations({
                "zh-TW": "訊息",
                "zh-CN": "讯息",
            })
            .setDescription("Getting message information (default is the last message in the channel)")
            .setDescriptionLocalizations({
                "zh-TW": "查看訊息的資訊 (預設是頻道中最後一則訊息)",
                "zh-CN": "查看讯息的资讯 (预设是频道中最后一则讯息)",
            })
            .addStringOption(option =>
                option.setName("message_id")
                    .setNameLocalizations({
                        "zh-TW": "訊息id",
                        "zh-CN": "讯息id",
                    })
                    .setDescription("The message id")
                    .setDescriptionLocalizations({
                        "zh-TW": "訊息的id",
                        "zh-CN": "讯息的id",
                    })
                    .setRequired(false),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // channel
            .setName("channel")
            .setNameLocalizations({
                "zh-TW": "頻道",
                "zh-CN": "频道",
            })
            .setDescription("Getting channel information")
            .setDescriptionLocalizations({
                "zh-TW": "查看頻道的資訊",
                "zh-CN": "查看频道的资讯",
            })
            .addChannelOption(option =>
                option.setName("channel")
                    .setNameLocalizations({
                        "zh-TW": "頻道",
                        "zh-CN": "频道",
                    })
                    .setDescription("The target channel")
                    .setDescriptionLocalizations({
                        "zh-TW": "要查看的頻道",
                        "zh-CN": "要看的频道",
                    })
                    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
                    .setRequired(false),
            ),
        ),
    allowedContext: ["dm", "guild"],
    stage: "beta",

    async execute(interaction, client) {
        const { channel, options } = interaction;
        if (!channel || (
            channel instanceof ThreadChannel
            || channel instanceof NewsChannel
            || channel instanceof StageChannel
        )) return;

        const subcommand = options.getSubcommand();

        const [_, [
            emoji_idCard,
            emoji_timer,
            emoji_job,
            emoji_adventure,
            emoji_drumstick,
            emoji_badge,
            emoji_user,
            emoji_boost2,
            emoji_robot,
        ]] = await Promise.all([
            interaction.deferReply(),
            get_emojis([
                "idCard",
                "timer",
                "job",
                "adventure",
                "drumstick",
                "badge",
                "user",
                "boost2",
                "robot",
            ], client),
        ]);

        const locale = interaction.locale;

        switch (subcommand) {
            case "user": {
                const lang_no_data = get_lang_data(locale, "/info", "user.no_data"); // 無資料
                const lang_none = get_lang_data(locale, "/info", "user.none"); // 無
                const lang_privacy = get_lang_data(locale, "/info", "user.privacy"); // 隱私設定關閉
                const lang_single = get_lang_data(locale, "/info", "user.single"); // 單身
                const lang_id = get_lang_data(locale, "/info", "user.id"); // ID
                const lang_created_at = get_lang_data(locale, "/info", "user.created_at"); // 創建時間
                const lang_money = get_lang_data(locale, "/info", "user.money"); // 金錢
                const lang_hunger = get_lang_data(locale, "/info", "user.hunger"); // 飽食度
                const lang_job = get_lang_data(locale, "/info", "user.job"); // 民生職業
                const lang_fightjob = get_lang_data(locale, "/info", "user.adventure_job"); // 冒險職業
                const lang_badge = get_lang_data(locale, "/info", "user.badge"); // 稱號
                const lang_relationship = get_lang_data(locale, "/info", "user.relationship"); // 感情狀態
                const lang_banner = get_lang_data(locale, "/info", "user.banner") // 橫幅

                const user = options.getUser("user") ?? interaction.user;
                const userTag = user.tag;
                const userId = user.id;

                const [rpg_data, privacy] = await Promise.all([
                    load_rpg_data(userId),
                    load_user_privacy(userId),
                ]);
                const marry_data = rpg_data.getMarryInfo();
                const lang_marry_info = get_lang_data(locale, "/info", "user.marry_info", marry_data.with, convertToSecondTimestamp(marry_data.time));
                const lang_sign_count = get_lang_data(locale, "/info", "user.sign_count", rpg_data.daily_times); // 連續簽到了 {0} 次

                const show_money = privacy.includes("money");
                let money = show_money ? rpg_data.money ?? lang_no_data : lang_privacy;
                if (typeof money === "number") money = `\`${money.toLocaleString(locale)}$\``

                const hunger = rpg_data.hunger ?? lang_no_data;
                const job = rpg_data.job || lang_none;
                const fightjob = rpg_data.fightjob || lang_none;
                const badge = rpg_data.badge || lang_none;

                const marry_str = marry_data.status
                    ? lang_marry_info
                    : lang_single;

                const createdAt = convertToSecondTimestamp(user.createdAt.getTime());
                const jobData = valid_job_id(job)
                    ? jobs[job]
                    : null;

                const [fetched_user, emojiOfTheJob, emojiOfTheFightJob] = await Promise.all([
                    client.users.fetch(user.id, { force: true }),

                    jobData?.emoji
                        ? await get_emoji(jobData.emoji)
                        : "",

                    fightjobs[fightjob]?.emoji
                        ? await get_emoji(fightjobs[fightjob].emoji)
                        : "",
                ]);

                const nameOfTheJob = jobData !== null && valid_job_id(job)
                    ? get_job_name(job, locale)
                    : job;

                const nameOfTheFightJob = fightjobs[fightjob]
                    ? get_fightjob_name(fightjob, locale)
                    : fightjob;

                const user_data_embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setThumbnail(fetched_user.displayAvatarURL({ size: 1024 }))
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
                    .setFooter({ text: lang_sign_count })
                    .setFields(
                        {
                            name: `${emoji_job} ${lang_job}`,
                            value: `${emojiOfTheJob} ${nameOfTheJob}`,
                            inline: true,
                        },
                        {
                            name: `${emoji_adventure} ${lang_fightjob}`,
                            value: `${emojiOfTheFightJob} ${nameOfTheFightJob}`,
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

                const userBannerURL = fetched_user.bannerURL({ size: 4096 });

                const row =
                    /** @type {ActionRowBuilder<ButtonBuilder>} */
                    (new ActionRowBuilder());

                const bannerBtn = userBannerURL
                    ? new ButtonBuilder()
                        .setLabel(lang_banner)
                        .setURL(userBannerURL)
                        .setStyle(ButtonStyle.Link)
                    : null;

                if (bannerBtn) row.addComponents(bannerBtn);

                await interaction.editReply({
                    embeds: [user_data_embed, rpg_data_embed],
                    components: row.components.length ? [row] : undefined,
                });
                break;
            }

            case "guild": {
                const lang_id = get_lang_data(locale, "/info", "guild.id"); // ID
                const lang_members = get_lang_data(locale, "/info", "guild.members"); // Members 成員
                const lang_boosts = get_lang_data(locale, "/info", "guild.boosts"); // Boosts 加成狀態
                const lang_owner = get_lang_data(locale, "/info", "guild.owner"); // Owner 擁有者
                const lang_created_at = get_lang_data(locale, "/info", "guild.created_at"); // Created At 創建時間
                const lang_icon = get_lang_data(locale, "/info", "guild.icon"); // Icon 圖標
                const lang_banner = get_lang_data(locale, "/info", "guild.banner"); // Banner 橫幅
                const lang_splash = get_lang_data(locale, "/info", "guild.splash"); // Splash 邀請背景

                const guild = interaction.guild;
                if (!guild) return await interaction.editReply({
                    content: "你不在一個伺服器内執行這個指令！"
                });

                const guildId = guild.id;
                const guildName = guild.name;
                const guildMembers = guild.memberCount;
                const boosts = guild.premiumSubscriptionCount ?? 0;
                const boostLevel = guild.premiumTier;
                const ownerId = guild.ownerId;
                const serverIconURL = guild.iconURL();
                const serverBanner = guild.bannerURL();
                const serverSplash = guild.splashURL();
                const createdAt = convertToSecondTimestamp(interaction.guild.createdAt.getTime());

                const lang_boosts_value = get_lang_data(locale, "/info", "guild.boosts_value", boosts, boostLevel);

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
                            value: lang_boosts_value,
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
                    /** @type {ActionRowBuilder<ButtonBuilder>} */
                    (new ActionRowBuilder()
                        .addComponents(BtnLinks))
                    : null;

                await interaction.editReply({ embeds: [embed], components: row ? [row] : [] });
                break;
            }

            case "bot": {
                const embed = await getBotInfoEmbed(locale, client);

                const lang_refresh = get_lang_data(locale, "/info", "bot.refresh");

                const refreshButton = new ButtonBuilder()
                    .setCustomId(`refresh|any|/info bot`)
                    .setEmoji(emoji_robot)
                    .setLabel(lang_refresh || "")
                    .setStyle(ButtonStyle.Success);

                const row =
                    /** @type {ActionRowBuilder<ButtonBuilder>} */
                    (new ActionRowBuilder()
                        .addComponents(refreshButton));

                await interaction.editReply({ embeds: [embed], components: [row] });
                break;
            }

            case "message": {
                const given_msg_id = options.getString("message_id", false);

                const message = (
                    (given_msg_id && await channel.messages.fetch(given_msg_id))
                    || (await channel.messages.fetch({ limit: 2 })).reverse().first()
                );

                if (!message) {
                    return await interaction.editReply({ content: "請先提供訊息ID或在此頻道中發送訊息。" });
                };

                const container = getMsgInfoContainer(message, locale);

                await interaction.editReply({
                    content: null,
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                });

                break;
            }

            case "channel": {
                const selected_channel = options.getChannel(
                    "channel", false,
                    [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.DM],
                ) ?? channel;

                const [embed, row] = await getChannelInfoEmbedRows(selected_channel, locale);

                await interaction.editReply({ embeds: [embed], components: [row] });
                break;
            }
        };
    },
};
