const { get_logger } = require("./logger");
const { wait_until_ready } = require("./wait_until_ready")

const logger = get_logger();

async function get_members_of_guild(guildID, client = global._client) {
    wait_until_ready(client);
    const guild = client.guilds.fetch(guildID);
    if (!guild) {
        logger.warn(`找不到Guild (ID: ${guildID})，返回members []`);
        return [];
    };
    return await guild.members.fetch();
};

async function get_user_of_guild(guildID, client = global._client) {
    const members = await get_members_of_guild(guildID, client);
    return members.map(m => m.user);
};

module.exports = {
    get_members_of_guild,
    get_user_of_guild,
};