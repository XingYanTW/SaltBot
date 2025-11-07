const { SlashCommandBuilder, AttachmentBuilder, ApplicationIntegrationType, InteractionContextType } = require('discord.js');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// 設置忽略 SSL 憑證驗證
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const jar = new CookieJar();
const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
}));

// 註冊字體（如果字體文件存在）
try {
    const fontPath = path.join(__dirname, '../../assets/fonts');
    
    // 檢查並註冊 SEGA 圓體字型
    const segaMaruPath = path.join(fontPath, 'SEGAMaruGothicDB.ttf');
    if (fs.existsSync(segaMaruPath)) {
        registerFont(segaMaruPath, { family: 'SEGAMaruGothic' });
        console.log('✅ 成功註冊 SEGAMaruGothic 字體 (KOP)');
    }
    
    // 檢查並註冊其他中文字體
    const notoSansCJKPath = path.join(fontPath, 'NotoSansCJK-Regular.ttf');
    if (fs.existsSync(notoSansCJKPath)) {
        registerFont(notoSansCJKPath, { family: 'Noto Sans CJK' });
        console.log('✅ 成功註冊 Noto Sans CJK 字體 (KOP)');
    }
} catch (error) {
    console.log('字體註冊警告 (KOP):', error.message);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maimai-kop')
        .setDescription('查看 maimai DX KOP 錦標賽排行榜')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('選擇伺服器地區')
                .setRequired(false)
                .addChoices(
                    { name: '🇯🇵 JP (日本)', value: 'jp' },
                    { name: '🌍 Intl (國際)', value: 'intl' }
                ))
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
        .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]),
    async execute(interaction) {
        await interaction.deferReply();
        
        // 用於累積進度訊息
        const progressMessages = [];
        
        // 取得伺服器選擇，預設為 JP
        const serverChoice = interaction.options.getString('server') || 'jp';
        const serverName = serverChoice === 'jp' ? '🇯🇵 JP (日本)' : '🌍 Intl (國際)';
        
        try {
            // 開始處理訊息
            progressMessages.push(`🔄 正在連接到 maimai DX 官網 (${serverName})...`);
            await interaction.editReply({
                content: progressMessages.join('\n')
            });
            
            const rankingData = await login(interaction, progressMessages, serverChoice);
            
            if (!rankingData || !rankingData.ranking || rankingData.ranking.length === 0) {
                await interaction.editReply({
                    content: progressMessages.join('\n') + '\n❌ 無法獲取排行榜資料，可能是登入失敗或網站維護中。'
                });
                return;
            }
            
            // 生成排行榜圖片
            const imageBuffer = await generateRankingImage(rankingData, interaction, progressMessages, serverChoice);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'kop-ranking.png' });
            
            let replyContent = `🏆 **maimai DX KOP 錦標賽排行榜** (${serverName})\n`;
            replyContent += `📊 顯示前 ${Math.min(rankingData.ranking.length, 20)} 名玩家\n`;
            replyContent += `⏰ 更新時間: ${new Date().toLocaleString('zh-TW')}`;
            
            await interaction.editReply({ 
                content: replyContent,
                files: [attachment] 
            });
            
        } catch (error) {
            console.error('KOP 排行榜指令執行錯誤:', error);
            await interaction.editReply({
                content: progressMessages.join('\n') + '\n❌ 獲取排行榜時發生錯誤，請稍後再試。'
            });
        }
    },
};

