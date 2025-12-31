const util = require("node:util");
const path = require("path");
const { Soundcloud } = require("soundcloud.ts");

const { get_logger } = require("../logger.js");

const sc = global._sc ?? new Soundcloud();
global._sc = sc;

const SOURCE = path.basename(__filename, path.extname(__filename));

const logger = get_logger();

const NO_CACHE = true;

/**
 * 
 * @param {string} query
 * @returns {Promise<import("soundcloud.ts").SoundcloudTrack[]>}
 */
async function search_tracks(query) {
    try {
        const tracks = await sc.tracks.search({ q: query });

        return tracks.collection;
    } catch (error) {
        const errorStack = util.inspect(error, { depth: null });

        logger.error(`搜尋歌曲時發生錯誤:\n${errorStack}`);
        return [];
    };
};

/**
 * 
 * @param {import("soundcloud.ts").SoundcloudTrack} track
 * @param {null | string} [savePath=null]
 * @returns {Promise<string | null>} 下載失敗時返回 null
 */
async function download_track(track, savePath = null) {
    const { join_temp_folder } = require("../file.js");
    const { convertToOgg } = require('./music.js');

    try {
        if (!savePath) savePath = join_temp_folder(`${SOURCE}_${track.id}.mp3`);

        const filePath = await sc.util.downloadTrack(track, savePath);
        convertToOgg(filePath);

        return filePath;
    } catch (error) {
        return null;
    };
};

/**
 * 
 * @param {string} url
 * @returns {import("soundcloud.ts").SoundcloudTrack}
 */
async function get_track_info(url) {
    return await sc.tracks.get(url);
};

const Constants = {
    SOUNDCLOUD_URL_REGEX: /^https?:\/\/(soundcloud\.com|snd\.sc)\/(.*)$/,
    REGEX_TRACK: /^https?:\/\/(soundcloud\.com|snd\.sc)\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/?$/,
    REGEX_SET: /^https?:\/\/(soundcloud\.com|snd\.sc)\/([A-Za-z0-9_-]+)\/sets\/([A-Za-z0-9_-]+)\/?$/,
    REGEX_ARTIST: /^https?:\/\/(soundcloud\.com|snd\.sc)\/([A-Za-z0-9_-]+)\/?$/,
};

function validateURL(url = null, type = "all") {
    if (typeof url !== "string") return false;

    switch (type) {
        case "artist":
            return Constants.REGEX_ARTIST.test(url);
        case "playlist":
            return Constants.REGEX_SET.test(url) || (url.match(/soundcloud.app.goo.gl/) && url.split("/").pop().length === 5);
        case "track":
            return Constants.REGEX_TRACK.test(url) || url.match(/soundcloud.app.goo.gl/) && url.split("/").pop().length > 5;
        default:
            return Constants.SOUNDCLOUD_URL_REGEX.test(url) || url.match(/soundcloud.app.goo.gl/);
    };
};

module.exports = {
    NO_CACHE,
    search_tracks,
    download_track,
    validateURL,
};