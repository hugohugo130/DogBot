const { process_send_queue } = require("../../utils/logger")

module.exports = {
    execute: async function (client) {
        await process_send_queue(client);
    }
}