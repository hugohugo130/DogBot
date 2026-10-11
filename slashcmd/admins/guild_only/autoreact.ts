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
        .setName("auto_react")
        .setDescription("Configure auto reacting messages")
        .addSubcommandGroup(group => // config
            group.setName('config')
                .setDescription('Configure auto react settings')
                .addSubcommand(sub => // set
                    sub.setName('set')
                        .setDescription('Configure auto reacting messages, leave all empty to disable')
                        .addChannelOption(option => // channel
                            option.setName('channel')
                                .setDescription('Configure the channel ID')
                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.GuildVoice,
                                    ChannelType.GuildAnnouncement
                                )
                                .setRequired(false),
                        )
                        .addUserOption(option => // user
                            option.setName('user')
                                .setDescription('Only auto-react to messages from this user (leave empty for all users)')
                                .setRequired(false),
                        ),
                ),
        )
        .addSubcommandGroup(group => // reactions
            group.setName('reactions')
                .setDescription('Manage reactions for auto reacting')
                .addSubcommand(sub => // add
                    sub.setName('add')
                        .setDescription('Add a reaction to be used when messages are sent')
                        .addStringOption(option => // reaction
                            option.setName('reaction')
                                .setDescription('The reaction to add')
                                .setMinLength(1)
                                .setMaxLength(200)
                                .setRequired(true),
                        ),
                )
                .addSubcommand(sub => // add
                    sub.setName('remove')
                        .setDescription('Remove a reaction from the auto react list')
                        .addStringOption(option => // reaction
                            option.setName('reaction')
                                .setDescription('The reaction to remove')
                                .setAutocomplete(true)
                                .setRequired(true),
                        ),
                )
                .addSubcommand(sub => // list
                    sub.setName('list')
                        .setDescription('List all reactions currently configured'),
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
            case "set": { // 屬於 config 群組
                const channel = options.getChannel("channel", false);
                const user = options.getUser("user", false);
                const setDisable = !channel && !user;
                if (setDisable) {
                    guildData.autoReact = default_value;
                } else {
                    if (channel) autoReact.channel = channel.id;
                    autoReact.author = user?.id ?? null;
                };

                const [
                    emoji_tick,
                    /* discarded */,
                ] = await Promise.all([
                    get_emoji("Tick", client),
                    saveData(guild.id, guildData),
                ] as const);

                const successStr =
                    (channel ? `頻道為${channel.toString()}\n` : "") +
                    `使用者為${user ? user.toString() : "所有人"}`;

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_tick} | ${setDisable ? "已停用自動表情反應" : "已設定自動表情反應"}`)
                    .setDescription(!setDisable ? successStr : null)
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
                        .setDescription("使用 `/auto_react config set` 來啟用此功能")
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
