import {
    SlashCommandBuilder,
    ChannelType,
    MessageFlags,
    VoiceChannel,
    PermissionFlagsBits,
} from "discord.js";

import {
    setDynamicVoice,
} from "../../../utils/file.js";
import {
    get_me,
} from "../../../utils/discord.js";
import {
    get_emoji,
} from "../../../utils/rpg.js";
import {
    get_lang_data,
    PermissionTranslationKeyMapping,
} from "../../../utils/language.js";

/** @type {import("../../../utils/types.js").Slash<["guild"]>} */
export const dvoiceSlash = {
    builder: new SlashCommandBuilder()
        .setName("dvoice")
        .setDescription("Enable or disable dynamic voice channel for this server")
        .setNameLocalizations({
            "zh-CN": "动态语音频道",
            "zh-TW": "動態語音頻道",
        })
        .setDescriptionLocalizations({
            "zh-CN": "为这个服务器启用或禁用动态语音频道",
            "zh-TW": "為這個伺服器啟用或禁用動態語音頻道",
        })
        .addChannelOption(option =>
            option.setName("vchannel")
                .setDescription("Create a temp voice channel when member joined this voice channel")
                .setNameLocalizations({
                    "zh-CN": "语音频道",
                    "zh-TW": "語音頻道",
                })
                .setDescriptionLocalizations({
                    "zh-CN": "当成员加入这个语音频道时，创建一个临时语音频道",
                    "zh-TW": "當成員加入這個語音頻道時，創建一個臨時語音頻道",
                })
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(false),
        ),
    // .setDefaultMemberPermissions(0), // 只有管理員可以使用這個指令
    permissions: {
        bot: ["ManageChannels"],
        user: ["ManageChannels"],
    },
    allowedContext: ["guild"],
    stage: "beta",

    execute: async function (interaction, client) {
        const channel = /** @type {VoiceChannel | undefined} */
            (interaction.options.getChannel("vchannel", false)) ?? null;

        const locale = interaction.locale;
        const guildID = interaction.guild.id;
        const me = await get_me(interaction.guild);

        if (channel) {
            const botChannelPerm = me.permissionsIn(channel);

            /** @type {(Exclude<keyof typeof PermissionFlagsBits, "ManageEmojisAndStickers">)[]} */
            const permissionsNeeded = [
                "ViewChannel",
                "MoveMembers",
            ];

            const missingPermissions = permissionsNeeded.filter(perm => !botChannelPerm.has(perm));

            if (missingPermissions.length > 0) {
                const emoji_cross = await get_emoji("crosS", client);
                const missPermText = missingPermissions.map(perm => {
                    const translation_key = PermissionTranslationKeyMapping[perm];

                    const translated_perm = get_lang_data(locale, "permissions", `perm.${translation_key}`);
                    `\`${translated_perm || perm}\``
                }).join(", ");

                await interaction.reply({
                    content: `${emoji_cross} | 你缺少了這些權限: ${missPermText}`,
                    flags: MessageFlags.Ephemeral,
                });
            };
        };

        await Promise.all([
            interaction.deferReply(),
            setDynamicVoice(guildID, channel),
        ]);

        await interaction.editReply({ content: `已成功設定動態語音頻道${channel ? `為 ${channel}` : "：關閉"}` });
    },
};