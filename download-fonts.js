#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, 'assets', 'fonts');

// 確保字體目錄存在
if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
}

console.log('🎨 開始下載字體文件...');

// 下載字體文件的函數
function downloadFont(url, filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(fontsDir, filename);
        
        // 檢查文件是否已存在
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${filename} 已存在，跳過下載`);
            resolve();
            return;
        }
        
        console.log(`📥 正在下載 ${filename}...`);
        
        const file = fs.createWriteStream(filePath);
        
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // 處理重定向
                https.get(response.headers.location, (redirectResponse) => {
                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`✅ ${filename} 下載完成`);
                        resolve();
                    });
                }).on('error', reject);
            } else {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ ${filename} 下載完成`);
                    resolve();
                });
            }
        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); // 刪除未完成的文件
            reject(err);
        });
    });
}

// 字體下載列表
const fonts = [
    {
        name: 'Roboto Regular',
        url: 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf',
        filename: 'Roboto-Regular.ttf'
    },
    {
        name: 'Roboto Bold',
        url: 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf',
        filename: 'Roboto-Bold.ttf'
    }
];

async function downloadAllFonts() {
    try {
        for (const font of fonts) {
            await downloadFont(font.url, font.filename);
        }
        
        console.log('\n🎉 所有字體下載完成！');
        console.log('📁 字體位置：', fontsDir);
        console.log('\n💡 注意事項：');
        console.log('- 如需要中文字體支援，請手動下載 Noto Sans CJK 字體');
        console.log('- 將 NotoSansCJK-Regular.ttf 放置到 assets/fonts/ 目錄中');
        console.log('- 字體將在下次重啟機器人時自動註冊');
        
    } catch (error) {
        console.error('❌ 字體下載失敗：', error.message);
        console.log('\n🔧 解決方案：');
        console.log('1. 檢查網路連接');
        console.log('2. 手動下載字體文件到 assets/fonts/ 目錄');
        console.log('3. 確保有寫入權限');
    }
}

downloadAllFonts();
