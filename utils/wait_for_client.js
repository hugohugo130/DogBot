import {
    Client,
} from "discord.js";

import {
    asleep,
} from "./sleep.js";
import DogClient from "./customs/client.js";

const client_ready = (client = global._client) => client?.isReady?.();

/**
 * Wait for the Client object
 *
 * @overload
 * @param {boolean} [waitReady=true] - whether to wait the client to be ready.
 * @param {null | undefined | 0} [timeout=10000] - unit: ms
 * @param {number} [wait=500] - check per __ ms
 * @returns {Promise<DogClient>}
 *
 * @overload
 * @param {boolean} [waitReady=true] - whether to wait the client to be ready.
 * @param {number} [timeout=10000] - unit: ms
 * @param {number} [wait=500] - check per __ ms
 * @returns {Promise<DogClient | null>}
 *
 * @overload
 * @param {boolean} [waitReady=true] - whether to wait the client to be ready.
 * @param {number} [timeout=10000] - unit: ms
 * @param {number} [wait=500] - check per __ ms
 * @returns {Promise<DogClient | null>}
 *
 * @param {boolean} [waitReady=true] - whether to wait the client to be ready.
 * @param {number} [timeout=10000] - unit: ms
 * @param {number} [wait=500] - check per __ ms
 */
async function wait_for_client(waitReady = true, timeout = 10000, wait = 500) {
    const client = global._client;
    const start = Date.now();

    while (true) {
        if (timeout && (start + timeout) >= Date.now()) break;

        if (waitReady) {
            if (client_ready(client)) break;
        } else if (client) break;

        await asleep(wait);
    };

    return client;
};

/**
 * 
 * @param {DogClient | null} [client] - Discord Client
 * @param {number} [timeout=10000] - Timeout (ms)
 * @param {number} [wait=500] - check is ready per _ ms
 * @returns {Promise<DogClient | null>}
 */
async function wait_until_ready(client = global._client, timeout = 10000, wait = 500) {
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

export {
    wait_for_client,
};