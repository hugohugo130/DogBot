const { writeJsonSync } = require("./file.js");
const { BETA, DEFAULT_IP } = require("./config.js");
const { get_logger } = require("./logger.js");

const logger = get_logger();

function getServerIPSync(client) {
    if (client.serverIP) return client.serverIP;
    const LOCAL_IP = "127.0.0.1"

    try {
        let PORT = BETA ? 3001 : 3002;
        // 用 powershell 偵測本地伺服器
        const res = require('child_process').execSync(`powershell -Command \"try { (Invoke-WebRequest -Uri 'http://${LOCAL_IP}:${PORT}/verify' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { '' }\"`).toString().trim();
        if (res === "200") {
            IP = LOCAL_IP;
            logger.info(`偵測到本地伺服器，已切換 IP 為 ${LOCAL_IP}`);
        };

        serverIP = { IP, PORT };
        writeJsonSync(serverIPFile, serverIP);
    } catch (err) {
        return DEFAULT_IP;
    } finally {
        delete default_value;
    };
};

module.exports = {
    getServerIPSync,
};