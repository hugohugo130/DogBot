const { Events, ChannelType, Client, VoiceState, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(client, oldState, newState) {
        const { getDynamicVoice } = require("../utils/file.js");
        const { get_logger } = require("../utils/logger.js");
        const logger = get_logger();

        // 调试信息
        logger.info(`[動態語音] 事件觸發 - 舊頻道: ${oldState.channel?.name || '無'}, 新頻道: ${newState.channel?.name || '無'}`);

        // 邊界條件檢查
        const guild = newState.guild || oldState.guild;
        if (!guild) {
            logger.warn("[動態語音] 無法取得公會");
            return;
        }

        const member = newState.member || oldState.member;
        if (!member) {
            logger.warn("[動態語音] 無法取得成員");
            return;
        }

        // 確保 client.dvoice 已初始化
        if (!client.dvoice) {
            client.dvoice = new Map();
            logger.info("[動態語音] 初始化 dvoice Map");
        }

        const mainchannelID = getDynamicVoice(guild.id);
        logger.info(`[動態語音] 主頻道ID: ${mainchannelID}, 公會: ${guild.name}`);

        if (!mainchannelID) {
            logger.warn(`[動態語音] 未找到主頻道設置`);
            return;
        }

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
                }

                const channel = await guild.channels.create({
                    name: `${member.user.username}的頻道`,
                    type: ChannelType.GuildVoice,
                    parent: newChannel.parent,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                        },
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                    ],
                });

                logger.info(`[動態語音] 已建立頻道: ${channel.name}`);
                await newState.setChannel(channel);

                client.dvoice.set(channel.id, {
                    owner: member.id,
                    channel: channel,
                    guild: guild.id
                });

                logger.info(`[動態語音] 已為 ${member.user.username} 建立頻道: ${channel.name}`);

            } catch (error) {
                logger.error(`[動態語音] 建立頻道失敗: ${error.message}`);
                console.error(error);
            }
        } 
        // 成員離開語音頻道
        else if (oldChannel && oldChannel.id !== mainchannelID) {
            logger.info(`[動態語音] ${member.user.username} 離開頻道: ${oldChannel.name}`);
            
            const data = client.dvoice.get(oldChannel.id);
            if (!data) {
                logger.warn(`[動態語音] 未找到頻道記錄: ${oldChannel.id}`);
                return;
            }

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
            } else {
                logger.info(`[動態語音] 頻道還有 ${oldChannel.members.size} 個成員，不刪除`);
            }
        }
    },
}