import {
    Collection,
    Message,
    User,
} from "discord.js";

import {
    get_user,
    get_user_by_username,
} from "./discord.js";

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
 * @overload
 * @param {Message | import("../cogs/rpg/msg_handler.js").MockMessage} message
 * @param {true} idOnly
 * @returns {Promise<Array<string>>}
 */
/**
 * @overload
 * @param {Message | import("../cogs/rpg/msg_handler.js").MockMessage} message
 * @param {false} [idOnly]
 * @returns {Promise<Collection<string, User>>}
 */
/**
 * Get the users mentioned in a message
 * @param {Message | import("../cogs/rpg/msg_handler.js").MockMessage} message
 * @param {boolean} [idOnly]
 * @returns {Promise<Collection<string, User> | Array<string>>}
 */
async function mentions_users(message, idOnly = false) {
    if (!message.content) return idOnly ? [] : new Collection();

    const userIDs = message.content.split(" ")
        .flatMap(userID => {
            userID = userID.trim();

            if (userID.startsWith("<@") && userID.endsWith(">")) {
                userID = userID.slice(2, -1);
            };

            return userID.trim();
        })
        .filter(userID => !!userID && (isDigit(userID) || /^[a-z0-9_.]+$/.test(userID)));

    if (idOnly) return userIDs.filter(isDigit);

    /**
     * @type {Promise<[string, User] | null>[]}
     */
    const promises = userIDs.map(
        /**
         * @param {string} userid
         * @returns {Promise<[string, User] | null>}
         */
        async (userid) => {
            const user = isDigit(userid)
                ? await get_user(userid)
                : await get_user_by_username(userid);

            return user?.id ?
                [
                    user?.id ?? null,
                    user,
                ]
                : null;
        },
    );

    const result = await Promise.all(promises);
    const users = result.filter(e => e !== null);
    return new Collection(users);
};

export {
    isDigit,
    mentions_users,
};