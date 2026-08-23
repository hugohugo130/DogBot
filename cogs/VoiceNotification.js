import {
    Events,
    Colors,
    MessageFlags,
} from "discord.js";

import {
    loadData,
} from "../utils/file.js";
import EmbedBuilder from "../utils/customs/embedBuilder.js";

export const name = Events.VoiceStateUpdate;

/**
 * @param {import("discord.js").VoiceState} oldState
 * @param {import("discord.js").VoiceState} newState
 */
export async function execute(oldState, newState) {
    const guild = newState.guild;
    const member = newState.member;
    const user = member?.user;

    if (!user || user.bot) return;

    const guildData = await loadData(guild.id);
    if (!guildData["voiceNotification"]) return;

    if (
        oldState.channel === null
        && newState.channel !== null
    ) { // 加入
        const channel = newState.channel;

        const embed = new EmbedBuilder()
            .setColor(Colors.Green)
            .setDescription(`:inbox_tray: ${member.toString()}`)
            .setTimestamp();

        await channel.send({ embeds: [embed], flags: [MessageFlags.SuppressNotifications] });

    } else if (
        oldState.channel !== null
        && newState.channel === null
    ) { // 離開
        const channel = oldState.channel;

        const embed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(`:outbox_tray: ${member.toString()}`)
            .setTimestamp();

        await channel.send({ embeds: [embed], flags: [MessageFlags.SuppressNotifications] })

    } else if (
        oldState.channel !== null
        && newState.channel !== null
        && oldState.channel != newState.channel
    ) { // 移動
        const before_channel = oldState.channel;
        const after_channel = newState.channel;

        const before_embed = new EmbedBuilder()
            .setColor(Colors.Blue)
            .setDescription(`:arrows_counterclockwise: ${member.toString()} (:outbox_tray: ➜ ${after_channel.toString()})`)
            .setTimestamp();

        await before_channel.send({ embeds: [before_embed], flags: [MessageFlags.SuppressNotifications] });

        const after_embed = new EmbedBuilder()
            .setColor(Colors.Blue)
            .setDescription(`:arrows_counterclockwise: ${member.toString()} (${before_channel.toString()} ➜ :inbox_tray:`)
            .setTimestamp();

        await after_channel.send({ embeds: [after_embed], flags: [MessageFlags.SuppressNotifications] });
    };
};
