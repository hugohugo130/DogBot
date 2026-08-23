import {
    SlashCommandBuilder,
    AttachmentBuilder,
    FileBuilder,
    MessageFlags,
    TextDisplayBuilder,
    ContainerBuilder,
} from "discord.js";

import {
    writeJson,
    join_temp_folder,
} from "../../../../utils/file.js";
import {
    adminIDs,
} from "../../../../utils/config.js";
import {
    load_rpg_data,
} from "../../../../utils/db/rpg.js";

/** @type {import("../../../../utils/types").Slash} */
export const getUserDataSlash = {
    builder: new SlashCommandBuilder()
        .setName("getuserdata")
        .setDescription("Get rpg data of a user")
        .setNameLocalizations({
            "zh-CN": "获取用户数据",
            "zh-TW": "獲取用戶數據",
        })
        .setDescriptionLocalizations({
            "zh-CN": "获取用户的RPG数据",
            "zh-TW": "獲取用戶的RPG數據",
        })
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to get data from")
                .setNameLocalizations({
                    "zh-CN": "用户",
                    "zh-TW": "用戶",
                })
                .setDescriptionLocalizations({
                    "zh-CN": "要获取数据的用户",
                    "zh-TW": "要獲取數據的用戶",
                })
                .setRequired(true),
        ),
    allowedContext: ["dm", "guild"],
    stage: "admin",

    async execute(interaction) {
        if (!adminIDs.includes(interaction.user.id)) return;

        const user = interaction.options.getUser("user");
        if (!user) return;

        const filename = `rpg_data-${user.id}-${Math.floor(Date.now())}.json`;

        const [_, rpg_data, filePath] = await Promise.all([
            interaction.deferReply({ flags: MessageFlags.Ephemeral }),
            load_rpg_data(user.id),
            await join_temp_folder(filename),
        ]);

        await writeJson(filePath, rpg_data);

        const attachment = new AttachmentBuilder(filePath)
            .setName(filename);

        const fileComponent = new FileBuilder()
            .setURL(`attachment://${filename}`);

        const textDisplay = new TextDisplayBuilder()
            .setContent(`${user.username}的RPG數據`);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(textDisplay)
            .addFileComponents(fileComponent);

        await interaction.editReply({
            content: null,
            files: [attachment],
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });

        // const msgs = [
        //     Object.entries(rpg_data?.inventory)
        //         .map(([key, value]) => `${key}: ${value}`)
        //         .join("\n"),

        //     Object.entries(rpg_data?.lastRunTimestamp)
        //         .map(([key, value]) => `${key}: ${value}`)
        //         .join("\n"),

        //     Object.entries(rpg_data?.count)
        //         .map(([key, value]) => `${key}: ${value}`)
        //         .join("\n"),

        //     await show_transactions(user.id),
        // ];

        // for (const msg of msgs) {
        //     for (const msgcontent of split_msg(msg)) {
        //         await interaction.followUp({content: msgcontent});
        //     };
        // };
    },
};