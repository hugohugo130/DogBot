import {
    load_cogs,
} from "./load_cogs.js";
import {
    wait_for_client,
} from "./wait_for_client.js";
import DogClient from "./customs/client.js";

/**
 * Hot reload cogs
 * @param {object} [options]
 * @param {boolean} [options.quiet]
 * @param {DogClient | null} [options.client]
 * @returns {Promise<number>} The amount of cogs loaded.
 */
async function hot_reload_cogs({ quiet = false, client = global._client } = {}) {
    if (!client) client = await wait_for_client();

    for (const [event_name, listeners] of client.eventListeners) {
        for (const listener of listeners) {
            client.removeListener(event_name, listener);
        };
        if (DEBUG) logger.debug(`removed listener for ${event_name}`);
    };

    return await load_cogs(client, quiet);
};

export {
    hot_reload_cogs,
};