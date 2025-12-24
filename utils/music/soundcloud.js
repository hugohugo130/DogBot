const { Soundcloud } = require("soundcloud.ts");
const util = require("node:util");
const path = require("path");

const { get_logger } = require("../logger.js");

const sc = global._sc ?? new Soundcloud();
global._sc = sc;

const SOURCE = path.basename(__filename, path.extname(__filename));

const logger = get_logger();

const NO_CACHE = false;

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
 * @returns {Promise<[import("soundcloud.ts").SoundcloudTrack, string | null]>} 下載失敗時返回 [track, null]
 */
async function download_track(track, savePath = null) {
    const { join_temp_folder } = require("../file.js");

    try {
        if (!savePath) savePath = join_temp_folder(`${SOURCE}_${track.id}.mp3`);

        const filePath = await sc.util.downloadTrack(track, savePath);

        return [track, filePath];
    } catch (error) {
        // const errorStack = util.inspect(error, { depth: null });

        // logger.error(`下載歌曲時發生錯誤:\n${errorStack}`);
        return [track, null];
    };
};

module.exports = {
    NO_CACHE,
    search_tracks,
    download_track,
};