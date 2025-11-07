const { Events, ChannelType, Client, VoiceState } = require("discord.js");

module.exports = {
    name: Events.VoiceStateUpdate,
    /**
     * 
     * @param {Client} client 
     * @param {VoiceState} oldState 
     * @param {VoiceState} newState 
     * @returns {Promise<void>}
     */
    async execute(client, oldState, newState) {
        const { getDynamicVoice } = require("../utils/file.js");
        const { get_logger } = require("../utils/logger.js");
        const logger = get_logger();

        // 邊界條件檢查
        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        const member = newState.member || oldState.member;
        if (!member) return;

        const mainchannelID = getDynamicVoice(guild.id);
        if (!mainchannelID) return;

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        // 成員加入語音頻道
        if (newChannel && newChannel.id === mainchannelID) {
            try {
                const channel = await guild.channels.create({
                    name: `${member.user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: newChannel.parent,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: ["Connect", "Speak", "ViewChannel", "ManageChannels"],
                        },
                    ],
                });

                await newState.setChannel(channel);

                client.dvoice.set(channel.id, {
                    owner: member.id,
                    channel: channel,
                });
                logger.info(`[動態語音] 已為 ${member.user.username} 建立頻道: ${channel.name}`);
            } catch (error) {
                logger.error(`[動態語音] 建立頻道失敗: ${error.message}`);
            }
        } else if (oldChannel && oldChannel.id !== mainchannelID) { // 成員離開語音頻道
            const data = client.dvoice.get(oldChannel.id);
            if (!data) return;

            // 檢查頻道是否為空
            if (oldChannel.members.size === 0) {
                try {
                    await oldChannel.delete();
                    client.dvoice.delete(oldChannel.id);
                    logger.info(`[動態語音] 已刪除空頻道: ${oldChannel.name}`);
                } catch (error) {
                    logger.error(`[動態語音] 刪除頻道失敗: ${error.message}`);
                    // 即使刪除失敗也要清理記錄
                    client.dvoice.delete(oldChannel.id);
                }
            }
        };
    },
}
