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
            
            console.log(`按鈕被點擊: ${interaction.customId}`);
        }
        
        // 處理選單互動
        if (interaction.isStringSelectMenu()) {
            // 在這裡添加選單處理邏輯
            console.log(`選單被選擇: ${interaction.customId}`);
        }
    },
};
