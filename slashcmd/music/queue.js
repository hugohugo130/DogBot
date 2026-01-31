const { SlashCommandBuilder } = require("@discordjs/builders");
const { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, ButtonStyle, BaseInteraction, ActionRowBuilder, ButtonBuilder, MessageFlags } = require("discord.js");

const { get_emojis } = require("../../utils/rpg.js");
const { getQueue, MusicQueue, queueListTrackPerPage } = require("../../utils/music/music.js");
const { formatMinutesSeconds } = require("../../utils/timestamp.js");
const { embed_default_color, embed_error_color } = require("../../utils/config.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder");
const DogClient = require("../../utils/customs/client");
const { get_lang_data } = require("../../utils/language.js");

/**
 * Get queue list embed
 * @param {MusicQueue} queue
 * @param {number} [currentPage=1]
 * @param {BaseInteraction} [interaction]
 * @param {DogClient} [client]
 * @returns {Promise<[EmbedBuilder, ActionRowBuilder<ButtonBuilder>]>}
 */
async function getQueueListEmbedRow(queue, currentPage = 1, interaction = null, client = global._client) {
    const [
        emoji_cross,
        emoji_playGrad,
        emoji_skip,
        emoji_update
    ] = await get_emojis([
        "crosS",
        "playGrad",
        "skip",
        "update"
    ], client);

    const currentTrack = queue.currentTrack;
    const locale = interaction?.locale;

    const [lang_no_track_in_queue, lang_playing, lang_queue, lang_prev_page, lang_next_page, lang_update, lang_list_empty] = await Promise.all([
        get_lang_data(locale, "/queue", "list.no_track_in_queue"), // 沒有音樂在佇列裡
        get_lang_data(locale, "/queue", "list.playing"), // 正在播放
        get_lang_data(locale, "/queue", "list.queue"), // 播放佇列
        get_lang_data(locale, "/queue", "list.prev_page"), // 上一頁
        get_lang_data(locale, "/queue", "list.next_page"), // 下一頁
        get_lang_data(locale, "/queue", "list.update"), // 更新
        get_lang_data(locale, "/queue", "list.empty") // 清單是空的
    ]);

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setEmbedFooter(interaction);

    const pages = Math.ceil(queue.tracks.length / queueListTrackPerPage) || 1;

    if (currentTrack) {
        const starts = queueListTrackPerPage * (currentPage - 1);

        const queueString =
            queue.tracks
                .slice(starts, starts + queueListTrackPerPage)
                .map((track, index) => {
                    const duration = formatMinutesSeconds(track.duration);

                    return `\`${starts + index + 1}.\` [${track.title}](<${track.url}>) - ${duration}`;
                })
                .join("\n")
            || lang_no_track_in_queue;

        embed
            .setDescription(`
${emoji_playGrad} ${lang_playing}
[${currentTrack.title}](<${currentTrack.url}>) - ${formatMinutesSeconds(currentTrack.duration)}
${emoji_skip} ${lang_queue}
${queueString}`)
            .setFooter({ text: get_lang_data(locale, "/queue", "list.page", currentPage, pages) }); // 第 {currentPage} / {pages} 頁
    } else {
        embed.setTitle(`${emoji_cross} | ${lang_list_empty}`);
    };

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`music|any|page|${currentPage - 1}`)
                .setEmoji("◀️")
                .setLabel(lang_prev_page)
                .setDisabled(currentPage <= 1)
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`music|any|page|${currentPage + 1}`)
                .setEmoji("▶️")
                .setLabel(lang_next_page)
                .setDisabled(currentPage >= pages)
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`music|any|page|${currentPage}`)
                .setEmoji(emoji_update)
                .setLabel(lang_update)
                .setStyle(ButtonStyle.Success),
        );

    return [embed, row];
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setNameLocalizations({
            "zh-CN": "音乐队列",
            "zh-TW": "音樂佇列"
        })
        .setDescription("queue")
        .addSubcommand(new SlashCommandSubcommandBuilder() // list
            .setName("list")
            .setNameLocalizations({
                "zh-CN": "列表",
                "zh-TW": "列表"
            })
            .setDescription("get the music in queue")
            .setDescriptionLocalizations({
                "zh-CN": "查询队列中的音乐",
                "zh-TW": "查詢佇列中的音樂"
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // remove
            .setName("remove")
            .setNameLocalizations({
                "zh-CN": "移除",
                "zh-TW": "移除"
            })
            .setDescription("remove a music in queue")
            .setDescriptionLocalizations({
                "zh-CN": "移除一首歌曲",
                "zh-TW": "移除一首歌曲"
            })
            .addIntegerOption(option =>
                option.setName("song")
                    .setNameLocalizations({
                        "zh-CN": "歌曲",
                        "zh-TW": "歌曲"
                    })
                    .setDescription("the song position to remove")
                    .setDescriptionLocalizations({
                        "zh-CN": "要移除的歌曲位置",
                        "zh-TW": "要移除的歌曲位置"
                    })
                    .setMinValue(1)
                    .setRequired(false),
            ),
        ),
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {DogClient} client
    */
    execute: async function (interaction, client) {
        const [subcommand, queue, [emoji_cross, emoji_playlist]] = await Promise.all([
            interaction.options.getSubcommand(false),
            getQueue(interaction.guildId),
            get_emojis(["crosS", "playlist"], client),
        ]);

        const locale = interaction.locale;

        switch (subcommand) {
            case "list": {
                const [_, [embed, row]] = await Promise.all([
                    interaction.deferReply(),
                    getQueueListEmbedRow(queue, 1, interaction, client),
                ]);

                return await interaction.editReply({ embeds: [embed], components: [row] });
            };

            case "remove": {
                const [lang_invalid_track, lang_success, index] = await Promise.all([
                    get_lang_data(locale, "/queue", "remove.invalid_track"), // 沒有這首歌
                    get_lang_data(locale, "/queue", "remove.success"), // 成功移除
                    (interaction.options.getInteger("song", false) ?? 1) - 1,
                ]);

                const track = queue.tracks[index];
                if (!track) {
                    const error_embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | ${lang_invalid_track}`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
                };

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_playlist} | ${lang_success} \`${track.title}\``) // 成功移除 `track_title`
                    .setEmbedFooter(interaction);

                await Promise.all([
                    queue.removeTrack(index),
                    interaction.reply({ embeds: [embed] }),
                ]);

                break;
            };
        };
    },
    getQueueListEmbedRow,
};
