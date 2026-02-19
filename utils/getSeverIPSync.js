const fs = require("fs");
const { execSync } = require("child_process");

const { writeJsonSync, readFileSync } = require("./file.js");
const { get_logger } = require("./logger.js");
const { DEFAULT_IP, DEFAULT_PORT, serverIPFile } = require("./config.js");

const logger = get_logger();

// const PORT = 3003;
const PORT = DEFAULT_PORT;

/**
 * Check whether the IP:PORT can be connected
 * @param {string} IP - The IP to check
 * @param {number} PORT - The PORT to check
 * @returns {boolean}
 */
function check_IP_valid(IP, PORT) {
    const platform = process.platform;

    if (platform === "win32") { // windows NT
        const res = execSync(`powershell -Command "try { (Invoke-WebRequest -Uri 'http://${IP}:${PORT}/verify' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { '' }"`).toString().trim();

        return res === "200";
    } else if (platform === "linux") { // linux / ubuntu
        const res = execSync(`curl -s -o /dev/null -w "%{http_code}" http://${IP}:${PORT}/verify --connect-timeout 1 || echo ""`).toString().trim();

        return res === "200";
    } else {
        // 不支援的操作系統 D:
    };

    return false;
};

function getServerIPSync() {
    let serverIP = null;
    if (fs.existsSync(serverIPFile)) {
        try {
            serverIP = JSON.parse(
                readFileSync(serverIPFile, {
                    encoding: "utf-8",
                })
            );
        } catch (e) {
            serverIP = null;
        };
    };

    const file_IP = serverIP?.IP;

    if (!serverIP || !file_IP || !check_IP_valid(file_IP, PORT)) {
        let IP = DEFAULT_IP;

        try {
            if (check_IP_valid("127.0.0.1", PORT)) {
                IP = "127.0.0.1";
                logger.info("偵測到本地伺服器，已切換 IP 為 127.0.0.1");
            };
        } catch {
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