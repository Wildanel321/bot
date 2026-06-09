import { ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { addWarning, getWarnings, clearWarnings } from '../database.js';

// Helper to check if a user has moderator-like privileges
function isModerator(member) {
  return member.permissions.has(PermissionFlagsBits.ManageMessages) || 
         member.permissions.has(PermissionFlagsBits.Administrator);
}

export const commands = [
  // 1. /kick
  {
    name: 'kick',
    description: 'Mengeluarkan anggota dari server',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota yang ingin ditendang',
        required: true
      },
      {
        name: 'alasan',
        type: ApplicationCommandOptionType.String,
        description: 'Alasan pengeluaran',
        required: false
      }
    ],
    async execute(interaction) {
      if (!isModerator(interaction.member)) {
        return interaction.reply({ content: "❌ Anda tidak memiliki izin (`Manage Messages` / `Administrator`) untuk menggunakan perintah ini.", ephemeral: true });
      }

      const member = interaction.options.getMember('anggota');
      const reason = interaction.options.getString('alasan') || "Tidak ada alasan spesifik";

      if (!member) {
        return interaction.reply({ content: "❌ Anggota tidak ditemukan di server ini.", ephemeral: true });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
        return interaction.reply({ content: "❌ Bot tidak memiliki izin `Kick Members` di server ini.", ephemeral: true });
      }

      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({ content: "❌ Anda tidak bisa mengeluarkan anggota yang memiliki role setara atau lebih tinggi dari Anda.", ephemeral: true });
      }

      if (!member.kickable) {
        return interaction.reply({ content: "❌ Bot tidak dapat mengeluarkan anggota ini (peran mereka mungkin lebih tinggi dari peran bot).", ephemeral: true });
      }

      try {
        await member.kick(reason);

        const embed = new EmbedBuilder()
          .setTitle("👢 Anggota Ditendang")
          .setDescription(`**${member.user.username}** telah berhasil ditendang dari server.`)
          .setColor("#FF0000")
          .setThumbnail(member.user.displayAvatarURL())
          .addFields(
            { name: "Target", value: `<@${member.id}>`, inline: true },
            { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Alasan", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        await interaction.reply({ content: f`❌ Gagal mengeluarkan anggota: \`${error.message}\``, ephemeral: true });
      }
    }
  },

  // 2. /ban
  {
    name: 'ban',
    description: 'Memblokir anggota dari server',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota yang ingin dibanned',
        required: true
      },
      {
        name: 'alasan',
        type: ApplicationCommandOptionType.String,
        description: 'Alasan pemblokiran',
        required: false
      }
    ],
    async execute(interaction) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: "❌ Anda tidak memiliki izin (`Ban Members`) untuk menggunakan perintah ini.", ephemeral: true });
      }

      const member = interaction.options.getMember('anggota');
      const reason = interaction.options.getString('alasan') || "Tidak ada alasan spesifik";

      if (!member) {
        return interaction.reply({ content: "❌ Anggota tidak ditemukan di server ini.", ephemeral: true });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: "❌ Bot tidak memiliki izin `Ban Members` di server ini.", ephemeral: true });
      }

      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({ content: "❌ Anda tidak bisa memblokir anggota yang memiliki role setara atau lebih tinggi dari Anda.", ephemeral: true });
      }

      if (!member.bannable) {
        return interaction.reply({ content: "❌ Bot tidak dapat memblokir anggota ini.", ephemeral: true });
      }

      try {
        await member.ban({ reason });

        const embed = new EmbedBuilder()
          .setTitle("🔨 Anggota Diblokir (Banned)")
          .setDescription(`**${member.user.username}** telah berhasil diblokir secara permanen dari server.`)
          .setColor("#8B0000")
          .setThumbnail(member.user.displayAvatarURL())
          .addFields(
            { name: "Target", value: `<@${member.id}>`, inline: true },
            { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Alasan", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        await interaction.reply({ content: `❌ Gagal memblokir anggota: \`${error.message}\``, ephemeral: true });
      }
    }
  },

  // 3. /unban
  {
    name: 'unban',
    description: 'Membuka blokir pengguna berdasarkan ID',
    options: [
      {
        name: 'user_id',
        type: ApplicationCommandOptionType.String,
        description: 'Discord ID dari pengguna yang diblokir',
        required: true
      },
      {
        name: 'alasan',
        type: ApplicationCommandOptionType.String,
        description: 'Alasan pembukaan blokir',
        required: false
      }
    ],
    async execute(interaction) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: "❌ Anda tidak memiliki izin (`Ban Members`) untuk menggunakan perintah ini.", ephemeral: true });
      }

      const userId = interaction.options.getString('user_id');
      const reason = interaction.options.getString('alasan') || "Tidak ada alasan spesifik";

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: "❌ Bot tidak memiliki izin `Ban Members` di server ini.", ephemeral: true });
      }

      try {
        const banList = await interaction.guild.bans.fetch();
        const bannedUser = banList.get(userId);

        if (!bannedUser) {
          return interaction.reply({ content: "❌ Pengguna tidak ditemukan dalam daftar blokir server ini.", ephemeral: true });
        }

        await interaction.guild.members.unban(userId, reason);

        const embed = new EmbedBuilder()
          .setTitle("🔓 Blokir Dibuka (Unbanned)")
          .setDescription(`**${bannedUser.user.username}** telah dipulihkan aksesnya ke server.`)
          .setColor("#00FF00")
          .addFields(
            { name: "Pengguna", value: `${bannedUser.user.username} (${userId})`, inline: true },
            { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Alasan", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        await interaction.reply({ content: `❌ Gagal membuka blokir: \`${error.message}\``, ephemeral: true });
      }
    }
  },

  // 4. /clear
  {
    name: 'clear',
    description: 'Menghapus sejumlah pesan di channel',
    options: [
      {
        name: 'jumlah',
        type: ApplicationCommandOptionType.Integer,
        description: 'Jumlah pesan yang ingin dihapus (1-100)',
        required: true
      }
    ],
    async execute(interaction) {
      if (!isModerator(interaction.member)) {
        return interaction.reply({ content: "❌ Anda tidak memiliki izin (`Manage Messages`) untuk menggunakan perintah ini.", ephemeral: true });
      }

      if (!interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: "❌ Bot tidak memiliki izin `Manage Messages` di channel ini.", ephemeral: true });
      }

      const count = interaction.options.getInteger('jumlah');

      if (count < 1 || count > 100) {
        return interaction.reply({ content: "❌ Jumlah pesan yang dihapus harus antara 1 sampai 100.", ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      try {
        const deleted = await interaction.channel.bulkDelete(count, true);
        await interaction.followUp({ content: `✅ Berhasil menghapus **${deleted.size}** pesan dari channel ini.` });
      } catch (error) {
        await interaction.followUp({ content: `❌ Gagal menghapus pesan: \`${error.message}\`` });
      }
    }
  },

  // 5. /timeout
  {
    name: 'timeout',
    description: 'Membatasi interaksi anggota (timeout/mute sementara)',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota yang ingin dihukum',
        required: true
      },
      {
        name: 'menit',
        type: ApplicationCommandOptionType.Integer,
        description: 'Durasi timeout dalam menit',
        required: true
      },
      {
        name: 'alasan',
        type: ApplicationCommandOptionType.String,
        description: 'Alasan timeout',
        required: false
      }
    ],
    async execute(interaction) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: "❌ Anda tidak memiliki izin (`Moderate Members`) untuk menggunakan perintah ini.", ephemeral: true });
      }

      const member = interaction.options.getMember('anggota');
      const minutes = interaction.options.getInteger('menit');
      const reason = interaction.options.getString('alasan') || "Tidak ada alasan spesifik";

      if (!member) {
        return interaction.reply({ content: "❌ Anggota tidak ditemukan di server ini.", ephemeral: true });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: "❌ Bot tidak memiliki izin `Moderate Members` di server ini.", ephemeral: true });
      }

      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({ content: "❌ Anda tidak bisa memberikan timeout kepada anggota yang memiliki role setara atau lebih tinggi dari Anda.", ephemeral: true });
      }

      if (minutes <= 0) {
        return interaction.reply({ content: "❌ Durasi timeout harus lebih dari 0 menit.", ephemeral: true });
      }

      try {
        await member.timeout(minutes * 60 * 1000, reason);

        const embed = new EmbedBuilder()
          .setTitle("🤫 Anggota Diberi Timeout")
          .setDescription(`**${member.user.username}** telah disenyapkan sementara.`)
          .setColor("#FFA500")
          .addFields(
            { name: "Target", value: `<@${member.id}>`, inline: true },
            { name: "Durasi", value: `${minutes} Menit`, inline: true },
            { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Alasan", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        await interaction.reply({ content: `❌ Gagal memberikan timeout: \`${error.message}\``, ephemeral: true });
      }
    }
  },

  // 6. /warn
  {
    name: 'warn',
    description: 'Memberikan peringatan resmi kepada anggota',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota yang ingin diberi peringatan',
        required: true
      },
      {
        name: 'alasan',
        type: ApplicationCommandOptionType.String,
        description: 'Alasan peringatan',
        required: true
      }
    ],
    async execute(interaction) {
      if (!isModerator(interaction.member)) {
        return interaction.reply({ content: "❌ Anda tidak memiliki izin (`Manage Messages`) untuk menggunakan perintah ini.", ephemeral: true });
      }

      const member = interaction.options.getMember('anggota');
      const reason = interaction.options.getString('alasan');

      if (!member) {
        return interaction.reply({ content: "❌ Anggota tidak ditemukan di server ini.", ephemeral: true });
      }

      if (member.user.bot) {
        return interaction.reply({ content: "❌ Anda tidak bisa memberi peringatan kepada bot.", ephemeral: true });
      }

      const guildId = interaction.guild.id;
      await addWarning(member.id, guildId, interaction.user.id, reason);
      
      const warns = await getWarnings(member.id, guildId);

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Peringatan Diberikan")
        .setDescription(`Peringatan resmi ke-**${warns.length}** telah tercatat untuk ${member}.`)
        .setColor("#FFFF00")
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: "Target", value: `<@${member.id}>`, inline: true },
          { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Alasan", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Attempt to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle(`⚠️ Anda Menerima Peringatan di ${interaction.guild.name}`)
          .setDescription(`Anda telah diperingatkan oleh moderator.\n**Alasan:** ${reason}`)
          .setColor("#FFFF00")
          .addFields({ name: "Total Peringatan Anda", value: `${warns.length} kali`, inline: true });
        await member.send({ embeds: [dmEmbed] });
      } catch (err) {
        // DM blocked, safe to ignore
      }
    }
  },

  // 7. /warnings
  {
    name: 'warnings',
    description: 'Melihat daftar peringatan dari anggota tertentu',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota yang ingin diperiksa',
        required: true
      }
    ],
    async execute(interaction) {
      const member = interaction.options.getMember('anggota');
      if (!member) {
        return interaction.reply({ content: "❌ Anggota tidak ditemukan.", ephemeral: true });
      }

      const guildId = interaction.guild.id;
      const warns = await getWarnings(member.id, guildId);

      if (warns.length === 0) {
        return interaction.reply(`✅ **${member.user.username}** bersih! Tidak ada peringatan yang tercatat.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Daftar Peringatan: ${member.user.username}`)
        .setDescription(`Total peringatan: **${warns.length}**`)
        .setColor("#FFFF00")
        .setThumbnail(member.user.displayAvatarURL());

      for (let i = 0; i < warns.length; i++) {
        const warn = warns[i];
        const dateText = new Date(warn.timestamp * 1000).toLocaleString('id-ID', { timeZone: 'UTC' }) + ' UTC';
        embed.addFields({
          name: `Peringatan #${i + 1} - ${dateText}`,
          value: `**Moderator:** <@${warn.moderator_id}>\n**Alasan:** ${warn.reason}`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    }
  },

  // 8. /clearwarn
  {
    name: 'clearwarn',
    description: 'Menghapus semua peringatan dari anggota tertentu',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota yang ingin dihapus peringatannya',
        required: true
      }
    ],
    async execute(interaction) {
      if (!isModerator(interaction.member)) {
        return interaction.reply({ content: "❌ Anda tidak memiliki izin (`Manage Messages`) untuk menggunakan perintah ini.", ephemeral: true });
      }

      const member = interaction.options.getMember('anggota');
      if (!member) {
        return interaction.reply({ content: "❌ Anggota tidak ditemukan.", ephemeral: true });
      }

      const guildId = interaction.guild.id;
      const count = await clearWarnings(member.id, guildId);

      if (count === 0) {
        await interaction.reply(`ℹ️ **${member.user.username}** tidak memiliki peringatan untuk dihapus.`);
      } else {
        await interaction.reply(`🧹 Berhasil menghapus **${count}** peringatan dari **${member.user.username}**!`);
      }
    }
  }
];
