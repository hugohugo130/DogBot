import {
    Events,
    Guild,
} from "discord.js";

import {
    loadData,
    saveData,
} from "../utils/file.js";
import {
    YEE_ID,
    default_prefix,
    prefix_compatible_with_yee,
} from "../utils/config.ts";
import {
    get_member,
} from "../utils/discord.js";
import DogClient from "../utils/customs/client.js";

export const name = Events.GuildCreate;
export const once = false;

export const execute = async function (
    _client: DogClient,
    guild: Guild,
) {
    const yee_exists = await get_member(YEE_ID, guild);
    if (!yee_exists) return;

    const guild_data = await loadData(guild.id);

    const i = guild_data.prefix.indexOf(default_prefix);
    if (i !== -1) {
        guild_data.prefix.splice(i, 1);
    };

    if (!guild_data.prefix.includes(prefix_compatible_with_yee)) {
        guild_data.prefix.push(prefix_compatible_with_yee);
    };

    await saveData(guild.id, guild_data);
};
