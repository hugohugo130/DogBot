import {
    ApplicationCommandType,
    ContextMenuCommandBuilder,
    MessageFlags,
} from "discord.js";

import type { ContextMenu } from "../utils/types";
import { getAvatarGallery } from "../slashcmd/avatar.js";

export const avatarMenu: ContextMenu = {
    builder: new ContextMenuCommandBuilder()
        .setName("avatar")
        .setNameLocalizations({
            "zh-CN": "头像",
            "zh-TW": "頭貼",
        })
        .setType(ApplicationCommandType.User),

    async execute(interaction) {
        if (!interaction.isUserContextMenuCommand()) return;

        const mediaGallery = getAvatarGallery(interaction.targetUser);

        await interaction.reply({ components: [mediaGallery], flags: MessageFlags.IsComponentsV2 });
    },
};
