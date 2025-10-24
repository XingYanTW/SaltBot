const { SlashCommandBuilder, AttachmentBuilder, ApplicationIntegrationType, InteractionContextType } = require('discord.js');
const { getMaimaiSongs, searchSongs, formatConstant } = require('../../utils/maimaiApi');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// 註冊字體（如果字體文件存在）
try {
    const fontPath = path.join(__dirname, '../../assets/fonts');
    
    // 檢查並註冊 SEGA 圓體字型
    const segaMaruPath = path.join(fontPath, 'SEGAMaruGothicDB.ttf');
    if (fs.existsSync(segaMaruPath)) {
        registerFont(segaMaruPath, { family: 'SEGAMaruGothic' });
        console.log('✅ 成功註冊 SEGAMaruGothic 字體');
    }
    
    // 檢查並註冊其他中文字體
    const notoSansCJKPath = path.join(fontPath, 'NotoSansCJK-Regular.ttf');
    if (fs.existsSync(notoSansCJKPath)) {
        registerFont(notoSansCJKPath, { family: 'Noto Sans CJK' });
        console.log('✅ 成功註冊 Noto Sans CJK 字體');
    }
    
    // 檢查並註冊英文字體
    const robotoPath = path.join(fontPath, 'Roboto-Regular.ttf');
    if (fs.existsSync(robotoPath)) {
        registerFont(robotoPath, { family: 'Roboto' });
        console.log('✅ 成功註冊 Roboto 字體');
    }
    
    const robotoBoldPath = path.join(fontPath, 'Roboto-Bold.ttf');
    if (fs.existsSync(robotoBoldPath)) {
        registerFont(robotoBoldPath, { family: 'Roboto Bold' });
        console.log('✅ 成功註冊 Roboto Bold 字體');
    }
} catch (error) {
    console.log('字體註冊警告:', error.message);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maimai-song')
        .setDescription('顯示 maimai DX 歌曲詳細資訊')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('歌曲名稱或藝術家')
                .setRequired(true))
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
        .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]),
    async execute(interaction) {
        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        
        try {
            // 從真實 API 獲取歌曲資料
            const songs = await getMaimaiSongs();
            
            // 搜尋歌曲
            const results = searchSongs(songs, query, 'all');
            
            if (results.length === 0) {
                return await interaction.editReply({
                    content: `❌ 找不到包含 "${query}" 的歌曲！\n💡 提示：請嘗試使用部分關鍵字或檢查拼寫。`
                });
            }
            
            // 取第一個搜尋結果
            const song = results[0];
            
            // 創建渲染圖片
            const imageBuffer = await createSongInfoImage(song);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'song-info.png' });
            
            // 準備回覆內容
            let replyContent = `🎵 **${song.title}** - ${song.artist}`;
            
            // 如果有多個搜尋結果，顯示提示
            if (results.length > 1) {
                replyContent += `\n\n🔍 **其他搜尋結果** (共找到 ${results.length} 首)：\n`;
                replyContent += results.slice(1, 4).map((s, i) => `${i + 2}. ${s.title} - ${s.artist}`).join('\n');
                if (results.length > 4) {
                    replyContent += `\n還有 ${results.length - 4} 首...`;
                }
            }
            
            await interaction.editReply({ 
                content: replyContent,
                files: [attachment] 
            });
            
        } catch (error) {
            console.error('查詢 maimai 歌曲詳情時發生錯誤:', error);
            await interaction.editReply({
                content: '❌ 查詢歌曲詳情時發生錯誤，請稍後再試。'
            });
        }
    },
};

