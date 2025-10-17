function wait_until_ready(client = global._client) {
    if (!client) client = global._client;
    while (true) {
        if (client && client.isReady()) break;
    };
    return client;
};

module.exports = {
    wait_until_ready,
}