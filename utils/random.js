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

module.exports = {
    randint,
    choice
};