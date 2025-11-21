const { Collection, Message, User } = require("discord.js");
const djs = import("discord.js");

function isDigit(char) {
    return /^[0-9]+$/.test(char);
};

/**
 * 
 * @param {Message} message 
 * @returns {Promise<Collection<djs.Snowflake, User>>}
 */
async function mentions_users(message) {
    const { get_user } = require("./discord.js");

    const UserIDs = message.content.split(" ")
        .flatMap(e => {
            e = e.trim();

            if (e.startsWith("<@") && e.endsWith(">")) {
                e = e.slice(2, -1);
            };

            return e
        })
        .filter(isDigit)
        .filter(e => e !== "");

    return new Collection(
        await Promise.all(
            UserIDs.map(e => [e, get_user(e)])
        ),
    );
};

module.exports = {
    mentions_users,
};