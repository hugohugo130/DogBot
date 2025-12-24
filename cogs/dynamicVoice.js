const { Events, ChannelType, VoiceState, PermissionFlagsBits, Collection } = require("discord.js");
const util = require("node:util");
const DogClient = require("../utils/customs/client.js");

const pattern = /^└⳺.*⳻ 的頻道$/;
const format = String(pattern)
    .replace(/^\/\^/, "")
    .replace(/\$\//, "")
    .replace(/\.\*/g, "{user}");

module.exports = {
    name: Events.VoiceStateUpdate,
    /**
     * 
     * @param {DogClient} client 
     * @param {VoiceState} oldState 
     * @param {VoiceState} newState 
     * @returns {Promise<void>}
     */
    async execute(client, oldState, newState) {
        const { get_logger } = require("../utils/logger.js");
        const logger = get_logger();

        try {
            const { getDynamicVoice } = require("../utils/file.js");

            const guild = newState.guild || oldState.guild;
            if (!guild) return;

            const member = newState.member || oldState.member;
            if (!member) return;

            const mainchannelID = getDynamicVoice(guild.id);
            if (!mainchannelID) return;

            const oldChannel = oldState.channel;
            const newChannel = newState.channel;

            if (!oldChannel?.id && !newChannel?.id) return;
            if (oldChannel?.id === newChannel?.id) return;

            // 成員加入語音頻道
            if (newChannel && newChannel.id === mainchannelID) {
                try {
                    // 檢查機器人權限
                    const botMember = await guild.members.fetchMe();
                    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) return;

                    let channel;
                    const data = client.dvoice.find(d => d.owner === member.id);

                    if (data) {
                        channel = data.channel || newChannel;
                    } else {
                        channel = await guild.channels.create({
                            name: format.replace("{user}", member.user.username),
                            type: ChannelType.GuildVoice,
                            parent: newChannel.parent,
                            permissionOverwrites: [
                                {
                                    id: member.id,
                                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                                },
                                {
                                    id: client.user.id,
                                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                                },
                            ],
                        });
                    };

                    await newState.setChannel(channel);

                    if (!data) client.dvoice.set(channel.id, {
                        owner: member.id,
                        channel: channel,
                        guild: guild.id
                    });
                } catch (error) {
                    const errorStack = util.inspect(error, { depth: null });
                    logger.error(`建立頻道失敗: ${errorStack}`);
                };
            };

            // 成員離開語音頻道
            if (oldChannel && oldChannel.id !== mainchannelID) {
                // 檢查頻道是否為空
                if (oldChannel.members.size === 0) {
                    const data = client.dvoice.find(e => e === oldChannel.id);

                    if (!data && !pattern.test(oldChannel.name)) return;

                    try {
                        await oldChannel.delete();

                        if (data) client.dvoice = client.dvoice.filter(e => e !== oldChannel.id);
                    } catch (error) {
                        const errorStack = util.inspect(error, { depth: null });

                        logger.error(`刪除頻道失敗: ${errorStack}`);

                        // 即使刪除失敗也要清理記錄
                        if (data) client.dvoice = client.dvoice.filter(e => e !== oldChannel.id);
                    };
                };
            };
        } catch (err) {
            const errorStack = util.inspect(err, { depth: null });

            logger.error(`動態語音錯誤: ${errorStack}`);
        };
    },
}