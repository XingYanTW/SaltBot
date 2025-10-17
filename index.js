const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 創建新的客戶端實例
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// 為命令創建一個集合
client.commands = new Collection();

// 載入命令
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    // 載入子資料夾中的命令
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
                    client.commands.set(command.data.name, command);
                    console.log(`[載入] 命令 ${command.data.name} 從 ${folder} 資料夾載入成功`);
                } else {
                    console.log(`[警告] 命令文件 ${filePath} 缺少必要的 "data" 或 "execute" 屬性。`);
                }
            }
        }
    }
}

// 載入事件
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// 錯誤處理
process.on('unhandledRejection', error => {
    console.error('未處理的 Promise 拒絕:', error);
});

// 登入 Discord
client.login(process.env.DISCORD_TOKEN);