async function login(interaction, progressMessages, serverChoice = 'jp') {
    try {
        // 根據伺服器選擇設定基礎 URL
        const baseUrl = serverChoice === 'jp' 
            ? 'https://maimaidx.jp/maimai-mobile' 
            : 'https://maimaidx-eng.com/maimai-mobile';
        
        // Step 1: 取得登入頁面
        const res1 = await client.get(`${baseUrl}/`);
        const html = res1.data;

        // Step 2: 從 HTML 抓出 token（若有）
        const token = html.match(/name="token" value="([^"]+)"/)?.[1];
        console.log("Token:", token);

        // Step 3: 組登入資料
        const params = new URLSearchParams({
            segaId: process.env.MAIMAI_SEGA_ID,
            password: process.env.MAIMAI_PASSWORD,
            ...(token ? { token } : {}),
        });

        // Step 4: 發送登入請求
        if (interaction && progressMessages) {
            progressMessages.push('🔐 正在登入 SEGA ID...');
            await interaction.editReply({
                content: progressMessages.join('\n')
            });
        }
        
        // 對於國際版，跳過標準登入流程
        if (serverChoice === 'intl') {
            console.log("國際版：跳過標準登入流程");
        } else {
            const res2 = await client.post(
                `${baseUrl}/submit/`,
                params.toString(),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    maxRedirects: 5,
                }
            );
            
            // Step 5: 查看是否登入成功
            console.log("Status:", res2.status);
            console.log("Current cookies:", await jar.getCookies(baseUrl.replace('/maimai-mobile', '')));
        }

        // Step 6: 點擊 Aime 登入按鈕
        console.log("點擊 Aime 登入按鈕...");
        if (interaction && progressMessages) {
            progressMessages.push('🎮 正在選擇 Aime 卡片...');
            await interaction.editReply({
                content: progressMessages.join('\n')
            });
        }
        
        let res3;
        if (serverChoice === 'jp') {
            res3 = await client.get(`${baseUrl}/aimeList/submit/`, {
                params: {
                    idx: 0
                }
            });
        } else {
            // 國際版需要先訪問國際版登入頁面
            if (interaction && progressMessages) {
                progressMessages.push('🌐 正在處理國際版登入流程...');
                await interaction.editReply({
                    content: progressMessages.join('\n')
                });
            }
            
            try {
                // 國際版邏輯 - 使用完整 index_int.js 實作
                console.log("正在訪問國際版登入頁面...");
                const intlLoginUrl = "https://lng-tgk-aime-gw.am-all.net/common_auth/login?site_id=maimaidxex&redirect_url=https://maimaidx-eng.com/maimai-mobile/&back_url=https://maimai.sega.com/";
                const intlRes1 = await client.get(intlLoginUrl);
                const intlHtml = intlRes1.data;
                
                console.log("分析國際版登入頁面結構...");
                
                // 查找表單和輸入欄位
                const formMatch = intlHtml.match(/<form[^>]*action="([^"]+)"[^>]*>/i);
                const usernameFieldMatch = intlHtml.match(/<input[^>]*name="([^"]*(?:user|id|email|login)[^"]*)"[^>]*>/i);
                const passwordFieldMatch = intlHtml.match(/<input[^>]*name="([^"]*password[^"]*)"[^>]*>/i);
                const tokenMatch = intlHtml.match(/name="([^"]*token[^"]*)" value="([^"]+)"/i);
                
                // 使用找到的表單資訊組建登入資料
                const loginAction = formMatch?.[1] || "https://lng-tgk-aime-gw.am-all.net/common_auth/login/sid/";
                const usernameField = usernameFieldMatch?.[1] || "sid";
                const passwordField = passwordFieldMatch?.[1] || "password";
                
                const intlParams = new URLSearchParams();
                intlParams.set(usernameField, process.env.MAIMAI_SEGA_ID);
                intlParams.set(passwordField, process.env.MAIMAI_PASSWORD);
                
                // 添加所有隱藏欄位
                const hiddenInputs = [...intlHtml.matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/gi)];
                hiddenInputs.forEach(match => {
                    intlParams.set(match[1], match[2]);
                });
                
                if (tokenMatch) {
                    intlParams.set(tokenMatch[1], tokenMatch[2]);
                }
                
                // 發送登入請求
                const fullLoginUrl = loginAction.startsWith('http') ? loginAction : `https://lng-tgk-aime-gw.am-all.net${loginAction}`;
                
                const intlRes2 = await client.post(
                    fullLoginUrl,
                    intlParams.toString(),
                    {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "Referer": intlLoginUrl,
                        },
                        maxRedirects: 10,
                    }
                );
                
                console.log(`國際版登入狀態: ${intlRes2.status}`);
                console.log(`國際版登入 URL: ${intlRes2.request?.res?.responseUrl}`);

                // 檢查是否重定向到 maimai 頁面
                let mainPageUrl = "https://maimaidx-eng.com/maimai-mobile/home/";
                
                // 如果登入成功，應該會重定向到 maimai 首頁
                const res3check = await client.get(mainPageUrl);
                console.log(`maimai 首頁狀態: ${res3check.status}`);
                console.log(`maimai 首頁 URL: ${res3check.request?.res?.responseUrl}`);

                // 點擊 Aime 登入按鈕
                console.log("嘗試訪問 Aime 列表...");
                res3 = await client.get("https://maimaidx-eng.com/maimai-mobile/aimeList/submit/", {
                    params: {
                        idx: 0
                    }
                });

                console.log(`Aime 頁面狀態: ${res3.status}`);
                console.log(`Aime 頁面 URL: ${res3.request?.res?.responseUrl}`);
                
            } catch (intlError) {
                console.error("國際版登入錯誤:", intlError.message);
                console.error("錯誤詳情:", intlError.response?.status, intlError.response?.statusText);
                
                // 如果國際版登入失敗，嘗試直接訪問主頁面
                console.log("嘗試直接訪問主頁面...");
                try {
                    res3 = await client.get("https://maimaidx-eng.com/maimai-mobile/home/", {
                        validateStatus: (status) => status < 400,
                    });
                    console.log(`直接訪問主頁面狀態: ${res3.status}`);
                } catch (homeError) {
                    console.error("直接訪問主頁面也失敗:", homeError.message);
                    res3 = { status: 200 }; // 假設成功，讓程序繼續執行
                }
            }
        }

        console.log("Aime 頁面狀態:", res3.status);
        console.log("Aime 頁面 URL:", res3.request?.res?.responseUrl);

        // Step 7: 爬取錦標賽排行榜頁面
        console.log("正在獲取錦標賽排行榜...");
        if (interaction && progressMessages) {
            progressMessages.push('🏆 正在獲取錦標賽排行榜資料...');
            await interaction.editReply({
                content: progressMessages.join('\n')
            });
        }
        
        const tournamentRes = await client.get(`${baseUrl}/home/tournamentRanking/`);

        console.log("錦標賽排行榜頁面狀態:", tournamentRes.status);

        // Step 8: 保存完整 HTML 到檔案以供分析（開發時使用）
        // fs.writeFileSync('tournament_ranking.html', tournamentRes.data);
        // console.log("完整 HTML 已保存到 tournament_ranking.html");

        // Step 9: 搜尋包含 ranking 的內容區段
        const rankingMatches = tournamentRes.data.match(/ranking_top_block|ranking_block/gi);
        console.log("找到的 ranking 相關內容:", rankingMatches?.length || 0, "個");

        // Step 10: 搜尋包含玩家資料的區段
        const contentSection = tournamentRes.data.match(/<div[^>]*class="[^"]*main[^"]*"[^>]*>(.*?)<\/div>/gs);
        if (contentSection) {
            console.log("找到主要內容區段:", contentSection.length, "個");
        }

        // Step 11: 解析 ranking_top_block 和 ranking_block
        if (interaction && progressMessages) {
            progressMessages.push('📊 正在解析排行榜資料...');
            await interaction.editReply({
                content: progressMessages.join('\n')
            });
        }
        
        const rankingData = parseRankingData(tournamentRes.data);

        // Step 12: 保存 JSON 資料到檔案（開發時使用）
        // fs.writeFileSync('tournament_ranking_data.json', JSON.stringify(rankingData, null, 2));
        // console.log("排行榜資料已保存到 tournament_ranking_data.json");

        console.log(`成功解析 ${rankingData.ranking?.length || 0} 個排行榜項目`);
        
        if (interaction && progressMessages) {
            progressMessages.push(`✅ 成功獲取 ${rankingData.ranking?.length || 0} 名玩家資料`);
            await interaction.editReply({
                content: progressMessages.join('\n')
            });
        }
        
        return rankingData;

    } catch (err) {
        console.error("登入失敗:", err);
        throw err;
    }
}

