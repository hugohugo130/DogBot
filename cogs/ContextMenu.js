import {
    Events,
} from "discord.js";

import { get_logger } from "../utils/logger.js";
import DogClient from "../utils/customs/client.js";

export const name = Events.InteractionCreate;
const logger = get_logger();

/**
 * @param {DogClient} client
 * @param {import("discord.js").Interaction} interaction
 */
export async function execute(client, interaction) {
    if (!interaction.isContextMenuCommand()) return;

    const { commandName } = interaction;

    const file = client.context_menus.get(commandName);

    if (!file?.execute) return;

    try {
        await file.execute(interaction, client);
    } catch (err) {
        const msg = err instanceof Error ? err.stack || err.message : String(err);
        logger.error(`處理上下文選單 ${commandName} 時，發生錯誤：\n${msg}`)
    };
};
