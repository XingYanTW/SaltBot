const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Salt 來幫你介紹所有指令にゃ'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🐾 Salt 的幫助指南にゃ')
            .setDescription('我是 Salt！以下是我會的所有技能にゃ～')
            .addFields(
                { 
                    name: '📊 **基本功能にゃ**', 
                    value: '`/ping` - 檢查我的反應速度にゃ\n' +
                           '`/help` - 顯示這個幫助說明にゃ\n' +
                           '`/info` - 告訴你我的詳細資訊にゃ', 
                    inline: false 
                },
                { 
                    name: '🛠️ **實用小幫手にゃ**', 
                    value: '`/user` - 查看用戶的詳細資料にゃ\n' +
                           '`/server` - 介紹這個伺服器的情況にゃ\n' +
                           '`/avatar` - 顯示美美的頭像にゃ', 
                    inline: false 
                },
                { 
                    name: '🛡️ **管理小助手にゃ**', 
                    value: '`/kick` - 請不乖的成員離開にゃ\n' +
                           '`/ban` - 封鎖惡意用戶にゃ\n' +
                           '`/unban` - 給人重新機會にゃ\n' +
                           '`/timeout` - 讓人冷靜一下にゃ\n' +
                           '`/untimeout` - 解除冷靜時間にゃ\n' +
                           '`/clear` - 清理頻道訊息にゃ', 
                    inline: false 
                },
                { 
                    name: '🎮 **一起玩遊戲にゃ**', 
                    value: '`/guess` - 猜數字小遊戲にゃ\n' +
                           '`/rps` - 石頭剪刀布對戰にゃ\n' +
                           '`/dice` - 幸運骰子遊戲にゃ\n' +
                           '`/8ball` - 神奇8號球占卜にゃ\n' +
                           '`/coinflip` - 硬幣決定命運にゃ\n' +
                           '`/guessnum` - 提交你的猜測にゃ', 
                    inline: false 
                },
                { 
                    name: '🎵 **maimai DX 專區にゃ**', 
                    value: '`/maimai-random` - 隨機推薦好歌にゃ\n' +
                           '`/maimai-search` - 幫你找歌曲にゃ\n' +
                           '`/maimai-rating` - 計算你的Rating にゃ\n' +
                           '`/maimai-daily` - 每日精選推薦にゃ\n' +
                           '`/maimai-info` - maimai 小知識にゃ', 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Salt - 總共學會了23個技能にゃ 🐾', iconURL: interaction.client.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};
