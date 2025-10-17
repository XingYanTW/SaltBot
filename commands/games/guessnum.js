const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guessnum')
        .setDescription('向 Salt 提交你的猜測にゃ')
        .addStringOption(option =>
            option.setName('gameid')
                .setDescription('遊戲ID にゃ')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('你猜測的數字にゃ')
                .setMinValue(1)
                .setRequired(true)),
    async execute(interaction) {
        const gameId = interaction.options.getString('gameid');
        const guessedNumber = interaction.options.getInteger('number');
        
        // 從 guess.js 獲取活躍遊戲
        const guessCommand = require('./guess.js');
        const activeGames = guessCommand.getActiveGames();
        
        const game = activeGames.get(gameId);
        
        if (!game) {
            return await interaction.reply({
                content: '❌ 找不到這個遊戲 ID 或遊戲已經結束了にゃ！',
                ephemeral: true
            });
        }
        
        if (game.userId !== interaction.user.id) {
            return await interaction.reply({
                content: '❌ 這不是你的遊戲にゃ！',
                ephemeral: true
            });
        }
        
        if (guessedNumber < 1 || guessedNumber > game.range) {
            return await interaction.reply({
                content: `❌ 請輸入 1 到 ${game.range} 之間的數字にゃ！`,
                ephemeral: true
            });
        }
        
        game.attempts++;
        const remainingAttempts = game.maxAttempts - game.attempts;
        
        let embed;
        
        if (guessedNumber === game.targetNumber) {
            // 猜中了！
            const timeTaken = Math.floor((Date.now() - game.startTime) / 1000);
            embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 恭喜！Salt 說你猜中了にゃ！')
                .setDescription(`正確答案就是 **${game.targetNumber}** にゃ！Salt 就知道你很厲害にゃ～`)
                .addFields(
                    { name: '🎯 嘗試次數', value: `${game.attempts}/${game.maxAttempts}`, inline: true },
                    { name: '⏱️ 用時', value: `${timeTaken} 秒`, inline: true },
                    { name: '🏆 評級', value: getPerformanceRating(game.attempts, game.maxAttempts), inline: true }
                )
                .setFooter({ text: 'Salt 說太厲害了にゃ！' });
            
            activeGames.delete(gameId);
            
        } else if (remainingAttempts <= 0) {
            // 機會用完了
            embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('💥 Salt 說遊戲結束了にゃ！')
                .setDescription(`很遺憾，Salt 說你用完了所有機會にゃ！\n正確答案是 **${game.targetNumber}** にゃ`)
                .addFields(
                    { name: '🎯 你的猜測', value: `${guessedNumber}`, inline: true },
                    { name: '❌ 嘗試次數', value: `${game.attempts}/${game.maxAttempts}`, inline: true },
                    { name: '🔄', value: '使用 `/guess` 開始新遊戲', inline: true }
                );
            
            activeGames.delete(gameId);
            
        } else {
            // 繼續遊戲
            const hint = guessedNumber < game.targetNumber ? '📈 Salt 說太小了にゃ！' : '📉 Salt 說太大了にゃ！';
            embed = new EmbedBuilder()
                .setColor(0xFFAA00)
                .setTitle(hint)
                .setDescription(`你猜的是 **${guessedNumber}**，但 Salt 說答案${guessedNumber < game.targetNumber ? '更大' : '更小'}一些にゃ！`)
                .addFields(
                    { name: '🎯 剩餘機會', value: `${remainingAttempts} 次`, inline: true },
                    { name: '🎲 遊戲 ID', value: `\`${gameId}\``, inline: true },
                    { name: '💡 提示', value: getHint(guessedNumber, game.targetNumber, game.range), inline: false }
                );
        }
        
        await interaction.reply({ embeds: [embed] });
    },
};

function getPerformanceRating(attempts, maxAttempts) {
    const percentage = attempts / maxAttempts;
    if (percentage <= 0.3) return '🏆 Salt 說完美にゃ！';
    if (percentage <= 0.5) return '⭐ Salt 說優秀にゃ！';
    if (percentage <= 0.7) return '👍 Salt 說不錯にゃ！';
    if (percentage <= 0.9) return '😅 Salt 說差點にゃ！';
    return '😰 Salt 說險勝にゃ！';
}

function getHint(guess, target, range) {
    const difference = Math.abs(guess - target);
    const percentDiff = difference / range;
    
    if (percentDiff <= 0.05) return '🔥 非常接近了！';
    if (percentDiff <= 0.1) return '♨️ 很接近！';
    if (percentDiff <= 0.2) return '🌡️ 接近了！';
    if (percentDiff <= 0.4) return '❄️ 還有一段距離';
    return '🧊 相差很遠';
}
