import {
    inspect,
} from "node:util";
import {
    escapeMarkdown,
    Events,
    MessageFlags,
    GuildMember,
    DMChannel,
} from "discord.js";

import {
    get_logger,
} from "../utils/logger.js";
import {
    get_emoji,
    get_loophole_embed,
} from "../utils/rpg.js";
import {
    get_me,
} from "../utils/discord.js";
import {
    get_lang_data,
    PermissionTranslationKeyMapping,
} from "../utils/language.js";
import EmbedBuilder from "../utils/customs/embedBuilder.js";
import DogClient from "../utils/customs/client.js";
import { adminIDs, ownerID } from "../utils/config.js";

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
 * @returns {readonly import('discord.js').CommandInteractionOption<import('discord.js').CacheType>[]}
 */
function getFinalOptions(options) {
    /** @type {readonly import('discord.js').CommandInteractionOption<import('discord.js').CacheType>[] | undefined}*/
    let current = options;

    while (current && current.length > 0 && (current[0].type === 1 || current[0].type === 2)) {
        current = current[0].options;
    };

    return current || [];
};

const logger = get_logger();
const backend_logger = get_logger({ backend: true });

const name = Events.InteractionCreate;
/**
 *
 * @param {DogClient} client
 * @param {import("discord.js").Interaction} interaction
 * @returns {Promise<any>}
 */
