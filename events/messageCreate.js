const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // 忽略機器人自己的訊息
        if (message.author.bot) return;
        
        // 檢查是否有進行中的遊戲
        const guessRhythmGame = require('../commands/games/guess-rhythm-song.js');
        
        // 遍歷所有活躍遊戲，找到在此頻道的遊戲（移除用戶限制，讓所有人都能參與）
        for (const [gameId, game] of guessRhythmGame.activeGames.entries()) {
            if (game.channelId === message.channel.id && !game.isComplete) {
                await handleGameMessage(message, gameId, game);
                return; // 處理完畢後返回，避免重複處理
            }
        }
    },
};

async function handleGameMessage(message, gameId, game) {
    const { EmbedBuilder } = require('discord.js');
    const guessRhythmGame = require('../commands/games/guess-rhythm-song.js');
    const input = message.content.trim().toLowerCase();
    
    // 檢查特殊指令
    if (input === '提示' || input === 'hint') {
        // 隨機給出一首歌的提示
        const randomSong = game.songs[Math.floor(Math.random() * game.songs.length)];
        const hints = [
            `💡 Salt 說：有一首歌的作曲家是 **${randomSong.artist}** にゃ`,
            `💡 Salt 說：**${randomSong.hint}** にゃ`,
            `💡 Salt 說：有一首歌名有 **${randomSong.name.length}** 個字符にゃ`
        ];
        
        const randomHint = hints[Math.floor(Math.random() * hints.length)];
        await message.reply(randomHint);
        return;
    }
    
    if (input === '放棄' || input === 'give up' || input === 'quit') {
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
        await message.reply({ embeds: [embed] });
        return;
    }
    
    // 檢查是否為單一字母猜測
    if (input.length === 1 && /[a-z]/.test(input)) {
        const letter = input;
        
        // 檢查字母是否已經猜過
        if (game.revealedLetters.has(letter) || game.wrongLetters.has(letter)) {
            await message.reply(`❌ Salt 說你已經猜過字母 "${letter.toUpperCase()}" 了にゃ！`);
            return;
        }
        
        // 檢查字母是否在任何歌曲中
        let letterFound = false;
        for (const song of game.songs) {
            if (song.name.toLowerCase().includes(letter)) {
                letterFound = true;
                break;
            }
        }
        
        if (letterFound) {
            game.revealedLetters.add(letter);
            
            // 檢查是否完成遊戲
            const isGameComplete = checkGameComplete(game.songs, game.revealedLetters);
            if (isGameComplete) {
                game.isComplete = true;
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Salt 說猜對了にゃ！')
                .setDescription(`字母 "${letter.toUpperCase()}" 在歌曲中找到了にゃ～`)
                .setTimestamp();
            
            if (isGameComplete) {
                embed.addFields({
                    name: '🎉 恭喜完成！',
                    value: 'Salt 說所有歌曲都顯示出來了にゃ！你可以用 /submit-song 來猜完整歌名にゃ～',
                    inline: false
                });
            }
            
            await message.reply({ embeds: [embed] });
            
        } else {
            game.wrongLetters.add(letter);
            const remainingWrongGuesses = game.maxWrongGuesses - game.wrongLetters.size;
            
            if (remainingWrongGuesses <= 0) {
                // 遊戲失敗
                game.isComplete = true;
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('💥 Salt 說遊戲結束了にゃ！')
                    .setDescription('Salt 說你犯了太多錯誤，遊戲結束了にゃ～')
                    .addFields({
                        name: '🎵 答案揭曉',
                        value: game.songs.map((song, index) => `${index + 1}. **${song.name}** *(${song.game})*`).join('\n'),
                        inline: false
                    })
                    .setFooter({ text: 'Salt 說下次再加油にゃ～' })
                    .setTimestamp();
                
                guessRhythmGame.activeGames.delete(gameId);
                await message.reply({ embeds: [embed] });
                return;
                
            } else {
                const embed = new EmbedBuilder()
                    .setColor(0xFF4444)
                    .setTitle('❌ Salt 說沒有這個字母にゃ')
                    .setDescription(`字母 "${letter.toUpperCase()}" 不在任何歌曲中にゃ`)
                    .addFields({
                        name: '⚠️ 剩餘機會',
                        value: `${remainingWrongGuesses} 次錯誤機會`,
                        inline: true
                    })
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
            }
        }
        
        // 更新遊戲顯示 (延遲1秒後更新) - 只有在遊戲未完成時才顯示按鈕
        setTimeout(async () => {
            try {
                if (!game.isComplete) {
                    const gameEmbed = guessRhythmGame.createGameEmbed(gameId, game.songs, game.revealedLetters, game.wrongLetters, game.maxWrongGuesses - game.wrongLetters.size);
                    const components = guessRhythmGame.createGameComponents(gameId);
                    await message.channel.send({ embeds: [gameEmbed], components: components });
                }
            } catch (error) {
                console.error('更新遊戲顯示時發生錯誤:', error);
            }
        }, 1000);
        
        return;
    }
    
    // 如果輸入不是單一字母，提醒用戶
    if (input.length > 1) {
        await message.reply('❓ Salt 說請輸入單一字母來猜測，或輸入 `提示` 獲得提示，`放棄` 結束遊戲にゃ！');
    }
}

// 輔助函數
function createGameEmbed(gameId, songs, revealedLetters, wrongLetters, remainingWrongGuesses) {
    const { EmbedBuilder } = require('discord.js');
    
    const embed = new EmbedBuilder()
        .setColor(remainingWrongGuesses > 3 ? 0x00FF00 : remainingWrongGuesses > 1 ? 0xFFFF00 : 0xFF0000)
        .setTitle('🎡 Salt 的 maimai DX 歌曲猜字遊戲にゃ')
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
        value: `剩餘錯誤機會: ${remainingWrongGuesses} 次\n遊戲ID: \`${gameId}\`\n\n**如何遊玩**: 直接在頻道中輸入字母來猜測！\n**特殊指令**: 輸入 \`提示\` 獲得提示，輸入 \`放棄\` 結束遊戲`,
        inline: false
    });

    embed.setFooter({ 
        text: 'Salt 說：直接在頻道中輸入字母猜測，或用 /submit-song 猜完整歌名にゃ'
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

function getGenreEmoji(genre) {
    const genreEmojis = {
        'GAME & VARIETY': '🎮',
        'POPS & ANIME': '📺',
        'niconico & VOCALOID': '🎤',
        'ORIGINAL & JOYPOLIS': '🎡',
        'VARIETY': '🎵'
    };
    return genreEmojis[genre] || '🎵';
}

function checkGameComplete(songs, revealedLetters) {
    return songs.every(song => {
        const maskedName = createMaskedSongName(song.name, revealedLetters);
        return !maskedName.includes('_');
    });
}
