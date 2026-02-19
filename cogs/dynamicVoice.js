const { Events, ChannelType, VoiceState, PermissionFlagsBits } = require("discord.js");
const util = require("util");

const { get_logger } = require("../utils/logger.js");
const { get_channel, get_me } = require("../utils/discord.js");
const { getDynamicVoice } = require("../utils/file.js");
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
        const logger = get_logger();

        try {
            const guild = newState.guild || oldState.guild;
            if (!guild) return;

            const member = newState.member || oldState.member;
            if (!member) return;

            const mainchannelID = await getDynamicVoice(guild.id);
            if (!mainchannelID) return;

            const mainchannel = await get_channel(mainchannelID, guild);
            if (!mainchannel) return;

            if (!('permissionsFor' in mainchannel)) return;

            const oldChannel = oldState.channel;
            const newChannel = newState.channel;

            if (!oldChannel?.id && !newChannel?.id) return;
            if (oldChannel?.id === newChannel?.id) return;

            const botMember = await get_me(guild);
            const channelPermission = mainchannel.permissionsFor(botMember.id);
            if (!channelPermission) return;

            // 檢查機器人是否有權限管理頻道
            if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) return;
            if (!channelPermission.has(PermissionFlagsBits.ManageChannels)) return;

            // 檢查機器人是否有權限移動成員
            if (!botMember.permissions.has(PermissionFlagsBits.MoveMembers)) return;
            if (!channelPermission.has(PermissionFlagsBits.MoveMembers)) return;

            // 成員加入語音頻道
            if (newChannel && newChannel.id === mainchannelID) {
                try {
                    let channel;
                    let createChannel = true;

                    const data = client.dvoice.find(d => d.owner === member.id);

                    if (data) {
                        channel = data.channel || newChannel;

                        if (
                            (
                                channel?.type &&
                                channel?.type === ChannelType.GuildVoice
                            ) && (
                                await get_channel(channel.id, guild)
                            )
                        ) {
                            createChannel = false;
                        };
                    };

                    if (createChannel) {
                        channel = await guild.channels.create({
                            name: format.replace("{user}", member.user.username),
                            type: ChannelType.GuildVoice,
                            parent: newChannel.parent,
                            permissionOverwrites: [
                                {
                                    id: member.id,
                                    allow: [
                                        PermissionFlagsBits.Connect,
                                        PermissionFlagsBits.Speak,
                                        PermissionFlagsBits.ViewChannel,
                                    ],
                                },
                                {
                                    id: client.user?.id || "",
                                    allow: [
                                        PermissionFlagsBits.Connect,
                                        PermissionFlagsBits.Speak,
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.ManageChannels,
                                        PermissionFlagsBits.MoveMembers,
                                    ],
                                },
                            ],
                        });
                    };

                    if (channel) await newState.setChannel(channel);

                    if (createChannel && channel) client.dvoice.set(channel.id, {
                        owner: member.id,
                        channel: channel,
                    });
                } catch (error) {
                    const errorStack = util.inspect(error, { depth: null });

                    logger.error(`[${guild.name} (${guild.id})] 建立頻道 & 移動成員失敗: ${errorStack} `);
                };
            };

            // 成員離開語音頻道
            if (oldChannel && oldChannel.id !== mainchannelID) {
                // 檢查頻道是否為空
                if (oldChannel.members.size === 0) {
                    const data = client.dvoice.get(oldChannel.id);

                    if (!data && !pattern.test(oldChannel.name)) return;

                    try {
                        await oldChannel.delete();

                        if (data) client.dvoice.delete(oldChannel.id);
                    } catch (error) {
                        const errorStack = util.inspect(error, { depth: null });

                        logger.error(`刪除頻道失敗: ${errorStack} `);

                        // 即使刪除失敗也要清理記錄
                        if (data) client.dvoice.delete(oldChannel.id);
                    };
                };
            };
        } catch (err) {
            const errorStack = util.inspect(err, { depth: null });

            logger.error(`動態語音錯誤: ${errorStack} `);
        };
    },
}