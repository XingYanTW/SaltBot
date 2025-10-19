const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// 遊戲狀態儲存
const activeGames = new Map();

// 追蹤最近使用過的歌曲，避免重複（保存最近 50 首歌曲）
const recentlyUsedSongs = new Set();
const MAX_RECENT_SONGS = 50;

// 從 maimai API 獲取歌曲資料
async function getMaimaiSongs() {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://otoge-db.net/maimai/data/music-ex.json');
        const data = await response.json();
        
        // 過濾並格式化歌曲資料，只保留 maimai 原創曲目
        return data
            .filter(song => {
                // 只保留 maimai 原創分類的歌曲
                const maimaiOriginalGenres = [
                    'maimai'  // maimai 的原創曲分類
                ];
                return maimaiOriginalGenres.includes(song.catcode);
            })
            .map(song => ({
                name: song.title,
                game: 'maimai DX',
                artist: song.artist,
                hint: generateHint(song),
                difficulty: getDifficultyLevel(song),
                genre: 'maimai',  // 統一改為 maimai
                version: song.version || 'maimai'
            }));
    } catch (error) {
        console.error('獲取 maimai 歌曲資料失敗:', error);
        // 備用歌曲列表 - 只包含 maimai 原創曲
        return [
            { name: 'Link', game: 'maimai DX', artist: 'Circle of friends', hint: 'maimai 原創的連結主題曲', difficulty: 'medium', genre: 'maimai', version: 'maimai' },
            { name: 'Garakuta Doll Play', game: 'maimai DX', artist: 't+pazolite', hint: 'maimai 原創的娃娃遊戲', difficulty: 'hard', genre: 'maimai', version: 'maimai' },
            { name: 'LAMIA', game: 'maimai DX', artist: 'Sota Fujimori', hint: 'maimai 原創的神秘曲目', difficulty: 'hard', genre: 'maimai', version: 'maimai' },
            { name: 'Shiny Memory', game: 'maimai DX', artist: 'Yamajet', hint: 'maimai 原創的閃亮回憶', difficulty: 'easy', genre: 'maimai', version: 'maimai' },
            { name: 'Beat Of Mind', game: 'maimai DX', artist: 'Cranky', hint: 'maimai 原創的心靈節拍', difficulty: 'medium', genre: 'maimai', version: 'maimai' },
            { name: 'Scatman', game: 'maimai DX', artist: 'かめりあ', hint: 'maimai 原創改編', difficulty: 'medium', genre: 'maimai', version: 'maimai' },
            { name: 'stellar', game: 'maimai DX', artist: 'Ras', hint: 'maimai 原創的星空主題', difficulty: 'easy', genre: 'maimai', version: 'maimai' },
            { name: 'CYCLES', game: 'maimai DX', artist: 'Nhato', hint: 'maimai 原創的循環主題', difficulty: 'medium', genre: 'maimai', version: 'maimai' },
            { name: 'AMAZING MIGHTYYYY!!!!', game: 'maimai DX', artist: 'Camellia', hint: 'maimai 原創的驚人力量', difficulty: 'hard', genre: 'maimai', version: 'maimai' },
            { name: 'Last Celebration', game: 'maimai DX', artist: 'cosMo@BousouP', hint: 'maimai 原創的最後慶典', difficulty: 'medium', genre: 'maimai', version: 'maimai' }
        ];
    }
}

function generateHint(song) {
    const hints = [];
    
    // 移除分類提示，不再顯示來自 maimai DX
    
    if (song.version) {
        const versionName = getVersionName(song.version);
        if (versionName) {
            hints.push(`收錄於 ${versionName} 版本`);
        }
    }
    
    // 根據歌名特徵生成提示
    if (song.title.includes('FREEDOM')) {
        hints.push('關於自由的主題');
    } else if (song.title.includes('Break')) {
        hints.push('有破壞或突破的意思');
    } else if (song.title.includes('World')) {
        hints.push('與世界相關的歌曲');
    } else if (song.title.length <= 6) {
        hints.push('歌名相對簡短');
    } else if (song.title.length >= 15) {
        hints.push('歌名比較長');
    }
    
    return hints.length > 0 ? hints[Math.floor(Math.random() * hints.length)] : '這是一首 maimai 的經典歌曲';
}

