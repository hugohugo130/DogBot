import {
    ApplicationCommandType,
    ApplicationIntegrationType,
    ContextMenuCommandBuilder,
    InteractionContextType,
    MessageFlags,
} from "discord.js";

import type { ContextMenu } from "../utils/types";
import {
    getMsgInfoContainer,
} from "../slashcmd/info.js";

export const avatarMenu: ContextMenu = {
    builder: new ContextMenuCommandBuilder()
        .setName("message-detail")
        .setNameLocalizations({
            "zh-CN": "訊息資訊",
            "zh-TW": "讯息资讯",
        })
        .setType(ApplicationCommandType.Message)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall),

    async execute(interaction) {
        if (!interaction.isMessageContextMenuCommand()) return;
        const { targetMessage, locale } = interaction;

        const container = getMsgInfoContainer(targetMessage, locale);

        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },
};
