const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");

const { embed_default_color } = require("../utils/config.js");
const DogClient = require("../utils/customs/client.js");
const EmbedBuilder = require("../utils/customs/embedBuilder.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setNameLocalizations({
            "zh-CN": "ping",
            "zh-TW": "ping"
        })
        .setDescription("Shows the bot's latency")
        .setDescriptionLocalizations({
            "zh-CN": "取得机器人延迟",
            "zh-TW": "取得機器人延遲"
        }),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {DogClient} client
     */
    async execute(interaction, client) {
        const start = Date.now();

        await interaction.deferReply({ withResponse: true });

        const end = Date.now();
        const globalPing = end - start;

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .addFields(
                { name: '🔗 API延遲', value: `${client.ws.ping}ms` },
                { name: '🌐 Global 全域延遲', value: `${globalPing}ms` }
            )
            .setEmbedFooter(interaction);

        return interaction.editReply({ content: `Pong! ${client.ws.ping}ms`, embeds: [embed] });
    },
};