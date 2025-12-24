const axios = require("axios");
const { get_logger } = require("../logger.js");

const APIVersion = 3.0;

const logger = get_logger();

/**
 * https://developer.jamendo.com/v3.0/response-codes
 * @param {any} responseData 
 */
function raise_for_status(responseData) {
    const headers = responseData.headers;

    if (!headers) throw new Error("無效的回應：沒有headers屬性");

    if (headers.warnings) {
        logger.warn(headers.warnings);
    };

    if (headers.code !== 0) { // 等同於 headers.status !== "success"
        throw new Error(headers.error_message);
    };
};

/**
 * https://developer.jamendo.com/v3.0/tracks
 * @param {string} search 
 * @param {string} format 
 * @param {number} limit 
 * @returns {Promise<axios.AxiosResponse>}
 */
async function search_tracks(search, format = "json", limit = 30) {
    const client_id = process.env.JAMENDO_MUSIC_clientID;

    if (!client_id) throw new Error("找不到 Jamendo appliaction client ID");

    const url = `https://api.jamendo.com/v${APIVersion}/tracks/?client_id=${client_id}&format=${format}&limit=${limit}&search=${search}`;

    const response = await axios.get(url);

    const responseData = response.data;
    raise_for_status(responseData);

    if (responseData.headers?.warnings?.length) {
        logger.warn(responseData.headers.warnings.length);
    };

    return response;
};

module.exports = {
    // built-in tools
    raise_for_status,

    // functions
    search_tracks,
};