const { Events, ActivityType } = require('discord.js');
const statusConfig = require('../config/statusConfig');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`準備完成！已登入為 ${client.user.tag}`);
        console.log(`機器人在 ${client.guilds.cache.size} 個伺服器中運行`);
        
        // 獲取統計資料
        const serverCount = client.guilds.cache.size;
        const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        
        // 組合狀態（自定義狀態 + 動態狀態）
        const customActivities = statusConfig.getCustomActivities(serverCount, userCount, client.commands.size);
        const dynamicActivities = statusConfig.getDynamicActivities(serverCount, userCount);
        const allActivities = [...customActivities, ...dynamicActivities];
        
        // 設置初始狀態
        let currentActivityIndex = 0;
        client.user.setActivity(allActivities[currentActivityIndex].name, { 
            type: allActivities[currentActivityIndex].type 
        });
        
        console.log(`✅ 機器人狀態設置為: ${allActivities[currentActivityIndex].name}`);
        
        // 每 30 秒切換一次狀態
        client.statusInterval = setInterval(() => {
            // 獲取最新統計資料
            const currentServerCount = client.guilds.cache.size;
            const currentUserCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            
            // 重新生成狀態列表（包含最新資訊）
            const currentCustomActivities = statusConfig.getCustomActivities(currentServerCount, currentUserCount, client.commands.size);
            const currentDynamicActivities = statusConfig.getDynamicActivities(currentServerCount, currentUserCount);
            const currentAllActivities = [...currentCustomActivities, ...currentDynamicActivities];
            
            currentActivityIndex = (currentActivityIndex + 1) % currentAllActivities.length;
            const activity = currentAllActivities[currentActivityIndex];
            
            client.user.setActivity(activity.name, { type: activity.type });
            console.log(`🔄 狀態切換為: ${activity.name} (${statusConfig.getActivityTypeName(activity.type)})`);
        }, statusConfig.switchInterval);
        
        // 顯示啟動資訊
        console.log('┌─────────────────────────────────────┐');
        console.log('│           📊 機器人統計資訊           │');
        console.log('├─────────────────────────────────────┤');
        console.log(`│ 🏠 伺服器數量: ${serverCount.toString().padEnd(19)} │`);
        console.log(`│ 👥 用戶數量: ${userCount.toString().padEnd(21)} │`);
        console.log(`│ ⚡ 指令數量: ${client.commands.size.toString().padEnd(21)} │`);
        console.log(`│ � 狀態數量: ${allActivities.length.toString().padEnd(21)} │`);
        console.log('└─────────────────────────────────────┘');
        console.log('🎵 SaltBot maimai DX 機器人已準備就緒！');
        console.log('🔄 自動狀態切換已啟用 (30秒間隔)');
    },
};
