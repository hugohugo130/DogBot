const { SlashCommandBuilder } = require('discord.js');
const EmbedBuilder = require('../../../../utils/customs/embedBuilder.js');

function split_msg(content, split = 2000) {
    let messages = [];
    for (let i = 0; i < content.length; i += split) {
        messages.push(content.slice(i, i + split));
    };

    return messages;
};

function show_transactions(userid) {
    const { load_rpg_data } = require("../../../../utils/file.js");
    const { transactions = [] } = load_rpg_data(userid);

    /* transactions 列表中的每個字典應該包含:
    timestamp: 時間戳記 (Unix timestamp) 單位: 秒
    detail: 交易詳情 (字串)
    amount: 金額 (數字)
    type: 交易類型 (字串，例如: "出售物品所得"、"購買物品付款" 等)
    */
    return transactions
        .slice(-10)
        .map(({ timestamp, originalUser, targetUser, amount, type }) =>
            `- <t:${timestamp}:R> ${originalUser} \`>\` ${targetUser} \`${amount.toLocaleString()}$\` (${type})`
        ).join('\n');
};

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
    async execute(interaction) {
        const { load_rpg_data } = require("../../../../utils/file.js");
        const { embed_default_color } = require("../../../../utils/config.js");
        await interaction.deferReply();
        const user = interaction.options.getUser("user");
        const rpg_data = load_rpg_data(user.id);

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

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${user.username}的RPG數據`)
            .addFields(
                { name: "金錢", value: rpg_data.money.toString(), inline: true },
                { name: "飽食度", value: rpg_data.hunger.toString(), inline: true },
                { name: "工作", value: rpg_data.job.toString(), inline: true },
                { name: "戰鬥工作", value: rpg_data.fightjob.toString(), inline: true },
                { name: "徽章", value: rpg_data.badge.toString(), inline: true },
                { name: "結婚狀態", value: rpg_data.marry.status.toString(), inline: true },
                { name: "結婚對象", value: rpg_data.marry.with.toString(), inline: true },
                { name: "結婚時間", value: rpg_data.marry.time.toString(), inline: true },
                { name: "交易", value: rpg_data.transactions.toString(), inline: true },
                { name: "隱私", value: rpg_data.privacy.toString(), inline: true },
                {
                    name: "物品",
                    value: Object.entries(rpg_data.inventory)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join("\n"),
                    inline: false
                },
                {
                    name: "上次執行時間",
                    value: Object.entries(rpg_data.lastRunTimestamp)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join("\n"),
                    inline: false
                },
                {
                    name: "計數",
                    value: Object.entries(rpg_data.count)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join("\n"),
                    inline: false
                },
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // const msgs = [
        //     Object.entries(rpg_data.inventory)
        //         .map(([key, value]) => `${key}: ${value}`)
        //         .join("\n"),

        //     Object.entries(rpg_data.lastRunTimestamp)
        //         .map(([key, value]) => `${key}: ${value}`)
        //         .join("\n"),

        //     Object.entries(rpg_data.count)
        //         .map(([key, value]) => `${key}: ${value}`)
        //         .join("\n"),

        //     show_transactions(user.id),
        // ];

        // for (const msg of msgs) {
        //     for (const msgcontent of split_msg(msg)) {
        //         await interaction.followUp({content: msgcontent});
        //     };
        // };
    },
};