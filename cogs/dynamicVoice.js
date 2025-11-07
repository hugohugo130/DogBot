const { Events, ChannelType, Client, VoiceState, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(client, oldState, newState) {
        const { getDynamicVoice } = require("../utils/file.js");
        const { get_logger } = require("../utils/logger.js");
        const logger = get_logger();

        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        const member = newState.member || oldState.member;
        if (!member) return;;

        // 確保 client.dvoice 已初始化
        if (!client.dvoice) client.dvoice = new Map();

        const mainchannelID = getDynamicVoice(guild.id);

        if (!mainchannelID) return;

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        // 成員加入語音頻道
        if (newChannel && newChannel.id === mainchannelID) {
            logger.info(`[動態語音] ${member.user.username} 加入主頻道`);

            try {
                // 檢查機器人權限
                const botMember = await guild.members.fetch(client.user.id);
                if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    logger.error("[動態語音] 機器人缺少管理頻道權限");
                    return;
                };

                const channel = await guild.channels.create({
                    name: `${member.user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: newChannel.parent,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                        },
                    ],
                });

                await newState.setChannel(channel);

                client.dvoice.set(channel.id, {
                    owner: member.id,
                    channel: channel,
                    guild: guild.id
                });

            } catch (error) {
                logger.error(`[動態語音] 建立頻道失敗: ${error.message}`);
                console.error(error);
            }
        }
        // 成員離開語音頻道
        else if (oldChannel && oldChannel.id !== mainchannelID) {
            const data = client.dvoice.get(oldChannel.id);
            if (!data) return;

            // 檢查頻道是否為空
            if (oldChannel.members.size === 0) {
                try {
                    await oldChannel.delete();
                    client.dvoice.delete(oldChannel.id);
                } catch (error) {
                    logger.error(`[動態語音] 刪除頻道失敗: ${error.message}`);
                    // 即使刪除失敗也要清理記錄
                    client.dvoice.delete(oldChannel.id);
                }
            };
        }
    },
}