// 轉換版本數字為版本名稱
function getVersionName(version) {
    // 將版本轉換為數字進行比較
    const versionNum = parseInt(version);
    
    // 如果不是有效數字，直接返回原始版本
    if (isNaN(versionNum)) {
        return version;
    }
    
    // 根據版本號範圍判斷版本名稱
    if (versionNum >= 26000) return 'maimai CiRCLE';
    if (versionNum >= 25500) return 'maimai PRiSM PLUS';
    if (versionNum >= 25000) return 'maimai PRiSM';
    if (versionNum >= 24500) return 'maimai BUDDiES PLUS';
    if (versionNum >= 24000) return 'maimai BUDDiES';
    if (versionNum >= 23500) return 'maimai FESTiVAL PLUS';
    if (versionNum >= 23000) return 'maimai FESTiVAL';
    if (versionNum >= 22500) return 'maimai UNiVERSE PLUS';
    if (versionNum >= 22000) return 'maimai UNiVERSE';
    if (versionNum >= 21500) return 'maimai Splash PLUS';
    if (versionNum >= 21000) return 'maimai Splash';
    if (versionNum >= 20500) return 'maimai DX PLUS';
    if (versionNum >= 20000) return 'maimai DX';
    if (versionNum >= 19700) return 'maimai FiNALE';
    if (versionNum >= 19500) return 'maimai MiLK PLUS';
    if (versionNum >= 19000) return 'maimai MiLK';
    if (versionNum >= 18500) return 'maimai MURASAKi PLUS';
    if (versionNum >= 18000) return 'maimai MURASAKi';
    if (versionNum >= 17000) return 'maimai PiNK PLUS';
    if (versionNum >= 16000) return 'maimai PiNK';
    if (versionNum >= 15000) return 'maimai ORANGE PLUS';
    if (versionNum >= 14000) return 'maimai ORANGE';
    if (versionNum >= 13000) return 'maimai GreeN PLUS';
    if (versionNum >= 12000) return 'maimai GreeN';
    if (versionNum >= 11000) return 'maimai PLUS';
    if (versionNum >= 10000) return 'maimai';
    
    // 如果版本號小於 10000，返回原始版本
    return version;
}

