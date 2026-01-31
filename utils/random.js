const crypto = require('crypto');

/**
 * Return random integer in range [a, b], including both end points.
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Choose a random element from a non-empty sequence.
 * @param {Array<element>} array 
 * @returns {element}
 */
function choice(array) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
};

/**
 *
 * @param {Array<T>} array
 * @param {number} [amount]
 * @returns {Array<T>}
 */
function choicesSync(array, amount = 1) {
    const result = [];
    for (let i = 0; i < amount; i++) {
        result.push(choice(array));
    };

    return result;
};

/**
 *
 * @param {Array<T>} array
 * @param {number} [amount]
 * @returns {Promise<Array<T>>}
 */
async function choices(array, amount = 1) {
    // 使用Promise.all並行執行choice amount次

    const promises = Array.from({ length: amount }, () => new Promise((resolve) => {
        resolve(choice(array));
    }));

    return await Promise.all(promises);
};

/**
 * Generates a random boolean with a specified weight (probability of being true).
 *
 * @param {number} weight - The probability of returning true, between 0.0 and 1.0.
 * @returns {boolean}
 */
function getRandomBooleanWithWeight(weight) {
    if (weight < 0 || weight > 1) {
        throw new Error("Weight must be between 0 and 1.");
    };

    return Math.random() < weight;
};

/**
 *
 * @param {number} [length=32] - Defaults to 32
 * @returns {string}
 */
function generateSessionId(length = 32) {
    return crypto.randomBytes(Math.floor(length / 2)).toString('hex');
};

function generateSHA256(input) {
    const SHA256Hash = crypto.createHash('sha256');

    SHA256Hash.update(input);
    return SHA256Hash.digest('hex');
};

function generateMD5(input) {
    const MD5Hash = crypto.createHash('md5');

    MD5Hash.update(input);
    return MD5Hash.digest('hex');
};

const generateUUID = crypto.randomUUID;

module.exports = {
    randint,
    choice,
    choices,
    choicesSync,
    getRandomBooleanWithWeight,
    generateSessionId,
    generateSHA256,
    generateMD5,
    generateUUID,
};