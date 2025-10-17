const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maimai-rating')
        .setDescription('Salt 幫你算 maimai DX Rating にゃ')
        .addNumberOption(option =>
            option.setName('constant')
                .setDescription('譜面定數是多少呢にゃ？')
                .setRequired(true)
                .setMinValue(1.0)
                .setMaxValue(15.0))
        .addNumberOption(option =>
            option.setName('achievement')
                .setDescription('達成率多少呢にゃ？(%)')
                .setRequired(true)
                .setMinValue(0.0)
                .setMaxValue(101.0000))
        .addBooleanOption(option =>
            option.setName('dx')
                .setDescription('是 DX 譜面嗎にゃ？')
                .setRequired(false)),
    async execute(interaction) {
        const constant = interaction.options.getNumber('constant');
        const achievement = interaction.options.getNumber('achievement');
        const isDX = interaction.options.getBoolean('dx') || false;
        
        // 計算 Rating
        const rating = calculateRating(constant, achievement, isDX);
        const rank = getRank(achievement);
        const rankColor = getRankColor(rank);
        
        const embed = new EmbedBuilder()
            .setColor(rankColor)
            .setTitle('📊 Salt 的 Rating 計算結果にゃ')
            .setDescription(`你的成績看起來不錯にゃ～`)
            .addFields(
                { name: '🎵 譜面定數', value: `${constant}`, inline: true },
                { name: '📈 達成率', value: `${achievement.toFixed(4)}%`, inline: true },
                { name: '📱 譜面類型', value: isDX ? '🌟 DX 譜面' : '📀 Standard 譜面', inline: true },
                { name: '🏆 評級', value: `${getRankEmoji(rank)} ${rank}`, inline: true },
                { name: '⭐ Rating', value: `**${rating.toFixed(0)}**`, inline: true },
                { name: '📊 精確 Rating', value: `${rating.toFixed(6)}`, inline: true }
            )
            .setFooter({ 
                text: `由 ${interaction.user.username} 計算`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        // 添加評級說明
        embed.addFields({
            name: '💡 評級說明',
            value: getRankDescription(rank),
            inline: false
        });
        
        // 添加Rating提升建議
        const improvementTip = getImprovementTip(achievement, constant, rating);
        if (improvementTip) {
            embed.addFields({
                name: '🎯 Salt 的提升建議にゃ',
                value: improvementTip,
                inline: false
            });
        }
        
        // 顯示達成率區間的Rating變化
        const ratingRange = getRatingRange(constant, isDX);
        embed.addFields({
            name: '📈 Rating 參考區間にゃ',
            value: ratingRange,
            inline: false
        });
        
        await interaction.reply({ embeds: [embed] });
    },
};

function calculateRating(constant, achievement, isDX) {
    let rating = 0;
    
    if (achievement >= 100.5) {
        // SSS+
        rating = constant * 22.4;
    } else if (achievement >= 100.0) {
        // SSS
        rating = constant * (21.6 + (achievement - 100.0) * 1.6);
    } else if (achievement >= 99.5) {
        // SS+
        rating = constant * (21.1 + (achievement - 99.5) * 1.0);
    } else if (achievement >= 99.0) {
        // SS
        rating = constant * (20.3 + (achievement - 99.0) * 1.6);
    } else if (achievement >= 98.0) {
        // S+
        rating = constant * (20.0 + (achievement - 98.0) * 0.3);
    } else if (achievement >= 97.0) {
        // S
        rating = constant * (17.0 + (achievement - 97.0) * 3.0);
    } else if (achievement >= 94.0) {
        // A
        rating = constant * (13.5 + (achievement - 94.0) * 1.166667);
    } else if (achievement >= 90.0) {
        // BBB
        rating = constant * (12.0 + (achievement - 90.0) * 0.375);
    } else if (achievement >= 85.0) {
        // BB
        rating = constant * (11.5 + (achievement - 85.0) * 0.1);
    } else if (achievement >= 80.0) {
        // B
        rating = constant * (10.5 + (achievement - 80.0) * 0.2);
    } else if (achievement >= 75.0) {
        // C
        rating = constant * (10.0 + (achievement - 75.0) * 0.1);
    } else if (achievement >= 70.0) {
        // D
        rating = constant * (8.5 + (achievement - 70.0) * 0.3);
    } else if (achievement >= 60.0) {
        // E
        rating = constant * (6.0 + (achievement - 60.0) * 0.25);
    } else {
        // F
        rating = constant * Math.max(0, achievement * 0.1);
    }
    
    // DX 譜面有加成
    if (isDX) {
        rating *= 1.0;  // 實際上DX譜面沒有額外加成，這裡保持原值
    }
    
    return Math.max(0, rating);
}

function getRank(achievement) {
    if (achievement >= 100.5) return 'SSS+';
    if (achievement >= 100.0) return 'SSS';
    if (achievement >= 99.5) return 'SS+';
    if (achievement >= 99.0) return 'SS';
    if (achievement >= 98.0) return 'S+';
    if (achievement >= 97.0) return 'S';
    if (achievement >= 94.0) return 'A';
    if (achievement >= 90.0) return 'BBB';
    if (achievement >= 85.0) return 'BB';
    if (achievement >= 80.0) return 'B';
    if (achievement >= 75.0) return 'C';
    if (achievement >= 70.0) return 'D';
    if (achievement >= 60.0) return 'E';
    return 'F';
}

function getRankColor(rank) {
    const colors = {
        'SSS+': 0xFFD700,  // 金色
        'SSS': 0xFFD700,   // 金色
        'SS+': 0xC0C0C0,   // 銀色
        'SS': 0xC0C0C0,    // 銀色
        'S+': 0xCD7F32,    // 青銅色
        'S': 0xCD7F32,     // 青銅色
        'A': 0x90EE90,     // 淺綠色
        'BBB': 0x87CEEB,   // 天藍色
        'BB': 0x87CEEB,    // 天藍色
        'B': 0x87CEEB,     // 天藍色
        'C': 0xDDA0DD,     // 紫色
        'D': 0xDDA0DD,     // 紫色
        'E': 0xFF6347,     // 橙紅色
        'F': 0x696969      // 灰色
    };
    return colors[rank] || 0x808080;
}

function getRankEmoji(rank) {
    const emojis = {
        'SSS+': '🌟',
        'SSS': '⭐',
        'SS+': '💎',
        'SS': '💍',
        'S+': '🏆',
        'S': '🥇',
        'A': '🥈',
        'BBB': '🥉',
        'BB': '🎖️',
        'B': '🏅',
        'C': '📜',
        'D': '📄',
        'E': '📋',
        'F': '❌'
    };
    return emojis[rank] || '❓';
}

function getRankDescription(rank) {
    const descriptions = {
        'SSS+': 'Salt 說：完美！超越人類極限的演奏にゃ！',
        'SSS': 'Salt 說：完美演奏！你就是maimai大師にゃ！',
        'SS+': 'Salt 說：優秀！幾乎完美的演奏にゃ！',
        'SS': 'Salt 說：優秀！非常出色的表現にゃ！',
        'S+': 'Salt 說：很好！技術純熟的演奏にゃ！',
        'S': 'Salt 說：很好！穩定的技術展現にゃ！',
        'A': 'Salt 說：不錯！繼續努力提升にゃ！',
        'BBB': 'Salt 說：普通，還有進步空間にゃ',
        'BB': 'Salt 說：普通，需要更多練習にゃ',
        'B': 'Salt 說：普通，基礎需要加強にゃ',
        'C': 'Salt 說：需要改進，多加練習にゃ',
        'D': 'Salt 說：需要改進，回去練習基礎にゃ',
        'E': 'Salt 說：需要大量練習にゃ',
        'F': 'Salt 說：重新開始學習吧にゃ'
    };
    return descriptions[rank] || 'Salt 說：未知評級にゃ';
}

function getImprovementTip(achievement, constant, currentRating) {
    if (achievement >= 100.5) {
        return null; // 已經是最高評級
    }
    
    const nextMilestone = getNextMilestone(achievement);
    const nextRating = calculateRating(constant, nextMilestone, false);
    const improvement = nextRating - currentRating;
    
    return `達到 ${nextMilestone}% 可獲得 **+${improvement.toFixed(0)}** Rating (${getRank(nextMilestone)} 評級)`;
}

function getNextMilestone(achievement) {
    const milestones = [60, 70, 75, 80, 85, 90, 94, 97, 98, 99, 99.5, 100, 100.5];
    return milestones.find(milestone => milestone > achievement) || 100.5;
}

function getRatingRange(constant, isDX) {
    const ranges = [
        { achievement: 97.0, rank: 'S' },
        { achievement: 98.0, rank: 'S+' },
        { achievement: 99.0, rank: 'SS' },
        { achievement: 99.5, rank: 'SS+' },
        { achievement: 100.0, rank: 'SSS' },
        { achievement: 100.5, rank: 'SSS+' }
    ];
    
    return ranges.map(range => {
        const rating = calculateRating(constant, range.achievement, isDX);
        return `${getRankEmoji(range.rank)} ${range.rank} (${range.achievement}%): **${rating.toFixed(0)}**`;
    }).join('\n');
}
