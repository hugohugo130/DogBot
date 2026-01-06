/**
 * 
 * @param {number} timestamp 
 * @returns {number}
 */
function convertToSecondTimestamp(timestamp) {
    if (isNaN(timestamp)) {
        throw new Error("Invalid timestamp");
    };

    timestamp = Math.floor(timestamp);

    if (timestamp < 1e12) return timestamp;

    return Math.floor(timestamp / 1000);
};

/**
 * 
 * @param {number} number
 * @returns {number}
 */
function convertToSecond(number) {
    return Math.floor(number / 1000);
};

/**
 * 
 * @param {number} seconds
 * @param {boolean} [convertToSec=true]
 * @returns {string}
 */
function formatMinutesSeconds(seconds, convertToSec = true) {
    if (convertToSec) {
        seconds = convertToSecond(seconds);
    };

    const hours = Math.floor(seconds / 60 / 60);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    const formattedHours = String(hours).padStart(2, "0")
    const formattedMins = String(mins).padStart(2, "0");
    const formattedSecs = String(secs).padStart(2, "0");

    return `${formattedHours}:${formattedMins}:${formattedSecs}`;
};

function DateNow() {
    return Date.now();
};

function DateNowSecond() {
    return convertToSecondTimestamp(DateNow());
};

module.exports = {
    convertToSecondTimestamp,
    convertToSecond,
    formatMinutesSeconds,
    DateNow,
    DateNowSecond,
};