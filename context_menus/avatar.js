import {
    ApplicationCommandType,
    ContextMenuCommandBuilder,
} from "discord.js";

export default new ContextMenuCommandBuilder()
    .setName("avatar")
    .setNameLocalizations({
        "zh-CN": "头像",
        "zh-TW": "頭貼",
    })
    .setType(ApplicationCommandType.User);
