import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";

import type {
    Slash,
} from "../../../utils/types.d.ts";
import {
    loadData,
    saveData,
} from "../../../utils/file.js";
import {
    get_emoji,
} from "../../../utils/rpg.ts";
import {
    type AutoReactData,
    embed_default_color,
    embed_error_color,
    MAX_AUTO_REACT,
} from "../../../utils/config.ts";
import {
    isUsableEmoji,
} from "../../../utils/discord.js";
import EmbedBuilder from "../../../utils/customs/embedBuilder.js";

export const autoReactSlash: Slash<["guild"]> = {
    builder: new SlashCommandBuilder()
        .setName("auto-react")
        .setDescription("Configure auto reacting messages")
        .setNameLocalizations({
            "zh-CN": "自动回应",
            "zh-TW": "自動回應",
        })
        .setDescriptionLocalizations({
            "zh-CN": "配置自动回应消息",
            "zh-TW": "設定自動回應訊息",
        })
        .addSubcommandGroup(group => // config
            group.setName("config")
                .setDescription("Configure auto react settings")
                .setNameLocalizations({
                    "zh-CN": "配置",
                    "zh-TW": "設定",
                })
                .setDescriptionLocalizations({
                    "zh-CN": "配置自动回应设置",
                    "zh-TW": "設定自動回應設定",
                })
                .addSubcommand(sub => // channel
                    sub.setName("channel")
                        .setDescription("Set the channel to auto-react in")
                        .setNameLocalizations({
                            "zh-CN": "频道",
                            "zh-TW": "頻道",
                        })
                        .setDescriptionLocalizations({
                            "zh-CN": "设置要自动回应的频道",
                            "zh-TW": "設定要自動回應的頻道",
                        })
                        .addChannelOption(option => // channel
                            option.setName("channel")
                                .setDescription("The channel to auto-react in")
                                .setNameLocalizations({
                                    "zh-CN": "频道",
                                    "zh-TW": "頻道",
                                })
                                .setDescriptionLocalizations({
                                    "zh-CN": "要自动回应的频道",
                                    "zh-TW": "要自動回應的頻道",
                                })
                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.GuildVoice,
                                    ChannelType.GuildAnnouncement
                                )
                                .setRequired(true),
                        ),
                )
                .addSubcommand(sub => // user
                    sub.setName("user")
                        .setDescription("Only auto-react to messages from this user")
                        .setNameLocalizations({
                            "zh-CN": "用户",
                            "zh-TW": "使用者",
                        })
                        .setDescriptionLocalizations({
                            "zh-CN": "仅自动回应来自此用户的消息",
                            "zh-TW": "僅自動回應來自此使用者的訊息",
                        })
                        .addUserOption(option => // user
                            option.setName("user")
                                .setDescription("The user to auto-react to (leave empty to reset)")
                                .setNameLocalizations({
                                    "zh-CN": "用户",
                                    "zh-TW": "使用者",
                                })
                                .setDescriptionLocalizations({
                                    "zh-CN": "要自动回应的用户（留空以重置）",
                                    "zh-TW": "要自動回應的使用者（留空以重設）",
                                })
                                .setRequired(false),
                        ),
                )
                .addSubcommand(sub => // disable
                    sub.setName("disable")
                        .setDescription("Disable auto reacting")
                        .setNameLocalizations({
                            "zh-CN": "禁用",
                            "zh-TW": "停用",
                        })
                        .setDescriptionLocalizations({
                            "zh-CN": "禁用自动回应",
                            "zh-TW": "停用自動回應",
                        }),
                ),
        )
        .addSubcommandGroup(group => // reactions
            group.setName("reactions")
                .setDescription("Manage reactions for auto reacting")
                .setNameLocalizations({
                    "zh-CN": "回应",
                    "zh-TW": "回應",
                })
                .setDescriptionLocalizations({
                    "zh-CN": "管理用于自动回应的回应",
                    "zh-TW": "管理用於自動回應的回應",
                })
                .addSubcommand(sub => // add
                    sub.setName("add")
                        .setDescription("Add a reaction to be used when messages are sent")
                        .setNameLocalizations({
                            "zh-CN": "添加",
                            "zh-TW": "新增",
                        })
                        .setDescriptionLocalizations({
                            "zh-CN": "添加发送消息时使用的回应",
                            "zh-TW": "新增傳送訊息時使用的回應",
                        })
                        .addStringOption(option => // reaction
                            option.setName("reaction")
                                .setDescription("The reaction to add")
                                .setNameLocalizations({
                                    "zh-CN": "回应",
                                    "zh-TW": "回應",
                                })
                                .setDescriptionLocalizations({
                                    "zh-CN": "要添加的回应",
                                    "zh-TW": "要新增的回應",
                                })
                                .setMinLength(1)
                                .setMaxLength(200)
                                .setRequired(true),
                        ),
                )
                .addSubcommand(sub => // remove
                    sub.setName("remove")
                        .setDescription("Remove a reaction from the auto react list")
                        .setNameLocalizations({
                            "zh-CN": "移除",
                            "zh-TW": "移除",
                        })
                        .setDescriptionLocalizations({
                            "zh-CN": "从自动回应列表中移除一个回应",
                            "zh-TW": "從自動回應清單中移除一個回應",
                        })
                        .addStringOption(option => // reaction
                            option.setName("reaction")
                                .setDescription("The reaction to remove")
                                .setNameLocalizations({
                                    "zh-CN": "回应",
                                    "zh-TW": "回應",
                                })
                                .setDescriptionLocalizations({
                                    "zh-CN": "要移除的回应",
                                    "zh-TW": "要移除的回應",
                                })
                                .setAutocomplete(true)
                                .setRequired(true),
                        ),
                )
                .addSubcommand(sub => // list
                    sub.setName("list")
                        .setDescription("List all reactions currently configured")
                        .setNameLocalizations({
                            "zh-CN": "列表",
                            "zh-TW": "清單",
                        })
                        .setDescriptionLocalizations({
                            "zh-CN": "列出当前配置的所有回应",
                            "zh-TW": "列出目前已設定的所有回應",
                        }),
                ),
        ),

    permissions: {
        user: ["ManageGuild"],
    },
    allowedContext: ["guild"],
    stage: "beta",

    async execute(interaction, client) {
        const { options, guild } = interaction;
        const subCommand = options.getSubcommand();

        const guildData = await loadData(guild.id);
        const default_value: AutoReactData = {
            author: null,
            channel: null,
            reactions: [],
        };

        if (!guildData.autoReact) {
            guildData.autoReact = default_value;
            await saveData(guild.id, guildData);
        };
        const { autoReact } = guildData;

        switch (subCommand) {
            case "channel": { // 屬於 config 群組
                const channel = options.getChannel("channel", true);
                autoReact.channel = channel.id;

                const [
                    emoji_tick,
                    /* discarded */,
                ] = await Promise.all([
                    get_emoji("Tick", client),
                    saveData(guild.id, guildData),
                ] as const);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_tick} | 已設定自動表情反應`)
                    .setDescription(`自動反應的頻道為 ${channel.toString()}`)
                    .setEmbedFooter(interaction);

                await interaction.reply({ embeds: [embed] });

                break;
            }
            case "user": { // 屬於 config 群組
                const user = options.getUser("user", false);
                autoReact.author = user?.id ?? null;

                const [
                    emoji_tick,
                    /* discarded */,
                ] = await Promise.all([
                    get_emoji("Tick", client),
                    saveData(guild.id, guildData),
                ] as const);

                const desc = user
                    ? `指定只有 ${user.toString()} 發的訊息才會被自動反應`
                    : `所有人在 <#${autoReact.channel}> 發的訊息都會被自動反應`;

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_tick} | 已設定自動表情反應`)
                    .setDescription(desc)
                    .setEmbedFooter(interaction);

                await interaction.reply({ embeds: [embed] });

                break;
            }
            case "disable": { // 屬於 config 群組
                guildData.autoReact = default_value;

                const [
                    emoji_tick,
                    /* discarded */,
                ] = await Promise.all([
                    get_emoji("Tick", client),
                    saveData(guild.id, guildData),
                ] as const);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_tick} | 已停用自動表情反應`)
                    .setEmbedFooter(interaction);

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case "add": { // 屬於 reactions 群組
                const reaction = options.getString("reaction", true);

                if (autoReact.reactions.includes(reaction)) {
                    const emoji_cross = await get_emoji("crosS", client);
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 這個表情符號已經被加入了`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (autoReact.reactions.length >= MAX_AUTO_REACT) {
                    const emoji_cross = await get_emoji("crosS", client);
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 已達到自動反應數量上限`)
                        .setDescription(`最多只能設定 ${MAX_AUTO_REACT} 個表情符號`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (!await isUsableEmoji(reaction, client)) {
                    const emoji_cross = await get_emoji("crosS", client);
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 我不知道有這個表情符號`)
                        .setDescription(`這個表情符號不存在，或我不在含有該表情符號的伺服器`)
                        .setEmbedFooter(interaction);

                    const row = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("guide|any|emoji_id")
                                .setLabel("要怎麼獲得表情符號ID?")
                                .setStyle(ButtonStyle.Secondary),
                        );

                    return await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
                };

                autoReact.reactions.push(reaction);
                const [
                    emoji_tick,
                    /* discarded */,
                ] = await Promise.all([
                    get_emoji("Tick", client),
                    saveData(guild.id, guildData),
                ] as const);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_tick} | 已增加表情符號 ${reaction}`)
                    .setEmbedFooter(interaction);

                await interaction.reply({ embeds: [embed] });

                break;
            }
            case "remove": { // 屬於 reactions 群組
                const reaction = options.getString("reaction", true);

                const index = autoReact.reactions.indexOf(reaction);

                if (index === -1) {
                    const emoji_cross = await get_emoji("crosS", client);
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 這個表情符號不在清單中`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                autoReact.reactions.splice(index, 1);

                const [
                    emoji_tick,
                    /* discarded */,
                ] = await Promise.all([
                    get_emoji("Tick", client),
                    saveData(guild.id, guildData),
                ] as const);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_tick} | 已移除表情符號 ${reaction}`)
                    .setEmbedFooter(interaction);

                await interaction.reply({ embeds: [embed] });

                break;
            }
            case "list": { // 屬於 reactions 群組
                const { channel, author, reactions } = autoReact;

                // 情境一：尚未設定頻道
                if (!channel) {
                    const emoji_cross = await get_emoji("crosS", client);
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 目前尚未設定自動表情反應`)
                        .setDescription("使用 `/auto-react config set` 來啟用此功能")
                        .setEmbedFooter(interaction);

                    return await interaction.reply({
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral,
                    });
                };

                const emoji_tick = await get_emoji("Tick", client);

                // 將 reactions 用空格分隔；空的話顯示提示文字
                const reactionsStr = reactions.length > 0
                    ? reactions.join("、")
                    : "*尚未加入任何表情符號*";

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_tick} | 自動表情反應設定`)
                    .addFields(
                        {
                            name: "📌 頻道",
                            value: `<#${channel}>`,
                            inline: true,
                        },
                        {
                            name: "👤 使用者",
                            value: author ? `<@${author}>` : "*所有人*",
                            inline: true,
                        },
                        {
                            name: `😀 表情符號（${reactions.length}）`,
                            value: reactionsStr,
                        },
                    )
                    .setEmbedFooter(interaction);

                await interaction.reply({ embeds: [embed] });

                break;
            }
        };
    },
};
