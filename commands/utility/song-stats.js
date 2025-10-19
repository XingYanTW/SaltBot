const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('song-stats')
        .setDescription('Salt 的歌曲統計和管理にゃ')
        .addSubcommand(subcommand =>
            subcommand
                .setName('recent')
                .setDescription('查看最近使用的歌曲統計にゃ')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('清空最近使用歌曲列表（管理員專用）にゃ')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guessRhythmGame = require('../games/guess-rhythm-song.js');
        
        if (subcommand === 'recent') {
            const stats = guessRhythmGame.getRecentSongsStats();
            
            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('🎵 Salt 的歌曲使用統計にゃ')
                .setDescription('Salt 記錄最近使用的歌曲來避免重複にゃ～')
                .addFields(
                    {
                        name: '📊 統計資訊',
                        value: `已記錄歌曲: ${stats.count}/${stats.maxCount}\n系統狀態: ${stats.count < stats.maxCount ? '🟢 正常' : '🟡 已滿'}`,
                        inline: true
                    }
                );
            
            if (stats.count > 0) {
                const recentSongs = stats.songs.slice(-10); // 顯示最新的 10 首
                embed.addFields({
                    name: '🎼 最近使用的歌曲 (最新10首)',
                    value: recentSongs.map((song, index) => `${index + 1}. ${song}`).join('\n') || '無',
                    inline: false
                });
            }
            
            embed.setFooter({ text: 'Salt 說：這個系統幫助避免歌曲重複にゃ～' })
                 .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
        } else if (subcommand === 'clear') {
            // 檢查用戶權限（可選）
            if (!interaction.member.permissions.has('ManageMessages')) {
                return await interaction.reply({
                    content: '❌ Salt 說你沒有權限使用這個功能にゃ！需要「管理訊息」權限にゃ～',
                    ephemeral: true
                });
            }
            
            const statsBeforeClear = guessRhythmGame.getRecentSongsStats();
            guessRhythmGame.clearRecentSongs();
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Salt 說清理完成にゃ！')
                .setDescription('最近使用歌曲列表已清空，現在所有歌曲都可以重新使用了にゃ～')
                .addFields({
                    name: '🧹 清理統計',
                    value: `清理前: ${statsBeforeClear.count} 首歌曲\n清理後: 0 首歌曲`,
                    inline: true
                })
                .setFooter({ text: 'Salt 說：現在歌曲選擇會更多樣化にゃ～' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }
    },
};
