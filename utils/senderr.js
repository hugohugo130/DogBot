module.exports = {
    senderr({ client, msg, clientready }) {
        const { get_logger } = require("./logger.js");
        const logger = get_logger(null, client || null);
        if (msg == undefined) {
            const error = new Error();
            const stack = error.stack.split("\n");
            process.emitWarning(`undefined message called from: ${stack[2]}`, {
                code: 'UNDEFINED_MSG',
                detail: '訊息未定義'
            });
            return;
        };
        if (clientready == undefined) {
            clientready = Boolean(client);
        };
        if (msg.stack) {
            process.emitWarning(`調用senderr函數的地方傳送參數msg為error而不是error.stack`, {
                code: 'WRONG_PARAMETER',
                detail: '應該使用 error.stack 而不是 error 物件'
            });
            return;
        };
        logger.error(msg);
    },
}