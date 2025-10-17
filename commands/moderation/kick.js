const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('請不乖的成員離開にゃ')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('要請誰離開呢にゃ？')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('為什麼要請他離開にゃ？')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Salt 覺得沒有提供原因にゃ';
        
        // 檢查權限
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return await interaction.reply({
                content: '❌ 你沒有請人離開的權限にゃ！',
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

        // 檢查是否嘗試踢除自己
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ 不能請自己離開にゃ！',
                ephemeral: true
            });
        }

        // 檢查是否嘗試踢除機器人自己
        if (targetUser.id === interaction.client.user.id) {
            return await interaction.reply({
                content: '❌ 不要趕我走にゃ！我還要幫大家的忙にゃ！',
                ephemeral: true
            });
        }

        // 檢查角色階層
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return await interaction.reply({
                content: '❌ 不能請走比你權限高的人にゃ！',
                ephemeral: true
            });
        }

        // 檢查機器人權限
        if (!targetMember.kickable) {
            return await interaction.reply({
                content: '❌ Salt 沒辦法請這個人離開にゃ，可能是權限不夠にゃ！',
                ephemeral: true
            });
        }

        try {
            // 嘗試發送私訊通知用戶
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0xFF6B6B)
                    .setTitle('🦶 你被請離開了にゃ')
                    .addFields(
                        { name: '伺服器', value: interaction.guild.name, inline: true },
                        { name: '執行者', value: interaction.user.tag, inline: true },
                        { name: '原因', value: reason, inline: false }
                    )
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('無法發送私訊給被踢除的用戶');
            }

            // 踢除用戶
            await targetMember.kick(reason);

            // 回覆成功訊息
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ 成功請人離開了にゃ')
                .addFields(
                    { name: '被請離開的人', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: '執行者', value: interaction.user.tag, inline: true },
                    { name: '原因', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('請人離開時發生錯誤:', error);
            await interaction.reply({
                content: '❌ 請人離開時出現問題了にゃ！',
                ephemeral: true
            });
        }
    },
};
