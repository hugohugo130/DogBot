const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");

const { load_rpg_data, writeJson, join_temp_folder } = require("../../../../utils/file.js");
const { embed_default_color, admins } = require("../../../../utils/config.js");
const EmbedBuilder = require("../../../../utils/customs/embedBuilder.js");

// function split_msg(content, split = 2000) {
//     let messages = [];
//     for (let i = 0; i < content.length; i += split) {
//         messages.push(content.slice(i, i + split));
//     };

//     return messages;
// };

// async function show_transactions(userid) {
//     const { transactions = [] } = await load_rpg_data(userid);

//     /* transactions 列表中的每個字典應該包含:
//     timestamp: 時間戳記 (Unix timestamp) 單位: 秒
//     detail: 交易詳情 (字串)
//     amount: 金額 (數字)
//     type: 交易類型 (字串，例如: "出售物品所得"、"購買物品付款" 等)
//     */
//     return transactions
//         .slice(-10)
//         .map(({ timestamp, originalUser, targetUser, amount, type }) =>
//             `- <t:${timestamp}:R> ${originalUser} \`>\` ${targetUser} \`${amount.toLocaleString()}$\` (${type})`
//         ).join("\n");
// };

module.exports = {
    data: new SlashCommandBuilder()
        .setName("getuserdata")
        .setDescription("Get rpg data of a user")
        .setNameLocalizations({
            "zh-CN": "获取用户数据",
            "zh-TW": "獲取用戶數據",
        })
        .setDescriptionLocalizations({
            "zh-CN": "获取用户的RPG数据",
            "zh-TW": "獲取用戶的RPG數據",
        })
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to get data from")
                .setNameLocalizations({
                    "zh-CN": "用户",
                    "zh-TW": "用戶",
                })
                .setDescriptionLocalizations({
                    "zh-CN": "要获取数据的用户",
                    "zh-TW": "要獲取數據的用戶",
                })
                .setRequired(true),
        )
        .setDefaultMemberPermissions(0), // 只有管理員可以使用這個指令
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @returns {Promise<any>}
     */
    async execute(interaction) {
        if (!admins.includes(interaction.user.id)) return

        await interaction.deferReply();

        const user = interaction.options.getUser("user");
        const rpg_data = await load_rpg_data(user.id);

        /*
            "money": 1000,
            "hunger": 20,
            "job": null,
            "fightjob": null,
            "badge": null,
            "marry": {
                "status": false,
                "with": null,
                "time": 0,
            },
            "lastRunTimestamp": {},
            "inventory": {},
            "transactions": [],
            "count": {},
            "privacy": [],
        */

        const filename = `rpg_data@${user.id}@${Math.floor(rpg_data)}`
        const filePath = join_temp_folder(filename);
        await writeJson(filePath, rpg_data);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${user.username}的RPG數據`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], files: [filePath] });

        // const msgs = [
        //     Object.entries(rpg_data?.inventory)
        //         .map(([key, value]) => `${key}: ${value}`)
        //         .join("\n"),

        //     Object.entries(rpg_data?.lastRunTimestamp)
        //         .map(([key, value]) => `${key}: ${value}`)
        //         .join("\n"),

        //     Object.entries(rpg_data?.count)
        //         .map(([key, value]) => `${key}: ${value}`)
        //         .join("\n"),

        //     await show_transactions(user.id),
        // ];

        // for (const msg of msgs) {
        //     for (const msgcontent of split_msg(msg)) {
        //         await interaction.followUp({content: msgcontent});
        //     };
        // };
    },
};