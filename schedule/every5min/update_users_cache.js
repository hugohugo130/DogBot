const DogClient = require("../../utils/customs/client.js");
const { get_logger } = require("../../utils/logger.js");
const { wait_until_ready } = require("../../utils/wait_until_ready.js");
const { priorityGuildIDs } = require("../../utils/config.js");
const util = require('node:util');

const logger = get_logger();

module.exports = {
    /**
     * 
     * @param {DogClient} client 
     */
    execute: async function (client) {
        try {
            wait_until_ready(client);

            const guildCollection = await client.guilds.fetch();
            const guildArray = [...guildCollection.values()];

            const guilds = (await Promise.all(guildArray.map(guild => guild.fetch())))
                .sort((a, b) => {
                    if (a.id.includes(priorityGuildIDs)) return -1;
                    if (b.id.includes(priorityGuildIDs)) return 1;
                    if (a.id.length !== b.id.length) return a.id.length - b.id.length;
                    return a.id.localeCompare(b.id);
                });

            let users;
            try {
                users = await Promise.all(guilds.map(guild => guild.members.fetch()));
            } catch (err) {
                // use cache if rate limited [GuildMembersTimeout]
                if (!err.message.includes("GuildMembersTimeout")) throw err;
                users = guilds.map(guild => guild.members.cache);
            };

            users = users.flatMap(members => members.map(member => member.user));

            client.users.cache = structuredClone(users);
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            logger.error(`更新用戶緩存時出錯：${errorStack}`);
        };
    },
};
