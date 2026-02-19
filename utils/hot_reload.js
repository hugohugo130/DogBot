const { load_cogs } = require("./load_cogs.js");
const { wait_for_client } = require("./wait_until_ready.js");
const DogClient = require("./customs/client.js");

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

module.exports = {
    hot_reload_cogs,
};