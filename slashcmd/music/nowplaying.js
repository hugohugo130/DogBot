import {
    SlashCommandBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    BaseInteraction,
    Locale,
} from "discord.js";
import util from "util";

import {
    get_logger,
} from "../../utils/logger.js";
import {
    get_emojis,
    get_emoji,
} from "../../utils/rpg.ts";
import {
    formatMinutesSeconds,
} from "../../utils/timestamp.js";
import {
    wait_for_client,
} from "../../utils/wait_for_client.js";
import {
    MusicQueue,
    MusicTrack,
    getQueue,
    noMusicIsPlayingEmbed,
} from "../../utils/music/music.js";
import {
    loopStatus,
} from "../../utils/music/music.js";
import {
    embed_default_color,
    DOCS,
    STATUS_PAGE,
} from "../../utils/config.ts";
import EmbedBuilder from "../../utils/customs/embedBuilder.js";
import DogClient from "../../utils/customs/client.js";
import { get_lang_data } from "../../utils/language.js";

/**
 * 生成 Discord 進度條
 * @param {number} start - 開始時間（秒）
 * @param {number} played - 已播放時間（秒）
 * @param {number} end - 結束時間（秒）
 * @param {boolean} [debug=false] - 是否啟用 debug
 * @param {DogClient | null} [client] - Discord 客戶端
 * @returns {Promise<string>} Discord 進度條字串
 */
async function createProgressBar(start, played, end, debug = false, client = global._client) {
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
 * @param {Locale | null} [locale=null] - Discord Locale
 * @param {DogClient | null} [client] - Discord 客戶端
 * @returns {Promise<ActionRowBuilder<ButtonBuilder>[]>}
 */
async function getNowPlayingRows(queue, locale = null, client = global._client) {
    const [
        emoji_pauseGrad,
        emoji_playGrad,
        emoji_loop,
        emoji_skip,
        emoji_goodbye,
        emoji_trending,
        emoji_shuffle,
        emoji_refresh,
        emoji_bin
    ] = await get_emojis([
        "pauseGrad",
        "playGrad",
        "loop",
        "skip",
        "goodbye",
        "trending",
        "shuffle",
        "refresh",
        "bin",
    ], client);

    let loopMode;

    const lang_loopStatus = /** @type {Record<"disabled" | "track" | "all" | "auto", string>} */ (
        Object.fromEntries(
            ["disabled", "track", "all", "auto"]
                .map((key) => [key, get_lang_data(locale, "music", `loop_status.${key}`)])
        )
    );
    const lang_clear_queue = get_lang_data(locale, "music", "nowplaying.clear_queue");
    const lang_update = get_lang_data(locale, "music", "nowplaying.update");
    const lang_disconnect = get_lang_data(locale, "music", "nowplaying.disconnect");

    switch (queue.loopStatus) {
        case loopStatus.DISABLED: {
            loopMode = lang_loopStatus.disabled;
            break;
        }

        case loopStatus.TRACK: {
            loopMode = lang_loopStatus.track;
            break;
        }

        case loopStatus.ALL: {
            loopMode = lang_loopStatus.all;
            break;
        }

        case loopStatus.AUTO: {
            loopMode = lang_loopStatus.auto;
            break;
        }

        default: {
            const logger = get_logger();
            logger.warn(`[${queue.guildID}] 的loopstatus是 ${queue.loopStatus}，而不是0,1,2,3\n${util.inspect(queue, { depth: null })}`);
            queue.setLoopStatus(loopStatus.DISABLED);

            loopMode = "關閉";
            break;
        }
    };

    const IsTrendingOn = queue.loopStatus === loopStatus.AUTO;

    const row1 = // first four buttons [ButtonStyle.Secondary]
        /** @type {ActionRowBuilder<ButtonBuilder>} */
        (new ActionRowBuilder()
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

                new ButtonBuilder()
                    .setCustomId("music|any|clear_queue")
                    .setEmoji(emoji_bin)
                    .setLabel(lang_clear_queue) // 清空佇列 Clear Queue
                    .setStyle(ButtonStyle.Danger),
            ));

    const row2 =
        /** @type {ActionRowBuilder<ButtonBuilder>} */
        (new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`music|any|trending|${IsTrendingOn ? "off" : "on"}`) // option: off/on
                    .setEmoji(emoji_trending) // 自動推薦 Auto Recommend
                    .setLabel(lang_loopStatus.auto)
                    .setStyle(IsTrendingOn ? ButtonStyle.Success : ButtonStyle.Secondary), // Success按下去後關閉，Secondary按下去後啟用

                new ButtonBuilder()
                    .setCustomId("refresh|any|nowplaying")
                    .setEmoji(emoji_loop)
                    .setLabel(lang_update) // 更新 Update
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("music|any|disconnect")
                    .setEmoji(emoji_goodbye)
                    .setLabel(lang_disconnect) // 中斷連線 Disconnect
                    .setStyle(ButtonStyle.Danger)
            ));

    return [row1, row2];
};

/**
 * 
 * @param {MusicQueue} queue - 音樂佇列
 * @param {MusicTrack | null} [currentTrack=null] - 當前播放的音樂曲目
 * @param {BaseInteraction | null} [interaction=null] - 互動
 * @param {DogClient | null} [client] - Discord 客戶端
 * @param {boolean} [start = false] - 是否剛開始播放
 * @returns {Promise<[EmbedBuilder, ActionRowBuilder<ButtonBuilder>[]]>}
 */
export async function getNowPlayingEmbed(queue, currentTrack = null, interaction = null, client = global._client, start = false) {
    if (!currentTrack) currentTrack = queue.currentTrack ?? queue.tracks[0];
    if (!currentTrack) throw new Error("No current track found.");
    if (!client) client = await wait_for_client();

    const playingAt = start || !queue.currentResource ? 0 : Math.floor(queue.currentResource.playbackDuration / 1000);
    const formattedPlayingAt = formatMinutesSeconds(playingAt, false);

    const [progressBar, rows, emoji] = await Promise.all([
        createProgressBar(0, playingAt, Math.floor(currentTrack.duration / 1000), false, client),
        getNowPlayingRows(queue, interaction?.locale, client),
        queue.isPaused()
            ? await get_emoji("pauseGrad", client)
            : await get_emoji("playGrad", client),
    ]);

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

    return [embed, rows];
};

/** @type {import("../../utils/types").Slash<["guild"]>} */
export const nowPlayingSlash = {
    builder: new SlashCommandBuilder()
        .setName("nowplaying")
        .setNameLocalizations({
            "zh-TW": "正在播放",
            "zh-CN": "正在播放"
        })
        .setDescription("Get the currently playing music")
        .setDescriptionLocalizations({
            "zh-TW": "查詢正在播放的音樂",
            "zh-CN": "查询正在播放的音乐"
        }),
    allowedContext: ["guild"],
    stage: "beta",
    music: true,

    async execute(interaction, client) {
        const guildId = interaction.guild?.id;
        if (!guildId) return;

        const queue = getQueue(guildId);

        const notPlayingEmbed = await noMusicIsPlayingEmbed(queue, interaction, client);
        if (notPlayingEmbed) {
            return await interaction.reply({ embeds: [notPlayingEmbed], flags: MessageFlags.Ephemeral });
        };

        const textChannel = interaction.channel;
        if (textChannel?.isSendable()) queue.setTextChannel(textChannel);

        const [_, [embed, rows]] = await Promise.all([
            interaction.deferReply(),
            getNowPlayingEmbed(queue, null, interaction, client),
        ]);

        await interaction.editReply({ embeds: [embed], components: rows });
    },
};
