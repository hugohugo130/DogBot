function client_ready(client = global._client) {
    return client?.isReady?.();
};

function wait_until_ready(client = global._client) {
    if (!client) client = global._client;
    while (true) {
        if (client_ready(client)) break;
    };
    return client;
};

module.exports = {
    client_ready,
    wait_until_ready,
}