const { SlashCommandBuilder, EmbedBuilder, SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, User, Client } = require("discord.js");
const { get_id_of_name, farm_slots } = require("../../../utils/rpg.js");

/**
 * 
 * @param {User} user 
 * @param {Client} client 
 * @returns {Promise<EmbedBuilder>}
 */
async function get_farm_info_embed(user, client = global._client) {
    const { load_farm_data } = require("../../../utils/file.js");
    const { setEmbedFooter } = require("../../../cogs/rpg/msg_handler.js");
    const { get_emoji } = require("../../../utils/rpg.js");
    const { get_name_of_id } = require("../../../utils/rpg.js");
    const { convertToSecond, DateNowSecond } = require("../../../utils/timestamp.js");
    const { embed_default_color } = require("../../../utils/config.js");

    const emoji_farmer = await get_emoji(client, "farmer");
    const emoji_hoe = await get_emoji(client, "hoe");
    const emoji_update = await get_emoji(client, "update");
    const farm_data = load_farm_data(user.id);

    let waterAt = farm_data.waterAt;

    // 判斷water at是秒還是毫秒，毫秒轉換成秒
    waterAt = convertToSecond(waterAt);

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(`${emoji_farmer} | ${user.username} 的農田`)
        .setDescription(`農田等級：${farm_data.lvl} | 上次澆水：${waterAt > 0 ? `<t:${waterAt}:R>` : "無"}`);

    for (const data of (farm_data.farms || [])) {
        const index = farm_data.farms.indexOf(data);
        const amount = data.amount;
        const hoe = data.hoe;
        const start = data.start;
        const endsAt = data.endsAt;

        const elapsed_time = DateNowSecond() - start;
        const total_duration = endsAt - start;
        const progress = Math.min(100, Math.max(0, (elapsed_time / total_duration) * 100))

        embed.addFields({
            name: `${index + 1}. ${get_name_of_id(hoe)}x${amount}`,
            value: `${emoji_hoe} 完成度: ${Math.round(progress)}% (<t:${endsAt}:R>)`
        });
    };

    const updateButton = new ButtonBuilder()
        .setCustomId(`farm|${user.id}`)
        .setEmoji(emoji_update)
        .setLabel("更新")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
        .addComponents(updateButton);

    return [setEmbedFooter(client, embed), row];
};

