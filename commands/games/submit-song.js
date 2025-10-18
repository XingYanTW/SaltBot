const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const guessRhythmGame = require('./guess-rhythm-song.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit-song')
        .setDescription('提交你對音遊歌曲的猜測にゃ')
        .addStringOption(option =>
            option.setName('game-id')
                .setDescription('遊戲ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('song-number')
                .setDescription('歌曲編號 (1-5)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('你的答案')
                .setRequired(true)),
    async execute(interaction) {
        const gameId = interaction.options.getString('game-id');
        const songNumber = parseInt(interaction.options.getString('song-number'));
        const userAnswer = interaction.options.getString('answer').trim();

        const game = guessRhythmGame.activeGames.get(gameId);
        if (!game) {
            return await interaction.reply({
                content: '❌ Salt 找不到這個遊戲にゃ！可能遊戲已經結束或ID錯誤にゃ',
                ephemeral: true
            });
        }

        if (game.userId !== interaction.user.id) {
            return await interaction.reply({
                content: '❌ 這不是你的遊戲にゃ！Salt 不允許別人代答にゃ',
                ephemeral: true
            });
        }

        if (game.isComplete) {
            return await interaction.reply({
                content: '❌ 遊戲已經結束了にゃ！',
                ephemeral: true
            });
        }

        if (songNumber < 1 || songNumber > 5) {
            return await interaction.reply({
                content: '❌ 歌曲編號必須是 1-5 にゃ！',
                ephemeral: true
            });
        }

        const targetSong = game.songs[songNumber - 1];
        const isCorrect = userAnswer.toLowerCase() === targetSong.name.toLowerCase();

        if (isCorrect) {
            // 正確答案
            const timeTaken = Math.round((Date.now() - game.startTime) / 1000);
            const performanceRating = getPerformanceRating(timeTaken, game.revealedLetters.size, game.wrongLetters.size);
            
            // 檢查是否完成所有歌曲
            if (!game.completedSongs) {
                game.completedSongs = new Set();
            }
            game.completedSongs.add(songNumber - 1);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 恭喜答對了にゃ！')
                .setDescription(`Salt 很開心你猜對了第 ${songNumber} 首歌曲にゃ！`)
                .addFields(
                    {
                        name: '🎵 正確答案',
                        value: `**${targetSong.name}**`,
                        inline: true
                    },
                    {
                        name: '🎮 來源遊戲',
                        value: targetSong.game,
                        inline: true
                    },
                    {
                        name: '🎼 作曲家',
                        value: targetSong.artist,
                        inline: true
                    },
                    {
                        name: '🏷️ 類別',
                        value: targetSong.genre || 'maimai DX',
                        inline: true
                    },
                    {
                        name: '⭐ 表現評級',
                        value: performanceRating,
                        inline: false
                    },
                    {
                        name: '📊 統計資訊',
                        value: `用時: ${timeTaken} 秒\n已猜字母: ${game.revealedLetters.size} 個\n錯誤字母: ${game.wrongLetters.size} 個`,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: game.completedSongs.size === 5 ? 
                        'Salt 說：所有歌曲都猜對了！你真是音遊達人にゃ～' : 
                        `Salt 說：還有 ${5 - game.completedSongs.size} 首歌曲等你猜測にゃ！`,
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTimestamp();

            if (game.completedSongs.size === 5) {
                game.isComplete = true;
                setTimeout(() => {
                    guessRhythmGame.activeGames.delete(gameId);
                }, 5 * 60 * 1000); // 5分鐘後清除
            }

            await interaction.reply({ embeds: [embed] });

        } else {
            // 錯誤答案
            const embed = new EmbedBuilder()
                .setColor(0xFF4444)
                .setTitle('❌ 答案不正確にゃ')
                .setDescription(`Salt 覺得「${userAnswer}」不是正確答案にゃ`)
                .addFields(
                    {
                        name: '💡 提示',
                        value: targetSong.hint,
                        inline: false
                    },
                    {
                        name: '🎮 來源遊戲',
                        value: targetSong.game,
                        inline: true
                    },
                    {
                        name: '🎼 作曲家',
                        value: targetSong.artist,
                        inline: true
                    },
                    {
                        name: '🏷️ 類別',
                        value: targetSong.genre || 'maimai DX',
                        inline: true
                    }
                )
                .setFooter({ 
                    text: 'Salt 說：繼續猜字母或再試試完整歌名にゃ',
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};

function getPerformanceRating(timeTaken, revealedCount, wrongCount) {
    if (timeTaken <= 30 && revealedCount <= 3 && wrongCount === 0) {
        return '🏆 **Salt 等級** - 閃電猜中にゃ！';
    } else if (timeTaken <= 60 && revealedCount <= 5 && wrongCount <= 1) {
        return '🥇 **大師等級** - 一猜就中にゃ！';
    } else if (timeTaken <= 120 && revealedCount <= 8 && wrongCount <= 2) {
        return '🥈 **專家等級** - 很厲害にゃ！';
    } else if (timeTaken <= 300 && wrongCount <= 4) {
        return '🥉 **熟練等級** - 不錯的表現にゃ！';
    } else {
        return '🎵 **音遊新手** - 繼續加油にゃ！';
    }
}
