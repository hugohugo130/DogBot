const { process_send_queue } = require("../../utils/logger.js");

module.exports = {
    execute: async function (client) {
        await process_send_queue(client);
    },
};