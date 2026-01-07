const path = require("path");
const util = require("node:util");
const axios = require("axios");
const httpAdapter = require('axios/unsafe/adapters/http.js');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { createAudioResource, createAudioPlayer, joinVoiceChannel, getVoiceConnection, AudioPlayerStatus, VoiceConnection, AudioPlayer, StreamType, AudioResource } = require("@discordjs/voice");
const { getAudioDurationInSeconds } = require('get-audio-duration');
const { default: _filenamify } = require("filenamify");
const { fileTypeFromStream, fileTypeFromFile } = require("file-type");
const { pipeline } = require("node:stream/promises");
const { Readable, PassThrough } = require("node:stream");
const { Collection, TextChannel, VoiceChannel, Subscription, Guild } = require("discord.js");
const { Soundcloud } = require("soundcloud.ts");

const { musicSearchEngine, embed_error_color, embed_default_color } = require("../config.js");
const { get_logger } = require("../logger.js");
const { existsSync, createReadStream, get_temp_folder, join_temp_folder, basename, readdirSync, unlinkSync, join, dirname } = require("../file.js");
const { formatMinutesSeconds } = require("../timestamp.js");
const { get_emoji } = require("../rpg.js");
const { generateMD5 } = require("../random.js");
const EmbedBuilder = require("../customs/embedBuilder.js");
const DogClient = require("../customs/client.js");

let sc = global._sc ?? new Soundcloud();
global._sc = sc;

const logger = get_logger();

const queues = new Collection();

const loopStatus = Object.freeze({
    DISABLED: 0,
    TRACK: 1,
    ALL: 2,
    AUTO: 3,
})

