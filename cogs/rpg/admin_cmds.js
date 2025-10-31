const { Events } = require("discord.js");

function add_item(rpg_data, item, amount) {
    if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;

    rpg_data.inventory[item] += amount;

    return rpg_data
}

module.exports = {
    name: Events.MessageCreate,
    execute: async function (client, message) {
        const { load_rpg_data, save_rpg_data } = require("../../utils/file.js");
        const { get_id_of_name } = require("../../utils/rpg.js");

        if (message.author.id !== "898836485397180426") return;
        if (!message.content.startsWith("!give ")) return;

        let args = message.content.split(" ");

        // 移除所有元素的空白字元
        args = args.map(arg => arg.trim());

        // 移除所有空白的元素 ''
        args = args.filter(arg => arg !== '');

        let [_, __, item, amount] = args;
        item = get_id_of_name(item);

        const user = message.mentions.users.first();

        if (!user) return;

        const rpg_data = add_item(load_rpg_data(user.id), item, parseInt(amount));

        save_rpg_data(user.id, rpg_data);

        return message.reply(`done adding user <@${user.id}> 's inventory: ${item}*${amount}`);
    },
}