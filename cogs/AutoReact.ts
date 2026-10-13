import {
    Events,
    Message,
} from "discord.js";

import {
    loadData,
} from "../utils/file.js";
import {
    isUsableEmoji,
} from "../utils/discord.js";
import {
    MAX_AUTO_REACT,
} from "../utils/config.ts";
import {
    asyncFilter,
} from "../utils/load_cogs.ts";
import DogClient from "../utils/customs/client.js";

export const name = Events.MessageCreate
export async function execute(client: DogClient, message: Message) {
    const { guild, channel, author } = message;

    if (!guild || channel.isDMBased() || !channel.isSendable()) return;
    const guildData = await loadData(guild.id);

    const autoReactConfig = guildData.autoReact;
    if (!autoReactConfig) return;

    const { channel: autoReactChannelId, author: specifiedAuthor, reactions } = autoReactConfig;
    if (!autoReactChannelId || channel.id !== autoReactChannelId) return;
    if (specifiedAuthor && author.id !== specifiedAuthor) return;
    if (!reactions.length) return;

    const filteredReactions = await asyncFilter(
        reactions.slice(0, MAX_AUTO_REACT),
        (r) => isUsableEmoji(r, client),
    );

    await Promise.allSettled(filteredReactions.map(r => message.react(r)));
};
