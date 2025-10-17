const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMaimaiSongs, getRandomSong, formatConstant } = require('../../utils/maimaiApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maimai-daily')
        .setDescription('今日 maimai DX 推薦歌曲')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('推薦類型')
                .setRequired(false)
                .addChoices(
                    { name: '🌅 晨練 (簡單)', value: 'morning' },
                    { name: '☀️ 日常 (中等)', value: 'daily' },
                    { name: '🌙 夜戰 (困難)', value: 'night' },
                    { name: '💀 地獄 (最高難度)', value: 'hell' },
                    { name: '🎲 隨機', value: 'random' }
                )),
    async execute(interaction) {
        await interaction.deferReply();
        
        const type = interaction.options.getString('type') || 'daily';
        
        try {
            // 使用日期作為種子確保每日推薦的一致性
            const today = new Date();
            const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
            const seed = hashCode(dateString + type);
            
            const songs = await getMaimaiSongs();
            const recommendation = getDailyRecommendation(songs, type, seed);
        
        const embed = new EmbedBuilder()
            .setColor(getTypeColor(type))
            .setTitle(`${getTypeEmoji(type)} 今日 maimai DX 推薦`)
            .setDescription(`${getTypeDescription(type)}\n今天就來挑戰這首歌吧！`)
            .addFields(
                { name: '🎶 今日推薦', value: `**${recommendation.song.title}**`, inline: false },
                { name: '🎤 藝術家', value: recommendation.song.artist, inline: true },
                { name: '📂 類型', value: `${getGenreEmoji(recommendation.song.genre)} ${getGenreName(recommendation.song.genre)}`, inline: true },
                { name: '🎯 BPM', value: `${recommendation.song.bpm}`, inline: true },
                { name: '📊 推薦譜面', value: `${getDifficultyEmoji(recommendation.chart.difficulty)} ${recommendation.chart.difficulty.toUpperCase()} ${recommendation.chart.level}`, inline: true },
                { name: '🎵 定數', value: recommendation.chart.constant !== null ? formatConstant(recommendation.chart.constant) : '未知', inline: true },
                { name: '💎 Note數', value: `${recommendation.chart.notes}`, inline: true }
            )
            .setFooter({ 
                text: `每日推薦 | ${today.toLocaleDateString('zh-TW')} | 由 ${interaction.user.username} 請求`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        // 設定推薦歌曲的封面圖片
        if (recommendation.song.imageUrl) {
            // 檢查是否為完整 URL，如果不是則構建完整 URL
            let imageUrl = recommendation.song.imageUrl;
            if (!imageUrl.startsWith('http')) {
                imageUrl = `https://otoge-db.net/maimai/jacket/${imageUrl}`;
            }
            
            try {
                embed.setThumbnail(imageUrl);
            } catch (error) {
                console.warn('無法設定歌曲圖片:', imageUrl, error.message);
            }
        }
        
        // 顯示所有譜面 - 分開 STD 和 DX
        const stdCharts = recommendation.song.charts.filter(chart => !chart.difficulty.startsWith('dx_'));
        const dxCharts = recommendation.song.charts.filter(chart => chart.difficulty.startsWith('dx_'));
        
        let allChartsDisplay = '';
        
        if (stdCharts.length > 0) {
            allChartsDisplay += '**STD:**\n';
            allChartsDisplay += stdCharts.map(chart => 
                `${getDifficultyEmoji(chart.difficulty)} ${chart.difficulty.toUpperCase()} ${chart.level}${chart.constant !== null ? ` (${formatConstant(chart.constant)})` : ''}`
            ).join('\n');
        }
        
        if (dxCharts.length > 0) {
            if (allChartsDisplay) allChartsDisplay += '\n\n';
            allChartsDisplay += '**DX:**\n';
            allChartsDisplay += dxCharts.map(chart => 
                `${getDifficultyEmoji(chart.difficulty.replace('dx_', ''))} ${chart.difficulty.replace('dx_', '').toUpperCase()} ${chart.level}${chart.constant !== null ? ` (${formatConstant(chart.constant)})` : ''}`
            ).join('\n');
        }
        
        embed.addFields({ 
            name: '📋 所有譜面', 
            value: allChartsDisplay || '無譜面資料', 
            inline: false 
        });
        
        // 添加每日挑戰
        const challenge = getDailyChallenge(recommendation.chart, seed);
        embed.addFields({
            name: '🏆 今日挑戰',
            value: challenge,
            inline: false
        });
        
        // 添加練習建議
        embed.addFields({
            name: '💡 練習建議',
            value: getPracticeTip(recommendation.chart, type),
            inline: false
        });
        
        // 添加其他用戶也可以看到相同推薦的提示
        embed.addFields({
            name: '🌟 特別提醒',
            value: '所有人今天看到的推薦都是一樣的喔！快去和朋友一起挑戰吧！',
            inline: false
        });
        
        await interaction.editReply({ embeds: [embed] });
        
        } catch (error) {
            console.error('獲取 maimai 每日推薦時發生錯誤:', error);
            await interaction.editReply({
                content: '❌ 獲取每日推薦時發生錯誤，請稍後再試。'
            });
        }
    },
};

// 簡單的字串雜湊函數
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 轉換為32位元整數
    }
    return Math.abs(hash);
}

