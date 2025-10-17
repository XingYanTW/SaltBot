const { SlashCommandBuilder, EmbedBuilder, ActivityType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot-status')
        .setDescription('管理 Salt 的狀態にゃ（僅管理員）')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('設定 Salt 的狀態にゃ')
                .addStringOption(option =>
                    option.setName('activity')
                        .setDescription('Salt 在做什麼呢にゃ？')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('這是什麼類型的活動にゃ？')
                        .setRequired(true)
                        .addChoices(
                            { name: '🎮 正在玩', value: 'playing' },
                            { name: '🎵 正在聽', value: 'listening' },
                            { name: '📺 正在看', value: 'watching' },
                            { name: '🏆 正在競賽', value: 'competing' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('auto')
                .setDescription('讓 Salt 自動切換狀態にゃ'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('看看 Salt 現在的狀態にゃ')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'set') {
            const activity = interaction.options.getString('activity');
            const typeString = interaction.options.getString('type');
            
            // 轉換活動類型
            let activityType;
            switch (typeString) {
                case 'playing':
                    activityType = ActivityType.Playing;
                    break;
                case 'listening':
                    activityType = ActivityType.Listening;
                    break;
                case 'watching':
                    activityType = ActivityType.Watching;
                    break;
                case 'competing':
                    activityType = ActivityType.Competing;
                    break;
                default:
                    activityType = ActivityType.Playing;
            }
            
            try {
                // 設定新狀態
                interaction.client.user.setActivity(activity, { type: activityType });
                
                // 停止自動切換（如果有的話）
                if (interaction.client.statusInterval) {
                    clearInterval(interaction.client.statusInterval);
                    interaction.client.statusInterval = null;
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ 機器人狀態已更新')
                    .setDescription(`已設定為: **${getActivityTypeName(activityType)} ${activity}**`)
                    .setFooter({ 
                        text: `由 ${interaction.user.username} 設定`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                
                console.log(`🔧 管理員 ${interaction.user.username} 設定機器人狀態: ${activity}`);
                
            } catch (error) {
                console.error('設定機器人狀態時發生錯誤:', error);
                await interaction.reply({
                    content: '❌ Salt 設定狀態時發生錯誤にゃ，請稍後再試にゃ。',
                    ephemeral: true
                });
            }
            
        } else if (subcommand === 'auto') {
            try {
                // 恢復自動狀態切換
                const activities = [
                    { name: '🎵 maimai DX 音樂', type: ActivityType.Listening },
                    { name: '🎮 與用戶互動', type: ActivityType.Playing },
                    { name: '🔍 搜尋歌曲資訊', type: ActivityType.Watching },
                    { name: '🎯 計算 Rating', type: ActivityType.Playing },
                    { name: '🎲 隨機選歌', type: ActivityType.Playing },
                    { name: '📊 maimai 數據分析', type: ActivityType.Watching },
                    { name: '🎪 遊戲與娛樂', type: ActivityType.Playing },
                    { name: '💫 /help 指令', type: ActivityType.Listening }
                ];
                
                // 停止現有的間隔器
                if (interaction.client.statusInterval) {
                    clearInterval(interaction.client.statusInterval);
                }
                
                // 設置初始狀態
                let currentActivityIndex = 0;
                interaction.client.user.setActivity(activities[currentActivityIndex].name, { 
                    type: activities[currentActivityIndex].type 
                });
                
                // 啟動自動切換
                interaction.client.statusInterval = setInterval(() => {
                    currentActivityIndex = (currentActivityIndex + 1) % activities.length;
                    const activity = activities[currentActivityIndex];
                    
                    interaction.client.user.setActivity(activity.name, { type: activity.type });
                }, 30000);
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🔄 自動狀態切換已啟用')
                    .setDescription('機器人狀態將每 30 秒自動切換一次')
                    .addFields({
                        name: '🎯 狀態列表',
                        value: activities.map(a => `• ${a.name}`).join('\n'),
                        inline: false
                    })
                    .setFooter({ 
                        text: `由 ${interaction.user.username} 啟用`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                
                console.log(`🔄 管理員 ${interaction.user.username} 啟用了自動狀態切換`);
                
            } catch (error) {
                console.error('啟用自動狀態時發生錯誤:', error);
                await interaction.reply({
                    content: '❌ Salt 啟用自動狀態時發生錯誤にゃ，請稍後再試にゃ。',
                    ephemeral: true
                });
            }
            
        } else if (subcommand === 'info') {
            const currentPresence = interaction.client.user.presence;
            const currentActivity = currentPresence?.activities?.[0];
            
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📊 機器人狀態資訊')
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(
                    { 
                        name: '🤖 機器人', 
                        value: `${interaction.client.user.tag}`, 
                        inline: true 
                    },
                    { 
                        name: '🟢 線上狀態', 
                        value: currentPresence?.status || '未知', 
                        inline: true 
                    },
                    { 
                        name: '🎯 當前活動', 
                        value: currentActivity ? 
                            `${getActivityTypeName(currentActivity.type)} ${currentActivity.name}` : 
                            '無活動', 
                        inline: false 
                    },
                    { 
                        name: '📊 統計資訊', 
                        value: `• 伺服器數量: ${interaction.client.guilds.cache.size}\n` +
                               `• 用戶數量: ${interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}\n` +
                               `• 指令數量: ${interaction.client.commands.size}`, 
                        inline: false 
                    }
                )
                .setFooter({ 
                    text: `由 ${interaction.user.username} 查詢`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }
    },
};

// 輔助函數：獲取活動類型名稱
function getActivityTypeName(type) {
    switch (type) {
        case ActivityType.Playing: return '🎮 正在玩';
        case ActivityType.Streaming: return '📺 正在直播';
        case ActivityType.Listening: return '🎵 正在聽';
        case ActivityType.Watching: return '📺 正在看';
        case ActivityType.Competing: return '🏆 正在競賽';
        default: return '❓ 未知';
    }
}
