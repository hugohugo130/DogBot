const { Events, EmbedBuilder } = require('discord.js');
const { get_logger } = require('../utils/logger.js');
const { get_loophole_embed } = require('../utils/rpg.js');

function parseOptions(options) {
    if (!options || options.length === 0) return '';
    return options.map(option => {
        if (option.type === 1 || option.type === 2) { // 1: SUB_COMMAND, 2: SUB_COMMAND_GROUP
            return `${option.name}${option.options && option.options.length > 0 ? `(${parseOptions(option.options)})` : ''}`;
        } else {
            return `${option.name}: ${option.value}`;
        }
    }).join(', ');
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
    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        const logger = get_logger();
        const backend_logger = get_logger({ backend: true });

        const username = interaction.user.globalName || interaction.user.username;

        try {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                logger.error(`找不到名為 ${interaction.commandName} 的指令`);
                return;
            };

            let subPath = getFullCommandPath(interaction.options.data);
            let fullCommand = [interaction.commandName, ...subPath].join(' ');
            let finalOptions = getFinalOptions(interaction.options.data);
            let optionsStr = finalOptions.map(option => `${option.name}: ${option.value}`).join(', ');

            logger.info(`${username} 正在執行斜線指令: ${fullCommand}${optionsStr ? `, 選項: ${optionsStr}` : ""}`);

            const embed = new EmbedBuilder()
                .setTitle("指令執行")
                .addFields({ name: '指令執行者', value: interaction.user.toString() })
                .addFields({ name: '指令名稱', value: fullCommand })
                .addFields({ name: '選項', value: optionsStr ? optionsStr : '無' });

            backend_logger.info(embed);

            await command.execute(interaction);
        } catch (error) {
            logger.error(`執行斜線指令時出錯：${error.stack}`);

            const embed = await get_loophole_embed(interaction.client, error.stack);
            await interaction.followUp({ embeds: [embed] });
        };
    },
};