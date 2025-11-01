const { Events } = require("discord.js");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

function add_item(rpg_data, item, amount) {
    if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;

    rpg_data.inventory[item] += amount;

    return rpg_data
}

module.exports = {
    name: Events.MessageCreate,
    execute: async function (client, message) {
        const { load_rpg_data, save_rpg_data } = require("../utils/file.js");
        const { get_id_of_name } = require("../utils/rpg.js");

        if (message.author.id !== "898836485397180426") return;
        if (!message.content.startsWith("!")) return;

        // 提取指令和參數
        let args = message.content.split(" ");
        args = args.map(arg => arg.trim());
        args = args.filter(arg => arg !== '');

        const command = args[0].substring(1); // 移除開頭的 '!'
        const commandArgs = args.slice(1); // 獲取所有參數

        // 使用 switch 處理不同的指令
        switch (command) {
            case "give":
                await handleGiveCommand(message, commandArgs);
                break;
            
            case "run":
                await handleRunCommand(message, commandArgs);
                break;
            
            default:
                return message.reply(`未知的指令: ${command}`);
        }

        async function handleGiveCommand(message, args) {
            if (args.length < 3) {
                return message.reply("用法: !give @user item amount");
            }

            let [_, item, amount] = args;
            item = get_id_of_name(item);

            const user = message.mentions.users.first();

            if (!user) {
                return message.reply("請標記一個用戶！");
            }

            const rpg_data = add_item(load_rpg_data(user.id), item, parseInt(amount));
            save_rpg_data(user.id, rpg_data);

            return message.reply(`done adding user <@${user.id}> 's inventory: ${item}*${amount}`);
        }

        async function handleRunCommand(message, args) {
            if (args.length === 0) {
                return message.reply("用法: !run COMMAND");
            }

            const cmd = args.join(" ");
            
            try {
                message.reply(`執行指令: \`${cmd}\`\n請稍候...`);
                
                const { stdout, stderr } = await execPromise(cmd, {
                    cwd: "/home/hugo/dogbot",
                    timeout: 30000 // 30秒超時
                });

                let response = "**執行結果:**\n";
                
                if (stdout) {
                    response += `\`\`\`\n${stdout.substring(0, 1800)}\`\`\``;
                }
                
                if (stderr) {
                    response += `\n**錯誤輸出:**\n\`\`\`\n${stderr.substring(0, 1800)}\`\`\``;
                }

                return message.reply(response);
            } catch (error) {
                return message.reply(`**執行失敗:**\n\`\`\`\n${error.message}\`\`\``);
            }
        }
    },
}
