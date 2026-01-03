const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
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

    const [emoji_progressStart, emoji_progressFill, emoji_progressFillEnd, emoji_progressBlack, emoji_progressEnd] = await get_emojis([
        "progressStart",
        "progressFill",
        "progressFillEnd",
        "progressBlack",
        "progressEnd"
    ], client);

    // for debug:
    // const emoji_progressStart = "[";
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

    progressBar += emoji_progressFillEnd;

    // 未播放部分
    for (let i = 0; i < (totalLength - filledCount); i++) {
        progressBar += emoji_progressBlack;
    };

    // 結束圖標
    progressBar += emoji_progressEnd;

    return progressBar;
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
        const { embed_default_color, embed_error_color, DOCS, STATUS_PAGE } = require("../../utils/config.js");
        const { get_emojis } = require("../../utils/rpg.js");
        const { getQueue, fixStructure } = require("../../utils/music/music.js");
        const { formatMinutesSeconds } = require("../../utils/timestamp.js");

        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guild.id;
        const queue = getQueue(guildId, false);

        const [emoji_cross, emoji_playGrad] = await get_emojis(["crosS", "playGrad"], client);

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

        const currentTrack = queue.currentTrack;
        const trackData = fixStructure([currentTrack])[0];

        const playingAt = Math.floor(queue.currentResource.playbackDuration / 1000);
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

        await interaction.reply({ embeds: [embed] });
    },
};