function getDifficultyLevel(song) {
    // 根據歌曲的最高難度等級判斷
    if (song.dx_lev_bas || song.lev_bas) {
        const maxLevel = Math.max(
            ...[song.dx_lev_bas, song.dx_lev_adv, song.dx_lev_exp, song.dx_lev_mas, 
                song.lev_bas, song.lev_adv, song.lev_exp, song.lev_mas].filter(Boolean)
        );
        
        if (maxLevel <= 8) return 'easy';
        if (maxLevel <= 11) return 'medium';
        return 'hard';
    }
    
    // 預設為隨機
    return ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guess-rhythm')
        .setDescription('Salt 的 maimai DX 歌曲猜字遊戲にゃ - 猜字母揭開歌名！')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('選擇難度にゃ')
                .setRequired(false)
                .addChoices(
                    { name: '🟢 簡單 - 知名歌曲', value: 'easy' },
                    { name: '🟡 普通 - 中等知名度', value: 'medium' },
                    { name: '🔴 困難 - 冷門歌曲', value: 'hard' },
                    { name: '🎲 隨機', value: 'random' }
                ))
        .addStringOption(option =>
            option.setName('genre')
                .setDescription('指定 maimai 原創音樂類別にゃ')
                .setRequired(false)
                .addChoices(
                    { name: '🎡 maimai - maimai 原創曲', value: 'maimai' },
                    { name: '🌟 全部 maimai 原創曲', value: 'all' }
                )),
    async execute(interaction) {
        await interaction.deferReply();
        
        // 檢查此頻道是否已有進行中的遊戲
        const existingGame = Array.from(activeGames.entries()).find(([gameId, game]) => 
            game.channelId === interaction.channel.id && !game.isComplete
        );
        
        if (existingGame) {
            return await interaction.editReply({
                content: `❌ Salt 說這個頻道已經有一個進行中的遊戲了にゃ！\n🎮 遊戲ID: \`${existingGame[0]}\`\n💡 請等待當前遊戲結束，或讓遊戲創建者使用放棄按鈕結束遊戲にゃ～`
            });
        }
        
        const difficulty = interaction.options.getString('difficulty') || 'random';
        const genreFilter = interaction.options.getString('genre') || 'all';
        const gameId = `${interaction.user.id}_${Date.now()}`;
        
        try {
            // 獲取 maimai 歌曲資料
            const allSongs = await getMaimaiSongs();
            let availableSongs = allSongs;
            
            // 根據類別篩選（確保只使用 maimai 原創曲）
            if (genreFilter !== 'all') {
                availableSongs = availableSongs.filter(song => song.genre === genreFilter);
            }
            
            // 再次確保所有歌曲都是 maimai 原創曲
            const maimaiOriginalGenres = [
                'maimai'  // maimai 的原創曲分類
            ];
            availableSongs = availableSongs.filter(song => maimaiOriginalGenres.includes(song.genre));
            
            // 根據難度篩選
            if (difficulty !== 'random') {
                availableSongs = availableSongs.filter(song => song.difficulty === difficulty);
            }
            
            // 確保有足夠的歌曲
            if (availableSongs.length < 5) {
                return await interaction.editReply({
                    content: '❌ Salt 找不到足夠的 maimai 原創曲目（需要至少 5 首）にゃ！\n💡 Salt 只使用 maimai 遊戲的原創音樂にゃ～\n🎵 這些都是專門為 maimai 創作的獨家曲目にゃ！'
                });
            }
            
            // 智能選擇 5 首歌曲，避免重複並確保多樣性
            const selectedSongs = getRandomSongs(availableSongs, 5);
            
            // 儲存遊戲狀態
            activeGames.set(gameId, {
                songs: selectedSongs,
                revealedLetters: new Set(),
                wrongLetters: new Set(),
                guessedSongs: new Set(), // 追蹤已猜中的歌曲索引
                maxWrongGuesses: 6,
                userId: interaction.user.id,
                channelId: interaction.channel.id,
                startTime: Date.now(),
                isComplete: false
            });
            
            const embed = createGameEmbed(gameId, selectedSongs, new Set(), new Set(), 6);
            const components = createGameComponents(gameId);

            await interaction.editReply({ embeds: [embed], components: components });
            
            // 30分鐘後自動清除遊戲
            setTimeout(() => {
                activeGames.delete(gameId);
            }, 30 * 60 * 1000);
            
        } catch (error) {
            console.error('獲取歌曲資料時發生錯誤:', error);
            await interaction.editReply({
                content: '❌ Salt 在獲取歌曲資料時遇到問題にゃ！請稍後再試にゃ'
            });
        }
    },
};

// 檢查歌名是否包含英文字母
function hasEnglishLetters(songName) {
    return /[A-Za-z]/.test(songName);
}