// SoundCloudTrack Object Example
/*
{
    "artwork_url": "https://i1.sndcdn.com/artworks-GUtkdN7hrPHY-0-large.jpg",
    "caption": null,
    "commentable": true,
    "comment_count": 3438,
    "created_at": "2021-01-26T13:09:44Z",
    "description": null,
    "downloadable": false,
    "download_count": 0,
    "duration": 30000,
    "full_duration": 155376,
    "embeddable_by": "all",
    "genre": "Pop",
    "has_downloads_left": false,
    "id": 973047190,
    "kind": "track",
    "label_name": "Polydor Records",
    "last_modified": "2025-10-10T17:54:07Z",
    "license": "all-rights-reserved",
    "likes_count": 56862,
    "permalink": "wellerman-sea-shanty",
    "permalink_url": "https://soundcloud.com/nathanevans-music/wellerman-sea-shanty",
    "playback_count": 3334201,
    "public": true,
    "publisher_metadata": {
        "id": 973047190,
        "urn": "soundcloud:tracks:973047190",
        "artist": "Nathan Evans",
        "album_title": "Wellerman",
        "contains_music": true,
        "upc_or_ean": "00602435763651",
        "isrc": "GBUM72100297",
        "explicit": false,
        "p_line": "℗ 2021 Universal Music Operations Limited",
        "p_line_for_display": "℗ 2021 Universal Music Operations Limited",
        "c_line": "© 2021 Universal Music Operations Limited",
        "c_line_for_display": "© 2021 Universal Music Operations Limited",
        "release_title": "Wellerman (Sea Shanty)"
    },
    "purchase_title": null,
    "purchase_url": null,
    "release_date": "2021-01-21T00:00:00Z",
    "reposts_count": 1222,
    "secret_token": null,
    "sharing": "public",
    "state": "finished",
    "streamable": true,
    "tag_list": "",
    "title": "Wellerman (Sea Shanty)",
    "uri": "https://api.soundcloud.com/tracks/soundcloud%3Atracks%3A973047190",
    "urn": "soundcloud:tracks:973047190",
    "user_id": 939262504,
    "visuals": null,
    "waveform_url": "https://wave.sndcdn.com/vdNMyVyTvXzE_m.json",
    "display_date": "2021-01-21T00:00:00Z",
    "media": {
        "transcodings": [
            {
                "url": "https://api-v2.soundcloud.com/media/soundcloud:tracks:973047190/f4ac86ce-2209-48c6-8040-4aa91dc917cb/preview/hls",
                "preset": "mp3_0_1",
                "duration": 30000,
                "snipped": true,
                "format": {
                    "protocol": "hls",
                    "mime_type": "audio/mpeg"
                },
                "quality": "sq",
                "is_legacy_transcoding": true
            },
            {
                "url": "https://api-v2.soundcloud.com/media/soundcloud:tracks:973047190/f4ac86ce-2209-48c6-8040-4aa91dc917cb/preview/progressive",
                "preset": "mp3_0_1",
                "duration": 30000,
                "snipped": true,
                "format": {
                    "protocol": "progressive",
                    "mime_type": "audio/mpeg"
                },
                "quality": "sq",
                "is_legacy_transcoding": true
            }
        ]
    },
    "station_urn": "soundcloud:system-playlists:track-stations:973047190",
    "station_permalink": "track-stations:973047190",
    "track_authorization": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW8iOiJISyIsInN1YiI6IiIsInJpZCI6IjJmMjRjZTgxLTU1NTctNDA0ZS05YWY3LWQwYmVmZDJjNzU2OSIsImlhdCI6MTc2NjU0NzkyOX0.RB83gVP3R6YzI_ZzSFH9qOwoSVZjSS4r1GOvQw1tktU",
    "monetization_model": "NOT_APPLICABLE",
    "policy": "SNIP",
    "user": {
        "avatar_url": "https://i1.sndcdn.com/avatars-mdN6Q8pM2qfpmWMI-LB9SiQ-large.jpg",
        "city": null,
        "comments_count": 0,
        "country_code": null,
        "created_at": "2021-01-26T10:37:31Z",
        "creator_subscriptions": [
            {
                "product": {
                    "id": "free"
                }
            }
        ],
        "creator_subscription": {
            "product": {
                "id": "free"
            }
        },
        "description": null,
        "followers_count": 12700,
        "followings_count": 0,
        "first_name": "",
        "full_name": "",
        "groups_count": 0,
        "id": 939262504,
        "kind": "user",
        "last_modified": "2021-06-24T13:46:35Z",
        "last_name": "",
        "likes_count": 0,
        "playlist_likes_count": 0,
        "permalink": "nathanevans-music",
        "permalink_url": "https://soundcloud.com/nathanevans-music",
        "playlist_count": 3,
        "reposts_count": null,
        "track_count": 55,
        "uri": "https://api.soundcloud.com/users/soundcloud%3Ausers%3A939262504",
        "urn": "soundcloud:users:939262504",
        "username": "Nathan Evans",
        "verified": false,
        "visuals": null,
        "badges": {
            "pro": false,
            "creator_mid_tier": false,
            "pro_unlimited": false,
            "verified": false
        },
        "station_urn": "soundcloud:system-playlists:artist-stations:939262504",
        "station_permalink": "artist-stations:939262504",
        "date_of_birth": null
    }
}
*/

/**
 * key: [MediaType](https://en.wikipedia.org/wiki/Media_type)
 * value: [StreamType](https://discord.js.org/docs/packages/voice/0.19.0/StreamType:Enum)
 * @typedef {Object.<string, string>} fileStreamType
 */
const fileStreamType = {
    "audio/ogg": StreamType.OggOpus,
    "audio/opus": StreamType.Opus,
};

class MusicTrack {
    constructor({ id, title, url = null, duration = 0, thumbnail = null, author = "unknown", source = "", stream = null }) {
        /** @type {string | number} */
        this.id = id;

        /** @type {string} */
        this.title = title;

        /** @type {string | null} */
        this.url = url;

        /** @type {number} */
        this.duration = duration;

        /** @type {string | null} */
        this.thumbnail = thumbnail;

        /** @type {string} */
        this.author = author;

        /** @type {string} */
        this.source = source?.toLowerCase?.().trim?.() || "soundcloud";

        /** @type {Readable | null} */
        this.stream = stream;
    };
};

