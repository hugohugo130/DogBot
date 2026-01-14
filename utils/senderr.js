const { get_logger, getCallerModuleName } = require("./logger.js");

const logger = get_logger();

module.exports = {
    senderr() {
        logger.warn(`[DEPRECATED] senderr called from ${getCallerModuleName()}`);
    },
};