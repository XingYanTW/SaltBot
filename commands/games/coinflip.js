const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('和 Salt 一起翻硬幣決定命運にゃ')
        .addStringOption(option =>
            option.setName('guess')
                .setDescription('你覺得會是哪一面呢にゃ？')
                .setRequired(false)
                .addChoices(
                    { name: '正面 (頭)', value: 'heads' },
                    { name: '反面 (尾)', value: 'tails' }
                ))
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('翻硬幣次數にゃ (1-10次)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)),
    async execute(interaction) {
        const userGuess = interaction.options.getString('guess');
        const count = interaction.options.getInteger('count') || 1;
        
        const results = [];
        let headsCount = 0;
        let tailsCount = 0;
        
        // 翻硬幣
        for (let i = 0; i < count; i++) {
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            results.push(result);
            if (result === 'heads') headsCount++;
            else tailsCount++;
        }
        
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🪙 翻硬幣結果')
            .setDescription(getCoinAnimation(count));
        
        if (count === 1) {
            // 單次翻硬幣
            const result = results[0];
            const resultEmoji = result === 'heads' ? '👑' : '🌟';
            const resultText = result === 'heads' ? '正面 (頭)' : '反面 (尾)';
            
            embed.addFields({
                name: '🎯 結果',
                value: `${resultEmoji} **${resultText}**`,
                inline: true
            });
            
            if (userGuess) {
                const isCorrect = userGuess === result;
                embed.addFields(
                    {
                        name: '🔮 你的猜測',
                        value: userGuess === 'heads' ? '👑 正面' : '🌟 反面',
                        inline: true
                    },
                    {
                        name: '📊 結果',
                        value: isCorrect ? '🎉 猜對了！' : '😅 猜錯了！',
                        inline: true
                    }
                );
                
                embed.setColor(isCorrect ? 0x00FF00 : 0xFF6B6B);
            }
            
            // 添加趣味元素
            embed.addFields({
                name: '🎭 趣味',
                value: getFunFact(),
                inline: false
            });
            
        } else {
            // 多次翻硬幣
            const resultString = results.map((result, index) => 
                `${index + 1}: ${result === 'heads' ? '👑' : '🌟'}`
            ).join(' ');
            
            embed.addFields(
                {
                    name: `🎯 ${count} 次結果`,
                    value: resultString,
                    inline: false
                },
                {
                    name: '📊 統計',
                    value: `👑 正面: **${headsCount}** 次 (${(headsCount/count*100).toFixed(1)}%)\n🌟 反面: **${tailsCount}** 次 (${(tailsCount/count*100).toFixed(1)}%)`,
                    inline: true
                }
            );
            
            // 檢查特殊模式
            const specialPattern = checkSpecialPattern(results);
            if (specialPattern) {
                embed.addFields({
                    name: '✨ 特殊模式',
                    value: specialPattern,
                    inline: false
                });
            }
            
            // 如果有猜測，計算準確率
            if (userGuess) {
                const correctGuesses = results.filter(result => result === userGuess).length;
                const accuracy = (correctGuesses / count * 100).toFixed(1);
                
                embed.addFields({
                    name: '🔮 猜測準確率',
                    value: `${correctGuesses}/${count} (${accuracy}%)`,
                    inline: true
                });
            }
        }
        
        embed.setFooter({ 
            text: `由 ${interaction.user.username} 翻擲`, 
            iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
};

function getCoinAnimation(count) {
    const animations = [
        '🪙 *硬幣在空中旋轉...*',
        '🪙 *硬幣高高拋起...*',
        '🪙 *命運之幣翻滾中...*',
        '🪙 *硬幣即將落地...*'
    ];
    
    if (count > 1) {
        return `🪙 *${count} 枚硬幣同時拋起...*`;
    }
    
    return animations[Math.floor(Math.random() * animations.length)];
}

function getFunFact() {
    const facts = [
        '硬幣翻面的機率理論上是 50%',
        '世界上第一枚硬幣出現在公元前 7 世紀',
        '有些人可以用技巧影響硬幣翻面的結果',
        '在某些文化中，硬幣被認為帶有神奇力量',
        '翻硬幣是解決二選一問題的經典方法',
        '據說愛因斯坦不相信隨機性，但硬幣翻面確實是隨機的',
        '有研究顯示硬幣可能有微小的偏向性',
        '古羅馬人用"heads or ships"來決定事情'
    ];
    
    return facts[Math.floor(Math.random() * facts.length)];
}

function checkSpecialPattern(results) {
    const resultString = results.join('');
    
    // 全部相同
    if (results.every(r => r === results[0])) {
        const type = results[0] === 'heads' ? '正面' : '反面';
        return `🎊 全部都是${type}！機率只有 ${(Math.pow(0.5, results.length) * 100).toFixed(2)}%`;
    }
    
    // 完美交替
    let isAlternating = true;
    for (let i = 1; i < results.length; i++) {
        if (results[i] === results[i-1]) {
            isAlternating = false;
            break;
        }
    }
    
    if (isAlternating && results.length > 2) {
        return '🎨 完美交替模式！非常罕見！';
    }
    
    // 檢查連續
    let maxStreak = 1;
    let currentStreak = 1;
    let streakType = results[0];
    
    for (let i = 1; i < results.length; i++) {
        if (results[i] === results[i-1]) {
            currentStreak++;
        } else {
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
                streakType = results[i-1];
            }
            currentStreak = 1;
        }
    }
    
    if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        streakType = results[results.length - 1];
    }
    
    if (maxStreak >= 4) {
        const type = streakType === 'heads' ? '正面' : '反面';
        return `🔥 ${type}連續 ${maxStreak} 次！超級幸運！`;
    }
    
    return null;
}
