const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('讓人冷靜一下にゃ')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('要讓誰冷靜一下呢にゃ？')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('冷靜時間 (分鐘) にゃ')
                .setMinValue(1)
                .setMaxValue(40320) // 28天 = 40320分鐘
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('為什麼要冷靜呢にゃ？')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'Salt 覺得沒有提供原因にゃ';
        
        // 檢查權限
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await interaction.reply({
                content: '❌ 你沒有讓人冷靜的權限にゃ！',
                ephemeral: true
            });
        }

        // 檢查目標用戶
        const targetMember = interaction.guild.members.cache.get(targetUser.id);
        if (!targetMember) {
            return await interaction.reply({
                content: '❌ 找不到這個人にゃ！',
                ephemeral: true
            });
        }

        // 檢查是否嘗試暫停自己
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ 不能讓自己冷靜にゃ！',
                ephemeral: true
            });
        }

        // 檢查是否嘗試暫停機器人
        if (targetUser.id === interaction.client.user.id) {
            return await interaction.reply({
                content: '❌ 不要讓我冷靜にゃ！我還要幫大家的忙にゃ！',
                ephemeral: true
            });
        }

        // 檢查角色階層
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return await interaction.reply({
                content: '❌ 不能讓比你權限高的人冷靜にゃ！',
                ephemeral: true
            });
        }

        // 檢查機器人權限
        if (!targetMember.moderatable) {
            return await interaction.reply({
                content: '❌ Salt 沒辦法讓這個人冷靜にゃ，可能是權限不夠にゃ！',
                ephemeral: true
            });
        }

        try {
            // 計算暫停結束時間
            const timeoutDuration = duration * 60 * 1000; // 轉換為毫秒
            const timeoutEnd = new Date(Date.now() + timeoutDuration);

            // 嘗試發送私訊通知用戶
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🔇 你需要冷靜一下にゃ')
                    .addFields(
                        { name: '伺服器', value: interaction.guild.name, inline: true },
                        { name: '執行者', value: interaction.user.tag, inline: true },
                        { name: '冷靜時間', value: `${duration} 分鐘`, inline: true },
                        { name: '結束時間', value: `<t:${Math.floor(timeoutEnd.getTime() / 1000)}:F>`, inline: false },
                        { name: '原因', value: reason, inline: false }
                    )
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('無法發送私訊給被暫停的用戶');
            }

            // 暫停用戶
            await targetMember.timeout(timeoutDuration, reason);

            // 回覆成功訊息
            const successEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🔇 成功讓人冷靜了にゃ')
                .addFields(
                    { name: '冷靜中的人', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: '執行者', value: interaction.user.tag, inline: true },
                    { name: '冷靜時間', value: `${duration} 分鐘`, inline: true },
                    { name: '結束時間', value: `<t:${Math.floor(timeoutEnd.getTime() / 1000)}:F>`, inline: false },
                    { name: '原因', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('讓人冷靜時發生錯誤:', error);
            await interaction.reply({
                content: '❌ 讓人冷靜時出現問題了にゃ！',
                ephemeral: true
            });
        }
    },
};