class MusicQueue {
    /**
     *
     * @param {string} guildID - 伺服器ID
     * @param {DogClient} [client=null] - Discord Client
     */
    constructor(guildID, client = global._client) {
        /** @type {string} */
        this.guildID = guildID;

        /** @type {DogClient} */
        this.client = client;

        /** @type {Guild} */
        this.guild = client.guilds.cache.get(guildID);

        /** @type {Array<import('soundcloud.ts').SoundcloudTrack>} */
        this.tracks = [];

        /** @type {AudioPlayer} */
        this.player = createAudioPlayer();

        /** @type {boolean} */
        this.playing = false;

        /** @type {MusicTrack | null} */
        this.currentTrack = null;

        /** @type {AudioResource | null} */
        this.currentResource = null;

        /** @type {number} */
        this.loopStatus = loopStatus.DISABLED;

        /** @type {boolean} */
        this.paused = false;

        /** @type {TextChannel} */
        this.textChannel = null;

        /** @type {VoiceChannel} */
        this.voiceChannel = null;

        /** @type {VoiceConnection} */
        this.connection = null;

        /** @type {Subscription} */
        this.subscription = null;

        this.player.on("error", async (error) => {
            const errorStack = util.inspect(error, { depth: null });
            logger.error(`[${this.guildID}] 播放音樂時發生錯誤: ${errorStack}`);

            if (this.textChannel?.send) {
                const emoji_cross = await get_emoji("crosS", client);

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 播放音樂時發生了錯誤`)
                    .setDescription(`請嘗試將機器人手動中斷連線，或是等待幾秒後再試一次`)
                    .setEmbedFooter();

                this.textChannel.send({ embeds: [embed] });
            };
        });

        this.player.on("stateChange", async (oldState, newState) => {
            // const { getVoiceConnection } = require("@discordjs/voice");
            // logger.debug(`[${this.guildID}] 音樂播放器狀態改變: ${oldState.status} -> ${newState.status}: ${Boolean(getVoiceConnection(this.guildID))}; ${require("util").inspect(this.tracks, { depth: null })}; ${require("util").inspect(this.currentTrack, { depth: null })}`);

            try {
                if (!getVoiceConnection(this.guildID)) {
                    if (this.voiceChannel) {
                        const voiceConnection = joinVoiceChannel({
                            channelId: this.voiceChannel.id,
                            guildId: this.guildID,
                            selfDeaf: true,
                            selfMute: false,
                            adapterCreator: this.voiceChannel.guild.voiceAdapterCreator
                        });

                        this.connection = voiceConnection;
                        this.subscribe();
                    } else {
                        if (this.textChannel?.send) {
                            const emoji_cross = await get_emoji("crosS", client);
                            const embed = new EmbedBuilder()
                                .setColor(embed_error_color)
                                .setTitle(`${emoji_cross} | 播放語音時發生錯誤`)
                                .setDescription(`找不到語音頻道，請重新執行播放指令`)
                                .setEmbedFooter();

                            await this.textChannel.send({ embeds: [embed] });

                            // wait 500ms
                            await new Promise(resolve => setTimeout(resolve, 500));

                            this.destroy();
                        } else {
                            this.destroy();
                        };
                    };
                };

                if (
                    [AudioPlayerStatus.Buffering, AudioPlayerStatus.Idle].includes(oldState.status) &&
                    newState.status === AudioPlayerStatus.Playing
                ) {
                    // 正在播放
                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle("🎵 | 正在播放")
                        .setDescription(`[**${this.currentTrack.title}**](<${this.currentTrack.url}>)`)
                        .setThumbnail(this.currentTrack.thumbnail)
                        .setFooter({ text: `時長: ${formatMinutesSeconds(this.currentTrack.duration)}` })

                    if (this.textChannel?.send) {
                        await this.textChannel.send({ embeds: [embed] });
                    };
                } else if (
                    oldState.status === AudioPlayerStatus.Playing &&
                    newState.status === AudioPlayerStatus.Idle
                ) {
                    // 閒置 (播完了)
                    this.playing = false;

                    if (this.loopStatus !== loopStatus.DISABLED) { // 已啟用循環
                        if (this.loopStatus === loopStatus.TRACK) {
                            // 如果是單曲循環

                            this.play({
                                id: this.currentTrack.id,
                                url: this.currentTrack.url,
                                source: this.currentTrack.source,
                                stream: this.currentTrack.stream,
                            });
                        } else if (this.loopStatus === loopStatus.ALL) {
                            // 如果是循環播放所有歌曲

                            this.tracks.push(this.tracks.shift());
                            this.play({
                                id: this.tracks[0].id,
                                url: this.tracks[0].url,
                                source: this.tracks[0].source,
                                stream: this.tracks[0].stream,
                            });
                        };
                    } else {
                        // 如果是正常播放
                        this.nextTrack();
                    };
                };
            } catch (err) {
                if (err.stack.includes("Missing Access")) return;
                if (err.stack.includes("Missing Permissions")) return;

                throw err;
            };
        });
    };

    /**
     * 
     * @param {import('soundcloud.ts').SoundcloudTrack | any} track
     * @param {number | null} [insert_at] - 要插入的位置，預設在結尾
     */
    addTrack(track, insert_at = null) {
        if (insert_at) {
            this.tracks.splice(insert_at, 0, track);
        } else {
            this.tracks.push(track);
        };
    };

    /**
     *
     * @returns {boolean}
     */
    isPlaying() {
        return this.playing;
    };

    /**
     *
     * @returns {boolean}
     */
    isPaused() {
        return this.paused;
    };

    /**
     *
     * @param {{id: string, url: string, title?: string, source: string, stream?: ReadableStream | Readable}} param0
     */
    async play({ id, url, title = null, source, stream = null }) {
        if (this.playing) {
            this.stopPlaying(true);
        };

        if (!this.connection && this.voiceChannel) {
            const connection = getVoiceConnection(this.guildID);
            if (connection) {
                this.connection = connection;
            } else {
                this.connection = joinVoiceChannel({
                    channelId: this.voiceChannel.id,
                    guildId: this.guildID,
                    selfDeaf: true,
                    selfMute: false,
                    adapterCreator: this.guild.voiceAdapterCreator,
                });
            };
        };

        let resource;
        let track;

        if (stream) {
            const clonedStream = stream.pipe(new PassThrough());

            const fileType = (await fileTypeFromStream(clonedStream))?.mime;
            if (!fileType?.startsWith("audio/")) {
                throw new Error("Stream is not an audio stream");
            };

            resource = createAudioResource(stream, {
                inputType: fileStreamType[fileType] || StreamType.Arbitrary,
            });

            track = new MusicTrack({
                id,
                stream,
                title: title ?? "unknown",
                url: null,
                author: "audio",
                source: "stream",
            });
        } else {
            const audioPath = await getTrack({ id, url, source });
            let track = await global._sc.tracks.get(id);
            track = fixStructure([track])[0];

            const fileType = (await fileTypeFromFile(audioPath))?.mime;
            if (!fileType?.startsWith("audio/")) {
                throw new Error("File is not an audio file");
            };

            resource = createAudioResource(
                createReadStream(audioPath),
                {
                    inputType: fileStreamType[fileType] || StreamType.Arbitrary,
                },
            );
        };

        this.player.play(resource);
        this.player.unpause();

        this.playing = true;
        this.paused = false;
        this.currentTrack = track;
        this.currentResource = resource;

        this.tracks = this.tracks.filter(track => track.id !== this.currentTrack?.id);
        return track;
    };

    stopPlaying(force = false) {
        this.tracks = this.tracks.filter(track => track.id !== this.currentTrack?.id);

        this.player.stop(force);

        this.playing = false;
        this.currentResource = null;
        this.currentTrack = null;
    };

    /**
     *
     * @param {boolean} force - 是否強制停止播放器
     * @returns {[import("soundcloud.ts").SoundcloudTrack, import("soundcloud.ts").SoundcloudTrack]} [old_track, new_track]
     */
    nextTrack(force = false) {
        const old_track = this.currentTrack;
        let new_track = null;

        this.stopPlaying(force);

        if (this.tracks.length > 0) {
            new_track = this.play({
                id: this.tracks[0].id,
                url: this.tracks[0].url,
                source: this.tracks[0].source,
                stream: this.tracks[0].stream,
            });
        };

        return [old_track, new_track];
    };

    subscribe() {
        if (this.connection && this.player) {
            this.subscription = this.connection.subscribe(this.player)
            return this.subscription;
        };

        return null;
    };

    unsubscribe() {
        try {
            if (this.subscription) {
                this.subscription.unsubscribe();
                return true;
            };
        } catch (_) {
            return false;
        };

        return false;
    };

    pause() {
        if (!this.paused) {
            this.player.pause();
            this.paused = true;
        };
    };

    unpause() {
        if (this.paused) {
            this.player.unpause();
            this.paused = false;
        };
    };

    swapTracks(firstTrackIndex, secondTrackIndex) {
        [this.tracks[firstTrackIndex], this.tracks[secondTrackIndex]] = [this.tracks[secondTrackIndex], this.tracks[firstTrackIndex]];
    };

    shuffle() {
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        };

        return this.tracks;
    };

    /**
     *
     * @param {loopStatus} status
     */
    setLoopStatus(status) {
        this.loopStatus = status;
    };

    destroy() {
        this.unsubscribe();
        this.player.stop(true);
        this.connection.destroy();
        queues.delete(this.guildID);
    };
};

/**
 *
 * @param {string} string
 * @param {{fileMode:boolean}} param1
 * @returns {string}
 */
function filenamify(string, { fileMode = false } = {}) {
    if (fileMode) {
        const fileName = basename(string);
        const correctedFileName = _filenamify(fileName);
        const correctedFilePath = join(dirname(string), correctedFileName);

        return correctedFilePath;
    } else {
        return _filenamify(string);
    };
};

/**
 *
 * @param {string} [guildID]
 * @param {boolean} [create=true]
 * @returns {MusicQueue}
 */
function getQueue(guildID, create = true) {
    const queueExists = queues.get(guildID);
    if (queueExists) {
        return queueExists;
    };

    if (create) {
        const queue = new MusicQueue(guildID);
        queues.set(guildID, queue);

        return queue;
    };

    return null;
};

/**
 *
 * @returns {Collection<any, MusicQueue>}
 */
function getQueues() {
    return queues;
};

/**
 *
 * @param {string} guildID
 * @param {MusicQueue} queue
 * @returns {MusicQueue}
 */
function saveQueue(guildID, queue) {
    queues.set(guildID, queue);

    return queue;
};

/**
 * 
 * @param {any} object
 * @returns {boolean}
 */
function isSoundCloudTrack(object) {
    return (
        object &&
        typeof object === "object" &&
        'comment_count' in object &&
        'full_duration' in object &&
        'downloadable' in object &&
        'created_at' in object &&
        'description' in object &&
        'media' in object &&
        'title' in object &&
        'publisher_metadata' in object &&
        'duration' in object &&
        'has_downloads_left' in object &&
        'artwork_url' in object &&
        'public' in object &&
        'streamable' in object &&
        'tag_list' in object &&
        'genre' in object &&
        'id' in object &&
        'reposts_count' in object &&
        'state' in object &&
        'label_name' in object &&
        'last_modified' in object &&
        'commentable' in object &&
        'policy' in object &&
        'visuals' in object &&
        'kind' in object &&
        'purchase_url' in object &&
        'sharing' in object &&
        'uri' in object &&
        'secret_token' in object &&
        'download_count' in object &&
        'likes_count' in object &&
        'urn' in object &&
        'license' in object &&
        'purchase_title' in object &&
        'display_date' in object &&
        'embeddable_by' in object &&
        'release_date' in object &&
        'user_id' in object &&
        'monetization_model' in object &&
        'waveform_url' in object &&
        'permalink' in object &&
        'permalink_url' in object &&
        'user' in object &&
        'playback_count' in object
    );
};

/**
 *
 * @param {Array<import("soundcloud.ts").SoundcloudTrack | {id: string, title: string, url: string, duration?: number, thumbnail?: string, author?: string | null, source?: string}>} objects
 * @returns {Array<MusicTrack>}
 */
function fixStructure(objects) {
    let fixedObjects = []

    for (const object of objects) {
        let { id, title, url, duration = 0, thumbnail = null, author = "Unknown", source = "unknown", stream = null } = object;

        if (isSoundCloudTrack(object)) {
            // https://www.npmjs.com/package/soundcloud.ts
            // https://moestash.github.io/soundcloud.ts/

            id = object.id;
            title = object.title;
            url = object.uri;
            duration = object.duration;
            thumbnail = object.artwork_url;
            author = object.publisher_metadata?.artist || object.user?.full_name || object.user?.username || "Unknown";
            source = "soundcloud";
        };

        fixedObjects.push(
            new MusicTrack({ id, title, url, duration, thumbnail, author, source, stream }),
        );
    };

    return fixedObjects;
};

function getAudioFileData(url, outputPath, stream = null) {
    const filename = path.basename(outputPath, path.extname(outputPath));
    const audioID = generateMD5(outputPath);

    return {
        id: audioID,
        title: filename.slice(0, 95),
        url,
        duration: getAudioDurationInSeconds(outputPath) * 1000 || 0,
        thumbnail: null,
        author: "來自音檔",
        source: "audio",
        stream,
    };
};

async function downloadFile(url, outputPath) {
    const { createWriteStream } = require("../file.js");
    const response = await fetch(url);

    if (!response.ok || !response.body) {
        throw new Error(`Failed to fetch ${url}. Status: ${response.status}`);
    };

    await pipeline(response.body, createWriteStream(outputPath));
    convertToOgg(outputPath);

    return [outputPath, getAudioFileData(url, outputPath, await getAudioStream(url))];
};

/**
 *
 * @param {string} url - 音檔網址
 * @returns {Promise<ReadableStream>}
 */
async function getAudioStream(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 15; SM-S931B Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36'
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    };

    const clonedData = response.clone();

    const fileType = await fileTypeFromStream(clonedData.body);
    if (!fileType.mime.startsWith("audio/")) throw new Error("Not an audio file");

    return response.body;
};

/**
 *
 * @param {Array<{track: any, id: string, url: string, source: string}>} tracks
 * @returns {Promise<{[key: string]: }[]>}
 */
async function downloadTracks(tracks) {
    const files = await Promise.all(tracks.map(async (track) => {
        const file = await getTrack(track);

        return { [track.id]: file };
    }));

    return files;
};

/**
 * 
 * @param {{track: any, id: string, url: string, source: string}} param0 
 * @returns {Promise<string>} 保存路徑
 */
async function getTrack({ track, id, url, source }) {
    const { existsSync, unlinkSync, join_temp_folder } = require("../file.js");

    let engine;
    try {
        engine = require(`./${source ?? "soundcloud"}.js`);
    } catch (_) { };

    let actualSavePath;
    const savePath = filenamify(join_temp_folder(`${source}_${id}.mp3`), { fileMode: true });
    const oggPath = filenamify(join_temp_folder(`${source}_${id}.ogg`), { fileMode: true });

    if (existsSync(oggPath)) {
        if (existsSync(savePath)) {
            unlinkSync(savePath);
        };

        return oggPath;
    };

    if (existsSync(savePath)) {
        return savePath;
    };

    if (!url && track) {
        url = track.url;
    } else if (!url && !track) throw new Error(`無效的參數`);

    if (engine?.download_track && typeof engine.download_track === "function") {
        actualSavePath = await engine.download_track(url, savePath);
    } else {
        [actualSavePath, _] = await downloadFile(url, savePath);
    };

    return actualSavePath;
};

/**
 * 
 * @param {string} query
 * @param {number} amount
 * @param {boolean} IsdownloadFile
 * @returns {Promise<MusicTrack[]>}
 */
async function search_until(query, amount = 25, IsdownloadFile = false) {
    let results = [];

    for (const engine of musicSearchEngine) {
        const file = require(`./${engine}.js`);

        if (!file) {
            logger.error(`找不到 搜索引擎 ${engine} 的 API模塊: ${engine}.js`);
            continue;
        };

        if (!file.search_tracks) {
            logger.warn(`API模塊 ${engine}.js 沒有搜索歌曲的 search_tracks 函數`);
            continue;
        };

        let tracks = [];
        let output = [];

        try {
            if (file.get_track_info
                && typeof file.get_track_info === "function"
                && file.validateURL
                && typeof file.validateURL === "function"
                && file.validateURL(query)
            ) {
                try {
                    output.push(await file.get_track_info(query));
                } catch (_) {
                    output = await file.search_tracks(query);
                };
            } else {
                output = await file.search_tracks(query);
            };

            if (IsdownloadFile && IsValidURL(query) && Array.isArray(output)) {
                const [outputPath, audioData] = await downloadFile(query, join_temp_folder(filenamify(query, { fileMode: true }).slice(0, 75) + ".mp3"));

                output.push(audioData);
            };
        } catch (err) {
            const errorStack = util.inspect(err, { depth: null });

            logger.warn(`使用音樂搜索引擎 ${engine}.js 搜索時出錯，忽略: ${errorStack}`);
            continue;
        };

        if (!Array.isArray(output)) {
            logger.warn(`API模塊 ${engine}.js 的 search_tracks 函數沒有返回陣列`);
            continue;
        };

        tracks = output.slice(0, amount);
        tracks = [...new Set(tracks)];
        tracks = fixStructure(tracks);

        if (!file.NO_CACHE) {
            const downloadedFiles = await downloadTracks(tracks.map(track => {
                return {
                    track,
                    id: track.id,
                    url: track.url,
                    source: engine,
                };
            }));

            const failedDownloadSongID = downloadedFiles
                .filter((info) => !Object.values(info)[0])
                .map((info) => {
                    const [file, success] = Object.entries(info)[0];

                    const basename = path.basename(file);
                    let fileExt = basename.split(".");
                    fileExt = fileExt[fileExt.length - 1];

                    const filename = basename.replace(`.${fileExt}`, "");
                    let songID = filename.split("_");
                    songID = songID[songID.length - 1];

                    return songID;
                });

            tracks = tracks.filter(track => !failedDownloadSongID.includes(track.id));
        };

        results.push(...tracks);

        if (results.length >= amount) {
            results = results.slice(0, amount);
            break;
        };
    };

    return results;
};

function getFFmpegPath() {
    const { execSync } = require('child_process');

    const command = process.platform === 'win32' ? 'cmd /C where ffmpeg' : 'which ffmpeg';

    const stdout = execSync(command).toString();

    const ffmpegPath = stdout.trim() || ffmpegInstaller.path;

    return ffmpegPath;
};

function convertToOgg(inputFile, outputFile = null) {
    if (!existsSync(inputFile)) {
        throw new Error(`輸入文件 ${inputFile} 不存在`);
    };

    if (!outputFile) {
        const fileExt = path.extname(inputFile);

        outputFile = inputFile.replace(fileExt, ".ogg");
    };

    if (existsSync(outputFile)) return;

    const ffmpegPath = getFFmpegPath();

    /*
     * -c:a libopus: 使用 libopus 編碼器進行音頻編碼。
     * -b:a 96k: 設定音頻比特率為 96 kbps。
     * -vbr off: 禁用可變比特率（VBR）模式，使用固定比特率（CBR）。
     * -compression_level 10: 設定壓縮級別為 10（範圍通常是 0-10，10 表示最高壓縮）。
     *
    */
    const commandData = {
        cmd: `${ffmpegPath} -i "${inputFile}" -c:a libopus -b:a 96k -vbr off -compression_level 10 "${outputFile}"`,
        input: inputFile,
        output: outputFile,
    };

    if (!global.convertToOggQueue) global.convertToOggQueue = [];
    global.convertToOggQueue.push(commandData);
};

function clear_duplicate_temp() {
    const temp_dir = get_temp_folder();

    const files = readdirSync(temp_dir)
        .filter(file => file.endsWith(".ogg"));

    for (const oggfile of files) {
        const filename = basename(oggfile, ".ogg");
        const oggFilePath = join_temp_folder(oggfile);
        const mp3FilePath = join_temp_folder(`${filename}.mp3`);

        if (existsSync(oggFilePath)) {
            try {
                unlinkSync(mp3FilePath);
            } catch (_) { };
        };
    };
};

function IsValidURL(str) {
    const pattern = new RegExp(
        '^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

    return !!pattern.test(str);
};

module.exports = {
    getQueue,
    getQueues,
    saveQueue,
    getTrack,
    fixStructure,
    search_until,
    convertToOgg,
    clear_duplicate_temp,
    IsValidURL,
    getAudioStream,
    MusicQueue,
    loopStatus,
};
