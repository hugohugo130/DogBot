import util from "util";
import {
    Readable,
} from "stream";
import {
    Soundcloud,
} from "soundcloud.ts";

import {
    get_logger,
} from "../logger.js";
import {
    fetchAudioStream,
} from "./music.js";

/** @type {Soundcloud} */
const sc: Soundcloud = global._sc ?? new Soundcloud();
global._sc = sc;

const logger = get_logger();

const Constants = {
    SOUNDCLOUD_URL_REGEX: /^https?:\/\/(soundcloud\.com|snd\.sc)\/(.*)$/,
    REGEX_TRACK: /^https?:\/\/(soundcloud\.com|snd\.sc)\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/?$/,
    REGEX_SET: /^https?:\/\/(soundcloud\.com|snd\.sc)\/([A-Za-z0-9_-]+)\/sets\/([A-Za-z0-9_-]+)\/?$/,
    REGEX_ARTIST: /^https?:\/\/(soundcloud\.com|snd\.sc)\/([A-Za-z0-9_-]+)\/?$/,
};

/**
 * Search for tracks on soundcloud.
 * @param {string} query
 * @returns {Promise<import("soundcloud.ts").SoundcloudTrack[]>}
 */
async function search_tracks(query: string): Promise<import("soundcloud.ts").SoundcloudTrack[]> {
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
 * Get the audio stream of a soundcloud track
 * @param {import("soundcloud.ts").SoundcloudTrack | string} track - The soundcloud track
 * @returns {Promise<[Readable, string | null]>} - [Readable, string] string is FileTypeResult.mime, usually "audio/mpeg"
 */
async function getAudioStream(track: import("soundcloud.ts").SoundcloudTrack | string): Promise<[Readable, string | null]> {
    // const stream_url = await sc.util.streamLink(track);
    const stream_url = false; // too bad so sad, this spend a loooooooooooooooot of time.
    if (stream_url) {
        // logger.debug(stream_url)
        const [audio_stream, fileType] = await fetchAudioStream(stream_url);
        // logger.debug("fetched")
        return [audio_stream, fileType.mime];
    } else {
        // logger.debug("else:")
        const stream = await sc.util.streamTrack(track);

        return [stream, "audio/mpeg"];
    };
};

async function get_track_info(url: string): Promise<import("soundcloud.ts").SoundcloudTrack> {
    return await sc.tracks.get(url);
};

async function get_related_tracks(track_id: string | number): Promise<import("soundcloud.ts").SoundcloudSearch> {
    return await sc.tracks.related(track_id);
};

export function validateURL(url: string | null = null, type: string | null = "track"): boolean {
    if (typeof url !== "string") return false;

    switch (type) {
        case "artist": {
            return Constants.REGEX_ARTIST.test(url);
        }

        case "playlist": {
            return !!(Constants.REGEX_SET.test(url) || (url.match(/soundcloud.app.goo.gl/) && url.split("/").pop()?.length === 5));
        }

        case "track": {
            const last = url.split("/").pop();

            return !!(Constants.REGEX_TRACK.test(url) || url.match(/soundcloud.app.goo.gl/) && last && last.length > 5);
        }

        default: {
            return !!(Constants.SOUNDCLOUD_URL_REGEX.test(url) || url.match(/soundcloud.app.goo.gl/));
        }
    };
};

export {
    search_tracks,
    getAudioStream,
    get_track_info,
    get_related_tracks,
};