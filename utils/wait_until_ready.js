function client_ready(client = global._client) {
    return client?.isReady?.();
};

function wait_until_ready(client = global._client, timeout = 10) {
    if (!client) client = global._client;
    const start = Date.now() / 1000;

    while (true) {
        if (client_ready(client) || start + timeout >= Date.now()) break;
    };

    return client_ready(client) ? client : null;;
};

module.exports = {
    client_ready,
    wait_until_ready,
}