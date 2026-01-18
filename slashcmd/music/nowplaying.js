const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, BaseInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const util = require("util");

const { get_logger } = require("../../utils/logger.js");
const { get_emojis, get_emoji } = require("../../utils/rpg.js");
const { formatMinutesSeconds } = require("../../utils/timestamp.js");
const { MusicQueue, MusicTrack, getQueue, noMusicIsPlayingEmbed, youHaveToJoinVC_Embed } = require("../../utils/music/music.js");
const { loopStatus } = require("../../utils/music/music.js");
const { embed_default_color, DOCS, STATUS_PAGE } = require("../../utils/config.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

/**
 * 生成 Discord 進度條
 * @param {number} start - 開始時間（秒）
 * @param {number} played - 已播放時間（秒）
 * @param {number} end - 結束時間（秒）
 * @param {number} DEBUG - 是否啟用 DEBUG
 * @param {DogClient} client - Discord 客戶端
 * @returns {Promise<string>} Discord 進度條字串
 */
async function createProgressBar(start, played, end, debug = false, client = global.client) {
    let emoji_progressStart;
    let emoji_progressDot;
    let emoji_progressFill;
    let emoji_progressFillEnd;
    let emoji_progressBlack;
    let emoji_progressEnd;

    if (debug) {
        emoji_progressStart = "[";
        emoji_progressDot = ";";
        emoji_progressFill = ".";
        emoji_progressFillEnd = "*";
        emoji_progressBlack = "-";
        emoji_progressEnd = "]";
    } else {
        [
            emoji_progressDot,
            emoji_progressStart,
            emoji_progressFill,
            emoji_progressFillEnd,
            emoji_progressBlack,
            emoji_progressEnd
        ] = await get_emojis([
            "progressDot",
            "progressStart",
            "progressFill",
            "progressFillEnd",
            "progressBlack",
            "progressEnd"
        ], client);
    };

    // 進度條總長度（不包括開始和結束圖標）
    const outputLength = 15;
    const totalLength = outputLength - 3; // - 3（開始、結束填滿和結束圖標）

    // 計算已播放比例
    const progressRatio = Math.min(1, Math.max(0, (played - start) / (end - start)));

    // 計算填充數量
    const filledCount = Math.round(totalLength * progressRatio);

    // 構建進度條
    let progressBar = '';

    // 開始圖標
    if (filledCount) progressBar += emoji_progressStart;

    // 已播放部分
    for (let i = 0; i < filledCount; i++) {
        progressBar += emoji_progressFill;
    };

    if (filledCount < 1) {
        // 填充數量為 0 的時候填充一個點
        progressBar += emoji_progressDot;
    } else if (filledCount === 0) {
        progressBar += emoji_progressFillEnd;
    };

    // 未播放部分
    for (let i = 0; i < (totalLength - filledCount); i++) {
        progressBar += emoji_progressBlack;
    };

    // 結束圖標
    progressBar += emoji_progressEnd;

    return progressBar;
};

/**
 * 獲取音樂控制面板按鈕
 * @param {MusicQueue} queue - 音樂佇列
 * @param {DogClient} [client] - Discord 客戶端
 * @returns {Promise<ActionRowBuilder[]>}
 */
async function getNowPlayingRows(queue, client = global._client) {
    const [
        emoji_pauseGrad,
        emoji_playGrad,
        emoji_loop,
        emoji_skip,
        emoji_goodbye,
        emoji_trending,
        emoji_shuffle,
        emoji_refresh
    ] = await get_emojis([
        "pauseGrad",
        "playGrad",
        "loop",
        "skip",
        "goodbye",
        "trending",
        "shuffle",
        "refresh",
    ], client);

    let loopMode;

    switch (queue.loopStatus) {
        case loopStatus.DISABLED: {
            loopMode = "關閉";
            break;
        };
        case loopStatus.TRACK: {
            loopMode = "單曲";
            break;
        };
        case loopStatus.ALL: {
            loopMode = "全部";
            break;
        };
        case loopStatus.AUTO: {
            loopMode = "自動推薦";
            break;
        };
        default: {
            const logger = get_logger();
            logger.warn(`[${queue.guildID}] 的loopstatus是 ${queue.loopStatus}，而不是0,1,2,3\n${util.inspect(queue, { depth: null })}`);
            queue.setLoopStatus(loopStatus.DISABLED);

            loopMode = "關閉";
            break;
        };
    };

    const IsTrendingOn = queue.loopStatus === loopStatus.AUTO;

    const row1 = new ActionRowBuilder() // all [ButtonStyle.Secondary]
        .addComponents(
            new ButtonBuilder()
                .setCustomId("music|any|pause")
                .setEmoji(queue.isPaused() ? emoji_pauseGrad : emoji_playGrad)
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("music|any|skip")
                .setEmoji(emoji_skip)
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("music|any|shuffle")
                .setEmoji(emoji_shuffle)
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("music|any|loop")
                .setEmoji(emoji_refresh)
                .setLabel(loopMode)
                .setStyle(ButtonStyle.Secondary),
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`music|any|trending|${IsTrendingOn ? "off" : "on"}`) // option: off/on
                .setEmoji(emoji_trending)
                .setLabel("自動推薦")
                .setStyle(IsTrendingOn ? ButtonStyle.Success : ButtonStyle.Secondary), // Success按下去後關閉，Secondary按下去後啟用

            new ButtonBuilder()
                .setCustomId("refresh|any|nowplaying")
                .setEmoji(emoji_loop)
                .setLabel("更新")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("music|any|disconnect")
                .setEmoji(emoji_goodbye)
                .setLabel("中斷連線")
                .setStyle(ButtonStyle.Danger)
        );

    return [row1, row2];
};

