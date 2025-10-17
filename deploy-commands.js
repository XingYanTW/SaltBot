const { REST, Routes } = require('discord.js');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const commands = [];

// 讀取所有命令文件
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const stat = fs.statSync(folderPath);
    
    if (stat.isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`[部署] 命令 ${command.data.name} 從 ${folder} 資料夾準備部署`);
            } else {
                console.log(`[警告] 命令文件 ${filePath} 缺少必要的 "data" 或 "execute" 屬性。`);
            }
        }
    }
}

// 建構並準備 REST 模組實例
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// 部署命令
(async () => {
    try {
        console.log(`開始重新載入 ${commands.length} 個應用程式 (/) 命令。`);

        // 全域命令部署（如果沒有設定 GUILD_ID）
        if (!process.env.GUILD_ID) {
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`成功重新載入 ${data.length} 個全域應用程式 (/) 命令。`);
        } else {
            // 伺服器特定命令部署（測試用）
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`成功重新載入 ${data.length} 個伺服器應用程式 (/) 命令。`);
        }
    } catch (error) {
        console.error('部署命令時發生錯誤:', error);
    }
})();
