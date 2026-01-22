const { Events, Message } = require("discord.js");

const { load_rpg_data, save_rpg_data } = require("../utils/file.js");
const { daily_sign_guildIDs } = require("../utils/config.js");
const DogClient = require("../utils/customs/client.js");
const { add_money } = require("../utils/rpg.js");
const { randint } = require("../utils/random.js");

module.exports = {
    name: Events.MessageCreate,
    /**
     *
     * @param {DogClient} client - Discord Client
     * @param {Message} message - Message Object
     */
    execute: async function (client, message) {
        const { author: user, guild } = message;

        if (user.bot || !guild || !daily_sign_guildIDs.includes(guild.id)) return;

        const rpg_data = await load_rpg_data(user.id);
        if (!rpg_data.daily || typeof rpg_data.daily !== "number") rpg_data.daily = 0;
        if (!rpg_data.daily_times || typeof rpg_data.daily_times !== "number") rpg_data.daily_times = 0;

        const daily_times = rpg_data.daily_times;

        const now = new Date();
        const last_sign = new Date(rpg_data.daily);
        if (now.getDate() === last_sign.getDate()) return;

        const money_per_dt = randint(5, 10);
        const bonus = money_per_dt * daily_times;

        const amount = randint(150 + bonus, 500);

        rpg_data.money = add_money({
            rpg_data,
            amount,
            originalUser: "系統",
            targetUser: user.toString(),
            type: "每日簽到",
        });

        rpg_data.daily = now.getTime();
        rpg_data.daily_times += 1;

        await Promise.all([
            message.react("💰"),
            save_rpg_data(user.id, rpg_data),
        ]);
    },
};