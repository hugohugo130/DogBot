const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, BaseInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const { MusicQueue } = require("../../utils/music/music.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

/**
 * 生成 Discord 進度條
 * @param {number} start - 開始時間（秒）
 * @param {number} played - 已播放時間（秒）
 * @param {number} end - 結束時間（秒）
 * @param {DogClient} client - Discord 客戶端
 * @returns {Promise<string>} Discord 進度條字串
 */
async function createProgressBar(start, played, end, client = global.client) {
    const { get_emojis } = require("../../utils/rpg.js");

    const [
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

    // for debug
    // const emoji_progressStart = "[";
    // const emoji_progressDot = ";";
    // const emoji_progressFill = ".";
    // const emoji_progressFillEnd = "*";
    // const emoji_progressBlack = "-";
    // const emoji_progressEnd = "]";

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
    progressBar += emoji_progressStart;

    // 已播放部分
    for (let i = 0; i < filledCount; i++) {
        progressBar += emoji_progressFill;
    };

    if (filledCount < 1) {
        // 填充數量為 0 的時候填充一個點
        progressBar += emoji_progressDot;
    } else {
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
    const { get_emojis } = require("../../utils/rpg.js");
    const { loopStatus } = require("../../utils/music/music.js");

    const [
        emoji_pauseGrad,
        emoji_loop,
        emoji_skip,
        emoji_goodbye,
        emoji_trending,
        emoji_shuffle,
        emoji_refresh
    ] = await get_emojis([
        "pauseGrad",
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
        case loopStatus.AUTOPLAY: {
            loopMode = "自動推薦";
            break;
        };
    };

    const row1 = new ActionRowBuilder() // all [ButtonStyle.Secondary]
        .addComponents(
            new ButtonBuilder()
                .setCustomId("music|any|pause")
                .setEmoji(emoji_pauseGrad)
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
                .setCustomId("music|any|trending")
                .setEmoji(emoji_trending)
                .setLabel("自動推薦")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("refresh|any|music")
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
 * @param {BaseInteraction} interaction - 互動
 * @param {DogClient} client - Discord 客戶端
 * @param {boolean} start - 是否剛開始播放
 * @returns {Promise<[EmbedBuilder, ActionRowBuilder[]]>}
 */
async function getNowPlayingEmbed(queue, interaction = null, client = global._client, start = false) {
    const { embed_default_color, DOCS, STATUS_PAGE } = require("../../utils/config.js");
    const { fixStructure } = require("../../utils/music/music.js");
    const { get_emoji } = require("../../utils/rpg.js");
    const { formatMinutesSeconds } = require("../../utils/timestamp.js");

    const emoji_playGrad = await get_emoji("playGrad", client);

    /*
    這函數會在addTrack後執行
    在play()之前
    所以start要改成true

    那麼因為還沒play, queue.currentTrack會是undefined
    所以要用queue.tracks[0]來取得第一首歌
    並且currentResource是null，因為還沒執行queue.play()
    */

    const currentTrack = queue.currentTrack ?? queue.tracks[0];
    const trackData = fixStructure([currentTrack])[0];

    const playingAt = start ? 0 : Math.floor(queue.currentResource.playbackDuration / 1000);
    const formattedPlayingAt = formatMinutesSeconds(playingAt, false);

    const progressBar = await createProgressBar(0, playingAt, Math.floor(trackData.duration / 1000));
    const formattedDuration = formatMinutesSeconds(trackData.duration);

    const description = `
${emoji_playGrad} ${formattedPlayingAt}${progressBar}${formattedDuration}

[使用教學](<${DOCS}>) ∙ [機器人狀態](<${STATUS_PAGE}>)`

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setThumbnail(trackData.thumbnail)
        .setAuthor({ name: trackData.author })
        .setURL(trackData.url)
        .setTitle(trackData.title)
        .setDescription(description)
        .setEmbedFooter(interaction);

    const rows = await getNowPlayingRows(client);

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
        const { embed_error_color } = require("../../utils/config.js");
        const { get_emoji } = require("../../utils/rpg.js");
        const { getQueue } = require("../../utils/music/music.js");

        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guild.id;
        const queue = getQueue(guildId, false);

        const emoji_cross = await get_emoji("cross", client);

        if (!voiceChannel) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你需要先進到一個語音頻道`)
                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        };

        if (!queue || !queue.isPlaying() || !queue.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 沒有音樂正在播放`)
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        await interaction.deferReply();

        const [embed, rows] = await getNowPlayingEmbed(queue, interaction, client);

        await interaction.editReply({ embeds: [embed], components: rows });
    },
    getNowPlayingEmbed,
};
