/**
 * Sleep synchronously
 * @deprecated use `asleep` instead
 * @param {number} ms
 */
export function sleep(ms) {
    const sharedArray = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(sharedArray, 0, 0, ms);
};

/**
 * Sleep asynchronously
 * @param {number} ms
 */
export async function asleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
};
