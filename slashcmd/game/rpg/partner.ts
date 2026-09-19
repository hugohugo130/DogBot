import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    escapeMarkdown,
    Guild,
    MessageFlags,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    User,
    type Interaction,
} from "discord.js";
import type {
    Slash,
} from "../../../utils/types.d.ts";
import {
    load_partner,
    load_user_privacy,
} from "../../../utils/db/rpg.ts";
import {
    firstPrefix,
    get_emoji,
    get_emojis,
    RPGPrivacy,
} from "../../../utils/rpg.ts";
import {
    embed_error_color,
    embed_marry_color
} from "../../../utils/config.ts";
import {
    RPGPartner,
} from "../../../utils/db/tables.ts";
import {
    wait_for_client,
} from "../../../utils/wait_for_client.js";
import EmbedBuilder from "../../../utils/customs/embedBuilder.js";
import DogClient from "../../../utils/customs/client.js";

const partnerListAmountPerPage = 5;
const emoji_dog = "🐶";

interface PartnerListReturn {
    embed: EmbedBuilder;
    row: ActionRowBuilder<ButtonBuilder> | null;
    flags: MessageFlags.Ephemeral | undefined;
};

export async function getPartnerList(
    request_user: User,
    target_user: User,
    guild: Guild | null = null,
    interaction: Interaction | null = null,
    client: DogClient | null = null,
    page: number = 0,
): Promise<PartnerListReturn> {
    if (!client) client = await wait_for_client();
    const isOther = target_user.id !== request_user.id;

    const partner_promise = load_partner(target_user.id).catch((err) => err);
    const [
        privacy,
        [emoji_cross, emoji_loop],
    ] = await Promise.all([
        load_user_privacy(target_user.id),
        get_emojis(["crosS", "loop"], client),
    ] as const);

    const escaped_username = escapeMarkdown(target_user.username);

    // 在查看別人的夥伴清單時，檢查他們的隱私權 是否公開
    if (isOther && !privacy.includes(RPGPrivacy.Partner)) {
        const prefix = await firstPrefix(guild?.id);

        const embed = new EmbedBuilder()
            .setColor(embed_error_color)
            .setTitle(`${emoji_cross} | 你不能查看 ${escaped_username} 的夥伴清單`)
            .setDescription(`對方可以使用 \`${prefix}privacy\` 來公開他的夥伴清單`)
            .setEmbedFooter(request_user.id);

        return {
            embed,
            row: null,
            flags: MessageFlags.Ephemeral,
        };
    };

    // 返回值只有 RPGPartner (load_partner 返回值) 和 .catch 的 err
    const partner = await partner_promise;
    if (!(partner instanceof RPGPartner)) throw partner;

    const members = partner.getMembers();

    // max_pages 是總頁數，有效頁碼是 0 ~ max_pages - 1
    const max_pages = Math.max(1, Math.ceil(members.length / partnerListAmountPerPage));
    const safePage = Math.min(Math.max(0, page), max_pages - 1);
    const offset = safePage * partnerListAmountPerPage;

    const membersStr = members
        .slice(offset, offset + partnerListAmountPerPage)
        .map((id, i) => {
            const n = offset + i + 1;
            return `\`${n}.\` <@${id}> 上次餵食：無`;
        })
        .join("\n");

    const embed = members.length
        ? new EmbedBuilder()
            .setColor(embed_marry_color)
            .setTitle(`${emoji_dog} | ${escaped_username} 的夥伴清單`)
            .setDescription(membersStr || "該頁面沒有任何寵物 OAO")
            .setEmbedFooter(interaction ?? request_user.id)
        : new EmbedBuilder()
            .setColor(embed_error_color)
            .setTitle(`${emoji_cross} | ${!isOther ? "你" : "對方"}還沒有新增任何夥伴`)
            .setEmbedFooter(interaction ?? request_user.id);

    const next_page = safePage + 1;
    const prev_page = safePage
        ? safePage - 1
        : -1;

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`partner|${request_user.id}|list|${target_user.id}|${prev_page}`)
                .setEmoji("◀")
                .setDisabled(prev_page === -1)
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`_`)
                .setLabel(`${safePage + 1} / ${max_pages} 頁`)
                .setDisabled(true)
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`partner|${request_user.id}|list|${target_user.id}|${next_page}`)
                .setEmoji("▶")
                .setDisabled(next_page >= max_pages)
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`partner|${request_user.id}|list|${target_user.id}|${safePage}`)
                .setEmoji(emoji_loop)
                .setLabel("更新")
                .setStyle(ButtonStyle.Success),
        ) as ActionRowBuilder<ButtonBuilder>;

    return {
        embed,
        row,
        flags: undefined,
    };
};

