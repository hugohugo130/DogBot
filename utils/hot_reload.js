const { load_cogs } = require("./load_cogs.js");
const DogClient = require("./customs/client.js");

/**
 * Hot reload cogs
 * @param {{ quiet: boolean, client: DogClient }} [param0]
 * @returns {Promise<number>} The amount of cogs loaded.
 */
async function hot_reload_cogs({ quiet = false, client = global._client } = {}) {
    client.removeAllListeners();

    return await load_cogs(client, quiet);
};

module.exports = {
    hot_reload_cogs,
};