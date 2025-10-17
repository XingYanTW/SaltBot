const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('瞭解 Salt 的詳細資訊にゃ'),
    async execute(interaction) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🐾 Salt 的自我介紹にゃ')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: '我的名字にゃ', value: interaction.client.user.tag, inline: true },
                { name: '我的身份證號にゃ', value: interaction.client.user.id, inline: true },
                { name: '已經工作了にゃ', value: `${hours}小時 ${minutes}分鐘 ${seconds}秒`, inline: true },
                { name: '服務的地方にゃ', value: `${interaction.client.guilds.cache.size} 個`, inline: true },
                { name: '認識的朋友にゃ', value: `${interaction.client.users.cache.size} 個`, inline: true },
                { name: 'Discord.js 版本', value: require('discord.js').version, inline: true },
                { name: 'Node.js 版本', value: process.version, inline: true },
                { name: '腦袋使用量にゃ', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: '我是在咖啡牛奶店工作的 Salt にゃ 🍞' });

        await interaction.reply({ embeds: [embed] });
    },
};
