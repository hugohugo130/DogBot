const { Events, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, escapeMarkdown } = require("discord.js");
const util = require("util");

const { get_logger } = require("../utils/logger.js");
const { get_loophole_embed } = require("../utils/rpg.js");
const { get_me } = require("../utils/discord.js");
const EmbedBuilder = require("../utils/customs/embedBuilder.js");
const DogClient = require("../utils/customs/client.js");

// function parseOptions(options) {
//     if (!options || options.length === 0) return "";
//     return options.map(option => {
//         if (option.type === 1 || option.type === 2) { // 1: SUB_COMMAND, 2: SUB_COMMAND_GROUP
//             return `${option.name}${option.options && option.options.length > 0 ? `(${parseOptions(option.options)})` : ""}`;
//         } else {
//             return `${option.name}: ${option.value}`;
//         }
//     }).join(", ");
// };

/**
 *
 * @param {any} options
 * @returns {string[]}
 */
function getFullCommandPath(options) {
    let path = [];

    let current = options;

    while (current && current.length > 0 && (current[0].type === 1 || current[0].type === 2)) {
        path.push(current[0].name);
        current = current[0].options;
    };

    return path;
};

/**
 *
 * @param {any} options
 * @returns {readonly import("discord.js").CommandInteractionOption<import("discord.js").CacheType>[]}
 */
function getFinalOptions(options) {
    /** @type {readonly import("discord.js").CommandInteractionOption<import("discord.js").CacheType>[] | undefined}*/
    let current = options;

    while (current && current.length > 0 && (current[0].type === 1 || current[0].type === 2)) {
        current = current[0].options;
    };

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
        const { user, guild, channel, commandName, isChatInputCommand } = interaction;

        if (!isChatInputCommand() || !guild || !channel) return;

        const username = user.globalName || user.username;
        const command = client.commands.get(commandName);

        if (!command) {
            logger.error(`找不到名為 ${commandName} 的指令`);
            return;
        };

        let subPath = getFullCommandPath(interaction.options.data);
        let finalOptions = getFinalOptions(interaction.options.data);
        let optionsStr = finalOptions.map(option => `${option.name}: ${option.value}`).join(", ");
        let fullCommand = [commandName, ...subPath].join(" ");

        try {
            if (!("permissionsFor" in channel)) return;

            const botMember = await get_me(guild);
            const channelPermission = channel.permissionsFor(botMember);

            logger.info(`${username} 正在執行斜線指令: ${fullCommand}${optionsStr ? `, 選項: ${optionsStr}` : ""}`);

            const e_fullCommand = escapeMarkdown(fullCommand);
            const e_optionsStr = escapeMarkdown(optionsStr || "無");
            const e_guildName = escapeMarkdown(`${guild.name} (${guild.id})`);
            const e_channelName = escapeMarkdown(`${channel.name} (${channel.id})`);

            const embed = new EmbedBuilder()
                .setTitle("指令執行")
                .addFields({ name: "指令執行者", value: user.toString() })
                .addFields({ name: "指令名稱", value: e_fullCommand })
                .addFields({ name: "選項", value: e_optionsStr })
                .addFields({ name: "伺服器", value: e_guildName })
                .addFields({ name: "頻道", value: e_channelName });

            backend_logger.info(embed);

            // interaction#reply 需要 read message history 權限
            /** @type {bigint[]} */
            const permissionNeeded = [PermissionFlagsBits.ReadMessageHistory];

            if (command.perm?.length) permissionNeeded.push(...command.perm);

            const missingPerms = permissionNeeded.filter(perm => !channelPermission.has(perm));

            const permKeys = Object.keys(PermissionFlagsBits);

            if (missingPerms.length > 0) {
                try {
                    if (!interaction.replied || !interaction.deferred) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                    return await interaction.followUp({ // @ts-ignore
                        content: `機器人缺少以下權限:\n${missingPerms.map(perm => `\`${permKeys.find(key => PermissionFlagsBits[key] === perm) ?? perm}\``).join("\n")}`.slice(0, 2000),
                        flags: MessageFlags.Ephemeral,
                    });
                } catch { };
            };

            if (!("execute" in command)) return;

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