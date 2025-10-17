const { writeJsonSync } = require("./file.js");
const { DEFAULT_IP, serverIPFile } = require("./config.js");
const { get_logger } = require("./logger.js");

const logger = get_logger();

const PORT = 3003;

function getServerIPSync() {
    let serverIP = null;
    if (fs.existsSync(serverIPFile)) {
        try {
            serverIP = JSON.parse(fs.readFileSync(serverIPFile, 'utf8'));
        } catch (e) {
            serverIP = null;
        };
    };

    if (!serverIP || !check_IP_valid(serverIP, PORT)) {
        try {
            let IP = DEFAULT_IP;

            try {
                const platform = process.platform;
                let res;
                let passed = false;

                if (platform === "win32") { // windows NT
                    // 用 powershell 偵測本地伺服器
                    res = require('child_process').execSync(`powershell -Command \"try { (Invoke-WebRequest -Uri 'http://127.0.0.1:${PORT}/verify' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { '' }\"`).toString().trim();
                    passed = true;
                } else if (platform === "linux") { // linux / ubuntu
                    res = require('child_process').execSync(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT}/verify --connect-timeout 1 || echo ""`).toString().trim();
                    passed = true;
                } else { // other unsupport system D:
                    serverIP = DEFAULT_IP;
                };

                if (passed) {
                    if (res === "200") {
                        IP = "127.0.0.1";
                        logger.info("偵測到本地伺服器，已切換 IP 為 127.0.0.1");
                    };
                };
            } catch (_) { }

            serverIP = { IP, PORT };
            writeJsonSync(serverIPFile, serverIP);
        } finally {
            delete default_value;
        };
    };

    return serverIP;
};

module.exports = {
    getServerIPSync,
};