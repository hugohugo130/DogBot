const { Events, ChannelType, Client, VoiceState, PermissionFlagsBits } = require("discord.js");

const pattern = /^└⳺.*⳻ 的頻道$/;
const format = String(pattern)
    .replace(/^\/\^/, '')
    .replace(/\$\//, '')
    .replace(/\.\*/g, '{user}');

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
        try{
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
            try {
                // 檢查機器人權限
                const botMember = await guild.members.fetch(client.user.id);
                if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    logger.error("機器人缺少管理頻道權限");
                    return;
                };

                let channel;
                const data = client.dvoice[newChannel.id];
                if (data) {
                    channel = data.channel || newChannel;
                };

                if (!data) {
                    channel = await guild.channels.create({
                        name: format.replace("{user}", member.user.username),
                        type: ChannelType.GuildVoice,
                        parent: newChannel.parent,
                        permissionOverwrites: [
                            {
                                id: member.id,
                                allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                            },
                        ],
                    });
                };

                await newState.setChannel(channel);

                client.dvoice[channel.id] = {
                    owner: member.id,
                    channel: channel,
                    guild: guild.id
                };
            } catch (error) {
                logger.error(`建立頻道失敗: ${error.message}`);
            }
        };

        // 成員離開語音頻道
        if (oldChannel && oldChannel.id !== mainchannelID) {
            const data = client.dvoice[oldChannel.id];
            if (!data) {
                if (!pattern.test(oldChannel.name)) return;
                logger.warn(`頻道 ${oldChannel.name} 不在動態語音記錄中，但疑似由動態語音建立`);
            };

            // 檢查頻道是否為空
            if (oldChannel.members.size === 0) {
                try {
                    await oldChannel.delete();
                    if (data) delete client.dvoice[oldChannel.id];
                } catch (error) {
                    logger.error(`刪除頻道失敗: ${error.message}`);

                    // 即使刪除失敗也要清理記錄
                    if (data) delete client.dvoice[oldChannel.id];
                };
            };
        };
    }catch(err){
        logger.error(`動態語音錯誤: ${err.message}`);
    }
    },
}