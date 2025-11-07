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

        const guild = newState.guild;
        const mainchannel = getDynamicVoice(guild.id);
        if (!mainchannel) return;

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;
        const member = newState.member || oldState.member

        // 成員加入語音頻道
        if (newChannel && newChannel.id === mainchannel.id) {
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
        } else if (oldChannel && oldChannel.id !== mainchannel.id) { // 成員離開語音頻道
            const channel = oldChannel;

            const data = client.dvoice.get(channel.id);
            if (!data) return;
            if (member.id !== data.owner.id) return;

            await channel.delete();
            client.dvoice.delete(channel.id);
        };
    },
}