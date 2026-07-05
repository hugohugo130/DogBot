import {
    Events,
    Message,
} from "discord.js";

import {
    load_rpg_data,
    save_rpg_data,
} from "../utils/file.js";
import {
    add_money,
    get_emoji,
} from "../utils/rpg.js";
import {
    randint,
} from "../utils/random.js";
import {
    wait_for_client,
} from "../utils/wait_for_client.js";
import {
    daily_sign_guildIDs,
    embed_default_color,
    RPGDatabase,
} from "../utils/config.js";
import DogClient from "../utils/customs/client.js";
import EmbedBuilder from "../utils/customs/embedBuilder.js";

/**
 * 判斷用戶今天是否已簽到和斷簽
 * @param {Date | string | number | null} lastSignTime - 上次簽到時間
 * @returns {[boolean, boolean]} [今天是否已簽到, 是否斷簽]
 */
export function hasSignedTodayOrBrokeSign(lastSignTime) {
    // 沒有簽到過，不算斷簽
    if (!lastSignTime) return [false, false];

    const current = new Date();
    const lastSign = new Date(lastSignTime);

    // 計算兩個日期之間的天數差
    const lastSignDate = new Date(
        lastSign.getFullYear(),
        lastSign.getMonth(),
        lastSign.getDate()
    );

    const currentDate = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate()
    );

    const timeDiff = currentDate.getTime() - lastSignDate.getTime();
    const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    // 如果時間差大於1天，則表示斷簽
    return [dayDiff === 0, dayDiff > 1];
};

/**
 * Sign Function
 * @param {RPGDatabase} rpg_data - RPG data
 * @param {Message} message - Discord Message
 * @param {DogClient | null} [client=null] - Discord Client
 * @returns {Promise<boolean>} true if signed successfully, otherwise false
 */
export async function sign(rpg_data, message, client = null) {
    if (!client) client = await wait_for_client();
    const user = message.author;

    if (!rpg_data.job) return false;
    if (!rpg_data.daily || typeof rpg_data.daily !== "number") rpg_data.daily = 0;
    if (!rpg_data.daily_times || typeof rpg_data.daily_times !== "number") rpg_data.daily_times = 0;

    let daily_times = rpg_data.daily_times;

    const [signedToday, brokeSign] = hasSignedTodayOrBrokeSign(rpg_data.daily);
    if (signedToday) return false;

    if (brokeSign) daily_times = 0;

    const money_per_dt = randint(4, 6);
    const bonus = money_per_dt * daily_times;
    const total = 150 + bonus;
    const diff = 4; // ± 4

    const amount = randint(total - diff, total + diff);
    try {
        rpg_data.money = add_money({
            rpg_data,
            amount,
            originalUser: "系統",
            targetUser: user.toString(),
            type: "每日簽到",
        });
    } catch (err) {
        if (err instanceof Error && err.stack?.includes?.("金額超過上限")) return true;
        throw err;
    };

    rpg_data.daily = Date.now();
    daily_times++;

    rpg_data.daily_times = daily_times;

    if (rpg_data.daily_msg) {
        const emoji_calendar = await get_emoji("calendar", client);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_calendar} | 每日簽到`)
            .setDescription(`你連續簽到了 \`${daily_times}\` 天，獲得了\`${amount}$\``)
            .setEmbedFooter(user.id);

        try {
            await user.send({ embeds: [embed] });
        } catch { };
    };

    await Promise.all([
        message.react("💰"),
        save_rpg_data(user.id, rpg_data),
    ]);

    return true;
};

export const name = Events.MessageCreate;

/**
 *
 * @param {DogClient} client - Discord Client
 * @param {Message} message - Message Object
 */
export async function execute(client, message) {
    const { author: user, guild } = message;

    if (user.bot || !guild || !daily_sign_guildIDs.includes(guild.id)) return;

    const rpg_data = await load_rpg_data(user.id);
    await sign(rpg_data, message, client);
};