function parseRankingData(html) {
    const result = {
        ranking: [],
        debug: {
            totalLength: html.length,
            containsRankingTopBlock: html.includes('ranking_top_block'),
            containsRankingBlock: html.includes('ranking_block')
        }
    };

    try {
        // 解析所有排行榜項目 - 統一處理 ranking_top_block 和 ranking_block

        // 先解析 ranking_top_block (前三名)
        const topBlockPattern = /<div[^>]*class="[^"]*ranking_top_block[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
        let topBlockMatch;

        while ((topBlockMatch = topBlockPattern.exec(html)) !== null) {
            const fullContent = topBlockMatch[0];
            const blockData = parseRankingTopBlock(fullContent);
            if (blockData) {
                result.ranking.push(blockData);
            }
        }

        // 再解析 ranking_block (4-200名) - 統一匹配 ranking_inner_block 的內容
        const blockPattern = /<div[^>]*class="[^"]*ranking_block[^"]*"[^>]*>\s*<div[^>]*class="[^"]*ranking_inner_block[^"]*"[^>]*>([\s\S]*?)<div\s+class="clearfix"><\/div>\s*<\/div>\s*<\/div>/g;
        let blockMatch;

        while ((blockMatch = blockPattern.exec(html)) !== null) {
            const innerContent = blockMatch[1];
            const blockData = parseRankingNormalBlock(innerContent);

            if (blockData && blockData.rank) {
                result.ranking.push(blockData);
            }
        }

        // 按排名排序
        result.ranking.sort((a, b) => a.rank - b.rank);

        console.log(`解析結果: 總共 ${result.ranking.length} 個排行榜項目`);

    } catch (error) {
        console.error("解析排行榜資料時發生錯誤:", error);
        result.error = error.message;
    }

    return result;
}

