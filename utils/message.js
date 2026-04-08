const { Collection, Message, User } = require("discord.js");

/**
 * Check whether a string is digit
 * @param {string} string
 * @returns {boolean}
 */
function isDigit(string) {
    return !!(
        string
        && typeof string === "string"
        && /^[0-9]+$/.test(string)
    );
};

/**
 * Get the users mentioned in a message
 * @param {Message | import("../cogs/rpg/msg_handler.js").MockMessage} message
 * @returns {Promise<Collection<string, User>>}
 */
async function mentions_users(message) {
    const { get_user } = require("./discord.js");

    if (!message.content) return new Collection();

    const userIDs = message.content.split(" ")
        .flatMap(userID => {
            userID = userID.trim();

            if (userID.startsWith("<@") && userID.endsWith(">")) {
                userID = userID.slice(2, -1);
            };

            return userID.trim();
        })
        .filter(userID => isDigit(userID) && Boolean(userID));

    /**
     * @type {Promise<[string, User | null]>[]}
     */
    const promises = userIDs.map(
        /**
         * @param {string} userid
         * @returns {Promise<[string, User | null]>}
         */
        async (userid) => [userid, await get_user(userid)],
    );

    return (
        /** @type {Collection<string, User>} */
        (new Collection(
            (await Promise.all(promises))
                .filter(([_, user]) => user !== null)
        ))
    );
};

module.exports = {
    isDigit,
    mentions_users,
};