function get_harvest_items(amount) {
    const { probabilities } = require("../../../utils/config.js");
    const { choice, randint } = require("../../../utils/random.js");
    const farm_probability = probabilities.farm;

    /*
    {
        "key": [amount, ...],
        "key2": [amount, ...],
        ...
    }
 
    -> [key * amount, key2 * amount, ...]
    */
    const res = [];
    for (const [key, value] of Object.entries(farm_probability)) {
        res.push(...Array(value[0]).fill(key));
    };

    const results = {};

    for (let i = 0; i < amount; i++) {
        const item = choice(res);
        const item_data = farm_probability[item];
        const amount = randint(item_data[1], item_data[2]);

        if (results[item]) {
            results[item] += amount;
        } else {
            results[item] = amount;
        };
    };

    return results;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("farm")
        .setDescription("farm related commands")
        .setNameLocalizations({
            "zh-TW": "種田",
            "zh-CN": "種田",
            "en-US": "farm",
        })
        .setDescriptionLocalizations({
            "zh-TW": "農田相關指令",
            "zh-CN": "农田相关指令",
            "en-US": "farm related commands",
        })
        .addSubcommand(new SlashCommandSubcommandBuilder() // plant
            .setName("plant")
            .setNameLocalizations({
                "zh-TW": "種植",
                "zh-CN": "种植",
                "en-US": "plant",
            })
            .setDescription("Use a hoe to plant crops")
            .setDescriptionLocalizations({
                "zh-TW": "使用鋤頭種植農作物",
                "zh-CN": "使用锄头种植农作物",
                "en-US": "Use a hoe to plant crops",
            })
            .addStringOption(option =>
                option.setName("hoe")
                    .setNameLocalizations({
                        "zh-TW": "鋤頭",
                        "zh-CN": "锄头",
                        "en-US": "hoe",
                    })
                    .setDescription("The hoe to be used")
                    .setDescriptionLocalizations({
                        "zh-TW": "要使用的锄头",
                        "zh-CN": "要使用的鋤頭",
                        "en-US": "The hoe to be used",
                    })
                    .setRequired(true)
                    .addChoices([
                        { name: "木鋤", value: get_id_of_name("木鋤", "wooden_hoe") },
                        { name: "鐵鋤", value: get_id_of_name("鐵鋤", "iron_hoe") },
                    ]),
            )
            .addIntegerOption(option =>
                option.setName("amount")
                    .setNameLocalizations({
                        "zh-TW": "數量",
                        "zh-CN": "数量",
                    })
                    .setDescription("The amount of hoe to be used")
                    .setDescriptionLocalizations({
                        "zh-TW": "要使用的鋤頭數量",
                        "zh-CN": "要使用的锄头数量",
                    })
                    .setRequired(false)
                    .setMinValue(1)
                    .setMaxValue(farm_slots),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // info
            .setName("info")
            .setNameLocalizations({
                "zh-TW": "資訊",
                "zh-CN": "資訊",
                "en-US": "info",
            })
            .setDescription("View current farming status")
            .setDescriptionLocalizations({
                "zh-TW": "檢視目前農田狀態",
                "zh-CN": "查看目前农田状态",
                "en-US": "View current farming status",
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // get
            .setName("get")
            .setNameLocalizations({
                "zh-TW": "採收",
                "zh-CN": "采集",
                "en-US": "get",
            })
            .setDescription("Harvest crops")
            .setDescriptionLocalizations({
                "zh-TW": "採收農作物",
                "zh-CN": "采集农作物",
                "en-US": "Harvest crops",
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // water
            .setName("water")
            .setNameLocalizations({
                "zh-TW": "澆水",
                "zh-CN": "浇水",
                "en-US": "water",
            })
            .setDescription("Water the farmland")
            .setDescriptionLocalizations({
                "zh-TW": "幫農田澆水",
                "zh-CN": "帮农田浇水",
                "en-US": "Water the farmland",
            })
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const { load_rpg_data, save_rpg_data, load_farm_data, save_farm_data } = require("../../../utils/file.js");
        const { farm_slots, get_name_of_id, userHaveEnoughItems, notEnoughItemEmbed } = require("../../../utils/rpg.js");
        const { setEmbedFooter, is_cooldown_finished } = require("../../../cogs/rpg/msg_handler.js");
        const { randint } = require("../../../utils/random.js");
        const { get_emoji } = require("../../../utils/rpg.js");
        const { DateNowSecond } = require("../../../utils/timestamp.js");
        const { embed_default_color, embed_error_color, rpg_lvlUp_per } = require("../../../utils/config.js");

        const client = interaction.client;
        const user = interaction.user;
        const userId = user.id;
        const subcommand = interaction.options.getSubcommand();

        const farm_data = load_farm_data(userId);

        const emoji_farmer = await get_emoji(client, "farmer");
        const emoji_cross = await get_emoji(client, "crosS");
        const emoji_check = await get_emoji(client, "check");

        if (subcommand === "plant") {
            const rpg_data = load_rpg_data(userId);
            const amount = interaction.options.getInteger("amount") ?? 1;
            const hoe = interaction.options.getString("hoe");

            const iron_hoe = hoe === get_id_of_name("鐵鋤", "iron_hoe");
            const need_hunger = iron_hoe ? 5 * amount : 0;
            const insert_amount = iron_hoe ? amount : 1;
            const hoe_amount = iron_hoe ? 10 : amount;
            const duration = 20 * 60;
            const endsAt = DateNowSecond() + duration;

            if (farm_data.farms.length >= farm_data || (farm_data.farms.length + insert_amount) > farm_slots) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 最多只能同時使用四把鋤頭`);

                return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], flags: MessageFlags.Ephemeral });
            };

            if (rpg_data.hungry < need_hunger) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你的體力不足了`);

                return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], flags: MessageFlags.Ephemeral });
            };

            if (!userHaveEnoughItems(userId, hoe, amount)) {
                const embed = notEnoughItemEmbed([{ name: get_name_of_id(hoe), amount }]);

                return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], flags: MessageFlags.Ephemeral });
            };

            if (!farm_data.farms) {
                farm_data.farms = [];
            };

            // loop {insert_amount} times
            for (let i = 0; i < insert_amount; i++) {
                const farm = {
                    amount: hoe_amount,
                    hoe,
                    start: DateNowSecond(),
                    endsAt,
                };

                farm_data.farms.push(farm);
            };

            rpg_data.hungry -= need_hunger;
            save_rpg_data(userId, rpg_data);
            save_farm_data(userId, farm_data);

            const success_embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_check} | 成功使用了 ${amount} 個鐵鋤`)
                .setDescription(`消耗 ${need_hunger} 點體力`);

            return await interaction.editReply({ embeds: [setEmbedFooter(client, success_embed, '', rpg_data)] });
        } else if (subcommand === "info") {
            const [embed, row] = await get_farm_info_embed(user, client);

            return await interaction.editReply({ embeds: [embed], components: [row] });
        } else if (subcommand === "get") {
            const completed_farms = farm_data.farms.filter(farm => DateNowSecond() >= farm.endsAt);
            if (completed_farms.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你的農田沒有正在種植的田地`);

                return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], flags: MessageFlags.Ephemeral });
            };

            const farmlands = completed_farms.map(farm => {
                return farm.amount;
            }).reduce((pre, cur) => pre + cur, 0);

            const items = get_harvest_items(farmlands);
            const items_str = Object.entries(items).map(([item, amount]) => `${amount} 個${get_name_of_id(item)}`).join("、");
            const rpg_data = load_rpg_data(userId);
            for (const [item, amount] of Object.entries(items)) {
                if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
                rpg_data.inventory[item] += amount;
            };

            farm_data.farms = farm_data.farms.filter(farm => !completed_farms.includes(farm));
            save_rpg_data(userId, rpg_data);
            save_farm_data(userId, farm_data);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_farmer} | 成功採收了 ${farmlands} 格田地`)
                .setDescription(`你獲得了 ${items_str}`);

            return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)] });
        } else if (subcommand === "water") {
            const rpg_data = load_rpg_data(userId);
            const cooldown_key = `farm_water`;

            const { is_finished, endsAts } = is_cooldown_finished(cooldown_key, rpg_data);

            if (!is_finished) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你已經澆過水了`)
                    .setDescription(`請在 <t:${endsAts}:R> 再繼續澆水`);

                return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], flags: MessageFlags.Ephemeral });
            };

            const get_exp = randint(50, 74);
            farm_data.exp += get_exp;
            if (farm_data.exp >= rpg_lvlUp_per) {
                const lvlUp = Math.floor(farm_data.exp / rpg_lvlUp_per);
                farm_data.lvl += lvlUp;
                farm_data.exp -= rpg_lvlUp_per * lvlUp;
            };

            rpg_data.lastRunTimestamp[cooldown_key] = DateNowSecond();
            farm_data.waterAt = DateNowSecond();

            save_rpg_data(userId, rpg_data);
            save_farm_data(userId, farm_data);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_farmer} | 成功幫你的農田澆水`)
                .setDescription(`你獲得了 \`${get_exp}\` 點經驗值`);

            return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)] });
        };
    },
    get_farm_info_embed,
};
