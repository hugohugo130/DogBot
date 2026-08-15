import {
    Collection,
    Guild,
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
 * Get the users mentioned in a message
 * @param {Message | import("../cogs/rpg/msg_handler.js").MockMessage} message
 * @param {Guild | null} [guild=null]
 * @returns {Promise<Collection<string, User>>}
 */
async function mentions_users(message, guild = null) {
    if (!message.content) return new Collection();

    const userIDs = message.content.split(" ")
        .flatMap(userID => {
            userID = userID.trim();

            if (userID.startsWith("<@") && userID.endsWith(">")) {
                userID = userID.slice(2, -1);
            };

            return userID.trim();
        })
        .filter(userID => !!userID && (isDigit(userID) || /^[a-z0-9_.]+$/.test(userID)));

    /**
     * @type {Promise<[string | null, User | null]>[]}
     */
    const promises = userIDs.map(
        /**
         * @param {string} userid
         * @returns {Promise<[string | null, User | null]>}
         */
        async (userid) => {
            const user = isDigit(userid)
                ? await get_user(userid)
                : await get_user_by_username(userid);

            return [
                user?.id ?? null,
                user
            ];
        },
    );

    return (
        /** @type {Collection<string, User>} */
        (new Collection(
            (await Promise.all(promises))
                .filter(([key, user]) => key !== null && user !== null)
        ))
    );
};

export {
    isDigit,
    mentions_users,
};