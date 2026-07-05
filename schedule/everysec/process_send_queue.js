import {
    process_send_queue,
} from "../../utils/logger.js";
import DogClient from "../../utils/customs/client.js";

export default {
    /**
     *
     * @param {DogClient} client
     */
    execute: async function (client) {
        await process_send_queue(client);
    },
};