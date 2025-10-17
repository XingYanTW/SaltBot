const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('封鎖惡意用戶にゃ')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('要封鎖誰呢にゃ？')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('為什麼要封鎖他呢にゃ？')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('要刪除幾天內的訊息呢にゃ？(0-7天)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || '無原因提供';
        const deleteMessageDays = interaction.options.getInteger('days') || 0;
        
        // 檢查權限
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({
                content: '❌ Salt 說你沒有封鎖人的權限にゃ～',
                ephemeral: true
            });
        }

        // 檢查是否嘗試封鎖自己
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ 不能封鎖自己にゃ～這樣Salt會很困擾的にゃ！',
                ephemeral: true
            });
        }

        // 檢查是否嘗試封鎖機器人自己
        if (targetUser.id === interaction.client.user.id) {
            return await interaction.reply({
                content: '❌ 嗚嗚～不要封鎖Salt啦にゃ！Salt還要陪大家玩呢にゃ～',
                ephemeral: true
            });
        }

        const targetMember = interaction.guild.members.cache.get(targetUser.id);
        
        // 如果用戶在伺服器中，檢查角色階層
        if (targetMember) {
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                return await interaction.reply({
                    content: '❌ 這個人的身份比你高にゃ～Salt 沒辦法封鎖比你厲害的人にゃ！',
                    ephemeral: true
                });
            }

            if (!targetMember.bannable) {
                return await interaction.reply({
                    content: '❌ Salt 封鎖不了這個人にゃ～可能是他們太厲害了，或是Salt的權限不夠にゃ！',
                    ephemeral: true
                });
            }
        }

        try {
            // 嘗試發送私訊通知用戶
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🔨 您已被封鎖')
                    .addFields(
                        { name: '伺服器', value: interaction.guild.name, inline: true },
                        { name: '執行者', value: interaction.user.tag, inline: true },
                        { name: '原因', value: reason, inline: false }
                    )
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('無法發送私訊給被封鎖的用戶');
            }

            // 封鎖用戶
            await interaction.guild.members.ban(targetUser, {
                reason: reason,
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
            });

            // 回覆成功訊息
            const successEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔨 Salt 成功封鎖了壞人にゃ')
                .addFields(
                    { name: '被封鎖的壞人', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Salt 的助手', value: interaction.user.tag, inline: true },
                    { name: '封鎖原因', value: reason, inline: false }
                );

            if (deleteMessageDays > 0) {
                successEmbed.addFields({
                    name: '訊息清理', 
                    value: `Salt 幫忙清理了 ${deleteMessageDays} 天內的訊息にゃ`, 
                    inline: true
                });
            }

            successEmbed.setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('封鎖用戶時發生錯誤:', error);
            await interaction.reply({
                content: '❌ 嗚嗚～Salt 無法封鎖這個人にゃ！可能是出了什麼問題呢にゃ？',
                ephemeral: true
            });
        }
    },
};
