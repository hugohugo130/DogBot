const { asleep } = require("./sleep");
const DogClient = require("./customs/client");

function client_ready(client = global._client) {
    return client?.isReady?.();
};

async function wait_for_client(waitReady = true, timeout = 10000, wait = 500) {
    const client = global._client;
    const start = Date.now();

    while (true) {
        if ((start + timeout) >= Date.now()) break;

        if (waitReady) {
            if (client_ready(client)) break;
        } else if (client) break;

        await asleep(wait);
    };

    return client;
};

/**
 * 
 * @param {DogClient} client - Discord Client
 * @param {*} timeout - Timeout (ms)
 * @param {*} wait - check is ready per _ ms
 * @returns {Promise<DogClient | null>}
 */
async function wait_until_ready(client = global._client, timeout = 10000, wait = 500) {
    if (!client instanceof Client) client = wait_for_client();

    if (!client) client = global._client;
    const start = Date.now();

    while (true) {
        if (client_ready(client) || (start + timeout) >= Date.now()) break;

        await asleep(wait);
    };

    return client_ready(client) ? client : null;
};

module.exports = {
    client_ready,
    wait_for_client,
    wait_until_ready,
};