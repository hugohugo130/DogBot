import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SlashCommandBuilder,
    User,
} from "discord.js";
import {
    get_lang_data,
} from "../utils/language.js";

/**
 * @param {User} user
 * @param {import("discord.js").Interaction | null} [interaction=null]
 * @returns {(MediaGalleryBuilder | ActionRowBuilder<ButtonBuilder>)[]}
 */
export function getAvatarGallery(user, interaction = null) {
    const lang_avatar_decoration = get_lang_data(interaction?.locale, "/avatar", "avatar_decoration");
    const avatarURL = user.avatarURL({ size: 4096 }) ?? user.defaultAvatarURL;
    const avatarDecoration = user.avatarDecorationURL({ size: 4096 });
    const mediaGallery = new MediaGalleryBuilder()
        .addItems(
            new MediaGalleryItemBuilder()
                .setURL(avatarURL)
        );

    const row = avatarDecoration
        ? /** @type {ActionRowBuilder<ButtonBuilder>} */ (
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel(lang_avatar_decoration)
                        .setStyle(ButtonStyle.Link)
                        .setURL(avatarDecoration),
                )
        )
        : null;

    return row ? [mediaGallery, row] : [mediaGallery];
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

        const rows = getAvatarGallery(user, interaction);

        await interaction.reply({ components: rows, flags: MessageFlags.IsComponentsV2 });
    },
};
