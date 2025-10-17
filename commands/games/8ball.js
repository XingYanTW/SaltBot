const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('問問 Salt 的神奇8號球にゃ')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('你想問什麼呢にゃ？')
                .setRequired(true)),
    async execute(interaction) {
        const question = interaction.options.getString('question');
        
        // 確保問題是疑問句
        if (!question.includes('?') && !question.includes('嗎') && !question.includes('呢')) {
            return await interaction.reply({
                content: '❓ 要提出問題才行にゃ！記得使用問號或疑問詞にゃ～',
                ephemeral: true
            });
        }
        
        const answer = getRandomAnswer();
        const color = getAnswerColor(answer.type);
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎱 Salt 的神奇8號球にゃ')
            .setDescription('*球在搖晃中... Salt 正在思考... 答案浮現了にゃ！*')
            .addFields(
                {
                    name: '❓ 你的問題',
                    value: `"${question}"`,
                    inline: false
                },
                {
                    name: '🔮 8號球的回答',
                    value: `**${answer.text}**`,
                    inline: false
                },
                {
                    name: '📊 建議',
                    value: getAdvice(answer.type),
                    inline: true
                }
            )
            .setFooter({ 
                text: `由 ${interaction.user.username} 提問`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        // 添加有趣的反應
        if (Math.random() < 0.1) { // 10% 機率出現特殊訊息
            embed.setDescription('*球搖得特別厲害... Salt 覺得這個問題很有趣にゃ...*');
            embed.addFields({
                name: '✨ Salt 的特別提醒',
                value: 'Salt 的8號球對這個問題特別有感觸にゃ！',
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    },
};

function getRandomAnswer() {
    const answers = [
        // 肯定回答
        { text: '當然！', type: 'positive' },
        { text: '毫無疑問！', type: 'positive' },
        { text: '是的，絕對如此！', type: 'positive' },
        { text: '你可以相信這一點', type: 'positive' },
        { text: '據我看來，是的', type: 'positive' },
        { text: '很有可能', type: 'positive' },
        { text: '前景看好', type: 'positive' },
        { text: '是的', type: 'positive' },
        { text: '跡象指向是的', type: 'positive' },
        
        // 中性回答
        { text: '回覆模糊，請再試一次', type: 'neutral' },
        { text: '稍後再問', type: 'neutral' },
        { text: '現在最好不要告訴你', type: 'neutral' },
        { text: '無法現在預測', type: 'neutral' },
        { text: '專心並再問一次', type: 'neutral' },
        { text: '這要看情況', type: 'neutral' },
        { text: '時機尚未成熟', type: 'neutral' },
        
        // 否定回答
        { text: '不要指望它', type: 'negative' },
        { text: '我的回答是不', type: 'negative' },
        { text: '我的消息說不', type: 'negative' },
        { text: '前景不太好', type: 'negative' },
        { text: '非常可疑', type: 'negative' },
        { text: '絕對不會', type: 'negative' },
        { text: '不太可能', type: 'negative' },
        
        // 有趣的回答
        { text: '宇宙告訴 Salt：也許吧にゃ', type: 'funny' },
        { text: 'Salt 的水晶球壞了，但我猜是的にゃ', type: 'funny' },
        { text: '問你的貓咪，它可能知道にゃ', type: 'funny' },
        { text: '42... 等等，這是另一個問題的答案にゃ', type: 'funny' },
        { text: 'Salt 的8號球說：我需要咖啡才能回答にゃ', type: 'funny' },
        { text: '據 Salt 的量子計算... 也許？にゃ', type: 'funny' }
    ];
    
    return answers[Math.floor(Math.random() * answers.length)];
}

function getAnswerColor(type) {
    switch (type) {
        case 'positive': return 0x00FF00;
        case 'negative': return 0xFF0000;
        case 'neutral': return 0xFFFF00;
        case 'funny': return 0xFF69B4;
        default: return 0x8A2BE2;
    }
}

function getAdvice(type) {
    switch (type) {
        case 'positive':
            return '🌟 Salt 說要積極行動にゃ！';
        case 'negative':
            return '💭 Salt 覺得或許需要重新考慮にゃ...';
        case 'neutral':
            return '⏰ Salt 建議耐心等待時機にゃ';
        case 'funny':
            return '😄 Salt 說要輕鬆面對，幽默看待にゃ！';
        default:
            return '🤔 Salt 相信你的直覺にゃ';
    }
}