const execute = async function (client, interaction) {
    if (!interaction.isChatInputCommand?.()) return;

    const { user, member, guild, channel, commandName, locale } = interaction;

    const username = user.globalName || user.username;
    const command = client.commands.get(commandName);

    if (!command) {
        logger.error(`找不到名為 ${commandName} 的指令`);
        return;
    };

    const isDM = (
        guild === null &&
        member === null &&
        channel?.isDMBased()
    );

    const { stage, allowedContext, permissions: cmd_perms, execute } = command;

    if (isDM && !allowedContext.includes("dm")) {
        const emoji_cross = await get_emoji("crosS", client);

        return await interaction.reply({
            content: `${emoji_cross} | 此指令無法在私訊中使用`,
            flags: MessageFlags.Ephemeral,
        });
    } else if (!isDM && !allowedContext.includes("guild")) {
        const emoji_cross = await get_emoji("crosS", client);

        return await interaction.reply({
            content: `${emoji_cross} | 此指令無法在伺服器中使用`,
            flags: MessageFlags.Ephemeral,
        });
    };

    switch (stage) {
        case "admin": {
            if (!adminIDs.includes(user.id)) {
                const emoji_cross = await get_emoji("crosS", client);

                return await interaction.reply({
                    content: `${emoji_cross} | 此指令僅限機器人管理員使用`,
                    flags: MessageFlags.Ephemeral,
                });
            };
        }

        case "owner": {
            if (ownerID !== user.id) {
                const emoji_cross = await get_emoji("crosS", client);

                return await interaction.reply({
                    content: `${emoji_cross} | 此指令僅限機器人擁有者使用`,
                    flags: MessageFlags.Ephemeral,
                });
            };
        };
    };

    const subPath = getFullCommandPath(interaction.options.data);
    const finalOptions = getFinalOptions(interaction.options.data);
    const optionsStr = finalOptions.map(option => `${option.name}: ${option.value}`).join(", ");
    const fullCommand = [commandName, ...subPath].join(" ");

    try {
        logger.info(`${username} 正在執行斜線指令: ${fullCommand}${optionsStr ? `, 選項: ${optionsStr}` : ""}`);

        const e_fullCommand = escapeMarkdown(fullCommand);
        const e_optionsStr = escapeMarkdown(optionsStr || "無");
        const e_guildName = guild ? escapeMarkdown(`${guild.name} (${guild.id})`) : null;
        const e_channelName = channel ? escapeMarkdown(`${!channel.isDMBased() ? channel.name : "私訊頻道"} (${channel.id})`) : null;

        const embed = new EmbedBuilder()
            .setTitle("指令執行")
            .addFields({ name: "指令執行者", value: user.toString() })
            .addFields({ name: "指令名稱", value: e_fullCommand })
            .addFields({ name: "選項", value: e_optionsStr })
            .addFields({ name: "伺服器", value: e_guildName || "私訊" })
            .addFields({ name: "頻道", value: e_channelName || "無資料" });

        backend_logger.info(embed);

        if (guild && member && channel && !channel.isDMBased()) {
            const [botMember, emoji_cross] = await Promise.all([
                get_me(guild),
                get_emoji("crosS", client),
            ]);

            const lang_bot_no_permission = get_lang_data(locale, "permissions", "bot_no_permission");
            const lang_user_no_permission = get_lang_data(locale, "permissions", "user_no_permission");
            const lang_cant_get_permission = get_lang_data(locale, "permissions", "cant_get_permission");

            const botChannelPermission = channel.permissionsFor(botMember);
            const userPermission = channel.permissionsFor(
                member instanceof GuildMember
                    ? member
                    : member.user.id
            );

            if (!userPermission) {
                return await interaction.reply({
                    content: `${emoji_cross} | 我無法取得你的權限`,
                    flags: MessageFlags.Ephemeral,
                });
            };

            // interaction#reply 需要 read message history 權限
            /** @type {{ bot: import("../utils/types").PermissionTexts[], user: import("../utils/types").PermissionTexts[] }} */
            const permissionNeeded = {
                "bot": ["ReadMessageHistory", ...(cmd_perms?.bot ?? [])],
                "user": cmd_perms?.user ?? [],
            };

            /**
             * @param {"bot" | "user"} key
             * @param {import("discord.js").PermissionsBitField} perms
             * @returns {import("../utils/types").PermissionTexts[]}
             */
            const getMissingPermissions = (key, perms) =>
                permissionNeeded[key].filter(
                    perm => !perms.has(perm)
                );

            /**
             * @param {import("../utils/types").PermissionTexts} perm
             * @return {string}
             */
            const translatePermissionNames = (perm) => {
                const translation_key = PermissionTranslationKeyMapping[perm];

                return get_lang_data(locale, "permissions", translation_key);
            };

            /** @type {{ bot: import("../utils/types").PermissionTexts[], user: import("../utils/types").PermissionTexts[] }} */
            const missingPermissions = {
                bot: getMissingPermissions("bot", botChannelPermission),
                user: getMissingPermissions("user", userPermission),
            };

            /**
             * @param {"bot" | "user"} key
             * @returns {string}
             */
            const getMissingPermText = (key) => missingPermissions[key].map(p => `\`${translatePermissionNames(p)}\``).join('、');

            const missingPermText =  /** @type {[key: "bot" | "user", label: string][]} */ ([["bot", lang_bot_no_permission], ["user", lang_user_no_permission]])
                .map(([key, label]) => missingPermissions[key].length ? `${emoji_cross} | ${label}\n${getMissingPermText(key)}` : "")
                .filter(Boolean)
                .join('\n')
                .trim();

            if (missingPermText !== "") {
                try {
                    if (!interaction.replied || !interaction.deferred) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                    return await interaction.followUp({
                        content: missingPermText.slice(0, 2000),
                        flags: MessageFlags.Ephemeral,
                    });
                } catch { };
            };
        };

        await execute(interaction, client);
    } catch (error) {
        const errorStack = inspect(error, { depth: null });

        if (errorStack.includes("Unknown Interaction")) return;
        logger.error(`執行斜線指令 ${fullCommand} 時出錯：${errorStack}`);

        const embeds = await get_loophole_embed(errorStack, interaction, client);
        try {
            await interaction.followUp({ content: "", embeds, components: [], flags: MessageFlags.Ephemeral });
        } catch { };
    };
};

export { name, execute };