export const partnerSlash: Slash = {
    builder: new SlashCommandBuilder()
        .setName("partner")
        .setNameLocalizations({
            "zh-CN": "伙伴",
            "zh-TW": "夥伴",
        })
        .setDescription("Partner commands")
        .addSubcommand(new SlashCommandSubcommandBuilder() // list
            .setName("list")
            .setNameLocalizations({
                "zh-CN": "清单",
                "zh-TW": "清單",
            })
            .setDescription("View a user's partner list")
            .setDescriptionLocalizations({
                "zh-CN": "查询使用者的伙伴清单",
                "zh-TW": "查詢使用者的夥伴清單",
            })
            .addUserOption(option =>
                option.setName("user")
                    .setNameLocalizations({
                        "zh-CN": "用户",
                        "zh-TW": "使用者",
                    })
                    .setDescription("The user to look up")
                    .setDescriptionLocalizations({
                        "zh-CN": "要查询的用户",
                        "zh-TW": "要查詢的使用者",
                    })
                    .setRequired(false),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // add
            .setName("add")
            .setNameLocalizations({
                "zh-CN": "绑定",
                "zh-TW": "綁定",
            })
            .setDescription("Bind a member as your partner")
            .setDescriptionLocalizations({
                "zh-CN": "绑定成员为自己的伙伴",
                "zh-TW": "綁定成員為自己的夥伴",
            })
            .addUserOption(option =>
                option.setName("user")
                    .setNameLocalizations({
                        "zh-CN": "用户",
                        "zh-TW": "使用者",
                    })
                    .setDescription("The user to bind")
                    .setDescriptionLocalizations({
                        "zh-CN": "要绑定的用户",
                        "zh-TW": "要綁定的使用者",
                    })
                    .setRequired(true),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // remove
            .setName("remove")
            .setNameLocalizations({
                "zh-CN": "解除绑定",
                "zh-TW": "解除綁定",
            })
            .setDescription("Unbind one of your partners")
            .setDescriptionLocalizations({
                "zh-CN": "解除绑定一位自己的伙伴",
                "zh-TW": "解除綁定一位自己的夥伴",
            })
            .addUserOption(option =>
                option.setName("user")
                    .setNameLocalizations({
                        "zh-CN": "用户",
                        "zh-TW": "使用者",
                    })
                    .setDescription("The user to bind")
                    .setDescriptionLocalizations({
                        "zh-CN": "要绑定的用户",
                        "zh-TW": "要綁定的使用者",
                    })
                    .setRequired(true),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // info
            .setName("info")
            .setNameLocalizations({
                "zh-CN": "信息",
                "zh-TW": "資訊",
            })
            .setDescription("View current partner information")
            .setDescriptionLocalizations({
                "zh-CN": "查询目前的伙伴信息",
                "zh-TW": "查詢目前的夥伴資訊",
            })
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // leave
            .setName("leave")
            .setNameLocalizations({
                "zh-CN": "逃离",
                "zh-TW": "逃離",
            })
            .setDescription("Escape from your partner")
            .setDescriptionLocalizations({
                "zh-CN": "逃离自己的伙伴",
                "zh-TW": "逃離自己的夥伴",
            })
        ),
    stage: "beta",
    allowedContext: ["dm", "guild"],
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand(true) as "list" | "add" | "remove" | "info" | "leave";
        const { user, guild, options } = interaction;

        switch (subcommand) {
            case "list": {
                const target_user = options.getUser("user", false) ?? user;

                const { embed, row, flags } = await getPartnerList(user, target_user, guild, interaction, client);

                await interaction.reply({ embeds: [embed], components: row ? [row] : undefined, flags });

                break;
            }
            case "add": {
                const target_user = options.getUser("user", true);

                if (target_user.id === user.id) {
                    const emoji_cross = await get_emoji("crosS", client);
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你想成為你自己的夥伴?`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                const target_user_partner = await load_partner(target_user.id);
                const bossId = target_user_partner.getBoss();

                if (bossId) {
                    const emoji_cross = await get_emoji("crosS", client);
                    const escaped_username = escapeMarkdown(target_user.username);

                    const embed = bossId === user.id
                        ? new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | ${escaped_username} 已經成為你的夥伴了`)
                            .setEmbedFooter(interaction)
                        : new EmbedBuilder()
                            .setColor(embed_marry_color)
                            .setTitle(`${emoji_cross} | ${escaped_username} 已經有其他夥伴了!`)
                            .setDescription(`<@${bossId}> 為他目前的夥伴`)
                            .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                const embed = new EmbedBuilder()
                    .setColor(embed_marry_color)
                    .setTitle(`${emoji_dog} | 成為夥伴`)
                    .setDescription(`你願意成為 ${user.toString()} 的夥伴嗎?`)
                    .setEmbedFooter(interaction);

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`cancel|${target_user.id}|partner`)
                            .setLabel("拒絕")
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId(`partner|${target_user.id}|accept|${user.id}`)
                            .setLabel("我同意")
                            .setStyle(ButtonStyle.Success),
                    ) as ActionRowBuilder<ButtonBuilder>;

                await interaction.reply({
                    content: target_user.toString(),
                    embeds: [embed],
                    components: [row],
                    allowedMentions: { users: [target_user.id] },
                });
                break;
            }
            case "remove": {
                const target_user = options.getUser("user", true);

                const [
                    partner,
                    emoji_cross,
                ] = await Promise.all([
                    load_partner(user.id),
                    get_emoji("crosS", client),
                ] as const);

                const escaped_username = escapeMarkdown(target_user.username);

                const embed = new EmbedBuilder()
                    .setColor(embed_marry_color)
                    .setTitle(`你解除綁定了夥伴 ${escaped_username}`)
                    .setEmbedFooter(interaction);

                if (!partner.getMembers().includes(target_user.id)) {
                    embed.setTitle(`${emoji_cross} | 你沒有這位夥伴!`);
                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                await Promise.all([
                    partner.removePartner(user.id, target_user.id),
                    interaction.reply({ embeds: [embed] }),
                ]);

                break;
            }
            case "info": {
                const target_user = options.getUser("user", false) ?? user;

                const partner = await load_partner(target_user.id);

                const bossId = partner.getBoss();
                const embed = new EmbedBuilder()
                    .setEmbedFooter(interaction);

                if (!bossId) {
                    const emoji_cross = await get_emoji("crosS", client);

                    embed.setColor(embed_error_color);
                    embed.setTitle(`${emoji_cross} | ${target_user.username} 還沒有任何夥伴`);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                embed.setTitle(`${emoji_dog} | ${target_user.username} 的夥伴`);
                embed.setDescription(`另一位夥伴為 ${target_user.toString()} 上次餵食：無`);

                await interaction.reply({ embeds: [embed] });
                break;
            }
            case "leave": {
                const [
                    partner,
                    emoji_cross,
                ] = await Promise.all([
                    load_partner(user.id),
                    get_emoji("crosS", client),
                ] as const);

                const embed = new EmbedBuilder()
                    .setColor(embed_marry_color)
                    .setTitle(`${emoji_dog} | 你成功脫離了夥伴`)
                    .setEmbedFooter(interaction);

                const bossId = partner.getBoss();
                if (!bossId) {
                    embed.setTitle(`${emoji_cross} | 你沒有成為任何人的夥伴`);
                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                await Promise.all([
                    partner.removePartner(bossId, user.id),
                    interaction.reply({ embeds: [embed] }),
                ]);

                break;
            }
        };
    },
};