function getRandomSongs(songs, count) {
    // 過濾掉沒有英文字母的歌曲
    const songsWithEnglish = songs.filter(song => hasEnglishLetters(song.name));
    
    // 如果過濾後的歌曲不夠，回退到原始歌曲列表
    let availableSongs = songsWithEnglish.length >= count ? songsWithEnglish : songs;
    
    // 過濾掉最近使用過的歌曲
    const nonRecentSongs = availableSongs.filter(song => !recentlyUsedSongs.has(song.name));
    
    // 如果過濾後的歌曲不夠，使用所有可用歌曲
    if (nonRecentSongs.length < count) {
        console.log(`Salt 說：最近使用歌曲太多，使用全部歌曲池にゃ (需要 ${count} 首，非重複有 ${nonRecentSongs.length} 首)`);
        availableSongs = availableSongs;
    } else {
        availableSongs = nonRecentSongs;
        console.log(`Salt 說：成功避免重複，從 ${availableSongs.length} 首非重複歌曲中選擇にゃ`);
    }
    
    // 改進的隨機選擇算法 - 使用 Fisher-Yates 洗牌算法
    const shuffled = [...availableSongs];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const selectedSongs = shuffled.slice(0, count);
    
    // 將選中的歌曲添加到最近使用列表
    selectedSongs.forEach(song => {
        recentlyUsedSongs.add(song.name);
    });
    
    // 如果最近使用的歌曲超過限制，移除最舊的（FIFO）
    if (recentlyUsedSongs.size > MAX_RECENT_SONGS) {
        const songsArray = Array.from(recentlyUsedSongs);
        const toRemove = songsArray.slice(0, recentlyUsedSongs.size - MAX_RECENT_SONGS);
        toRemove.forEach(songName => recentlyUsedSongs.delete(songName));
        console.log(`Salt 說：清理了 ${toRemove.length} 首舊歌曲，保持歌曲池新鮮にゃ`);
    }
    
    console.log(`Salt 說：選擇了 ${selectedSongs.length} 首歌曲，目前記錄 ${recentlyUsedSongs.size} 首最近使用歌曲にゃ`);
    return selectedSongs;
}

function createMaskedSongName(songName, revealedLetters, isGuessed = false) {
    // 如果歌曲已被猜中，直接返回完整歌名
    if (isGuessed) {
        return songName.toUpperCase();
    }
    
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

function createGameEmbed(gameId, songs, revealedLetters, wrongLetters, remainingWrongGuesses, guessedSongs = new Set()) {
    const embed = new EmbedBuilder()
        .setColor(remainingWrongGuesses > 3 ? 0x00FF00 : remainingWrongGuesses > 1 ? 0xFFFF00 : 0xFF0000)
        .setTitle('🎡 Salt 的 maimai DX 原創曲猜字遊戲にゃ')
        .setDescription('Salt 從 maimai DX 的原創曲目中選了 5 首歌曲，猜字母來揭開歌名吧にゃ！這些都是專門為 maimai 創作的獨家音樂にゃ～');

    // 顯示所有歌曲的遮蔽狀態
    let songsDisplay = '';
    songs.forEach((song, index) => {
        const isGuessed = guessedSongs.has(index);
        const maskedName = createMaskedSongName(song.name, revealedLetters, isGuessed);
        const genreEmoji = getGenreEmoji(song.genre);
        
        if (isGuessed) {
            songsDisplay += `${genreEmoji} **${index + 1}.** ✅ \`${maskedName}\` *(已猜中)*\n`;
        } else {
            songsDisplay += `${genreEmoji} **${index + 1}.** \`${maskedName}\` *(${song.genre})*\n`;
        }
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

    // 顯示進度
    const totalSongs = songs.length;
    const guessedCount = guessedSongs.size;
    const progressText = `已猜中歌曲: ${guessedCount}/${totalSongs}`;

    embed.addFields({
        name: '📊 遊戲狀態',
        value: `${progressText}\n剩餘錯誤機會: ${remainingWrongGuesses} 次\n遊戲ID: \`${gameId}\`\n\n**如何遊玩**: 直接在頻道中輸入字母來猜測！\n**特殊指令**: 輸入 \`提示\` 獲得提示，輸入 \`放棄\` 結束遊戲\n**快速操作**: 使用下方按鈕快速輸入答案或獲得提示にゃ`,
        inline: false
    });

    embed.setFooter({ 
        text: 'Salt 說：直接在頻道中輸入字母猜測，或用按鈕快速操作にゃ'
    })
    .setTimestamp();

    return embed;
}

function createGameComponents(gameId) {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`guess_song_1_${gameId}`)
                .setLabel('🎵 猜第1首歌')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`guess_song_2_${gameId}`)
                .setLabel('🎵 猜第2首歌')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`guess_song_3_${gameId}`)
                .setLabel('🎵 猜第3首歌')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`guess_song_4_${gameId}`)
                .setLabel('🎵 猜第4首歌')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`guess_song_5_${gameId}`)
                .setLabel('🎵 猜第5首歌')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`game_hint_${gameId}`)
                .setLabel('💡 獲得提示')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`game_give_up_${gameId}`)
                .setLabel('❌ 放棄遊戲')
                .setStyle(ButtonStyle.Danger)
        );

    return [row1, row2, row3];
}

