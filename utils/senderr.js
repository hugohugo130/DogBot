module.exports = {
    senderr({ client, msg, clientready }) {
        const { get_logger, getCallerModuleName } = require("./logger.js");
        const logger = get_logger();
        logger.error(`[DEPRECATED] senderr called from ${getCallerModuleName()}`);
    },
}