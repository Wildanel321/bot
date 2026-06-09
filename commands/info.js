import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;
const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const groq = apiKey ? new Groq({ apiKey }) : null;

// Uptime calculation string
function getUptimeString() {
  const uptimeSeconds = Math.floor(process.uptime());
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} menit`);
  parts.push(`${seconds} detik`);
  return parts.join(', ');
}

export const commands = [
  // 1. /userinfo
  {
    name: 'userinfo',
    description: 'Menampilkan informasi detail tentang pengguna',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota server (opsional, default: diri sendiri)',
        required: false
      }
    ],
    async execute(interaction) {
      const user = interaction.options.getUser('anggota') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      
      const embed = new EmbedBuilder()
        .setTitle(`👤 Profil Pengguna: ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .setColor(member ? member.displayColor : "#00FFFF")
        .setTimestamp();
        
      embed.addFields(
        { name: "Nama Panggilan", value: member ? member.displayName : user.username, inline: true },
        { name: "ID Pengguna", value: user.id, inline: true },
        { name: "Status Bot", value: user.bot ? "🤖 Bot" : "👤 Pengguna Biasa", inline: true }
      );
      
      const createdStr = user.createdAt.toLocaleString('id-ID', { timeZone: 'UTC' }) + ' UTC';
      embed.addFields({ name: "Akun Dibuat", value: createdStr, inline: false });
      
      if (member) {
        const joinedStr = member.joinedAt.toLocaleString('id-ID', { timeZone: 'UTC' }) + ' UTC';
        embed.addFields({ name: "Bergabung Server", value: joinedStr, inline: false });
        
        // Roles listing
        const roles = member.roles.cache
          .filter(role => role.id !== interaction.guild.id) // Exclude @everyone
          .map(role => role.toString());
        const rolesStr = roles.length > 0 ? roles.join(', ') : "Tidak ada role khusus";
        embed.addFields({ name: "Role Server", value: rolesStr, inline: false });
        
        // Key permissions
        const keyPermissions = ["Administrator", "ManageGuild", "KickMembers", "BanMembers", "ManageMessages", "ManageRoles", "MentionEveryone"];
        const notablePerms = [];
        for (const perm of keyPermissions) {
          if (member.permissions.has(perm)) {
            notablePerms.push(perm.replace(/([A-Z])/g, ' $1').trim());
          }
        }
        const permsStr = notablePerms.length > 0 ? notablePerms.join(', ') : "Standard Member";
        embed.addFields({ name: "Izin Penting", value: permsStr, inline: false });
      }
      
      embed.setFooter({ text: `Permintaan oleh: ${interaction.user.username}` });
      await interaction.reply({ embeds: [embed] });
    }
  },

  // 2. /serverinfo
  {
    name: 'serverinfo',
    description: 'Menampilkan statistik dan informasi detail server',
    async execute(interaction) {
      const guild = interaction.guild;
      if (!guild) {
        return interaction.reply({ content: "❌ Perintah ini hanya bisa digunakan di dalam server.", ephemeral: true });
      }
      
      const owner = await guild.fetchOwner();
      const ownerText = owner ? `${owner.user.username} (${owner.id})` : `ID: ${guild.ownerId}`;
      
      const textChannels = guild.channels.cache.filter(c => c.type === 0).size; // GuildText
      const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size; // GuildVoice
      const categories = guild.channels.cache.filter(c => c.type === 4).size; // GuildCategory
      
      const totalMembers = guild.memberCount;
      const botMembers = guild.members.cache.filter(m => m.user.bot).size;
      const humanMembers = totalMembers - botMembers;
      
      const embed = new EmbedBuilder()
        .setTitle(`🏰 Informasi Server: ${guild.name}`)
        .setColor("#9B59B6")
        .setTimestamp();
        
      if (guild.iconURL()) {
        embed.setThumbnail(guild.iconURL());
      }
      
      embed.addFields(
        { name: "Pemilik", value: ownerText, inline: true },
        { name: "ID Server", value: guild.id, inline: true },
        { name: "Dibuat Pada", value: guild.createdAt.toLocaleDateString('id-ID'), inline: true },
        
        { name: "Jumlah Anggota", value: `👥 Total: ${totalMembers}\n👤 Manusia: ${humanMembers}\n🤖 Bot: ${botMembers}`, inline: true },
        { name: "Saluran (Channels)", value: `📁 Kategori: ${categories}\n💬 Teks: ${textChannels}\n🔊 Suara: ${voiceChannels}`, inline: true },
        { name: "Fitur Tambahan", value: `🎭 Role: ${guild.roles.cache.size}\n😀 Emoji: ${guild.emojis.cache.size}\n💎 Boost: Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} Boosts)`, inline: true }
      );
      
      embed.setFooter({ text: `Diminta oleh: ${interaction.user.username}` });
      await interaction.reply({ embeds: [embed] });
    }
  },

  // 3. /botinfo
  {
    name: 'botinfo',
    description: 'Menampilkan statistik dan informasi bot Antigravity',
    async execute(interaction, client) {
      const latency = Math.round(client.ws.ping);
      const uptime = getUptimeString();
      const serversCount = client.guilds.cache.size;
      const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      
      const embed = new EmbedBuilder()
        .setTitle("🤖 Statistik & Info Bot Antigravity")
        .setColor("#1ABC9C")
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          { name: "Developer", value: "Google DeepMind Team", inline: true },
          { name: "Library", value: "discord.js v14.15.3", inline: true },
          { name: "Model AI", value: modelName, inline: true },
          { name: "Kecepatan Ping", value: `⚡ ${latency} ms`, inline: true },
          { name: "Jumlah Server", value: `🏰 ${serversCount} Server`, inline: true },
          { name: "Melayani Pengguna", value: `👥 ${totalUsers} Pengguna`, inline: true },
          { name: "Uptime Bot", value: `⏰ ${uptime}`, inline: false }
        )
        .setFooter({ text: "Gunakan /tanya untuk mengobrol bersama AI" });
        
      await interaction.reply({ embeds: [embed] });
    }
  },

  // 4. /avatar
  {
    name: 'avatar',
    description: 'Mengambil gambar profil (avatar) pengguna',
    options: [
      {
        name: 'anggota',
        type: ApplicationCommandOptionType.User,
        description: 'Anggota yang ingin diambil fotonya (opsional)',
        required: false
      }
    ],
    async execute(interaction) {
      const user = interaction.options.getUser('anggota') || interaction.user;
      
      const embed = new EmbedBuilder()
        .setTitle(`🖼️ Avatar ${user.username}`)
        .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
        .setColor("#55FF55")
        .setFooter({ text: `Diminta oleh ${interaction.user.username}` });
        
      await interaction.reply({ embeds: [embed] });
    }
  },

  // 5. /wiki
  {
    name: 'wiki',
    description: 'Mencari ringkasan artikel Wikipedia',
    options: [
      {
        name: 'topik',
        type: ApplicationCommandOptionType.String,
        description: 'Topik atau kata kunci pencarian',
        required: true
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const topic = interaction.options.getString('topik');
      const encodedTopic = encodeURIComponent(topic.replace(/\s+/g, '_'));
      
      try {
        let resp = await fetch(`https://id.wikipedia.org/api/rest_v1/page/summary/${encodedTopic}`);
        let data;
        
        if (resp.ok) {
          data = await resp.json();
        } else {
          // Fallback to English Wiki
          resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTopic}`);
          if (resp.ok) {
            data = await resp.json();
          } else {
            return interaction.editReply(`❌ Topik **${topic}** tidak ditemukan di Wikipedia bahasa Indonesia maupun Inggris.`);
          }
        }
        
        const title = data.title || topic;
        const extract = data.extract || "Tidak ada ringkasan tersedia.";
        const pageUrl = data.content_urls?.desktop?.page || "";
        const thumbnail = data.thumbnail?.source || null;
        
        const embed = new EmbedBuilder()
          .setTitle(`📖 Wikipedia: ${title}`)
          .setDescription(extract)
          .setURL(pageUrl)
          .setColor("#E2E2E2")
          .setFooter({ text: "Informasi diambil dari Wikipedia" });
          
        if (thumbnail) {
          embed.setThumbnail(thumbnail);
        }
        
        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        await interaction.editReply("❌ Terjadi kesalahan saat memproses data Wikipedia.");
      }
    }
  },

  // 6. /define
  {
    name: 'define',
    description: 'Mendefinisikan arti kata/istilah menggunakan bantuan AI',
    options: [
      {
        name: 'kata',
        type: ApplicationCommandOptionType.String,
        description: 'Kata atau istilah yang ingin didefinisikan (contoh: Integritas, FOMO, PHP)',
        required: true
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const word = interaction.options.getString('kata');
      
      if (!groq) {
        return interaction.editReply("❌ Fitur AI Dictionary tidak aktif karena Groq API key tidak diatur.");
      }
      
      const prompt = 
        `Tolong definisikan istilah/kata berikut secara formal layaknya kamus besar:\n\n` +
        `**Kata/Istilah:** "${word}"\n\n` +
        `Format jawaban:\n` +
        `1. **Definisi:** [Penjelasan lengkap arti kata tersebut]\n` +
        `2. **Kelas Kata:** [Misalnya: Nomina (kata benda), Verba (kata kerja), Slang (bahasa gaul), dll]\n` +
        `3. **Contoh Penggunaan:** [Buatkan 1 kalimat contoh yang relevan]\n` +
        `4. **Asal Usul/Konteks (jika ada):** [Penjelasan singkat asal katanya]`;
        
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'Anda adalah ensiklopedia dan kamus bahasa Indonesia terlengkap (KBBI modern).' },
            { role: 'user', content: prompt }
          ],
          model: modelName,
          temperature: 0.4
        });
        
        const reply = completion.choices[0].message.content;
        
        const embed = new EmbedBuilder()
          .setTitle(`📖 Definisi Kata: ${word.charAt(0).toUpperCase() + word.slice(1)}`)
          .setDescription(reply)
          .setColor("#34495E")
          .setFooter({ text: "Didefinisikan menggunakan Groq AI" });
          
        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        await interaction.editReply(`❌ Gagal mencari definisi: \`${err.message}\``);
      }
    }
  }
];
