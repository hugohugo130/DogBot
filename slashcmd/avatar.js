import {
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SlashCommandBuilder,
    User,
} from "discord.js";

/**
 * @param {User} user
 * @returns {MediaGalleryBuilder}
 */
export function getAvatarGallery(user) {
    const avatarURL = user.avatarURL({ size: 4096 }) ?? user.defaultAvatarURL;

    return new MediaGalleryBuilder()
        .addItems(
            new MediaGalleryItemBuilder()
                .setURL(avatarURL)
        );
};

/** @type {import("../utils/types").Slash} */
export const avatarSlash = {
    builder: new SlashCommandBuilder()
        .setName("avatar")
        .setNameLocalizations({
            "zh-CN": "头像",
            "zh-TW": "頭貼",
        })
        .setDescription("Get the avatar of a member")
        .setDescriptionLocalizations({
            "zh-CN": "取得成员的头像",
            "zh-TW": "取得使用者的頭貼",
        })
        .addUserOption(option => //user
            option.setName("user")
                .setNameLocalizations({
                    "zh-CN": "成员",
                    "zh-TW": "使用者",
                })
                .setDescription("User to find")
                .setDescriptionLocalizations({
                    "zh-CN": "成员",
                    "zh-TW": "使用者",
                })
                .setRequired(false),
        ),
    allowedContext: ["dm", "guild"],
    stage: "beta",

    async execute(interaction, client) {
        const user = interaction.options.getUser("user", false) ?? interaction.user;

        const mediaGallery = getAvatarGallery(user);

        await interaction.reply({ components: [mediaGallery], flags: MessageFlags.IsComponentsV2 });
    },
};
