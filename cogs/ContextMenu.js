import {
    Events,
    MessageFlags,
} from "discord.js";

import {
    getAvatarGallery,
} from "../slashcmd/avatar.js";
import DogClient from "../utils/customs/client.js";

export const name = Events.InteractionCreate;

/**
 * @param {DogClient} client
 * @param {import("discord.js").Interaction} interaction
 */
export async function execute(client, interaction) {
    if (!interaction.isUserContextMenuCommand()) return;

    const { user, targetUser, guild, commandName } = interaction;

    switch (commandName) {
        case "avatar": {
            const mediaGallery = getAvatarGallery(targetUser);

            await interaction.reply({ components: [mediaGallery], flags: MessageFlags.IsComponentsV2 });
            break;
        }
    };
};