function getDailyRecommendation(songs, type, seed) {
    let filteredSongs = [...songs];
    let levelFilter = null;
    
    // 根據類型篩選歌曲
    switch (type) {
        case 'morning':
            levelFilter = chart => chart.level >= 1 && chart.level <= 7;
            break;
        case 'daily':
            levelFilter = chart => chart.level >= 6 && chart.level <= 11;
            break;
        case 'night':
            levelFilter = chart => chart.level >= 10 && chart.level <= 13;
            break;
        case 'hell':
            levelFilter = chart => chart.level >= 13;
            break;
        case 'random':
        default:
            levelFilter = () => true;
            break;
    }
    
    // 篩選有符合條件譜面的歌曲
    filteredSongs = filteredSongs.filter(song => 
        song.charts.some(levelFilter)
    );
    
    // 使用種子選擇歌曲
    const songIndex = seed % filteredSongs.length;
    const selectedSong = filteredSongs[songIndex];
    
    // 選擇符合條件的譜面
    const validCharts = selectedSong.charts.filter(levelFilter);
    const chartIndex = Math.floor(seed / filteredSongs.length) % validCharts.length;
    const selectedChart = validCharts[chartIndex];
    
    return {
        song: selectedSong,
        chart: selectedChart
    };
}

function getTypeColor(type) {
    const colors = {
        morning: 0xFFE4B5,  // 淺橙色
        daily: 0x87CEEB,    // 天藍色
        night: 0x4B0082,    // 深紫色
        hell: 0xFF0000,     // 紅色
        random: 0xFF69B4    // 粉色
    };
    return colors[type] || 0x00BFFF;
}

function getTypeEmoji(type) {
    const emojis = {
        morning: '🌅',
        daily: '☀️',
        night: '🌙',
        hell: '💀',
        random: '🎲'
    };
    return emojis[type] || '🎵';
}

function getTypeDescription(type) {
    const descriptions = {
        morning: '早晨時光，來點輕鬆的暖身運動！',
        daily: '日常練習，保持手感的好選擇！',
        night: '夜深人靜，挑戰困難譜面的時刻！',
        hell: '地獄模式，只有真正的大師才能征服！',
        random: '隨機推薦，命運選擇的歌曲！'
    };
    return descriptions[type] || '今日推薦歌曲';
}

function getDailyChallenge(chart, seed) {
    const challenges = [
        `🎯 目標：達成 ${95 + (seed % 5)}% 以上的準確率`,
        `⚡ 挑戰：不使用技能道具完成`,
        `🏃 速度：以 ${0.5 + (seed % 4) * 0.5}x 倍速完成`,
        `💎 完美：嘗試取得全 Perfect`,
        `🔥 連擊：保持 300+ 連擊`,
        `⭐ 評級：目標達成 S 以上評級`,
        `🎪 風格：使用不同的按鍵風格遊玩`,
        `👥 合作：和朋友一起遊玩並比較成績`
    ];
    
    return challenges[seed % challenges.length];
}

function getPracticeTip(chart, type) {
    const baseTips = [
        '先聽一遍音樂熟悉節奏',
        '從較低難度開始練習',
        '注意手部姿勢和放鬆',
        '專注於準確度而非速度',
        '定期休息避免疲勞'
    ];
    
    const levelTips = {
        morning: '適合練習基本技巧和手感',
        daily: '可以專注於提升準確度',
        night: '需要高度集中注意力',
        hell: '建議分段練習困難部分',
        random: '保持開放心態，享受音樂'
    };
    
    const tipIndex = chart.level % baseTips.length;
    return `${baseTips[tipIndex]}\n💡 ${levelTips[type] || '享受遊戲過程！'}`;
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

function getGenreName(genre) {
    const names = {
        pops: 'POPS & ANIME',
        niconico: 'niconico & VOCALOID',
        touhou: '東方Project',
        game: 'GAME & VARIETY',
        maimai: 'maimai',
        ongeki: 'オンゲキ',
        chunithm: 'CHUNITHM'
    };
    return names[genre] || genre;
}