function getGameEmoji(gameName) {
    return '🎡'; // maimai DX 的統一圖示
}

function getGenreEmoji(genre) {
    const genreEmojis = {
        'maimai': '🎡'  // maimai 原創曲專用圖示
    };
    return genreEmojis[genre] || '🎵';
}

function checkGameComplete(songs, revealedLetters, guessedSongs = new Set()) {
    return songs.every((song, index) => {
        // 如果歌曲已經被猜中，直接返回 true
        if (guessedSongs.has(index)) {
            return true;
        }
        
        // 否則檢查歌曲是否完全解開
        const maskedName = createMaskedSongName(song.name, revealedLetters, false);
        return !maskedName.includes('_');
    });
}

// 檢查特定歌曲是否完全解開（用於判斷是否失效）
function isSongFullyRevealed(song, revealedLetters) {
    const maskedName = createMaskedSongName(song.name, revealedLetters, false);
    return !maskedName.includes('_');
}

function getDifficultyColor(difficulty) {
    switch (difficulty) {
        case 'easy': return 0x00FF00;
        case 'medium': return 0xFFFF00;
        case 'hard': return 0xFF0000;
        default: return 0x8A2BE2;
    }
}

function getDifficultyEmoji(difficulty) {
    switch (difficulty) {
        case 'easy': return '🟢 簡單';
        case 'medium': return '🟡 普通';
        case 'hard': return '🔴 困難';
        default: return '🎲 隨機';
    }
}

function getExtraHint(songData) {
    const extraHints = {
        'Violet': 'Salt 最喜歡的顏色主題歌曲にゃ～',
        'FREEDOM DiVE': '這首歌是很多音遊玩家的噩夢にゃ...',
        'Fracture Ray': 'Arcaea 的代表性高難度曲目にゃ',
        'Senbonzakura': '櫻花飛舞的美麗歌曲にゃ～',
        'ROBO Head': '機器人主題，很有科技感にゃ',
        'Tempestissimo': '暴風雨般的超高難度，Salt 也覺得很難にゃ',
        'Another Me': '關於自我探索的歌曲にゃ',
        'The Big Black': 'osu! 的傳說級譜面にゃ'
    };
    
    return extraHints[songData.answer] || `這首歌的作曲家是 ${songData.artist} にゃ～`;
}

// 清理最近使用歌曲列表的函數
function clearRecentSongs() {
    recentlyUsedSongs.clear();
    console.log('Salt 說：最近使用歌曲列表已清空にゃ！');
}

// 獲取最近使用歌曲統計的函數
function getRecentSongsStats() {
    return {
        count: recentlyUsedSongs.size,
        maxCount: MAX_RECENT_SONGS,
        songs: Array.from(recentlyUsedSongs)
    };
}

// 匯出函數供其他指令使用
module.exports.activeGames = activeGames;
module.exports.getExtraHint = getExtraHint;
module.exports.createGameComponents = createGameComponents;
module.exports.createGameEmbed = createGameEmbed;
module.exports.isSongFullyRevealed = isSongFullyRevealed;
module.exports.checkGameComplete = checkGameComplete;
module.exports.clearRecentSongs = clearRecentSongs;
module.exports.getRecentSongsStats = getRecentSongsStats;
