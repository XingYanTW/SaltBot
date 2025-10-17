const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMaimaiSongs, searchSongs, formatConstant } = require('../../utils/maimaiApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maimai-song')
        .setDescription('顯示 maimai DX 歌曲詳細資訊')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('歌曲名稱或藝術家')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        
        try {
            // 從真實 API 獲取歌曲資料
            const songs = await getMaimaiSongs();
            
            // 搜尋歌曲
            const results = searchSongs(songs, query, 'all');
            
            if (results.length === 0) {
                return await interaction.editReply({
                    content: `❌ 找不到包含 "${query}" 的歌曲！\n💡 提示：請嘗試使用部分關鍵字或檢查拼寫。`
                });
            }
            
            // 取第一個搜尋結果
            const song = results[0];
            
            const embed = new EmbedBuilder()
                .setColor(0x00CED1)
                .setTitle(`🎵 ${song.title}`)
                .setDescription(`🎤 **${song.artist}**`)
                .addFields(
                    { name: '📂 類型', value: `${getGenreEmoji(song.genre)} ${song.genreName}`, inline: true },
                    { name: '🎯 BPM', value: song.bpm.toString(), inline: true },
                    { name: '📅 版本', value: song.version || '未知', inline: true }
                )
                .setFooter({ 
                    text: `由 ${interaction.user.username} 查詢`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            // 設定歌曲封面圖片為大圖
            if (song.imageUrl) {
                // 檢查是否為完整 URL，如果不是則構建完整 URL
                let imageUrl = song.imageUrl;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = `https://otoge-db.net/maimai/jacket/${imageUrl}`;
                }
                
                try {
                    embed.setImage(imageUrl);
                } catch (error) {
                    console.warn('無法設定歌曲圖片:', imageUrl, error.message);
                }
            }
            
            // 添加詳細譜面資訊 - 分開 STD 和 DX
            const stdCharts = song.charts.filter(chart => !chart.difficulty.startsWith('dx_'));
            const dxCharts = song.charts.filter(chart => chart.difficulty.startsWith('dx_'));
            
            let chartDetails = '';
            
            if (stdCharts.length > 0) {
                chartDetails += '**STD 譜面:**\n';
                chartDetails += stdCharts.map(chart => {
                    let info = `${getDifficultyEmoji(chart.difficulty)} **${chart.difficulty.toUpperCase()}** Lv.${chart.level}`;
                    if (chart.constant !== null) info += ` (定數: ${formatConstant(chart.constant)})`;
                    if (chart.notes) info += ` - ${chart.notes} Notes`;
                    return info;
                }).join('\n');
            }
            
            if (dxCharts.length > 0) {
                if (chartDetails) chartDetails += '\n\n';
                chartDetails += '**DX 譜面:**\n';
                chartDetails += dxCharts.map(chart => {
                    let info = `${getDifficultyEmoji(chart.difficulty.replace('dx_', ''))} **${chart.difficulty.replace('dx_', '').toUpperCase()}** Lv.${chart.level}`;
                    if (chart.constant !== null) info += ` (定數: ${formatConstant(chart.constant)})`;
                    if (chart.notes) info += ` - ${chart.notes} Notes`;
                    return info;
                }).join('\n');
            }
            
            embed.addFields({
                name: '📊 譜面詳情',
                value: chartDetails || '無譜面資料',
                inline: false
            });
            
            // 如果有多個搜尋結果，顯示提示
            if (results.length > 1) {
                embed.addFields({
                    name: '🔍 其他搜尋結果',
                    value: `找到 ${results.length} 首歌曲，顯示第一首。其他結果：\n` +
                           results.slice(1, 4).map((s, i) => `${i + 2}. ${s.title} - ${s.artist}`).join('\n') +
                           (results.length > 4 ? `\n還有 ${results.length - 4} 首...` : ''),
                    inline: false
                });
            }
            
            // 添加相關指令提示
            embed.addFields({
                name: '💡 相關指令',
                value: '• `/maimai-rating` - 計算 Rating\n' +
                       '• `/maimai-search` - 搜尋更多歌曲\n' +
                       '• `/maimai-random` - 隨機選歌',
                inline: false
            });
            
            // 如果有 Wiki 連結，添加到描述中
            if (song.wikiUrl) {
                embed.setDescription(`🎤 **${song.artist}**\n[📖 查看 Wiki](${song.wikiUrl})`);
            }
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('查詢 maimai 歌曲詳情時發生錯誤:', error);
            await interaction.editReply({
                content: '❌ 查詢歌曲詳情時發生錯誤，請稍後再試。'
            });
        }
    },
};

function getDifficultyEmoji(difficulty) {
    const emojis = {
        basic: '🟢',
        advanced: '🟡',
        expert: '🔴',
        master: '🟣',
        remaster: '⚪',
        dx_basic: '🟢',
        dx_advanced: '🟡',
        dx_expert: '🔴',
        dx_master: '🟣',
        dx_remaster: '⚪'
    };
    return emojis[difficulty] || '⚫';
}

function getGenreEmoji(genre) {
    const emojis = {
        pops: '🎵',
        niconico: '🎮',
        touhou: '🎯',
        game: '🎪',
        maimai: '🎼',
        ongeki: '🌟',
        chunithm: '💫',
        other: '🎵'
    };
    return emojis[genre] || '🎵';
}