/**
 * 
 * @param {MusicQueue} queue - 音樂佇列
 * @param {MusicTrack} [currentTrack] - 當前播放的音樂曲目
 * @param {BaseInteraction} interaction - 互動
 * @param {DogClient} client - Discord 客戶端
 * @param {boolean} start - 是否剛開始播放
 * @returns {Promise<[EmbedBuilder, ActionRowBuilder[]]>}
 */
async function getNowPlayingEmbed(queue, currentTrack = null, interaction = null, client = global._client, start = false) {
    const emoji = queue.isPaused()
        ? await get_emoji("pauseGrad", client)
        : await get_emoji("playGrad", client);

    if (!currentTrack) currentTrack = queue.currentTrack ?? queue.tracks[0];
    if (!currentTrack) throw new Error("No current track found.");

    const playingAt = start ? 0 : Math.floor(queue.currentResource.playbackDuration / 1000);
    const formattedPlayingAt = formatMinutesSeconds(playingAt, false);

    const progressBar = await createProgressBar(0, playingAt, Math.floor(currentTrack.duration / 1000), false, client);

    const formattedDuration = formatMinutesSeconds(currentTrack.duration);

    const description = `
${emoji} ${formattedPlayingAt}${progressBar}${formattedDuration}

[使用教學](<${DOCS}>) ∙ [機器人狀態](<${STATUS_PAGE}>)`

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setThumbnail(currentTrack.thumbnail)
        .setAuthor({ name: currentTrack.author })
        .setURL(currentTrack.url)
        .setTitle(currentTrack.title)
        .setDescription(description)
        .setEmbedFooter(interaction);

    const rows = await getNowPlayingRows(queue, client);

    return [embed, rows];
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Get the currently playing music")
        .setNameLocalizations({
            "zh-TW": "正在播放",
            "zh-CN": "正在播放"
        })
        .setDescriptionLocalizations({
            "zh-TW": "查詢正在播放的音樂",
            "zh-CN": "查询正在播放的音乐"
        }),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {DogClient} client
     */
    async execute(interaction, client) {
        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guild.id;
        const queue = getQueue(guildId, false);

        if (!voiceChannel) {
            return await interaction.reply({
                embeds: [await youHaveToJoinVC_Embed(interaction, client)],
                flags: MessageFlags.Ephemeral,
            });
        };

        const notPlayingEmbed = await noMusicIsPlayingEmbed(queue, interaction, client);
        if (notPlayingEmbed) {
            return await interaction.reply({ embeds: [notPlayingEmbed], flags: MessageFlags.Ephemeral });
        };

        await interaction.deferReply();

        const [embed, rows] = await getNowPlayingEmbed(queue, null, interaction, client);

        await interaction.editReply({ embeds: [embed], components: rows });
    },
    getNowPlayingEmbed,
};
