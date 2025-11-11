/**
 * 
 * @param {number} timestamp 
 * @returns {number}
 */
function convertToSecond(timestamp) {
    if (isNaN(timestamp)) {
        throw new Error("Invalid timestamp");
    };

    timestamp = Math.floor(timestamp);

    if (timestamp < 1e12) return timestamp;

    return Math.floor(timestamp / 1000);
};

function DateNow() {
    return Date.now();
};

function DateNowSecond() {
    return convertToSecond(DateNow());
};

module.exports = {
    convertToSecond,
    DateNow,
    DateNowSecond,
};