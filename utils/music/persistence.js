import {
    joinVoiceChannel,
    getVoiceConnection,
} from "@discordjs/voice";

import {
    get_logger,
} from "../logger.js";
import {
    get_channel,
} from "../discord.js";
import {
    readJson,
    writeJson,
    exists,
} from "../file.js";
import {
    getQueues,
    getQueue,
    MusicTrack,
} from "./music.js";
import {
    music_status_file,
} from "../config.js";
import DogClient from "../customs/client.js";

const DEBUG = false;

const logger = get_logger();

async function saveAllMusicStates() {
    const queues = getQueues();

    /** @type {{ [guildId: string]: import("../config.js").MusicStatus }} */
    // const allMusicData = await loadAllMusicStates();
    const allMusicData = {};

    for (const [guildId, queue] of queues.entries()) {
        if (await queue.isValid()) {
            const state = {
                channelId: queue.voiceChannel?.id || null,
                textChannelId: queue.textChannel?.id || null,
                currentTrack: queue.currentTrack?.toJSON?.() || null,
                queue: queue.tracks.map(track => track.toJSON()),
                loopStatus: queue.loopStatus,
                paused: queue.isPaused(),
            };

            allMusicData[guildId] = state;
        };
    };

    const data_length = Object.keys(allMusicData).length;

    await writeJson(music_status_file, allMusicData);
    logger.info(`[音樂持久化] 已保存 ${data_length} 個伺服器的音樂狀態`);
};

/**
 * Load all stored music states
 * @returns {Promise<{ [guildId: string]: import("../config.js").MusicStatus }>}
 */
async function loadAllMusicStates() {
    if (!(await exists(music_status_file))) {
        return {};
    };

    return await readJson(music_status_file);
};

/**
 * @param {DogClient} client
 */
async function restoreAllMusicStates(client) {
    const musicData = await loadAllMusicStates();
    const guildIds = Object.keys(musicData);

    if (guildIds.length === 0) { // 無資料
        return;
    };

    let restoredCount = 0;
    let modified = false;

    for (const guildId of guildIds) {
        const state = musicData[guildId];

        if (!state.channelId) continue;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            if (DEBUG) logger.debug(`[音樂持久化] 伺服器 ${guildId} 不存在，跳過`);
            continue;
        };

        const voiceChannel = guild.channels.cache.get(state.channelId);
        if (!voiceChannel || !voiceChannel.isVoiceBased()) { // 頻道不存在 / 不是語音頻道
            if (DEBUG) logger.debug(`[音樂持久化] 伺服器 ${guildId} 的語音頻道不存在或已刪除，跳過`);
            delete musicData[guildId];
            modified = true;
            continue;
        };

        // const visibleMembers = voiceChannel.members.filter(member => (
        //     !member.voice.deaf
        //     && !member.voice.selfDeaf
        //     && !member.user.bot
        // ));

        // if (visibleMembers.size === 0) { // 無有效的成員
        //     if (DEBUG) logger.debug(`[音樂持久化] 伺服器 ${guildId} 的語音頻道內沒有非拒聽的非機器人成員，跳過`);
        //     delete musicData[guildId];
        //     modified = true;
        //     continue;
        // };

        const textChannel = state.textChannelId
            ? await get_channel(state.textChannelId, guild)
            : null;

        const currentTrack = state.currentTrack
            ? new MusicTrack(state.currentTrack)
            : null;

        const connection = getVoiceConnection(guild.id) ?? joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            selfDeaf: true,
            selfMute: false,
            adapterCreator: guild.voiceAdapterCreator,
        });

        const queue = getQueue(guildId, true);

        if (textChannel?.isSendable()) queue.setTextChannel(textChannel);
        if (!queue.voiceChannel) queue.setVoiceChannel(voiceChannel);

        queue.setConnection(connection);
        queue.setLoopStatus(state.loopStatus);

        for (const trackData of state.queue) {
            const queue_track = new MusicTrack(trackData);

            queue.addTrack(queue_track);
        };

        try {
            if (currentTrack) await queue.play(currentTrack);
            if (state.paused) queue.pause(true);

            restoredCount++;
            if (DEBUG) logger.debug(`[音樂持久化] 已恢復伺服器 ${guildId} 的音樂狀態`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.stack || err.message : String(err);

            logger.error(`[音樂持久化] 恢復伺服器 ${guildId} 的音樂狀態時發生錯誤: ${errorMessage}`);
            queue.destroy();

            delete musicData[guildId];
            modified = true;
        };
    };

    if (modified) {
        await writeJson(music_status_file, musicData);
    };

    logger.info(`[音樂持久化] 完成！共恢復 ${restoredCount} 個伺服器的音樂狀態`);
};

export {
    saveAllMusicStates,
    loadAllMusicStates,
    restoreAllMusicStates,
};