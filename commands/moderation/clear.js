const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Salt 來清理頻道訊息にゃ')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('要清理多少訊息呢にゃ？(1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('只清理某個人的訊息にゃ？')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        
        // 檢查權限
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ 你沒有管理訊息的權限にゃ！',
                ephemeral: true
            });
        }

        // 檢查機器人權限
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ Salt 沒有管理訊息的權限にゃ！',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            // 獲取訊息
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            
            let messagesToDelete;
            if (targetUser) {
                // 只刪除特定用戶的訊息
                messagesToDelete = messages.filter(msg => 
                    msg.author.id === targetUser.id && 
                    (Date.now() - msg.createdTimestamp) < 1209600000 // 14天內的訊息
                ).first(amount);
            } else {
                // 刪除最近的訊息
                messagesToDelete = messages.filter(msg => 
                    (Date.now() - msg.createdTimestamp) < 1209600000 // 14天內的訊息
                ).first(amount);
            }

            if (messagesToDelete.length === 0) {
                return await interaction.editReply({
                    content: '❌ Salt 找不到可以清理的訊息にゃ！(只能清理14天內的訊息にゃ)'
                });
            }

            // 批量刪除訊息
            const deletedMessages = await interaction.channel.bulkDelete(messagesToDelete, true);

            // 建立成功訊息
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🗑️ Salt 清理完畢にゃ')
                .addFields(
                    { name: '清理數量', value: `${deletedMessages.size} 則訊息被Salt清理了にゃ`, inline: true },
                    { name: 'Salt 的助手', value: interaction.user.tag, inline: true },
                    { name: '清理的頻道', value: interaction.channel.name, inline: true }
                );

            if (targetUser) {
                successEmbed.addFields({
                    name: '被清理的人', 
                    value: targetUser.tag, 
                    inline: true
                });
            }

            successEmbed.setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // 3秒後刪除回覆訊息
            setTimeout(async () => {
                try {
                    await interaction.deleteReply();
                } catch (error) {
                    console.log('無法刪除回覆訊息');
                }
            }, 3000);

        } catch (error) {
            console.error('清除訊息時發生錯誤:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ 嗚嗚～Salt 清理訊息時出錯了にゃ！可能是權限不夠或訊息太舊了にゃ？'
                });
            } else {
                await interaction.reply({
                    content: '❌ 嗚嗚～Salt 清理訊息時出錯了にゃ！可能是權限不夠或訊息太舊了にゃ？',
                    ephemeral: true
                });
            }
        }
    },
};
