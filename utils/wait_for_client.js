import {
    Client,
} from "discord.js";

import {
    asleep,
} from "./sleep.js";

const client_ready = (client = global._client) => client?.isReady?.();

/**
 * Wait for the Client object
 *
 * @overload
 * @param {boolean} [waitReady] - whether to wait the client to be ready.
 * @param {null | undefined | 0} [timeout] - unit: ms
 * @param {number} [wait] - check per __ ms
 * @returns {Promise<import("./customs/client.js").DogClient>}
 *
 * @overload
 * @param {boolean} [waitReady] - whether to wait the client to be ready.
 * @param {number} [timeout] - unit: ms
 * @param {number} [wait] - check per __ ms
 * @returns {Promise<import("./customs/client.js").DogClient | null>}
 *
 * @param {boolean} [waitReady] - whether to wait the client to be ready.
 * @param {number | null | undefined} [timeout] - unit: ms
 * @param {number} [wait] - check per __ ms
 * @returns {Promise<import("./customs/client.js").DogClient | null>}
 */
export async function wait_for_client(waitReady = true, timeout = 10000, wait = 500) {
    const client = global._client;
    const start = Date.now();

    while (true) {
        if (timeout && (start + timeout) <= Date.now()) break;

        if (waitReady) {
            if (client_ready(client)) break;
        } else if (client) break;

        await asleep(wait);
    };

    return client;
};

/**
 * 
 * @param {import("./customs/client.js").DogClient | null} [client] - Discord Client
 * @param {number} [timeout] - Timeout (ms)
 * @param {number} [wait] - check is ready per _ ms
 * @returns {Promise<import("./customs/client.js").DogClient | null>}
 */
export async function wait_until_ready(client = global._client, timeout = 10000, wait = 500) {
    if (!(client instanceof Client)) client = await wait_for_client(true, timeout, wait);

    if (!client) client = global._client;
    const start = Date.now();

    while (true) {
        if (client_ready(client) || (start + timeout) >= Date.now()) break;

        await asleep(wait);
    };

    return client_ready(client)
        ? client
        : null;
};
