// 模態框提交處理邏輯
async function handleSongAnswerModal(interaction) {
    const parts = interaction.customId.split('_');
    const songIndex = parseInt(parts[2]);
    const gameId = parts.slice(3).join('_');
    
    const guessRhythmGame = require('../commands/games/guess-rhythm-song.js');
    const game = guessRhythmGame.activeGames.get(gameId);
    
    if (!game) {
        return await interaction.reply({
            content: '❌ Salt 找不到這個遊戲或遊戲已經結束了にゃ！',
            ephemeral: true
        });
    }
    
    // 移除用戶身份檢查，讓所有人都能猜測
    
    const userAnswer = interaction.fields.getTextInputValue('song_name').trim();
    const targetSong = game.songs[songIndex];
    
    // 檢查答案是否正確
    const isCorrect = userAnswer.toLowerCase() === targetSong.name.toLowerCase();
    
    if (isCorrect) {
        // 檢查歌曲是否已完全解開（如果是，則無效）
        const { isSongFullyRevealed } = require('../commands/games/guess-rhythm-song.js');
        
        if (isSongFullyRevealed(targetSong, game.revealedLetters)) {
            await interaction.reply({
                content: `❌ Salt 說這首歌已經被字母猜測完全解開了，所以無效了にゃ！\n🎵 歌曲：**${targetSong.name}**\n💡 下次要更快一點猜出答案にゃ～`,
                ephemeral: true
            });
            return;
        }
        
        // 標記歌曲為已猜中
        if (!game.guessedSongs) {
            game.guessedSongs = new Set();
        }
        game.guessedSongs.add(songIndex);
        
        // 檢查是否全部猜中
        if (game.guessedSongs.size === game.songs.length) {
            const { EmbedBuilder } = require('discord.js');
            const finalEmbed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🏆 Salt 說全部答對了にゃ！')
                .setDescription('恭喜你全部猜對了！Salt 覺得你真是音樂大師にゃ～')
                .addFields(
                    { name: '🎵 最後答對的歌曲', value: `**${targetSong.name}**\n作者：${targetSong.artist}\n遊戲：${targetSong.game}`, inline: true },
                    { name: '💡 提示', value: targetSong.hint, inline: true }
                )
                .setFooter({ text: 'Salt 說你對音樂很有品味にゃ～' })
                .setTimestamp();
            
            // 標記遊戲為完成並刪除
            game.isComplete = true;
            guessRhythmGame.activeGames.delete(gameId);
            await interaction.reply({ embeds: [finalEmbed], ephemeral: false });
            return;
        }
        
        // 更新遊戲狀態 - 創建包含成功訊息和遊戲狀態的組合回應
        const { EmbedBuilder } = require('discord.js');
        const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎉 Salt 說答對了にゃ！')
            .setDescription(`恭喜！第 ${songIndex + 1} 首歌 **${targetSong.name}** 答對了にゃ～`)
            .addFields(
                { name: '🎵 歌曲資訊', value: `**${targetSong.name}**\n作者：${targetSong.artist}\n遊戲：${targetSong.game}`, inline: true },
                { name: '💡 提示', value: targetSong.hint, inline: true }
            )
            .setFooter({ text: `還剩 ${game.songs.length - game.guessedSongs.size} 首歌待猜測！繼續加油にゃ～` })
            .setTimestamp();
        
        const updatedGameEmbed = guessRhythmGame.createGameEmbed(
            gameId, 
            game.songs, 
            game.revealedLetters, 
            game.wrongLetters, 
            game.maxWrongGuesses - game.wrongLetters.size,
            game.guessedSongs
        );
        const components = guessRhythmGame.createGameComponents(gameId);
        
        await interaction.reply({ 
            embeds: [successEmbed, updatedGameEmbed], 
            components: components,
            ephemeral: false 
        });
        
    } else {
        await interaction.reply({
            content: `❌ Salt 說答錯了にゃ～再想想看吧にゃ！\n💡 提示：${targetSong.hint}`,
            ephemeral: true
        });
    }
}

module.exports = { handleSongAnswerModal };
