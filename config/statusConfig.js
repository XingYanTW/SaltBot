// 機器人狀態配置
const { ActivityType } = require('discord.js');

module.exports = {
    // 預設狀態列表（將由 getCustomActivities 動態生成）
    customMessages: [
        'パン食べるです',
        'くっすくたいです', 
        'にゃーにゃーゴロゴロ',
        '蒼のこむぎこを探してるにゃ',
        'ダンディ・ダンと旅してるにゃ',
        'カフェミルクで頑張ってるにゃ',
        'ふかふかパン作ってるにゃ',
        '世界中を旅したにゃ'
    ],
    
    // 狀態切換間隔（毫秒）
    switchInterval: 30000, // 30 秒
    
    // 特殊事件狀態（可選）
    specialEvents: {
        // 例如：節日或特殊活動時的狀態
        christmas: [
            { name: '🎄 聖誕快樂！', type: ActivityType.Playing },
            { name: '🎅 聖誕音樂', type: ActivityType.Listening }
        ],
        newYear: [
            { name: '🎊 新年快樂！', type: ActivityType.Playing },
            { name: '🎆 新年倒數', type: ActivityType.Watching }
        ]
    },
    
    // 生成自定義狀態（包含動態機器人資訊）
    getCustomActivities: (serverCount, userCount, commandCount) => {
        const infoTexts = [
            `在 ${serverCount} 個伺服器努力工作中 🌟`,
            `交到了 ${userCount} 個好朋友にゃ 💫`,
            `學會了 ${commandCount} 個實用技能にゃ ⚡`,
            '今天也要精神滿滿地幫忙 🍞',
            '和大家一起享受音遊樂趣 🎵',
            '正在製作蓬鬆美味的麵包 🥖',
            '在咖啡牛奶店認真工作中 ☕',
            '滿載著環遊世界的珍貴回憶 🗺️'
        ];
        
        const saltHints = [
            '🔍 正在尋找蒼のこむぎこ情報にゃ！',
            '🍞 今天也要做蓬鬆麵包にゃ',
            '🎵 要不要一起玩 maimai にゃ？',
            '☕ 歡迎來到咖啡牛奶店にゃ',
            '🌍 用環遊世界的經驗幫助大家にゃ',
            '🐾 夥伴丹帝丹也很有精神にゃ',
            '🎪 回憶大豐收祭的美好時光にゃ',
            '💝 想要幫助每一個人にゃ'
        ];
        
        return module.exports.customMessages.map((message, index) => ({
            name: `${message} | ${infoTexts[index % infoTexts.length]}`,
            type: ActivityType.Playing
        })).concat(saltHints.map(hint => ({
            name: hint,
            type: ActivityType.Watching
        })));
    },
    
    // 根據伺服器數量動態調整狀態
    getDynamicActivities: (serverCount, userCount) => {
        const saltTips = [
            '🎯 一起來計算音遊分數にゃ！',
            '🎨 告訴你歌曲的詳細資訊にゃ',
            '📊 查看 maimai DX 的數據にゃ',
            '🍞 像蓬鬆麵包一樣的音遊體驗にゃ',
            '⭐ 挑戰高難度譜面也要加油にゃ！',
            '🔥 幫你找到最喜歡的歌曲にゃ',
            '🎼 和音樂一起舞蹈にゃ',
            '🌈 每天都有新的發現にゃ',
            '☕ 在咖啡牛奶店稍作休息にゃ',
            '🗺️ 運用環遊世界學到的技巧にゃ'
        ];
        
        const randomTip = saltTips[Math.floor(Math.random() * saltTips.length)];
        
        return [
            { name: `🏠 在 ${serverCount} 個地方努力活動中にゃ`, type: ActivityType.Watching },
            { name: `👥 結交了 ${userCount} 個音遊夥伴にゃ`, type: ActivityType.Playing },
            { name: '🎵 maimai DX 音樂資料庫', type: ActivityType.Listening },
            { name: randomTip, type: ActivityType.Watching },
            { name: '🎮 一起來玩遊戲にゃ！', type: ActivityType.Playing },
            { name: '📚 輸入 /help 學習使用方法にゃ', type: ActivityType.Watching },
            { name: '🍞 今天的麵包製作也辛苦了', type: ActivityType.Playing },
            { name: '🔍 徵求蒼のこむぎこ的線索', type: ActivityType.Watching }
        ];
    },
    
    // 獲取活動類型名稱（Salt 風格）
    getActivityTypeName: (type) => {
        switch (type) {
            case ActivityType.Playing: return '🎮 努力遊玩中にゃ';
            case ActivityType.Streaming: return '📺 直播表演中にゃ';
            case ActivityType.Listening: return '🎵 專心聆聽中にゃ';
            case ActivityType.Watching: return '📺 仔細觀察中にゃ';
            case ActivityType.Competing: return '🏆 認真競賽中にゃ';
            default: return '❓ 不太清楚にゃ';
        }
    }
};