// 創建歌曲信息圖片
async function createSongInfoImage(song) {
    const canvas = createCanvas(800, 800); // 增加高度以適應上下排列
    const ctx = canvas.getContext('2d');
    
    // 設置字體回退順序（優先使用 SEGA 字體）
    const baseFont = 'SEGAMaruGothic, "Microsoft YaHei", Arial, sans-serif';
    const boldFont = 'SEGAMaruGothic, "Microsoft YaHei", Arial, sans-serif';
    
    // 添加圓角矩形函數
    function roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        return ctx;
    }
    
    // 添加文字陰影效果
    function drawTextWithShadow(ctx, text, x, y, shadowColor = 'rgba(0,0,0,0.5)', offsetX = 2, offsetY = 2) {
        const originalFillStyle = ctx.fillStyle;
        
        // 繪製陰影
        ctx.fillStyle = shadowColor;
        ctx.fillText(text, x + offsetX, y + offsetY);
        
        // 繪製主文字
        ctx.fillStyle = originalFillStyle;
        ctx.fillText(text, x, y);
    }
    
    // 添加文字描邊效果
    function drawTextWithStroke(ctx, text, x, y, strokeColor = 'rgba(0,0,0,0.8)', strokeWidth = 2) {
        const originalStrokeStyle = ctx.strokeStyle;
        const originalLineWidth = ctx.lineWidth;
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        
        ctx.strokeStyle = originalStrokeStyle;
        ctx.lineWidth = originalLineWidth;
    }
    
    // 載入並繪製背景圖片
    try {
        const backgroundPath = path.join(__dirname, '../../assets/sprites/background.png');
        const backgroundImage = await loadImage(backgroundPath);
        
        // 將背景圖片縮放至畫布大小
        ctx.drawImage(backgroundImage, 0, 0, 800, 800);
    } catch (error) {
        console.warn('無法載入背景圖片，使用預設漸層背景:', error.message);
        // 如果載入失敗，回到原來的漸層背景
        const gradient = ctx.createRadialGradient(400, 400, 0, 400, 400, 500);
        gradient.addColorStop(0, '#ffb7cd');
        gradient.addColorStop(0.4, '#ffb7cd');
        gradient.addColorStop(1, '#ff4799');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 800);
    }
    
    // 主要信息區域背景 - 使用 CommonBox 風格邊框
    // 最外層陰影效果
    ctx.shadowColor = 'rgba(17, 33, 104, 0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    
    // 外層白色邊框 (2px)
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 16, 16, 768, 768, 28);
    ctx.fill();
    
    // 重置陰影
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // 青色邊框層 (6px = 8px - 2px)
    ctx.fillStyle = '#42e7d7';
    roundRect(ctx, 18, 18, 764, 764, 28);
    ctx.fill();
    
    // 內層白色邊框 (2px)
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 24, 24, 752, 752, 28);
    ctx.fill();
    
    // 主要內容區域 - 使用漸層背景 (上半部分青色，下半部分紫色)
    const contentGradient = ctx.createLinearGradient(30, 30, 30, 774);
    contentGradient.addColorStop(0, '#42e7d7');    // 上半部分青色
    contentGradient.addColorStop(0.5, '#42e7d7');  // 中間點仍是青色
    contentGradient.addColorStop(0.5, '#8e92e1');  // 中間點開始變成紫色
    contentGradient.addColorStop(1, '#8e92e1');    // 下半部分紫色
    ctx.fillStyle = contentGradient;
    
    roundRect(ctx, 30, 30, 740, 740, 28);
    ctx.fill();
    
    // 添加縮小的白色背景，讓藍紫色漸層成為邊框
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 42, 42, 716, 716, 22); // 縮小12px，露出藍紫色邊框
    ctx.fill();
    
    // 主標題區域 - 在白色背景上使用半透明覆蓋層
    const titleGradient = ctx.createLinearGradient(60, 60, 692, 180);
    titleGradient.addColorStop(0, 'rgba(240, 240, 240, 0.8)');
    titleGradient.addColorStop(1, 'rgba(220, 220, 220, 0.6)');
    ctx.fillStyle = titleGradient;
    roundRect(ctx, 60, 60, 680, 120, 15);
    ctx.fill();
    
    // 封面圖片 - 調整位置配合新邊框
    let jacketWidth = 100;
    let jacketHeight = 100;
    try {
        if (song.imageUrl) {
            let imageUrl = song.imageUrl;
            if (!imageUrl.startsWith('http')) {
                imageUrl = `https://otoge-db.net/maimai/jacket/${imageUrl}`;
            }
            
            const songImage = await loadImage(imageUrl);
            
            // 繪製封面 - 去掉圓角和陰影
            ctx.drawImage(songImage, 80, 70, jacketWidth, jacketHeight);
            
            // 封面邊框 - 使用分類顏色
            ctx.strokeStyle = getGenreColor(song.genreName);
            ctx.lineWidth = 3;
            ctx.strokeRect(80, 70, jacketWidth, jacketHeight);
        }
    } catch (error) {
        // 如果無法載入圖片，顯示預設圖示
        const placeholderGradient = ctx.createLinearGradient(80, 70, 180, 170);
        placeholderGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        placeholderGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        ctx.fillStyle = placeholderGradient;
        ctx.fillRect(80, 70, jacketWidth, jacketHeight);
        
        ctx.fillStyle = '#000000';
        ctx.font = `32px ${baseFont}`;
        ctx.textAlign = 'center';
        ctx.fillText('♪', 130, 130);
        
        // 預設圖示邊框 - 使用分類顏色
        ctx.strokeStyle = getGenreColor(song.genreName);
        ctx.lineWidth = 3;
        ctx.strokeRect(80, 70, jacketWidth, jacketHeight);
    }
    
    // 歌曲標題 - 調整位置配合新布局
    ctx.fillStyle = '#000000';
    ctx.font = `bold 32px ${boldFont}`;
    ctx.textAlign = 'left';
    const titleText = song.title.length > 25 ? song.title.substring(0, 25) + '...' : song.title;
    drawTextWithStroke(ctx, titleText, 200, 98, 'rgba(255,255,255,0.8)', 1);
    
    // 藝術家 - 在標題下方
    ctx.font = `20px ${baseFont}`;
    ctx.fillStyle = '#333333';
    ctx.fillText(`${song.artist}`, 200, 120);
    
    // 分類和 BPM - 在藝術家下方
    ctx.font = `18px ${baseFont}`;
    ctx.fillStyle = '#666666';
    const categoryText = `分類: ${song.genreName || 'Unknown'}`;
    const bpmText = `BPM: ${song.bpm?.toString() || 'Unknown'}`;
    ctx.fillText(`${categoryText} | ${bpmText}`, 200, 155);
    
    // 版本信息 - 移到最右邊
    try {
        const versionImagePath = getVersionImagePath(song.version);
        if (versionImagePath && fs.existsSync(versionImagePath)) {
            const versionImage = await loadImage(versionImagePath);
            
            // 計算適當的圖片大小 - 再次放大版本圖片
            const maxWidth = 332*0.7;  // 從 200 增加到 250
            const maxHeight = 164*.7;  // 從 50 增加到 65
            const scale = Math.min(maxWidth / versionImage.width, maxHeight / versionImage.height);
            const imgWidth = versionImage.width * scale;
            const imgHeight = versionImage.height * scale;
            
            // 將版本圖片放在右側，距離右邊界有一定邊距
            const versionX = 752 - imgWidth - 10; // 減少邊距以適應更大的圖片
            const versionY = 58 + (120 - imgHeight) / 2; // 垂直居中在標題區域
            
            ctx.drawImage(versionImage, versionX, versionY, imgWidth, imgHeight);
        } else {
            // 如果找不到版本圖片，回到文字顯示
            ctx.font = `15px ${baseFont}`;
            ctx.fillStyle = '#f0f0f0';
            ctx.textAlign = 'right';
            const versionText = song.version || 'Unknown';
            const displayText = `版本: ${versionText.length > 15 ? versionText.substring(0, 15) + '...' : versionText}`;
            ctx.fillText(displayText, 740, 100); // 右對齊顯示
        }
    } catch (error) {
        // 出錯時回到文字顯示
        ctx.font = `15px ${baseFont}`;
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'right';
        const versionText = song.version || 'Unknown';
        const displayText = `版本: ${versionText.length > 15 ? versionText.substring(0, 15) + '...' : versionText}`;
        ctx.fillText(displayText, 732, 108); // 右對齊顯示，配合加粗邊框
    }
    
    // STD 和 DX 譜面區域 - 改為上下排列
    const stdCharts = song.charts.filter(chart => !chart.difficulty.startsWith('dx_'));
    const dxCharts = song.charts.filter(chart => chart.difficulty.startsWith('dx_'));
    
    // 定義難度順序（供 STD 和 DX 使用）
    const difficultyOrder = ['basic', 'advanced', 'expert', 'master', 'remaster'];
    
    let currentY = 190; // 開始位置調整到更靠近標題
    
    // 表格區域設定
    const tableX = 60; // 表格左邊界 - 調整以適應新布局
    const tableWidth = 680; // 表格寬度 - 調整以適應縮小的白色背景
    
    // 計算所需的高度
    const maxChartsPerTable = Math.max(stdCharts.length, dxCharts.length);
    const tableHeight = 85 + (maxChartsPerTable * 32) + 30; // 增加標題高度 + 增加行高 + 增加底部空間
    
    // STD 譜面區域 - 放在上方
    if (stdCharts.length > 0) {
        // STD 譜面背景 - 使用 maimai 風格青色半透明背景
        ctx.fillStyle = 'rgba(66, 231, 215, 0.1)';
        roundRect(ctx, tableX, currentY, tableWidth, tableHeight, 10);
        ctx.fill();
        
        // 載入並顯示 STD 模式圖標
        try {
            const stdIconPath = path.join(__dirname, '../../assets/sprites/UI_TST_Infoicon_StandardMode.png');
            const stdIcon = await loadImage(stdIconPath);
            
            // 繪製 STD 圖標
            ctx.drawImage(stdIcon, tableX + 20, currentY + 15, 120, 38);
        } catch (error) {
            // 如果圖標載入失敗，使用文字
            ctx.fillStyle = '#ffeb3b';
            ctx.font = `bold 24px ${boldFont}`;
            ctx.textAlign = 'left';
            drawTextWithStroke(ctx, 'STANDARD', tableX + 20, currentY + 35, 'rgba(0,0,0,0.8)', 2);
        }
        
        // STD 譜面表格
        const stdTableStartY = currentY + 75; // 增加標題區域高度
        const stdRowHeight = 32; // 增加行高以提供更好的視覺效果
        
        // STD 表格標題
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        roundRect(ctx, tableX + 10, stdTableStartY - 8, tableWidth - 20, stdRowHeight, 3);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.font = `bold 14px ${boldFont}`; // 增加表格標題字體大小
        ctx.textAlign = 'center';
        ctx.fillText('難度', tableX + 80, stdTableStartY + 12);
        ctx.fillText('等級', tableX + 180, stdTableStartY + 12);
        ctx.fillText('定數', tableX + 280, stdTableStartY + 12);
        ctx.fillText('Notes', tableX + 380, stdTableStartY + 12);
        ctx.fillText('Designer', tableX + 540, stdTableStartY + 12);
        
        // STD 譜面內容
        let stdY = stdTableStartY + stdRowHeight + 5; // 增加與標題的間距
        ctx.font = `13px ${baseFont}`; // 增加表格內容字體大小
        
        const sortedStdCharts = stdCharts.sort((a, b) => {
            const aIndex = difficultyOrder.indexOf(a.difficulty);
            const bIndex = difficultyOrder.indexOf(b.difficulty);
            return aIndex - bIndex;
        });
        
        // 預載所有等級圖片和難度按鈕圖片
        const levelImageCache = {};
        let difficultyButtonImage = null;
        
        // 載入難度按鈕圖片
        try {
            const diffButtonPath = path.join(__dirname, '../../assets/sprites/search_level_btn.png');
            if (fs.existsSync(diffButtonPath)) {
                difficultyButtonImage = await loadImage(diffButtonPath);
            }
        } catch (error) {
            console.log('無法載入難度按鈕圖片:', error.message);
        }
        
        for (const chart of sortedStdCharts) {
            try {
                const levelImagePath = getLevelImagePath(chart.level);
                if (levelImagePath && fs.existsSync(levelImagePath)) {
                    levelImageCache[chart.level] = await loadImage(levelImagePath);
                }
            } catch (error) {
                console.log(`無法載入等級圖片: ${chart.level}`);
            }
        }
        
        sortedStdCharts.forEach((chart, index) => {
            // 交替行背景
            if (index % 2 === 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                roundRect(ctx, tableX + 10, stdY - 12, tableWidth - 20, stdRowHeight - 3, 2);
                ctx.fill();
            }
            
            const diffColor = getDifficultyColor(chart.difficulty);
            const diffName = chart.difficulty.toUpperCase();
            
            // 使用難度按鈕圖片
            if (difficultyButtonImage) {
                const diffIndex = getDifficultyIndex(chart.difficulty);
                if (diffIndex !== -1) {
                    // 每個難度按鈕的尺寸：165x56
                    const buttonWidth = 165;
                    const buttonHeight = 56;
                    
                    // 計算適當的縮放比例，適合表格行高
                    const targetHeight = 20; // 適合更高行高的目標高度
                    const scale = targetHeight / buttonHeight;
                    const imgWidth = buttonWidth * scale;
                    const imgHeight = targetHeight;
                    
                    // 置中顯示難度按鈕
                    const imgX = tableX + 80 - imgWidth / 2;
                    const imgY = stdY - 8; // 調整垂直位置以適應更高的行
                    
                    // 裁剪對應的難度按鈕
                    ctx.drawImage(
                        difficultyButtonImage,
                        diffIndex * buttonWidth, 0, buttonWidth, buttonHeight, // 源圖片裁剪範圍
                        imgX, imgY, imgWidth, imgHeight                         // 目標位置和大小
                    );
                } else {
                    // 如果無法確定難度索引，回到文字顯示
                    ctx.fillStyle = diffColor;
                    ctx.fillText(diffName, tableX + 80, stdY + 6);
                }
            } else {
                // 如果難度按鈕圖片載入失敗，回到文字顯示
                ctx.fillStyle = diffColor;
                ctx.fillText(diffName, tableX + 80, stdY + 6);
            }
            
            // 使用等級圖片替代文字
            if (levelImageCache[chart.level]) {
                const levelImage = levelImageCache[chart.level];
                
                // 等級圖片裁剪範圍: 從(77,71)開始，大小177x65
                const sourceX = 77;
                const sourceY = 71;
                const sourceWidth = 177;
                const sourceHeight = 65;
                
                // 根據表格行高計算適當的縮放比例
                const targetHeight = 22; // 適合更高行高的目標高度
                const scale = targetHeight / sourceHeight; // 基於裁剪後高度 65px
                const imgWidth = sourceWidth * scale; // 基於裁剪後寬度 177px
                const imgHeight = targetHeight;
                
                // 置中顯示等級圖片
                const imgX = tableX + 180 - imgWidth / 2;
                const imgY = stdY - 6; // 調整垂直位置以適應更高的行
                
                // 使用 drawImage 的裁剪功能
                ctx.drawImage(
                    levelImage,
                    sourceX, sourceY, sourceWidth, sourceHeight, // 源圖片裁剪範圍
                    imgX, imgY, imgWidth, imgHeight              // 目標位置和大小
                );
            } else {
                // 如果圖片載入失敗，回到文字顯示
                ctx.fillStyle = '#000000';
                ctx.fillText(`${chart.level}`, tableX + 180, stdY + 6);
            }
            
            const constantText = chart.constant !== null ? formatConstant(chart.constant) : '-';
            ctx.fillStyle = '#333333';
            ctx.fillText(constantText, tableX + 280, stdY + 6);
            
            const notesText = chart.notes ? chart.notes.toString() : '-';
            ctx.fillStyle = '#333333';
            ctx.fillText(notesText, tableX + 380, stdY + 6);
            
            // Designer 信息
            const designerText = chart.noteDesigner || '-';
            ctx.fillStyle = '#333333';
            // 增加文字寬度限制以適應更寬的表格
            const maxDesignerWidth = 120;
            let displayDesigner = designerText;
            if (ctx.measureText(designerText).width > maxDesignerWidth) {
                while (ctx.measureText(displayDesigner + '...').width > maxDesignerWidth && displayDesigner.length > 0) {
                    displayDesigner = displayDesigner.slice(0, -1);
                }
                displayDesigner += '...';
            }
            ctx.fillText(displayDesigner, tableX + 540, stdY + 6);
            
            stdY += stdRowHeight;
        });
        
        // 更新 currentY 到 STD 表格後
        currentY += tableHeight + 20; // 增加間距
    }
    
    // DX 譜面區域 - 放在 STD 表格下方
    if (dxCharts.length > 0) {
        // DX 譜面背景 - 使用 maimai 風格青色半透明背景
        ctx.fillStyle = 'rgba(66, 231, 215, 0.1)';
        roundRect(ctx, tableX, currentY, tableWidth, tableHeight, 10);
        ctx.fill();
        
        // 載入並顯示 DX 模式圖標
        try {
            const dxIconPath = path.join(__dirname, '../../assets/sprites/UI_TST_Infoicon_DeluxeMode.png');
            const dxIcon = await loadImage(dxIconPath);
            
            // 繪製 DX 圖標
            ctx.drawImage(dxIcon, tableX + 20, currentY + 15, 120, 38);
        } catch (error) {
            // 如果圖標載入失敗，使用文字
            ctx.fillStyle = '#ff9800';
            ctx.font = `bold 24px ${boldFont}`;
            ctx.textAlign = 'left';
            drawTextWithStroke(ctx, 'DELUXE', tableX + 20, currentY + 35, 'rgba(0,0,0,0.8)', 2);
        }
        
        // DX 譜面表格
        const dxTableStartY = currentY + 75; // 增加標題區域高度
        const dxRowHeight = 32; // 增加行高以提供更好的視覺效果
        
        // DX 表格標題
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        roundRect(ctx, tableX + 10, dxTableStartY - 8, tableWidth - 20, dxRowHeight, 3);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.font = `bold 14px ${boldFont}`; // 增加表格標題字體大小
        ctx.textAlign = 'center';
        ctx.fillText('難度', tableX + 80, dxTableStartY + 12);
        ctx.fillText('等級', tableX + 180, dxTableStartY + 12);
        ctx.fillText('定數', tableX + 280, dxTableStartY + 12);
        ctx.fillText('Notes', tableX + 380, dxTableStartY + 12);
        ctx.fillText('Designer', tableX + 540, dxTableStartY + 12);
        
        // DX 譜面內容
        let dxY = dxTableStartY + dxRowHeight + 5; // 增加與標題的間距
        ctx.font = `13px ${baseFont}`; // 增加表格內容字體大小
        
        const sortedDxCharts = dxCharts.sort((a, b) => {
            const aDiff = a.difficulty.replace('dx_', '');
            const bDiff = b.difficulty.replace('dx_', '');
            const aIndex = difficultyOrder.indexOf(aDiff);
            const bIndex = difficultyOrder.indexOf(bDiff);
            return aIndex - bIndex;
        });
        
        // 預載所有 DX 等級圖片和難度按鈕圖片
        const dxLevelImageCache = {};
        let dxDifficultyButtonImage = null;
        
        // 載入難度按鈕圖片
        try {
            const diffButtonPath = path.join(__dirname, '../../assets/sprites/search_level_btn.png');
            if (fs.existsSync(diffButtonPath)) {
                dxDifficultyButtonImage = await loadImage(diffButtonPath);
            }
        } catch (error) {
            console.log('無法載入 DX 難度按鈕圖片:', error.message);
        }
        
        for (const chart of sortedDxCharts) {
            try {
                const levelImagePath = getLevelImagePath(chart.level);
                if (levelImagePath && fs.existsSync(levelImagePath)) {
                    dxLevelImageCache[chart.level] = await loadImage(levelImagePath);
                }
            } catch (error) {
                console.log(`無法載入 DX 等級圖片: ${chart.level}`);
            }
        }
        
        sortedDxCharts.forEach((chart, index) => {
            // 交替行背景
            if (index % 2 === 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                roundRect(ctx, tableX + 10, dxY - 12, tableWidth - 20, dxRowHeight - 3, 2);
                ctx.fill();
            }
            
            const difficulty = chart.difficulty.replace('dx_', '');
            const diffColor = getDifficultyColor(difficulty);
            const diffName = difficulty.toUpperCase();
            
            // 使用難度按鈕圖片
            if (dxDifficultyButtonImage) {
                const diffIndex = getDifficultyIndex(difficulty);
                if (diffIndex !== -1) {
                    // 每個難度按鈕的尺寸：165x56
                    const buttonWidth = 165;
                    const buttonHeight = 56;
                    
                    // 計算適當的縮放比例，適合表格行高
                    const targetHeight = 20; // 適合更高行高的目標高度
                    const scale = targetHeight / buttonHeight;
                    const imgWidth = buttonWidth * scale;
                    const imgHeight = targetHeight;
                    
                    // 置中顯示難度按鈕
                    const imgX = tableX + 80 - imgWidth / 2;
                    const imgY = dxY - 8; // 調整垂直位置以適應更高的行
                    
                    // 裁剪對應的難度按鈕
                    ctx.drawImage(
                        dxDifficultyButtonImage,
                        diffIndex * buttonWidth, 0, buttonWidth, buttonHeight, // 源圖片裁剪範圍
                        imgX, imgY, imgWidth, imgHeight                         // 目標位置和大小
                    );
                } else {
                    // 如果無法確定難度索引，回到文字顯示
                    ctx.fillStyle = diffColor;
                    ctx.fillText(diffName, tableX + 80, dxY + 6);
                }
            } else {
                // 如果難度按鈕圖片載入失敗，回到文字顯示
                ctx.fillStyle = diffColor;
                ctx.fillText(diffName, tableX + 80, dxY + 6);
            }
            
            // 使用等級圖片替代文字
            if (dxLevelImageCache[chart.level]) {
                const levelImage = dxLevelImageCache[chart.level];
                
                // 等級圖片裁剪範圍: 從(77,71)開始，大小177x65
                const sourceX = 77;
                const sourceY = 71;
                const sourceWidth = 177;
                const sourceHeight = 65;
                
                // 根據表格行高計算適當的縮放比例
                const targetHeight = 22; // 適合更高行高的目標高度
                const scale = targetHeight / sourceHeight; // 基於裁剪後高度 65px
                const imgWidth = sourceWidth * scale; // 基於裁剪後寬度 177px
                const imgHeight = targetHeight;
                
                // 置中顯示等級圖片
                const imgX = tableX + 180 - imgWidth / 2;
                const imgY = dxY - 6; // 調整垂直位置以適應更高的行
                
                // 使用 drawImage 的裁剪功能
                ctx.drawImage(
                    levelImage,
                    sourceX, sourceY, sourceWidth, sourceHeight, // 源圖片裁剪範圍
                    imgX, imgY, imgWidth, imgHeight              // 目標位置和大小
                );
            } else {
                // 如果圖片載入失敗，回到文字顯示
                ctx.fillStyle = '#000000';
                ctx.fillText(`${chart.level}`, tableX + 180, dxY + 6);
            }
            
            const constantText = chart.constant !== null ? formatConstant(chart.constant) : '-';
            ctx.fillStyle = '#333333';
            ctx.fillText(constantText, tableX + 280, dxY + 6);
            
            const notesText = chart.notes ? chart.notes.toString() : '-';
            ctx.fillStyle = '#333333';
            ctx.fillText(notesText, tableX + 380, dxY + 6);
            
            const designerText = chart.noteDesigner || '-';
            ctx.fillStyle = '#333333';
            // 如果文字太長，截斷並添加省略號
            const maxDesignerWidth = 120;
            let displayDesigner = designerText;
            if (ctx.measureText(designerText).width > maxDesignerWidth) {
                while (ctx.measureText(displayDesigner + '...').width > maxDesignerWidth && displayDesigner.length > 0) {
                    displayDesigner = displayDesigner.slice(0, -1);
                }
                displayDesigner += '...';
            }
            ctx.fillText(displayDesigner, tableX + 540, dxY + 6);
            
            dxY += dxRowHeight;
        });
    }
    // 底部文字
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = `13px ${baseFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('maimai DX Song Information | Generated by SaltBot', 400, 750);
    
    return canvas.toBuffer('image/png');
}

// 獲取難度顏色 - 使用 maimai DX 官方顏色
function getDifficultyColor(difficulty) {
    const colors = {
        basic: '#22BB5B',     // maimai 官方綠色
        advanced: '#FB9C2D',  // maimai 官方橙色  
        expert: '#F64C7B',    // maimai 官方紅色
        master: '#9A5ABB',    // maimai 官方紫色
        remaster: '#DDDDDD'   // maimai 官方白色
    };
    return colors[difficulty] || '#FFFFFF';
}

function getGenreColor(genre){
    const colors = {
        'POPS＆アニメ': '#ff9c24',
        'niconico＆ボーカロイド': '#12b4ff',
        'ゲーム＆バラエティ': '#6ae03f',
        '東方Project': '#ca6feb',
        'maimai': '#ff4646',
        'オンゲキ＆CHUNITHM': '#6ae03f',
        '宴会場': '#dc39b8'
    };
    return colors[genre] || '#FFFFFF';
}

// 獲取難度索引（用於難度按鈕圖片裁剪）
function getDifficultyIndex(difficulty) {
    const difficulties = ['basic', 'advanced', 'expert', 'master', 'remaster'];
    return difficulties.indexOf(difficulty.toLowerCase());
}

// 獲取等級圖片路徑
function getLevelImagePath(level) {
    if (!level) return null;
    
    const levelStr = level.toString();
    let fileName;
    
    if (levelStr.includes('+')) {
        // 處理帶 + 的等級，例如 "7+" -> "07p"
        const baseLevel = levelStr.replace('+', '');
        fileName = `${baseLevel.padStart(2, '0')}p`;
    } else {
        // 處理普通等級，例如 "7" -> "07"
        fileName = levelStr.padStart(2, '0');
    }
    
    const imagePath = path.join(__dirname, `../../assets/sprites/level/UI_CMN_TabTitle_Level_${fileName}.png`);
    
    // 檢查文件是否存在
    if (!fs.existsSync(imagePath)) {
        console.log(`等級圖片不存在: ${imagePath}`);
        return null;
    }
    
    return imagePath;
}

// 獲取版本圖片路徑
function getVersionImagePath(version) {
    if (!version) return null;
    
    // 版本號到圖片文件名的映射
    const versionMap = {
        '10000': '100',   // maimai
        '11000': '110',   // maimai PLUS
        '12000': '120',   // maimai GreeN
        '13000': '130',   // maimai GreeN PLUS
        '14000': '140',   // maimai ORANGE
        '15000': '150',   // maimai ORANGE PLUS
        '16000': '160',   // maimai PiNK
        '17000': '170',   // maimai PiNK PLUS
        '18000': '180',   // maimai MURASAKi
        '18500': '185',   // maimai MURASAKi PLUS
        '19000': '190',   // maimai MiLK
        '19500': '195',   // maimai MiLK PLUS
        '19900': '199',   // maimai FiNALE
        '20000': '200',   // maimai DX
        '21000': '210',   // maimai DX PLUS
        '21400': '214',   // maimai DX Splash
        '21500': '215',   // maimai DX Splash PLUS
        '22000': '220',   // maimai DX UNiVERSE
        '22500': '225',   // maimai DX UNiVERSE PLUS
        '23000': '230',   // maimai DX FESTiVAL
        '23500': '235',   // maimai DX FESTiVAL PLUS
        '24000': '240',   // maimai DX BUDDiES
        '24500': '245',   // maimai DX BUDDiES PLUS
        '25000': '250',   // maimai DX PRiSM
        '25500': '255',   // maimai DX PRiSM PLUS
        '26000': '260'    // maimai DX CiRCLE
    };
    
    // 轉換版本字符串（處理可能的數字或字符串格式）
    const versionStr = version.toString();
    let versionCode = versionMap[versionStr];
    
    // 如果找不到精確匹配，優先匹配同一主版本系列
    if (!versionCode) {
        const versionNum = parseInt(versionStr);
        if (!isNaN(versionNum)) {
            // 獲取所有版本號並排序
            const availableVersions = Object.keys(versionMap)
                .map(Number)
                .sort((a, b) => a - b);
            
            // 首先嘗試匹配主版本號，但要考慮小版本
            const mainVersion = Math.floor(versionNum / 1000) * 1000;
            const subVersion = versionNum % 1000;
            
            // 如果小版本號 >= 500，則映射到對應的 PLUS 版本
            if (subVersion >= 500 && versionMap[(mainVersion + 500).toString()]) {
                versionCode = versionMap[(mainVersion + 500).toString()];
                console.log(`版本 ${version} 映射到 PLUS 版本 ${mainVersion + 500}`);
            } else if (versionMap[mainVersion.toString()]) {
                versionCode = versionMap[mainVersion.toString()];
                console.log(`版本 ${version} 映射到主版本 ${mainVersion}`);
            } else {
                // 如果主版本不存在，則使用 >= 邏輯找到合適的版本
                for (const availableVersion of availableVersions) {
                    if (versionNum <= availableVersion) {
                        versionCode = versionMap[availableVersion.toString()];
                        console.log(`版本 ${version} 映射到 ${availableVersion} (使用 >= 邏輯)`);
                        break;
                    }
                }
                
                // 如果所有版本都小於當前版本，使用最新版本
                if (!versionCode && availableVersions.length > 0) {
                    const latestVersion = availableVersions[availableVersions.length - 1];
                    versionCode = versionMap[latestVersion.toString()];
                    console.log(`版本 ${version} 超出範圍，使用最新版本 ${latestVersion}`);
                }
            }
        }
    }
    
    if (!versionCode) {
        console.log(`無法匹配版本格式: ${version}`);
        return null;
    }
    
    const imagePath = path.join(__dirname, `../../assets/sprites/versions/UI_CMN_TabTitle_MaimaiTitle_Ver${versionCode}.png`);
    
    // 檢查文件是否存在
    if (!fs.existsSync(imagePath)) {
        console.log(`版本圖片不存在: ${imagePath}`);
        return null;
    }
    
    return imagePath;
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
