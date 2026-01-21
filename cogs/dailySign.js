const { Events, Message } = require("discord.js");

const { load_rpg_data, save_rpg_data } = require("../utils/file.js");
const { daily_sign_guildIDs } = require("../utils/config.js");
const DogClient = require("../utils/customs/client.js");
const { add_money } = require("../utils/rpg.js");

module.exports = {
    name: Events.MessageCreate,
    /**
     *
     * @param {DogClient} client - Discord Client
     * @param {Message} message - Message Object
     */
    execute: async function (client, message) {
        const { author: user, guild } = message;

        if (user.bot || !guild) return;
        if (!daily_sign_guildIDs.includes(guild.id)) return;

        const rpg_data = await load_rpg_data(user.id);
        if (!rpg_data.daily) rpg_data.daily = 0;

        const now = new Date();
        const last_sign = new Date(rpg_data.daily);
        if (now.getDate() === last_sign.getDate()) return;

        rpg_data.money = add_money({
            rpg_data,
            amount,
            originalUser: "系統",
            targetUser: user.toString(),
            type: "每日簽到",
        });

        rpg_data.daily = now.getTime();
        await save_rpg_data(user.id, rpg_data);
    },
};