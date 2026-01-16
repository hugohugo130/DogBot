const { Events, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, PermissionsBitField, GuildChannel } = require("discord.js");
const util = require("util");

const { get_logger } = require("../utils/logger.js");
const { get_loophole_embed } = require("../utils/rpg.js");
const EmbedBuilder = require("../utils/customs/embedBuilder.js");
const DogClient = require("../utils/customs/client.js");
const { get_me, get_channel } = require("../utils/discord.js");

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

const logger = get_logger();
const backend_logger = get_logger({ backend: true });

module.exports = {
    name: Events.InteractionCreate,
    /**
     * 
     * @param {DogClient} client
     * @param {ChatInputCommandInteraction} interaction 
     * @returns {Promise<any>}
     */
    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        const user = interaction.user;
        const username = user.globalName || user.username;
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

            const botMember = await get_me(guild);
            const channelPermission = channel.permissionsFor(botMember);

            logger.info(`${username} 正在執行斜線指令: ${fullCommand}${optionsStr ? `, 選項: ${optionsStr}` : ""}`);

            const embed = new EmbedBuilder()
                .setTitle("指令執行")
                .addFields({ name: "指令執行者", value: user.toString() })
                .addFields({ name: "指令名稱", value: fullCommand })
                .addFields({ name: "選項", value: optionsStr ? optionsStr : "無" })
                .addFields({ name: "伺服器", value: `${guild?.name} (${guild?.id})` })
                .addFields({ name: "頻道", value: `${channel?.name} (${channel?.id})` });

            backend_logger.info(embed);

            // interaction的reply 需要 read message history 權限

            /** @type {bigint[]} */
            const permissionNeeded = [PermissionFlagsBits.ReadMessageHistory];

            if (command.perm?.length) permissionNeeded.push(...command.perm);

            const missingPerms = permissionNeeded.filter(perm => !channelPermission.has(perm));

            const permKeys = Object.keys(PermissionFlagsBits);

            if (missingPerms.length > 0) {
                try {
                    if (!interaction.replied || !interaction.deferred) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                    return interaction.followUp({
                        content: `機器人缺少以下權限:\n${missingPerms.map(perm => `\`${permKeys.find(key => PermissionFlagsBits[key] === perm) ?? perm}\``).join("\n")}`.slice(0, 2000),
                        flags: MessageFlags.Ephemeral,
                    });
                } catch { };
            };

            await command.execute(interaction, client);
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            if (errorStack.includes("Unknown Interaction")) return;
            logger.error(`執行斜線指令 ${fullCommand} 時出錯：${errorStack}`);

            const embeds = await get_loophole_embed(errorStack, interaction, client);
            try {
                await interaction.followUp({ content: "", embeds, components: [], flags: MessageFlags.Ephemeral });
            } catch { };
        };
    },
};