const readlinep = require("readline/promises");

/**
 * 
 * @param {boolean} createInterface - Whether to create Interface when the rl is not exists.
 * @returns {readlinep.Interface | null}
 */
function get_areadline(createInterface = true) {
    if (global._areadline) return global._areadline;

    /** @type {null | readlinep.Interface} */
    let rl = null;

    if (createInterface) {
        rl = readlinep.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    };

    global._areadline = rl;

    return rl;
};

module.exports = {
    get_areadline,
};