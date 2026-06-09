import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { 
  getUser, 
  addCoins, 
  updateDailyTime, 
  updateWorkTime, 
  getEconomyLeaderboard, 
  getLevelLeaderboard 
} from '../database.js';

const jobs = [
  "Bekerja sebagai Kurir Paket di J&T dan dibayar",
  "Menjadi Programmer Lepas (Freelancer) untuk membuat website toko kelontong dan dibayar",
  "Menjadi Driver Ojek Online di Gojek dan mendapatkan tip sebesar",
  "Bekerja paruh waktu sebagai Barista di Starbucks dan menerima upah",
  "Menjadi Content Creator dan mendapatkan adsense YouTube sebesar",
  "Membantu mencuci piring di warteg langganan dan diberi uang jajan",
  "Menjadi Guru Les Privat Matematika SD dan dibayar",
  "Membantu menerjemahkan dokumen bahasa Inggris dan menerima komisi",
  "Ikut turnamen e-Sports lokal dan memenangkan hadiah hiburan senilai",
  "Membantu menyapu halaman kantor kelurahan dan diberi imbalan"
];

function generateProgressBar(xp, level) {
  const needed = level * 150;
  const percent = Math.min(100, Math.floor((xp / needed) * 100));
  const filled = Math.min(10, Math.floor((xp / needed) * 10));
  const bar = "🟩".repeat(filled) + "⬜".repeat(10 - filled);
  return { bar, percent };
}

