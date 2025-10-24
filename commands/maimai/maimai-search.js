const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationIntegrationType, InteractionContextType } = require('discord.js');
const { getMaimaiSongs, searchSongs, formatConstant } = require('../../utils/maimaiApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maimai-search')
        .setDescription('Salt 幫你找 maimai DX 歌曲にゃ')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('想找什麼歌曲呢にゃ？(歌名或藝術家)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('search_type')
                .setDescription('要怎麼搜尋呢にゃ？')
                .setRequired(false)
                .addChoices(
                    { name: '🎵 歌曲名稱', value: 'title' },
                    { name: '🎤 藝術家', value: 'artist' },
                    { name: '🔍 全部', value: 'all' }
                ))
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
        .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]),
    async execute(interaction) {
        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        const searchType = interaction.options.getString('search_type') || 'all';
        
        try {
            // 從真實 API 獲取歌曲資料
            const songs = await getMaimaiSongs();
            
            // 搜尋歌曲
            const results = searchSongs(songs, query, searchType);
            
            if (results.length === 0) {
                return await interaction.editReply({
                    content: `❌ 找不到包含 "${query}" 的歌曲にゃ！\n💡 Salt 的建議：試試用部分關鍵字或檢查一下拼寫にゃ～`
                });
            }
            
            // 限制結果數量
            const maxResults = 5;
            const limitedResults = results.slice(0, maxResults);
            
            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle(`🔍 Salt 幫你找到了這些歌曲にゃ`)
                .setDescription(`搜尋關鍵字：**${query}**\n找到 ${results.length} 首歌曲${results.length > maxResults ? `（顯示前 ${maxResults} 首）` : ''}にゃ\n\n點下面的按鈕看詳細資料にゃ～`)
                .setFooter({ 
                    text: `${interaction.user.username} 的搜尋結果にゃ 🐾`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            // 為每首歌曲添加簡要資訊
            limitedResults.forEach((song, index) => {
                // 分開 STD 和 DX 譜面
                const stdCharts = song.charts.filter(chart => !chart.difficulty.startsWith('dx_'));
                const dxCharts = song.charts.filter(chart => chart.difficulty.startsWith('dx_'));
                
                let chartInfo = '';
                
                if (stdCharts.length > 0) {
                    const stdChartsText = stdCharts.map(chart => 
                        `${getDifficultyEmoji(chart.difficulty)} ${chart.level}`
                    ).join(' ');
                    chartInfo += `**STD:** ${stdChartsText}`;
                }
                
                if (dxCharts.length > 0) {
                    const dxChartsText = dxCharts.map(chart => 
                        `${getDifficultyEmoji(chart.difficulty.replace('dx_', ''))} ${chart.level}`
                    ).join(' ');
                    if (chartInfo) chartInfo += ' | ';
                    chartInfo += `**DX:** ${dxChartsText}`;
                }
                
                embed.addFields({
                    name: `${index + 1}. ${song.title}`,
                    value: `🎤 ${song.artist} | 📂 ${song.genreName} | 🎯 ${song.bpm} BPM\n${chartInfo || '無譜面資料'}`,
                    inline: false
                });
                
                // 為第一首歌曲設定縮圖
                if (index === 0 && song.imageUrl) {
                    let imageUrl = song.imageUrl;
                    if (!imageUrl.startsWith('http')) {
                        imageUrl = `https://otoge-db.net/maimai/jacket/${imageUrl}`;
                    }
                    
                    try {
                        embed.setThumbnail(imageUrl);
                    } catch (error) {
                        console.warn('無法設定歌曲圖片:', imageUrl, error.message);
                    }
                }
            });
            
            // 創建按鈕
            const buttons = [];
            limitedResults.forEach((song, index) => {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`song_detail_${index}`)
                        .setLabel(`${index + 1}. ${song.title.length > 15 ? song.title.substring(0, 15) + '...' : song.title}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎵')
                );
            });
            
            // 將按鈕分組（每行最多5個）
            const actionRows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
                actionRows.push(row);
            }
            
            if (results.length > maxResults) {
                embed.addFields({
                    name: '📝 注意',
                    value: `還有 ${results.length - maxResults} 首歌曲未顯示。請使用更具體的搜尋關鍵字來縮小範圍。`,
                    inline: false
                });
            }
            
            const response = await interaction.editReply({ 
                embeds: [embed], 
                components: actionRows 
            });
            
            // 創建按鈕互動收集器
            const collector = response.createMessageComponentCollector({
                time: 300000 // 5分鐘
            });
            
            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return await buttonInteraction.reply({
                        content: '❌ 只有發起搜尋的使用者可以點擊按鈕！',
                        ephemeral: true
                    });
                }
                
                const songIndex = parseInt(buttonInteraction.customId.split('_')[2]);
                const selectedSong = limitedResults[songIndex];
                
                if (!selectedSong) {
                    return await buttonInteraction.reply({
                        content: '❌ 找不到選中的歌曲！',
                        ephemeral: true
                    });
                }
                
                // 創建詳細資訊 embed
                const detailEmbed = await createDetailedSongEmbed(selectedSong, buttonInteraction.user);
                
                await buttonInteraction.reply({
                    embeds: [detailEmbed],
                    ephemeral: false
                });
            });
            
            collector.on('end', async () => {
                // 禁用所有按鈕
                const disabledRows = actionRows.map(row => {
                    const newRow = new ActionRowBuilder();
                    row.components.forEach(button => {
                        newRow.addComponents(
                            ButtonBuilder.from(button).setDisabled(true)
                        );
                    });
                    return newRow;
                });
                
                try {
                    await interaction.editReply({ 
                        embeds: [embed], 
                        components: disabledRows 
                    });
                } catch (error) {
                    // 如果編輯失敗，忽略錯誤（可能是訊息已被刪除）
                }
            });
            
        } catch (error) {
            console.error('搜尋 maimai 歌曲時發生錯誤:', error);
            await interaction.editReply({
                content: '❌ 搜尋歌曲時發生錯誤，請稍後再試。'
            });
        }
    },
};

// 創建詳細歌曲資訊 embed
async function createDetailedSongEmbed(song, user) {
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
            text: `由 ${user.username} 查詢`, 
            iconURL: user.displayAvatarURL() 
        })
        .setTimestamp();
    
    // 設定歌曲封面圖片為大圖
    if (song.imageUrl) {
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
    
    // 添加相關指令提示
    embed.addFields({
        name: '💡 相關指令',
        value: '• `/maimai-rating` - 計算 Rating\n' +
               '• `/maimai-random` - 隨機選歌\n' +
               '• `/maimai-daily` - 每日推薦',
        inline: false
    });
    
    // 如果有 Wiki 連結，添加到描述中
    if (song.wikiUrl) {
        embed.setDescription(`🎤 **${song.artist}**\n[📖 查看 Wiki](${song.wikiUrl})`);
    }
    
    return embed;
}

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
