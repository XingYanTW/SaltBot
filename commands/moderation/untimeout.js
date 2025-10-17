const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('讓人重新說話にゃ')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('要讓誰重新說話呢にゃ？')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('為什麼要讓他們重新說話呢にゃ？')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Salt 覺得他們可以重新說話了にゃ';
        
        // 檢查權限
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await interaction.reply({
                content: '❌ Salt 說你沒有讓人恢復說話的權限にゃ～',
                ephemeral: true
            });
        }

        // 檢查目標用戶
        const targetMember = interaction.guild.members.cache.get(targetUser.id);
        if (!targetMember) {
            return await interaction.reply({
                content: '❌ Salt 找不到這個人にゃ～他們還在伺服器裡嗎にゃ？',
                ephemeral: true
            });
        }

        // 檢查用戶是否被暫停
        if (!targetMember.communicationDisabledUntil || targetMember.communicationDisabledUntil < new Date()) {
            return await interaction.reply({
                content: '❌ 這個人本來就可以說話にゃ～不需要解除什麼にゃ！',
                ephemeral: true
            });
        }

        try {
            // 解除暫停
            await targetMember.timeout(null, reason);

            // 嘗試發送私訊通知用戶
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎉 Salt 讓你可以重新說話了にゃ')
                    .addFields(
                        { name: '伺服器', value: interaction.guild.name, inline: true },
                        { name: 'Salt 的助手', value: interaction.user.tag, inline: true },
                        { name: '原因', value: reason, inline: false }
                    )
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('無法發送私訊給用戶');
            }

            // 回覆成功訊息
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 Salt 讓他們重新說話了にゃ')
                .addFields(
                    { name: '恢復說話的用戶', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Salt 的助手', value: interaction.user.tag, inline: true },
                    { name: '原因', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('解除暫停時發生錯誤:', error);
            await interaction.reply({
                content: '❌ 嗚嗚～Salt 無法讓他們重新說話にゃ！可能是權限不夠呢にゃ？',
                ephemeral: true
            });
        }
    },
};
