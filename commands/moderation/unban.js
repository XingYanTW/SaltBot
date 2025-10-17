const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('給人重新機會にゃ')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('要給誰重新機會呢にゃ？(用戶ID)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('為什麼要給重新機會呢にゃ？')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || '無原因提供';
        
        // 檢查權限
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({
                content: '❌ Salt 說你沒有給人重新機會的權限にゃ～',
                ephemeral: true
            });
        }

        // 驗證用戶ID格式
        if (!/^\d{17,19}$/.test(userId)) {
            return await interaction.reply({
                content: '❌ Salt 說這個ID看起來不對にゃ～',
                ephemeral: true
            });
        }

        try {
            // 檢查用戶是否被封鎖
            const bannedUsers = await interaction.guild.bans.fetch();
            const bannedUser = bannedUsers.get(userId);

            if (!bannedUser) {
                return await interaction.reply({
                    content: '❌ 這個人沒有被封鎖過にゃ～可能已經解封了呢にゃ！',
                    ephemeral: true
                });
            }

            // 解除封鎖
            await interaction.guild.members.unban(userId, reason);

            // 回覆成功訊息
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Salt 給了重新機會にゃ')
                .addFields(
                    { name: '重新接納的用戶', value: `${bannedUser.user.tag} (${userId})`, inline: true },
                    { name: 'Salt 的助手', value: interaction.user.tag, inline: true },
                    { name: '給重新機會的原因', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('解除封鎖時發生錯誤:', error);
            await interaction.reply({
                content: '❌ 嗚嗚～Salt 無法幫這個人解封にゃ！可能是ID不對，或是他們本來就沒被封鎖にゃ？',
                ephemeral: true
            });
        }
    },
};
