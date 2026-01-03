const { Events, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const EmbedBuilder = require("../utils/customs/embedBuilder.js");
const { get_logger } = require("../utils/logger.js");
const util = require("node:util");
const DogClient = require("../utils/customs/client.js");

function parseOptions(options) {
    if (!options || options.length === 0) return "";
    return options.map(option => {
        if (option.type === 1 || option.type === 2) { // 1: SUB_COMMAND, 2: SUB_COMMAND_GROUP
            return `${option.name}${option.options && option.options.length > 0 ? `(${parseOptions(option.options)})` : ""}`;
        } else {
            return `${option.name}: ${option.value}`;
        }
    }).join(", ");
};

function getFullCommandPath(options) {
    let path = [];
    let current = options;
    while (current && current.length > 0 && (current[0].type === 1 || current[0].type === 2)) {
        path.push(current[0].name);
        current = current[0].options;
    }
    return path;
};

function getFinalOptions(options) {
    let current = options;
    while (current && current.length > 0 && (current[0].type === 1 || current[0].type === 2)) {
        current = current[0].options;
    }
    return current || [];
};

module.exports = {
    name: Events.InteractionCreate,
    /**
     * 
     * @param {DogClient} client 
     * @param {ChatInputCommandInteraction} interaction 
     * @returns 
     */
    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        const logger = get_logger();
        const backend_logger = get_logger({ backend: true });

        const username = interaction.user.globalName || interaction.user.username;
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            logger.error(`找不到名為 ${interaction.commandName} 的指令`);
            return;
        };

        let subPath = getFullCommandPath(interaction.options.data);
        let fullCommand = [interaction.commandName, ...subPath].join(" ");
        let finalOptions = getFinalOptions(interaction.options.data);
        let optionsStr = finalOptions.map(option => `${option.name}: ${option.value}`).join(", ");

        try {
            const guild = interaction.guild;
            const channel = interaction.channel;

            logger.info(`${username} 正在執行斜線指令: ${fullCommand}${optionsStr ? `, 選項: ${optionsStr}` : ""}`);

            const embed = new EmbedBuilder()
                .setTitle("指令執行")
                .addFields({ name: "指令執行者", value: interaction.user.toString() })
                .addFields({ name: "指令名稱", value: fullCommand })
                .addFields({ name: "選項", value: optionsStr ? optionsStr : "無" })
                .addFields({ name: "伺服器", value: `${guild.name} (${guild.id})` })
                .addFields({ name: "頻道", value: `${channel.name} (${channel.id})` });

            backend_logger.info(embed);

            interaction.client = client;
            await command.execute(interaction, client);
        } catch (error) {
            const { get_loophole_embed } = require("../utils/rpg.js");
            if (error.message.includes("Unknown Interaction")) return;

            const errorStack = util.inspect(error, { depth: null });
            logger.error(`執行斜線指令 ${fullCommand} 時出錯：${errorStack}`);

            const embeds = await get_loophole_embed(errorStack, interaction, client);
            try {
                await interaction.followUp({ content: "", embeds, components: [], flags: MessageFlags.Ephemeral });
            } catch (_) { };
        };
    },
};