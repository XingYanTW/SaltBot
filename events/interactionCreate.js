const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // 處理斜線命令
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`找不到命令 ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('執行命令時發生錯誤:', error);
                
                const errorMessage = {
                    content: '執行此命令時發生錯誤！',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
        
        // 處理按鈕互動
        if (interaction.isButton()) {
            // 石頭剪刀布按鈕處理
            if (interaction.customId.startsWith('rps_')) {
                const choice = interaction.customId.replace('rps_', '');
                const rpsCommand = require('../commands/games/rps.js');
                const result = rpsCommand.playRPS(choice);
                const embed = rpsCommand.createResultEmbed(choice, result.botChoice, result.outcome, interaction.user);
                
                await interaction.update({ embeds: [embed], components: [] });
                return;
            }
            
            // 字母猜測按鈕處理已移除 - 改為訊息偵測
            
            // 音遊歌曲猜謎按鈕處理
            if (interaction.customId.startsWith('song_hint_')) {
                const gameId = interaction.customId.replace('song_hint_', '');
                const guessRhythmGame = require('../commands/games/guess-rhythm-song.js');
                const game = guessRhythmGame.activeGames.get(gameId);
                
                if (!game) {
                    return await interaction.reply({
                        content: '❌ Salt 找不到這個遊戲或遊戲已經結束了にゃ！',
                        ephemeral: true
                    });
                }
                
                // 移除用戶身份檢查，讓所有人都能獲得提示
                
                // 隨機給出一首歌的提示
                const randomSong = game.songs[Math.floor(Math.random() * game.songs.length)];
                const hints = [
                    `💡 Salt 說：有一首歌的作曲家是 **${randomSong.artist}**にゃ`,
                    `💡 Salt 說：**${randomSong.hint}**にゃ`,
                    `💡 Salt 說：有一首歌名有 **${randomSong.name.length}** 個字符にゃ`
                ];
                
                const randomHint = hints[Math.floor(Math.random() * hints.length)];
                await interaction.reply({
                    content: randomHint,
                    ephemeral: true
                });
                return;
            }
            
            if (interaction.customId.startsWith('song_give_up_')) {
                const gameId = interaction.customId.replace('song_give_up_', '');
                const guessRhythmGame = require('../commands/games/guess-rhythm-song.js');
                const game = guessRhythmGame.activeGames.get(gameId);
                
                if (!game) {
                    return await interaction.reply({
                        content: '❌ Salt 找不到這個遊戲或遊戲已經結束了にゃ！',
                        ephemeral: true
                    });
                }
                
                // 移除用戶身份檢查，讓所有人都能放棄遊戲
                
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(0x808080)
                    .setTitle('😅 Salt 說沒關係的にゃ')
                    .setDescription(`Salt 說放棄也沒關係的にゃ～這些歌曲都很經典にゃ！`)
                    .addFields({
                        name: '🎵 答案揭曉',
                        value: game.songs.map((song, index) => `${index + 1}. **${song.name}** *(${song.game} - ${song.artist})*`).join('\n'),
                        inline: false
                    })
                    .setFooter({ text: 'Salt 說學習新歌曲也是很棒的にゃ～' })
                    .setTimestamp();
                
                guessRhythmGame.activeGames.delete(gameId);
                await interaction.update({ embeds: [embed], components: [] });
                return;
            }
            
            // 新的遊戲按鈕處理 - 猜歌按鈕
            if (interaction.customId.startsWith('guess_song_')) {
                const parts = interaction.customId.split('_');
                const songIndex = parseInt(parts[2]) - 1; // 歌曲索引 (0-4)
                const gameId = parts.slice(3).join('_'); // 重建遊戲ID
                
                const guessRhythmGame = require('../commands/games/guess-rhythm-song.js');
                const game = guessRhythmGame.activeGames.get(gameId);
                
                if (!game) {
                    return await interaction.reply({
                        content: '❌ Salt 找不到這個遊戲或遊戲已經結束了にゃ！',
                        ephemeral: true
                    });
                }
                
                // 移除用戶身份檢查，讓所有人都能猜歌曲
                
                if (songIndex < 0 || songIndex >= game.songs.length) {
                    return await interaction.reply({
                        content: '❌ Salt 說這個歌曲編號不存在にゃ！',
                        ephemeral: true
                    });
                }
                
                const targetSong = game.songs[songIndex];
                
                // 創建模態框讓用戶輸入答案
                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                
                const modal = new ModalBuilder()
                    .setCustomId(`song_answer_${songIndex}_${gameId}`)
                    .setTitle(`猜第 ${songIndex + 1} 首歌 - ${targetSong.game}`);
                
                const songInput = new TextInputBuilder()
                    .setCustomId('song_name')
                    .setLabel(`請輸入第 ${songIndex + 1} 首歌的歌名`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('輸入完整的歌曲名稱...')
                    .setRequired(true)
                    .setMaxLength(100);
                
                const firstActionRow = new ActionRowBuilder().addComponents(songInput);
                modal.addComponents(firstActionRow);
                
                await interaction.showModal(modal);
                return;
            }
            
            // 遊戲提示按鈕處理
            if (interaction.customId.startsWith('game_hint_')) {
                const gameId = interaction.customId.replace('game_hint_', '');
                const guessRhythmGame = require('../commands/games/guess-rhythm-song.js');
                const game = guessRhythmGame.activeGames.get(gameId);
                
                if (!game) {
                    return await interaction.reply({
                        content: '❌ Salt 找不到這個遊戲或遊戲已經結束了にゃ！',
                        ephemeral: true
                    });
                }
                
                // 移除用戶身份檢查，讓所有人都能獲得提示
                
                // 隨機給出一首歌的提示
                const randomSong = game.songs[Math.floor(Math.random() * game.songs.length)];
                const hints = [
                    `💡 Salt 說：有一首歌的作曲家是 **${randomSong.artist}**にゃ`,
                    `💡 Salt 說：**${randomSong.hint}**にゃ`,
                    `💡 Salt 說：有一首歌名有 **${randomSong.name.length}** 個字符にゃ`
                ];
                
                const randomHint = hints[Math.floor(Math.random() * hints.length)];
                await interaction.reply({
                    content: randomHint,
                    ephemeral: true
                });
                return;
            }
            
            // 遊戲放棄按鈕處理
            if (interaction.customId.startsWith('game_give_up_')) {
                const gameId = interaction.customId.replace('game_give_up_', '');
                const guessRhythmGame = require('../commands/games/guess-rhythm-song.js');
                const game = guessRhythmGame.activeGames.get(gameId);
                
                if (!game) {
                    return await interaction.reply({
                        content: '❌ Salt 找不到這個遊戲或遊戲已經結束了にゃ！',
                        ephemeral: true
                    });
                }
                
                // 移除用戶身份檢查，讓所有人都能放棄遊戲
                
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(0x808080)
                    .setTitle('😅 Salt 說沒關係的にゃ')
                    .setDescription(`Salt 說放棄也沒關係的にゃ～這些歌曲都很經典にゃ！`)
                    .addFields({
                        name: '🎵 答案揭曉',
                        value: game.songs.map((song, index) => `${index + 1}. **${song.name}** *(${song.game} - ${song.artist})*`).join('\n'),
                        inline: false
                    })
                    .setFooter({ text: 'Salt 說學習新歌曲也是很棒的にゃ～' })
                    .setTimestamp();
                
                guessRhythmGame.activeGames.delete(gameId);
                await interaction.update({ embeds: [embed], components: [] });
                return;
            }
            
            console.log(`按鈕被點擊: ${interaction.customId}`);
        }
        
        // 處理選單互動
        if (interaction.isStringSelectMenu()) {
            // 在這裡添加選單處理邏輯
            console.log(`選單被選擇: ${interaction.customId}`);
        }
        
        // 處理模態框提交
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('song_answer_')) {
                const { handleSongAnswerModal } = require('./modal-handler.js');
                await handleSongAnswerModal(interaction);
                return;
            }
        }
    },
};

// 輔助函數
function createGameEmbed(gameId, songs, revealedLetters, wrongLetters, remainingWrongGuesses) {
    const { EmbedBuilder } = require('discord.js');
    
    const embed = new EmbedBuilder()
        .setColor(remainingWrongGuesses > 3 ? 0x00FF00 : remainingWrongGuesses > 1 ? 0xFFFF00 : 0xFF0000)
        .setTitle('� Salt 的 maimai DX 歌曲猜字遊戲にゃ')
        .setDescription('Salt 從 maimai DX 選了 5 首歌曲，猜字母來揭開歌名吧にゃ！');

    // 顯示所有歌曲的遮蔽狀態
    let songsDisplay = '';
    songs.forEach((song, index) => {
        const maskedName = createMaskedSongName(song.name, revealedLetters);
        const genreEmoji = getGenreEmoji(song.genre);
        songsDisplay += `${genreEmoji} **${index + 1}.** \`${maskedName}\` *(${song.genre || 'maimai DX'})*\n`;
    });

    embed.addFields(
        {
            name: '🎼 歌曲列表',
            value: songsDisplay,
            inline: false
        }
    );

    // 顯示已猜過的字母
    if (revealedLetters.size > 0) {
        embed.addFields({
            name: '✅ 正確字母',
            value: Array.from(revealedLetters).map(letter => `\`${letter.toUpperCase()}\``).join(' '),
            inline: true
        });
    }

    if (wrongLetters.size > 0) {
        embed.addFields({
            name: '❌ 錯誤字母',
            value: Array.from(wrongLetters).map(letter => `\`${letter.toUpperCase()}\``).join(' '),
            inline: true
        });
    }

    embed.addFields({
        name: '📊 遊戲狀態',
        value: `剩餘錯誤機會: ${remainingWrongGuesses} 次\n遊戲ID: \`${gameId}\``,
        inline: false
    });

    embed.setFooter({ 
        text: 'Salt 說：使用按鈕猜字母，或用 /submit-song 猜完整歌名にゃ'
    })
    .setTimestamp();

    return embed;
}

function createMaskedSongName(songName, revealedLetters) {
    return songName
        .toUpperCase()
        .split('')
        .map(char => {
            if (char === ' ') {
                return ' ';
            } else if (revealedLetters.has(char.toLowerCase()) || revealedLetters.has(char.toUpperCase())) {
                return char;
            } else if (/[A-Za-z]/.test(char)) {
                return '_';
            } else {
                // 數字和特殊符號直接顯示
                return char;
            }
        })
        .join('');
}

function getGameEmoji(gameName) {
    return '🎡'; // maimai DX 的統一圖示
}

function getGenreEmoji(genre) {
    const genreEmojis = {
        'GAME & VARIETY': '🎮',
        'POPS & ANIME': '📺',
        'niconico & VOCALOID': '�',
        'ORIGINAL & JOYPOLIS': '�',
        'VARIETY': '�'
    };
    return genreEmojis[genre] || '🎵';
}

function checkGameComplete(songs, revealedLetters) {
    return songs.every(song => {
        const maskedName = createMaskedSongName(song.name, revealedLetters);
        return !maskedName.includes('_');
    });
}
