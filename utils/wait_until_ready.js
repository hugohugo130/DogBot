const { Client } = require("discord.js");
const { get_logger, getCallerModuleName } = require("./logger");

const logger = get_logger();

function client_ready(client = global._client) {
    return client?.isReady?.();
};

function wait_for_client(waitReady = true, timeout = 10) {
    const client = global._client;
    const start = Date.now() / 1000;

    while (true) {
        if (start + timeout >= Date.now()) break;

        if (waitReady) {
            if (client_ready(client)) {
                break;
            };
        } else if (client) {
            break;
        };
    };

    return client;
};

function wait_until_ready(client = global._client, timeout = 10) {
    if (!client instanceof Client) {
        client = wait_for_client();
    };

    if (!client) client = global._client;
    const start = Date.now() / 1000;

    while (true) {
        if (client_ready(client) || start + timeout >= Date.now()) break;
    };

    return client_ready(client) ? client : null;
};

module.exports = {
    client_ready,
    wait_for_client,
    wait_until_ready,
}