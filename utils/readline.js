const readlinep = require("readline/promises");

/**
 * @overload
 * @param {false} createInterface - Whether to create Interface when the rl is not exists.
 * @returns {readlinep.Interface | null}
 */
/**
 * @overload
 * @param {true} [createInterface=true] - Whether to create Interface when the rl is not exists.
 * @returns {readlinep.Interface}
 */
/**
 * Get readline/promises interface object
 * @param {boolean} [createInterface=true] - Whether to create Interface when the rl is not exists.
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