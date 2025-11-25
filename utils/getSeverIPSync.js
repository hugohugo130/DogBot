const { writeJsonSync } = require("./file.js");
const { DEFAULT_IP, DEFAULT_PORT, serverIPFile } = require("./config.js");
const { get_logger } = require("./logger.js");
const fs = require("fs");

const logger = get_logger();

const PORT = 3003;

function check_IP_valid(IP, PORT) {
    const platform = process.platform;
    let passed = false;

    if (platform === "win32") { // windows NT
        // 用 powershell 偵測本地伺服器
        res = require('child_process').execSync(`powershell -Command \"try { (Invoke-WebRequest -Uri 'http://${IP}:${PORT}/verify' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { '' }\"`).toString().trim();
        passed = true;
    } else if (platform === "linux") { // linux / ubuntu
        res = require('child_process').execSync(`curl -s -o /dev/null -w "%{http_code}" http://${IP}:${PORT}/verify --connect-timeout 1 || echo ""`).toString().trim();
        passed = true;
    } else { // other unsupport system D:
        serverIP = DEFAULT_IP;
    };

    return passed;
};

function getServerIPSync() {
    let serverIP = null;
    if (fs.existsSync(serverIPFile)) {
        try {
            serverIP = JSON.parse(fs.readFileSync(serverIPFile, 'utf8'));
        } catch (e) {
            serverIP = null;
        };
    };

    const IP_file = serverIP?.IP;

    if (!serverIP || !IP_file || !check_IP_valid(IP_file, PORT)) {
        let IP = DEFAULT_IP;

        try {
            if (check_IP_valid("127.0.0.1", PORT)) {
                IP = "127.0.0.1";
                logger.info("偵測到本地伺服器，已切換 IP 為 127.0.0.1");
            };
        } catch (_) {
            IP = DEFAULT_IP;
        };

        serverIP = { IP, PORT };
        writeJsonSync(serverIPFile, serverIP);
    };

    if (!serverIP.IP) {
        serverIP.IP = DEFAULT_IP;
    };

    if (!serverIP.PORT) {
        serverIP.PORT = DEFAULT_PORT;
    };

    return serverIP;
};

module.exports = {
    getServerIPSync,
};