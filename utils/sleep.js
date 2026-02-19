module.exports = {
    /**
     * Sleep synchronously
     * @deprecated use `asleep` instead
     * @param {number} ms
     */
    sleep(ms) {
        const sharedArray = new Int32Array(new SharedArrayBuffer(4));
        Atomics.wait(sharedArray, 0, 0, ms);
    },
    /**
     * Sleep asynchronously
     * @param {number} ms
     */
    async asleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },
};