function parseRankingTopBlock(content) {
    try {
        const data = {
            type: 'ranking_top_block'
        };

        // 解析排名圖片 (rank_first.png, rank_second.png, etc.)
        const rankImgMatch = content.match(/<img[^>]*src="[^"]*\/ranking\/(rank_[^"]+\.png)"/);
        if (rankImgMatch) {
            data.rankImage = rankImgMatch[1];
            // 從檔名推斷排名
            if (rankImgMatch[1].includes('first')) data.rank = 1;
            else if (rankImgMatch[1].includes('second')) data.rank = 2;
            else if (rankImgMatch[1].includes('third')) data.rank = 3;
        }

        // 解析玩家名稱 (在 f_l p_t_20 p_l_10 f_15 類別的 div 中)
        const nameMatch = content.match(/<div[^>]*class="[^"]*f_l[^"]*p_t_20[^"]*p_l_10[^"]*f_15[^"]*"[^>]*>\s*([^<\s]+(?:[^<]*[^<\s])?)\s*<\/div>/s);
        if (nameMatch) {
            data.playerName = nameMatch[1].trim();
        }

        // 解析日期時間和時間類型
        const timeMatch1day = content.match(/<div[^>]*class="[^"]*ranking_music_date_1day[^"]*"[^>]*>\s*([^<]+)\s*<\/div>/);
        const timeMatch7day = content.match(/<div[^>]*class="[^"]*ranking_music_date_7day[^"]*"[^>]*>\s*([^<]+)\s*<\/div>/);

        if (timeMatch1day) {
            data.dateTime = timeMatch1day[1].trim();
            data.dateType = '1day'; // 紅色標籤
        } else if (timeMatch7day) {
            data.dateTime = timeMatch7day[1].trim();
            data.dateType = '7day'; // 橙色標籤
        } else {
            const dateMatch = content.match(/<div[^>]*class="[^"]*ranking_music_date[^"]*"[^>]*>\s*([^<]+)\s*<\/div>/);
            if (dateMatch) {
                data.dateTime = dateMatch[1].trim();
                data.dateType = 'default'; // 預設藍色標籤
            }
        }

        // 解析百分比和分數 - 更精確的正則表達式
        const scoreMatch = content.match(/<div[^>]*class="[^"]*p_t_15[^"]*p_r_10[^"]*"[^>]*>\s*([0-9.]+%)<br[^>]*>\s*<span[^>]*>\s*([0-9,]+)\s*<\/span>/s);
        if (scoreMatch) {
            data.percentage = scoreMatch[1];
            data.score = parseInt(scoreMatch[2].replace(/,/g, '')); // 轉為數字
            data.scoreFormatted = scoreMatch[2]; // 保留格式化的分數
        }

        // 解析所有圖片
        const allImages = [...content.matchAll(/<img[^>]*src="([^"]+)"/g)];
        if (allImages.length > 0) {
            data.images = allImages.map(match => match[1]);
        }

        return Object.keys(data).length > 1 ? data : null;

    } catch (error) {
        console.error("解析 Top Block 時發生錯誤:", error);
        return null;
    }
}

function parseRankingNormalBlock(content) {
    try {
        const data = {
            type: 'ranking_block'
        };

        // 解析排名數字 - 從排名圖片檔名中提取
        const rankingSection = content.match(/<div[^>]*class="[^"]*ranking_rank_block[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        if (rankingSection) {
            const rankSectionContent = rankingSection[1];
            const rankNums = [...rankSectionContent.matchAll(/rank_num_(\d+)\.png/g)];

            if (rankNums.length > 0) {
                if (rankNums.length === 1) {
                    // 單位數排名
                    data.rank = parseInt(rankNums[0][1]);
                } else {
                    // 多位數排名 - 由於圖片使用 f_r (float right)，顯示順序與HTML順序相反
                    // 例如：HTML中是 "0" "1" 但顯示為 "10"
                    let rankStr = '';
                    for (let i = rankNums.length - 1; i >= 0; i--) {
                        rankStr += rankNums[i][1];
                    }
                    data.rank = parseInt(rankStr);
                }
            }
        }

        // 調試：如果是第8名，輸出內容進行分析
        if (data.rank === 8) {
            console.log('=== 第8名調試資訊 ===');
            console.log('Content length:', content.length);
            console.log('Content (first 500 chars):', content.substring(0, 500));
        }

        // 解析玩家名稱 (在 f_l p_t_20 p_l_10 f_15 類別的 div 中)
        const nameMatch = content.match(/<div[^>]*class="[^"]*f_l[^"]*p_t_20[^"]*p_l_10[^"]*f_15[^"]*"[^>]*>\s*([^<\s]+(?:[^<]*[^<\s])?)\s*<\/div>/s);
        if (nameMatch) {
            data.playerName = nameMatch[1].trim();
            if (data.rank === 8) console.log('Name match found:', nameMatch[1].trim());
        } else if (data.rank === 8) {
            console.log('Name match failed');
        }

        // 解析日期時間和時間類型 - 支援三種class名稱
        const timeMatch1day = content.match(/<div[^>]*class="[^"]*ranking_music_date_1day[^"]*"[^>]*>\s*([^<]+)\s*<\/div>/);
        const timeMatch7day = content.match(/<div[^>]*class="[^"]*ranking_music_date_7day[^"]*"[^>]*>\s*([^<]+)\s*<\/div>/);

        if (timeMatch1day) {
            data.dateTime = timeMatch1day[1].trim();
            data.dateType = '1day'; // 紅色標籤
            if (data.rank === 8) console.log('Date match found (1day):', timeMatch1day[1].trim());
        } else if (timeMatch7day) {
            data.dateTime = timeMatch7day[1].trim();
            data.dateType = '7day'; // 橙色標籤
            if (data.rank === 8) console.log('Date match found (7day):', timeMatch7day[1].trim());
        } else {
            const dateMatch = content.match(/<div[^>]*class="[^"]*ranking_music_date[^"]*"[^>]*>\s*([^<]+)\s*<\/div>/);
            if (dateMatch) {
                data.dateTime = dateMatch[1].trim();
                data.dateType = 'default'; // 預設藍色標籤
                if (data.rank === 8) console.log('Date match found (default):', dateMatch[1].trim());
            } else if (data.rank === 8) {
                console.log('Date match failed');
            }
        }

        // 解析百分比和分數 - 更精確的正則表達式
        const scoreMatch = content.match(/<div[^>]*class="[^"]*p_t_15[^"]*p_r_10[^"]*"[^>]*>\s*([0-9.]+%)<br[^>]*>\s*<span[^>]*>\s*([0-9,]+)\s*<\/span>/s);
        if (scoreMatch) {
            data.percentage = scoreMatch[1];
            data.score = parseInt(scoreMatch[2].replace(/,/g, '')); // 轉為數字
            data.scoreFormatted = scoreMatch[2]; // 保留格式化的分數
            if (data.rank === 8) console.log('Score match found:', scoreMatch[1], scoreMatch[2]);
        } else if (data.rank === 8) {
            console.log('Score match failed');
        }

        // 解析所有圖片
        const allImages = [...content.matchAll(/<img[^>]*src="([^"]+)"/g)];
        if (allImages.length > 0) {
            data.images = allImages.map(match => match[1]);
        }

        if (data.rank === 8) {
            console.log('=== 第8名調試結束 ===');
        }

        return Object.keys(data).length > 1 ? data : null;

    } catch (error) {
        console.error("解析 Normal Block 時發生錯誤:", error);
        return null;
    }
}

// 下載分隔線圖片
async function downloadLineImage() {
    const url = 'https://maimaidx.jp/maimai-mobile/img/line_02.png';
    const assetsDir = path.join(__dirname, '../../assets/sprites');
    const filename = path.join(assetsDir, 'line_02.png');

    // 確保目錄存在
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 檢查圖片是否已存在
    if (fs.existsSync(filename)) {
        console.log('分隔線圖片已存在');
        return filename;
    }

    try {
        const response = await client.get(url, {
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filename);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('分隔線圖片下載完成');
                resolve(filename);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('下載分隔線圖片失敗:', error.message);
        return null;
    }
}

// 下載標題背景圖片
async function downloadTitleBackgroundImage() {
    const url = 'https://maimaidx.jp/maimai-mobile/img/ranking/back_rank_top.png';
    const assetsDir = path.join(__dirname, '../../assets/sprites');
    const filename = path.join(assetsDir, 'back_rank_top.png');

    // 確保目錄存在
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 檢查圖片是否已存在
    if (fs.existsSync(filename)) {
        console.log('標題背景圖片已存在');
        return filename;
    }

    try {
        const response = await client.get(url, {
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filename);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('標題背景圖片下載完成');
                resolve(filename);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('下載標題背景圖片失敗:', error.message);
        return null;
    }
}

// 根據maimai DX官方CSS樣式生成排行榜圖片
async function generateRankingImage(data, interaction, progressMessages, serverChoice = 'jp') {

    // 計算圖片尺寸 - 使用官方CSS的寬度設置
    const allPlayers = (data.ranking || []).slice(0, 20); // 只顯示前20名

    if (interaction && progressMessages) {
        progressMessages.push(`🎨 正在生成 ${allPlayers.length} 名玩家的排行榜圖片...`);
        await interaction.editReply({
            content: progressMessages.join('\n')
        });
    }

    const width = 480; // maimai DX手機版寬度
    const headerHeight = 53.4; // ranking_title_block區域
    const topBlockHeight = 63.6; // ranking_top_block高度 (前三名) - 450x63.6
    const normalBlockHeight = 63.6; // ranking_block高度 (一般排名)
    const blockMargin = 5; // 區塊間距 (margin: 5px 15px)

    let totalHeight = headerHeight + 20; // 標題區域 + 上邊距

    // 計算總高度
    for (let i = 0; i < allPlayers.length; i++) {
        const isTopThree = allPlayers[i].rank <= 3;
        totalHeight += isTopThree ? topBlockHeight : normalBlockHeight;
        totalHeight += blockMargin; // 下邊距

        // 加上資格線的高度
        if (allPlayers[i].rank === 7 || allPlayers[i].rank === 15) {
            totalHeight += 60; // 資格文字 + 分隔線 + 間距
        }
    }
    totalHeight += 60; // 底部邊距

    // 創建畫布 - 使用高DPI避免字體模糊
    const scale = 2; // 2倍縮放以提高清晰度
    const canvas = createCanvas(width * scale, totalHeight * scale);
    const ctx = canvas.getContext('2d');

    // 設定畫布縮放
    ctx.scale(scale, scale);

    // 啟用文字抗鋸齒
    ctx.textBaseline = 'alphabetic';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 背景色 - 使用maimai DX官方背景色 #51bcf3
    ctx.fillStyle = '#51bcf3';
    ctx.fillRect(0, 0, width, totalHeight);

    // 繪製container - 模擬maimai DX官方的白色容器
    const containerX = 15;
    const containerY = 15;
    const containerWidth = 450;
    const containerHeight = totalHeight - 30;

    // container樣式 - 白色背景 + 複合陰影效果
    ctx.fillStyle = '#fff';

    // 複合陰影效果 (box-shadow: 0 0 0 2px #2e94f4, 0 0 0 6px #fff, 1px 8px 8px rgba(0, 0, 0, 0.2))
    ctx.save();

    // 外層藍色邊框 (2px #2e94f4)
    /*ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#2e94f4';
    for(let i = 0; i < 2; i++) {
      ctx.strokeStyle = '#2e94f4';
      ctx.lineWidth = 2;
      roundRect(ctx, containerX - i, containerY - i, containerWidth + i*2, containerHeight + i*2, 10);
      ctx.stroke();
    }*/

    // 白色容器主體
    //roundRect(ctx, containerX, containerY, containerWidth, containerHeight, 10);
    //ctx.fill();

    // 主陰影效果
    //ctx.shadowOffsetX = 1;
    //ctx.shadowOffsetY = 8;
    //ctx.shadowBlur = 8;
    //ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    //ctx.restore();

    // 繪製標題區塊 - ranking_title_block樣式
    const titleX = containerX + 15;
    const titleY = containerY + 15;
    const titleWidth = containerWidth - 30;
    const titleHeight = headerHeight - 40;

    /*// 標題背景 - 模擬back_rank_top.png的效果 (更貼近原網站)
    const titleGradient = ctx.createLinearGradient(titleX, titleY, titleX + titleWidth, titleY + titleHeight);
    titleGradient.addColorStop(0, '#ffffff');
    titleGradient.addColorStop(0.3, '#f8fcff');
    titleGradient.addColorStop(0.7, '#e8f4ff');
    titleGradient.addColorStop(1, '#d0eaff');
    ctx.fillStyle = titleGradient;
    
    ctx.save();
    roundRect(ctx, titleX, titleY, titleWidth, titleHeight, 5);
    ctx.fill();
    
    // 標題邊框 - 使用官方藍色
    ctx.strokeStyle = '#2e94f4';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();*/

    // 標題文字 - 使用官方字體大小和顏色


    // 下載分隔線圖片
    let lineImage = null;
    let headerImage = null;
    
    try {
        const lineImagePath = await downloadLineImage();
        if (lineImagePath) {
            lineImage = await loadImage(lineImagePath);
        }
    } catch (error) {
        console.warn('無法載入分隔線圖片，將使用簡單線條');
    }
    
    try {
        const headerImagePath = await downloadTitleBackgroundImage();
        if (headerImagePath) {
            headerImage = await loadImage(headerImagePath);
        }
    } catch (error) {
        console.warn('無法載入標題背景圖片，將使用預設背景');
    }

    // 設定初始 currentY 位置
    let currentY = titleY;

    // 分隔線 - w_450 m_t_5 m_b_10 (450×9.38333) - 在標題上方
    if (lineImage) {
        const lineWidth = 450;
        const lineHeight = 9.38333; // 使用官方尺寸
        ctx.drawImage(lineImage, containerX + 10, currentY, lineWidth - containerX - 10, lineHeight);
        currentY += lineHeight + 15;
    } else {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(containerX + 15, currentY, containerWidth - 30, 2);
        currentY += 17;
    }

    // 繪製標題文字 - 根據伺服器選擇顯示不同標題
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px "メイリオ", Meiryo, "ＭＳ Ｐゴシック", "MS P Gothic", sans-serif';
    ctx.textAlign = 'left';
    
    const titleText = serverChoice === 'jp' 
        ? '「全国エリア」オンライン予選ランキング'
        : '「International Area」Online qualifying ranking';
    ctx.fillText(titleText, titleX, currentY + 5);

    // 更新時間 - f_11樣式 (11px) - 右下角
    ctx.font = 'bold 12px "メイリオ", Meiryo, sans-serif';
    ctx.fillStyle = '#fff';
    const currentDate = new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/\//g, '/').replace(',', '');
    ctx.textAlign = 'left';
    const updateText = serverChoice === 'jp' ? `${currentDate} 更新` : `${currentDate} update`;
    ctx.fillText(updateText, titleX, currentY + 25);

    // 繪製背景圖片
    if (headerImage) {
        ctx.drawImage(headerImage, 214, containerY+40.5, 236, 39);
    }

    // 設定 currentY 為標題區域之後
    currentY += 40; // 標題文字區域結束後的位置

    currentY += 0; // 標題和排行榜之間的間距

    // 繪製所有排名 - 使用官方CSS的margin和padding設置
    for (let i = 0; i < allPlayers.length; i++) {
        const player = allPlayers[i];
        const isTopThree = player.rank <= 3;
        const blockHeight = isTopThree ? topBlockHeight : normalBlockHeight;

        // 每5名更新一次進度（這個不加入疊加訊息，只是臨時顯示）
        if (interaction && i % 5 === 0) {
            // 創建臨時的進度訊息，不加入 progressMessages
            const tempMessages = [...progressMessages, `🖼️ 正在繪製排行榜... (${i + 1}/${allPlayers.length})`];
            await interaction.editReply({
                content: tempMessages.join('\n')
            });
        }

        // ranking_top_block margin: 0 15px 5px 15px; ranking_block margin: 5px 15px
        const marginTop = isTopThree && i === 0 ? 0 : blockMargin;
        currentY += marginTop;

        await drawMaimaiStyleRow(ctx, player, currentY, containerWidth, blockHeight, isTopThree);
        currentY += blockHeight;

        // 根據伺服器類型顯示不同的資格線
        if (serverChoice === 'jp' && player.rank === 7) {
            // 日本版：第7名後加上全国決勝大会資格線
            currentY += 15; // 間距

            // 資格文字 - m_15 m_b_0 t_r f_12 f_b white
            currentY += 14.4;
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px "メイリオ", Meiryo, sans-serif';
            ctx.textAlign = 'right';
            const qualifyText = 'ここまでの方は全国決勝大会に出場する権利が与えられます。';
            ctx.fillText(qualifyText, containerX + containerWidth - 15, currentY);
            currentY += 14.4;

            // 分隔線 - w_450 m_t_5 m_b_10
            if (lineImage) {
                const lineWidth = 450;
                const lineHeight = lineImage.height * (lineWidth / lineImage.width);
                ctx.drawImage(lineImage, containerX + 10, currentY, lineWidth - containerX - 10, lineHeight);
                currentY += lineHeight + 10;
            } else {
                ctx.fillStyle = '#ddd';
                ctx.fillRect(containerX + 15, currentY, containerWidth - 30, 2);
                currentY += 15;
            }
            ctx.restore();
        } else if (serverChoice === 'intl' && player.rank === 2) {
            // 國際版：第2名後加上國際決勝大会資格線
            currentY += 15; // 間距

            // 資格文字 - m_15 m_b_0 t_r f_12 f_b white
            currentY += 14.4;
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px "メイリオ", Meiryo, sans-serif';
            ctx.textAlign = 'right';
            const qualifyText = 'Players up to here, will have the rights to join the International Ver.';
            ctx.fillText(qualifyText, containerX + containerWidth - 15, currentY);
            const qualifyText2 = 'Final in Japan.';
            currentY += 14.4;
            ctx.fillText(qualifyText2, containerX + containerWidth - 15, currentY);
            currentY += 14.4;

            // 分隔線 - w_450 m_t_5 m_b_10
            if (lineImage) {
                const lineWidth = 450;
                const lineHeight = lineImage.height * (lineWidth / lineImage.width);
                ctx.drawImage(lineImage, containerX + 10, currentY, lineWidth - containerX - 10, lineHeight);
                currentY += lineHeight + 10;
            } else {
                ctx.fillStyle = '#ddd';
                ctx.fillRect(containerX + 15, currentY, containerWidth - 30, 2);
                currentY += 15;
            }
            ctx.restore();
        }

        // 第15名後的LCQ資格線（僅限日本版）
        if (serverChoice === 'jp' && player.rank === 15) {
            currentY += 15; // 間距

            // 資格文字 - m_15 m_b_0 t_r f_12 f_b white
            currentY += 14.4;
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px "メイリオ", Meiryo, sans-serif';
            ctx.textAlign = 'right';
            const lcqText = 'ここまでの方はLCQ（最終予選）に出場する権利が与えられます。';
            ctx.fillText(lcqText, containerX + containerWidth - 15, currentY);
            currentY += 14.4;

            // 分隔線 - w_450 m_t_5 m_b_10
            if (lineImage) {
                const lineWidth = 450;
                const lineHeight = lineImage.height * (lineWidth / lineImage.width);
                ctx.drawImage(lineImage, containerX + 10, currentY, lineWidth - containerX - 10, lineHeight);
                currentY += lineHeight + 10;
            } else {
                ctx.fillStyle = '#ddd';
                ctx.fillRect(containerX + 15, currentY, containerWidth - 30, 2);
                currentY += 15;
            }
            ctx.restore();
        }
    }

    // 最終完成訊息
    if (interaction && progressMessages) {
        progressMessages.push(`✅ 排行榜圖片生成完成！包含 ${allPlayers.length} 名玩家`);
        await interaction.editReply({
            content: progressMessages.join('\n')
        });
    }

    // 返回圖片 buffer 給 Discord
    const buffer = canvas.toBuffer('image/png');

    console.log('✅ 圖片已生成');
    console.log(`📊 圖片尺寸: ${width}x${totalHeight}px`);
    console.log(`👥 包含玩家: ${allPlayers.length}名`);
    
    return buffer;
}

// 根據maimai DX官方CSS樣式繪製排行榜行
async function drawMaimaiStyleRow(ctx, player, y, width, height, isTopThree) {
    // margin: 5px 15px - 在container內部的邊距
    const x = 30; // container邊距 + ranking block邊距
    const actualWidth = width - 30; // 調整實際寬度

    // 使用官方CSS樣式的背景色
    ctx.save();
    if (isTopThree) {
        // ranking_top_block - 彩虹漸層背景
        // linear-gradient(-30deg, #ff6d51, #ff6d51 41%, #ffa034 41%, #ffa034 47%, #ffe839 47%, #ffe839 53%, #a8ef3e 53%, #a8ef3e 59%, #3fc6fc 59%, #3fc5fb 100%)
        // CSS angle: -30deg (clockwise from vertical top)
        const cssAngleDeg = -30;
        const angleDeg = 90 - cssAngleDeg; // convert CSS to canvas/math angle (0 = right)
        const angleRad = (angleDeg * Math.PI) / 180;

        // Calculate start/end points for the gradient line
        const centerX = x + actualWidth / 2;
        const centerY = y + height / 2;
        const halfLen = Math.hypot(actualWidth, height); // large enough to fully cover area

        const dx = Math.cos(angleRad);
        const dy = Math.sin(angleRad);

        const x0 = centerX - dx * halfLen / 2;
        const y0 = centerY - dy * halfLen / 2;
        const x1 = centerX + dx * halfLen / 2;
        const y1 = centerY + dy * halfLen / 2;

        const rainbowGradient = ctx.createLinearGradient(x0, y1, x1, y0);

        rainbowGradient.addColorStop(0.00, '#ff6d51');
        rainbowGradient.addColorStop(0.41, '#ff6d51');
        rainbowGradient.addColorStop(0.41, '#ffa034');
        rainbowGradient.addColorStop(0.47, '#ffa034');
        rainbowGradient.addColorStop(0.47, '#ffe839');
        rainbowGradient.addColorStop(0.53, '#ffe839');
        rainbowGradient.addColorStop(0.53, '#a8ef3e');
        rainbowGradient.addColorStop(0.59, '#a8ef3e');
        rainbowGradient.addColorStop(0.59, '#3fc6fc');
        rainbowGradient.addColorStop(1.00, '#3fc5fb');


        ctx.fillStyle = rainbowGradient;
    } else {
        // ranking_block - 半透明白色背景 rgba(255, 255, 255, 0.6)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    }

    // box-shadow: 1px 3px 0px rgba(0, 0, 0, 0.4) - ranking_top_block和ranking_block的陰影效果
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';

    // 繪製外層背景 - border-radius: 5px
    roundRect(ctx, x, y, actualWidth, height, 5);
    ctx.fill();
    ctx.restore();

    // 重置陰影，確保內層沒有陰影
    ctx.shadowColor = 'transparent';

    // 內層背景 (ranking_top_inner_block 或 ranking_inner_block)
    // padding: 4px - 內邊距4px
    const innerX = x + 4;
    const innerY = y + 4;
    const innerWidth = actualWidth - 8;
    const innerHeight = height - 8;

    if (isTopThree) {
        // ranking_top_inner_block - background: url(../img/ranking/back.png), #f5f8fb;
        ctx.fillStyle = '#f5f8fb';
    } else {
        // ranking_inner_block - background: #eff5fb;
        ctx.fillStyle = '#eff5fb';
    }

    // border: 2px solid #fff; border-radius: 5px;
    ctx.save();
    roundRect(ctx, innerX, innerY, innerWidth, innerHeight, 5);
    ctx.fill();

    // 2px白色邊框
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 排名區塊 (ranking_rank_block) - width: 70px; height: 36px;
    const rankBlockWidth = 70;
    const rankBlockHeight = 36;
    const rankX = innerX;
    const rankY = innerY + 10; // p_t_10

    // 使用官方排名圖片
    await drawRankingImages(ctx, player, rankX, rankY, rankBlockWidth, rankBlockHeight);

    // 玩家名稱 - f_l p_t_20 p_l_10 f_15 (左浮動, 上邊距20px, 左邊距10px, 15px字體)
    const nameX = innerX + rankBlockWidth + 10; // p_l_10
    const nameY = innerY + 20 + 15; // p_t_20 + f_15行高

    ctx.fillStyle = '#000';
    ctx.font = '15px "メイリオ", Meiryo, "ＭＳ Ｐゴシック", sans-serif';
    ctx.textAlign = 'left';
    const playerName = player.playerName || 'Unknown';

    // 限制名稱長度以適應寬度
    const maxNameWidth = innerWidth - rankBlockWidth - 20 - 120; // 預留右側分數空間
    let displayName = playerName;
    while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 1) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== playerName && displayName.length < playerName.length) displayName += '...';

    ctx.fillText(displayName, nameX, nameY);

    // 時間標籤 - 根據dateType使用不同顏色
    if (player.dateTime) {
        // width: 116px; top: -2px; right: -2px; border-radius: 10px; line-height: 11px; font-size: 10px;
        const dateBlockWidth = 116;
        const dateBlockHeight = 11;
        const dateX = innerX + innerWidth - dateBlockWidth + 2; // right: -2px相對於inner block
        const dateY = innerY - 2; // top: -2px

        // 背景色 - 根據dateType選擇顏色
        let bgColor = '#26b3fc'; // 預設藍色 (ranking_music_date)
        if (player.dateType === '1day') {
            bgColor = '#ff2900'; // 紅色 (ranking_music_date_1day)
        } else if (player.dateType === '7day') {
            bgColor = '#ffb200'; // 橙色 (ranking_music_date_7day)
        }

        ctx.fillStyle = bgColor;
        ctx.save();
        roundRect(ctx, dateX, dateY, dateBlockWidth, dateBlockHeight, 5); // border-radius: 10px
        ctx.fill();
        ctx.restore();

        // 時間文字 - font-size: 10px; color: #fff; line-height: 11px;
        ctx.fillStyle = '#fff';
        ctx.font = '10px "メイリオ", Meiryo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.dateTime, dateX + dateBlockWidth / 2, dateY + dateBlockHeight / 2 + 4);
    }

    // 分數區域 - p_t_15 p_r_10 p_b_5 f_r t_r f_16 f_b l_h_10
    // (上邊距15px, 右邊距10px, 下邊距5px, 右浮動, 文字右對齊, 16px粗體, 行高10px)
    const scoreX = innerX + innerWidth - 10; // p_r_10 右邊距10px
    const percentageY = innerY + 15 + 16; // p_t_15 + f_16行高

    // 達成率 - f_16 f_b (16px粗體)
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px "メイリオ", Meiryo, sans-serif';
    ctx.textAlign = 'right'; // t_r 文字右對齊
    ctx.fillText(player.percentage || '--', scoreX, percentageY);

    // 分數 - f_14 較小字體，灰色
    ctx.font = '14px "メイリオ", Meiryo, sans-serif';
    ctx.fillStyle = '#000'; // 使用官方灰色 #747474
    const scoreY = percentageY + 16; // l_h_10 行高調整
    ctx.fillText(player.scoreFormatted || player.score || '--', scoreX, scoreY);
}

// 下載並繪製排名圖片
async function drawRankingImages(ctx, player, x, y, width, height) {
    if (player.images && player.images.length > 0) {
        try {
            // 過濾出排名相關的圖片
            const rankingImages = player.images.filter(img =>
                img.includes('rank_first.png') ||
                img.includes('rank_second.png') ||
                img.includes('rank_third.png') ||
                img.includes('rank_num_')
            );

            if (rankingImages.length === 0) {
                // 沒有排名圖片，使用文字
                drawRankText(ctx, player.rank, x, y, width, height);
                return;
            }

            // 使用官方圖片尺寸計算縮放
            const imgSpacing = 2; // 圖片間距
            let totalWidth = 0;
            const imageData = [];

            // 預載入所有圖片並使用官方尺寸
            for (const imgUrl of rankingImages) {
                try {
                    const img = await loadImage(imgUrl);

                    // 根據圖片類型使用官方尺寸
                    let targetWidth, targetHeight;
                    if (imgUrl.includes('rank_first.png') ||
                        imgUrl.includes('rank_second.png') ||
                        imgUrl.includes('rank_third.png')) {
                        // 前三名圖片: 40x36
                        targetWidth = 40;
                        targetHeight = 36;
                    } else if (imgUrl.includes('rank_num_')) {
                        // 數字圖片: 20x24
                        targetWidth = 20;
                        targetHeight = 24;
                    } else {
                        // 備用：使用原始尺寸
                        targetWidth = img.width;
                        targetHeight = img.height;
                    }

                    // 根據排名區塊高度調整縮放
                    const maxScale = height * 0.85 / targetHeight;
                    const scale = Math.min(maxScale, 1); // 不超過原始尺寸

                    const scaledWidth = targetWidth * scale;
                    const scaledHeight = targetHeight * scale;

                    imageData.push({
                        img,
                        width: scaledWidth,
                        height: scaledHeight
                    });
                    totalWidth += scaledWidth + imgSpacing;
                } catch (imgError) {
                    console.warn(`無法載入圖片 ${imgUrl}:`, imgError.message);
                }
            }

            if (imageData.length === 0) {
                drawRankText(ctx, player.rank, x, y, width, height);
                return;
            }

            totalWidth -= imgSpacing; // 移除最後一個間距

            // 從右邊開始繪製，並反轉順序 (因為HTML中使用f_r float right)
            let currentX = x + width - totalWidth - 5;

            // 反轉圖片順序以匹配HTML中f_r的效果
            for (let i = imageData.length - 1; i >= 0; i--) {
                const data = imageData[i];
                const imgY = y + (height - data.height) / 2;
                ctx.drawImage(data.img, currentX, imgY, data.width, data.height);
                currentX += data.width + imgSpacing;
            }

        } catch (error) {
            console.warn('繪製排名圖片時發生錯誤:', error.message);
            // 發生錯誤，使用文字替代
            drawRankText(ctx, player.rank, x, y, width, height);
        }
    } else {
        // 沒有圖片資料，使用文字
        drawRankText(ctx, player.rank, x, y, width, height);
    }
}

// 繪製排名文字（備用方案）
function drawRankText(ctx, rank, x, y, width, height) {
    ctx.fillStyle = '#000';
    ctx.font = 'bold 18px "メイリオ", Meiryo, "ＭＳ Ｐゴシック", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rank, x + width / 2, y + height / 2 + 6);
}

// 輔助函數：繪製圓角矩形
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