export const commands = [
  // 1. /daily
  {
    name: 'daily',
    description: 'Mengklaim hadiah koin harian gratis',
    async execute(interaction) {
      const userId = interaction.user.id;
      const guildId = interaction.guild ? interaction.guild.id : '0';
      
      const userData = await getUser(userId, guildId);
      const lastDaily = userData.last_daily;
      const currentTime = Math.floor(Date.now() / 1000);
      
      const cooldown = 86400; // 24 hours
      const timePassed = currentTime - lastDaily;
      
      if (timePassed < cooldown) {
        const remaining = cooldown - timePassed;
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;
        
        return interaction.reply({ 
          content: `❌ Anda sudah mengklaim hadiah harian Anda. Silakan coba lagi dalam **${hours} jam, ${minutes} menit, ${seconds} detik** .`, 
          ephemeral: true 
        });
      }
      
      const reward = Math.floor(Math.random() * 151) + 100; // 100 to 250
      const newBalance = await addCoins(userId, guildId, reward);
      await updateDailyTime(userId, guildId, currentTime);
      
      const embed = new EmbedBuilder()
        .setTitle("🎁 Hadiah Harian Diklaim!")
        .setDescription(`Selamat! Anda mendapatkan **🪙 ${reward} koin** .`)
        .setColor("#00FF00")
        .addFields({ name: "Saldo Baru Anda", value: `🪙 ${newBalance} koin`, inline: false })
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
    }
  },

  // 2. /balance
  {
    name: 'balance',
    description: 'Melihat saldo koin Anda atau pengguna lain',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Pengguna yang ingin dilihat saldonya (opsional)',
        required: false
      }
    ],
    async execute(interaction) {
      const user = interaction.options.getUser('anggota') || interaction.user;
      if (user.bot) {
        return interaction.reply({ content: "❌ Bot tidak memiliki saldo ekonomi.", ephemeral: true });
      }
      
      const guildId = interaction.guild ? interaction.guild.id : '0';
      const userData = await getUser(user.id, guildId);
      
      const embed = new EmbedBuilder()
        .setTitle(`🪙 Dompet Ekonomi: ${user.username}`)
        .setColor("#F1C40F")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Saldo Koin", value: `**🪙 ${userData.coins} koin**`, inline: true },
          { name: "Tingkat Level", value: `⭐ Level ${userData.level}`, inline: true }
        )
        .setFooter({ text: `Diminta oleh: ${interaction.user.username}` })
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
    }
  },

  // 3. /work
  {
    name: 'work',
    description: 'Bekerja serabutan untuk mendapatkan koin tambahan',
    async execute(interaction) {
      const userId = interaction.user.id;
      const guildId = interaction.guild ? interaction.guild.id : '0';
      
      const userData = await getUser(userId, guildId);
      const lastWork = userData.last_work;
      const currentTime = Math.floor(Date.now() / 1000);
      
      const cooldown = 3600; // 1 hour
      const timePassed = currentTime - lastWork;
      
      if (timePassed < cooldown) {
        const remaining = cooldown - timePassed;
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        
        return interaction.reply({ 
          content: `❌ Anda lelah! Harap istirahat dan coba bekerja lagi dalam **${minutes} menit, ${seconds} detik** .`, 
          ephemeral: true 
        });
      }
      
      const pay = Math.floor(Math.random() * 61) + 30; // 30 to 90
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const newBalance = await addCoins(userId, guildId, pay);
      await updateWorkTime(userId, guildId, currentTime);
      
      const embed = new EmbedBuilder()
        .setTitle("💼 Selesai Bekerja!")
        .setDescription(`${job} **🪙 ${pay} koin** .`)
        .setColor("#3498DB")
        .addFields({ name: "Saldo Sekarang", value: `🪙 ${newBalance} koin`, inline: false })
        .setFooter({ text: "Kerja keras bagai kuda!" })
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
    }
  },

  // 4. /leaderboard
  {
    name: 'leaderboard',
    description: 'Menampilkan papan peringkat server (XP/Koin)',
    options: [
      {
        name: 'tipe',
        type: ApplicationCommandOptionType.String,
        description: 'Pilih tipe papan peringkat',
        required: true,
        choices: [
          { name: "Kekayaan (Koin)", value: "coins" },
          { name: "Keaktifan (Level/XP)", value: "level" }
        ]
      }
    ],
    async execute(interaction) {
      const guild = interaction.guild;
      if (!guild) {
        return interaction.reply({ content: "❌ Papan peringkat hanya tersedia di dalam server.", ephemeral: true });
      }
      
      await interaction.deferReply();
      const type = interaction.options.getString('tipe');
      
      let topUsers, title, color;
      if (type === 'coins') {
        topUsers = await getEconomyLeaderboard(guild.id, 10);
        title = "🏆 Papan Peringkat Kekayaan Server (Koin)";
        color = "#F1C40F";
      } else {
        topUsers = await getLevelLeaderboard(guild.id, 10);
        title = "🏆 Papan Peringkat Keaktifan Server (XP)";
        color = "#9B59B6";
      }
      
      if (topUsers.length === 0) {
        return interaction.editReply("ℹ️ Papan peringkat belum memiliki data aktif.");
      }
      
      const descriptionLines = [];
      for (let i = 0; i < topUsers.length; i++) {
        const entry = topUsers[i];
        const user = guild.members.cache.get(entry.user_id) || 
                     await guild.members.fetch(entry.user_id).catch(() => null);
        const name = user ? user.user.username : `User ID: ${entry.user_id}`;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `\`#${i + 1}\``;
        
        if (type === 'coins') {
          descriptionLines.push(`${medal} **${name}** - 🪙 ${entry.coins} koin`);
        } else {
          descriptionLines.push(`${medal} **${name}** - Level ${entry.level} (XP: ${entry.xp})`);
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(descriptionLines.join('\n'))
        .setColor(color)
        .setFooter({ text: `Server: ${guild.name}` })
        .setTimestamp();
        
      await interaction.editReply({ embeds: [embed] });
    }
  },

  // 5. /rank
  {
    name: 'rank',
    description: 'Melihat level dan XP Anda saat ini',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota server yang ingin dilihat levelnya (opsional)',
        required: false
      }
    ],
    async execute(interaction) {
      const user = interaction.options.getUser('anggota') || interaction.user;
      if (user.bot) {
        return interaction.reply({ content: "❌ Bot tidak memiliki peringkat level.", ephemeral: true });
      }
      
      const guildId = interaction.guild ? interaction.guild.id : '0';
      const userData = await getUser(user.id, guildId);
      
      const level = userData.level;
      const xp = userData.xp;
      const needed = level * 150;
      
      const { bar, percent } = generateProgressBar(xp, level);
      
      const embed = new EmbedBuilder()
        .setTitle(`⭐ Kartu Level: ${user.username}`)
        .setColor("#9B59B6")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Level saat ini", value: `**Level ${level}**`, inline: true },
          { name: "Total XP", value: `**${xp} / ${needed} XP**`, inline: true },
          { name: "Kemajuan Level-up", value: `${bar} \`${percent}%\``, inline: false }
        )
        .setFooter({ text: "Teruslah aktif mengobrol di server!" })
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
    }
  },

  // 6. /pay
  {
    name: 'pay',
    description: 'Mentransfer koin Anda kepada anggota lain',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota tujuan transfer',
        required: true
      },
      {
        name: 'jumlah',
        type: ApplicationCommandOptionType.Integer,
        description: 'Jumlah koin yang ingin dikirim',
        required: true
      }
    ],
    async execute(interaction) {
      const targetUser = interaction.options.getUser('anggota');
      const amount = interaction.options.getInteger('jumlah');
      
      const senderId = interaction.user.id;
      const receiverId = targetUser.id;
      const guildId = interaction.guild ? interaction.guild.id : '0';
      
      if (receiverId === senderId) {
        return interaction.reply({ content: "❌ Anda tidak bisa mentransfer koin ke diri sendiri.", ephemeral: true });
      }
      
      if (targetUser.bot) {
        return interaction.reply({ content: "❌ Anda tidak bisa mentransfer koin ke Bot.", ephemeral: true });
      }
      
      if (amount <= 0) {
        return interaction.reply({ content: "❌ Jumlah transfer harus lebih dari 0 koin.", ephemeral: true });
      }
      
      const senderData = await getUser(senderId, guildId);
      if (senderData.coins < amount) {
        return interaction.reply({ 
          content: `❌ Saldo Anda tidak mencukupi. Saldo saat ini: **🪙 ${senderData.coins} koin** .`, 
          ephemeral: true 
        });
      }
      
      // Perform transfer
      await addCoins(senderId, guildId, -amount);
      await addCoins(receiverId, guildId, amount);
      
      const embed = new EmbedBuilder()
        .setTitle("💸 Transaksi Berhasil")
        .setDescription(`Anda berhasil mentransfer koin ke <@${receiverId}>.`)
        .setColor("#00FF00")
        .addFields(
          { name: "Pengirim", value: `<@${senderId}>`, inline: true },
          { name: "Penerima", value: `<@${receiverId}>`, inline: true },
          { name: "Jumlah Transfer", value: `🪙 ${amount} koin`, inline: false }
        )
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
    }
  }
];
