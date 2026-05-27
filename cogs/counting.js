const { Events, Message } = require("discord.js");

const { isDigit } = require("../utils/message.js");
const { loadData, saveData } = require("../utils/file.js");
const { counting_warning_cooldown } = require("../utils/config.js");
const DogClient = require("../utils/customs/client.js");

/**
 * @param {Message} message
 * @returns {number | null}
 */
function getNumberFromMessage(message) {
    const content = message.content.split(" ")[0];

    return parseInt(content) || null;
};

/**
 * @param {any} n
 * @returns {boolean}
 */
function IsAValidNumber(n) {
    if (!n) return false;

    const given_number = String(n);

    return (
        isDigit(given_number) &&
        given_number.length < Number.MAX_SAFE_INTEGER.toString().length
    );
};

const reset_number = 1;

module.exports = {
    name: Events.MessageCreate,

    /**
     * @param {DogClient} client
     * @param {Message} message
     */
    execute: async function (client, message) {
        if (!message.guild || message.author.bot) return;

        const given_number = getNumberFromMessage(message);
        const channel = message.channel;
        const guild = message.guild;
        const user = message.author;
        const guildId = guild.id;

        if (!IsAValidNumber(given_number)) return;

        const guildData = await loadData(guildId);

        const counting_data = guildData.counting;

        const { channelId: counting_channel_id, last_counter, current: current_number, highest: highest_number } = counting_data;

        if (!counting_channel_id || channel.id !== counting_channel_id) return;

        const next_count = current_number + 1;

        const correct = given_number === next_count;
        const different_counter = last_counter !== user.id;

        let emoji = "❓";
        let msg = null;

        if (correct && different_counter) {
            emoji = "✅";

            counting_data.current = next_count;

            if (current_number > highest_number) {
                emoji = "☑️";
                counting_data.highest = next_count;
            };

        } else if (!correct && current_number === reset_number) {
            const last_warning_timestamp = client.counting_warning_cooldown.get(guildId) ?? 0;
            const next_timestamp = last_warning_timestamp + counting_warning_cooldown;
            const now = Date.now();

            if (now < next_timestamp) return;

            emoji = "⚠️";
            msg = `⚠️ 下一個數字是 **${current_number}**。`;

        } else {
            const reason = !different_counter
                ? "你不能連續數兩個數字。"
                : "數錯了。";

            emoji = "❌";
            msg = `<@${user.id}> 在 **${current_number}** 搞砸了！！下一個數字是 **${reset_number}**。**${reason}。**`;

            counting_data.current = reset_number;
        };

        counting_data.last_counter = user.id;

        guildData.counting = counting_data;
        client.counting_warning_cooldown.set(guildId, Date.now());

        await Promise.all([
            emoji ? message.react(emoji) : null,
            msg ? message.reply(msg) : null,
            saveData(guildId, guildData),
        ]);
    },
}