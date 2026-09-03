import {
    process_send_queue,
} from "../../utils/logger.js";

export default {
    execute: async function () {
        await process_send_queue();
    },
};