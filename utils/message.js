const { Collection, Message, User } = require("discord.js");

/**
 * Check whether a string is digit
 * @param {string} char
 * @returns {boolean}
 */
function isDigit(char) {
    return /^[0-9]+$/.test(char);
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
        .flatMap(e => {
            e = e.trim();

            if (e.startsWith("<@") && e.endsWith(">")) {
                e = e.slice(2, -1);
            };

            return e;
        })
        .filter(isDigit)
        .filter(e => Boolean(e.trim()));

    return new Collection(
        // @ts-ignore
        await Promise.all(
            userIDs.map(
                /** @param {string} userid */
                async (userid) => [userid, await get_user(userid)]
            ),
        )
    );
};

module.exports = {
    mentions_users,
};