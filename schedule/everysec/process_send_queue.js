const { process_send_queue } = require("../../utils/logger.js");
const DogClient = require("../../utils/customs/client.js");

module.exports = {
    /**
     *
     * @param {DogClient} client
     */
    execute: async function (client) {
        await process_send_queue(client);
    },
};