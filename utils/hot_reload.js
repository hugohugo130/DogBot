import {
    load_cogs,
} from "./load_cogs.js";
import {
    wait_for_client,
} from "./wait_for_client.js";
import DogClient from "./customs/client.js";

/**
 * Hot reload cogs
 * @param {Object} [options]
 * @param {boolean} [options.quiet=false]
 * @param {DogClient | null} [options.client]
 * @returns {Promise<number>} The amount of cogs loaded.
 */
async function hot_reload_cogs({ quiet = false, client = global._client } = {}) {
    if (!client) client = await wait_for_client();

    client.removeAllListeners();

    return await load_cogs(client, quiet);
};

export {
    hot_reload_cogs,
};