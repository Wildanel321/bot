import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { addReminder, addTodo, getTodos, completeTodo, deleteTodo } from '../database.js';

// Safe math evaluator using strict regex validation
function evaluateMath(expression) {
  const clean = expression.replace(/\s+/g, '').replace(/x/g, '*').replace(/:/g, '/').replace(/\^/g, '**');
  // Only allow digits, math operators, and parentheses
  if (!/^[0-9+\-*/().%]*$/.test(clean)) {
    return "Ekspresi mengandung karakter ilegal. Hanya angka dan operator matematika (+, -, *, /, %) yang diizinkan.";
  }
  try {
    const res = Function(`"use strict"; return (${clean})`)();
    if (typeof res !== 'number' || isNaN(res) || !isFinite(res)) {
      return "Hasil bukan angka yang valid.";
    }
    return res;
  } catch (error) {
    return `Gagal mengevaluasi rumus: ${error.message}`;
  }
}

// Duration string parser (e.g. 10m, 2h)
function parseDuration(timeStr) {
  const match = timeStr.toLowerCase().match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  
  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 3600;
  if (unit === 'd') return amount * 86400;
  return 0;
}

const wmoCodes = {
  0: "☀️ Cerah",
  1: "🌤️ Cerah Berawan", 2: "🌤️ Cerah Berawan", 3: "🌤️ Cerah Berawan",
  45: "🌫️ Berkabut", 48: "🌫️ Rime Kabut",
  51: "🌧️ Gerimis Ringan", 53: "🌧️ Gerimis Sedang", 55: "🌧️ Gerimis Lebat",
  56: "❄️ Gerimis Beku Ringan", 57: "❄️ Gerimis Beku Lebat",
  61: "🌧️ Hujan Ringan", 63: "🌧️ Hujan Sedang", 65: "🌧️ Hujan Lebat",
  66: "❄️ Hujan Beku Ringan", 67: "❄️ Hujan Beku Lebat",
  71: "❄️ Salju Ringan", 73: "❄️ Salju Sedang", 75: "❄️ Salju Lebat",
  77: "❄️ Butiran Salju",
  80: "🌧️ Hujan Mandi Ringan", 81: "🌧️ Hujan Mandi Sedang", 82: "🌧️ Hujan Mandi Deras",
  85: "❄️ Hujan Salju Ringan", 86: "❄️ Hujan Salju Lebat",
  95: "⛈️ Badai Petir Ringan/Sedang", 96: "⛈️ Badai Petir dengan Hujan Es", 99: "⛈️ Badai Petir dengan Hujan Es Lebat"
};

export const commands = [
  // 1. /calculate
  {
    name: 'calculate',
    description: 'Menghitung ekspresi matematika',
    options: [
      {
        name: 'ekspresi',
        type: ApplicationCommandOptionType.String,
        description: 'Contoh: (15 + 5) * 3 / 2',
        required: true
      }
    ],
    async execute(interaction) {
      const expr = interaction.options.getString('ekspresi');
      const result = evaluateMath(expr);
      
      if (typeof result === 'number') {
        await interaction.reply(`📊 **Hasil:** \`${result}\``);
      } else {
        await interaction.reply({ content: `❌ **Kesalahan:** ${result}`, ephemeral: true });
      }
    }
  },

  // 2. /qrcode
  {
    name: 'qrcode',
    description: 'Membuat kode QR instan dari teks atau link',
    options: [
      {
        name: 'konten',
        type: ApplicationCommandOptionType.String,
        description: 'Teks atau URL untuk dibuatkan kode QR',
        required: true
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const content = interaction.options.getString('konten');
      const encodedText = encodeURIComponent(content);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedText}`;
      
      const embed = new EmbedBuilder()
        .setTitle("📱 QR Code Generator")
        .setDescription(`Berikut adalah QR Code untuk: \`${content}\``)
        .setColor("#3498DB")
        .setImage(qrUrl)
        .setFooter({ text: "Arahkan kamera ponsel Anda untuk memindai" });
        
      await interaction.editReply({ embeds: [embed] });
    }
  },

  // 3. /poll
  {
    name: 'poll',
    description: 'Membuat pemungutan suara (voting) di channel',
    options: [
      {
        name: 'pertanyaan',
        type: ApplicationCommandOptionType.String,
        description: 'Pertanyaan jajak pendapat',
        required: true
      },
      {
        name: 'pilihan1',
        type: ApplicationCommandOptionType.String,
        description: 'Pilihan pertama',
        required: true
      },
      {
        name: 'pilihan2',
        type: ApplicationCommandOptionType.String,
        description: 'Pilihan kedua',
        required: true
      },
      {
        name: 'pilihan3',
        type: ApplicationCommandOptionType.String,
        description: 'Pilihan ketiga (opsional)',
        required: false
      },
      {
        name: 'pilihan4',
        type: ApplicationCommandOptionType.String,
        description: 'Pilihan keempat (opsional)',
        required: false
      },
      {
        name: 'pilihan5',
        type: ApplicationCommandOptionType.String,
        description: 'Pilihan kelima (opsional)',
        required: false
      }
    ],
    async execute(interaction) {
      const question = interaction.options.getString('pertanyaan');
      const options = [
        interaction.options.getString('pilihan1'),
        interaction.options.getString('pilihan2')
      ];
      
      const p3 = interaction.options.getString('pilihan3');
      const p4 = interaction.options.getString('pilihan4');
      const p5 = interaction.options.getString('pilihan5');
      if (p3) options.push(p3);
      if (p4) options.push(p4);
      if (p5) options.push(p5);
      
      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
      const descriptionLines = options.map((opt, i) => `${emojis[i]} - **${opt}**`);
      
      const embed = new EmbedBuilder()
        .setTitle(`📊 Jajak Pendapat: ${question}`)
        .setDescription(descriptionLines.join('\n'))
        .setColor("#9B59B6")
        .setFooter({ text: `Dibuat oleh ${interaction.user.username}` })
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
      const replyMessage = await interaction.fetchReply();
      
      for (let i = 0; i < options.length; i++) {
        await replyMessage.react(emojis[i]);
      }
    }
  },

  // 4. /weather
  {
    name: 'weather',
    description: 'Melihat cuaca terkini di kota tujuan',
    options: [
      {
        name: 'kota',
        type: ApplicationCommandOptionType.String,
        description: 'Nama kota yang ingin dicari cuacanya (contoh: Jakarta, Tokyo)',
        required: true
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const city = interaction.options.getString('kota');
      
      try {
        // Step 1: Geocoding
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoResp = await fetch(geoUrl);
        if (!geoResp.ok) {
          return interaction.editReply("❌ Gagal menghubungi server geocoding.");
        }
        
        const geoData = await geoResp.json();
        if (!geoData.results || geoData.results.length === 0) {
          return interaction.editReply(`❌ Kota **${city}** tidak ditemukan.`);
        }
        
        const cityInfo = geoData.results[0];
        const lat = cityInfo.latitude;
        const lon = cityInfo.longitude;
        const name = cityInfo.name;
        const country = cityInfo.country || "";
        
        // Step 2: Forecast
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`;
        const wResp = await fetch(weatherUrl);
        if (!wResp.ok) {
          return interaction.editReply("❌ Gagal mendapatkan informasi cuaca.");
        }
        
        const wData = await wResp.json();
        const current = wData.current;
        
        const temp = current.temperature_2m;
        const feelsLike = current.apparent_temperature;
        const humidity = current.relative_humidity_2m;
        const wind = current.wind_speed_10m;
        const code = current.weather_code;
        
        const weatherDesc = wmoCodes[code] || "❓ Tidak Diketahui";
        
        const embed = new EmbedBuilder()
          .setTitle(`🌤️ Informasi Cuaca: ${name}, ${country}`)
          .setDescription(`Status: **${weatherDesc}**`)
          .setColor("#E67E22")
          .addFields(
            { name: "Suhu", value: `${temp}°C`, inline: true },
            { name: "Terasa Seperti", value: `${feelsLike}°C`, inline: true },
            { name: "Kelembaban", value: `${humidity}%`, inline: true },
            { name: "Kecepatan Angin", value: `${wind} km/h`, inline: true },
            { name: "Koordinat", value: `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`, inline: true }
          )
          .setFooter({ text: "Data disediakan oleh Open-Meteo" })
          .setTimestamp();
          
        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        await interaction.editReply("❌ Terjadi kesalahan saat memproses data cuaca.");
      }
    }
  },

  // 5. /remind
  {
    name: 'remind',
    description: 'Mengatur pengingat waktu otomatis',
    options: [
      {
        name: 'durasi',
        type: ApplicationCommandOptionType.String,
        description: 'Format durasi (contoh: 30s, 5m, 2h, 1d)',
        required: true
      },
      {
        name: 'pesan',
        type: ApplicationCommandOptionType.String,
        description: 'Pesan pengingat',
        required: true
      }
    ],
    async execute(interaction) {
      const duration = interaction.options.getString('durasi');
      const message = interaction.options.getString('pesan');
      
      const seconds = parseDuration(duration);
      if (seconds <= 0) {
        return interaction.reply({ content: "❌ Format durasi salah. Gunakan `s` (detik), `m` (menit), `h` (jam), atau `d` (hari). Contoh: `15m` atau `2h`.", ephemeral: true });
      }
      
      const remindTime = Math.floor(Date.now() / 1000) + seconds;
      await addReminder(interaction.user.id, interaction.channelId, message, remindTime);
      
      await interaction.reply(`⏰ Pengingat diatur! Saya akan mengingatkan Anda tentang **${message}** dalam **${duration}**.`);
    }
  },

  // 6. /shorten
  {
    name: 'shorten',
    description: 'Memendekkan URL link yang panjang',
    options: [
      {
        name: 'url',
        type: ApplicationCommandOptionType.String,
        description: 'Tautan panjang yang ingin dipendekkan (http/https)',
        required: true
      }
    ],
    async execute(interaction) {
      const url = interaction.options.getString('url');
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return interaction.reply({ content: "❌ Tautan harus diawali dengan `http://` atau `https://`", ephemeral: true });
      }
      
      await interaction.deferReply();
      try {
        const api = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`;
        const resp = await fetch(api);
        const data = await resp.json();
        
        if (resp.ok && data.shorturl) {
          await interaction.editReply(`🔗 **Tautan pendek Anda:** ${data.shorturl}`);
        } else {
          const errMsg = data.errormessage || "Kesalahan tidak diketahui";
          await interaction.editReply(`❌ Gagal memendekkan tautan: \`${errMsg}\``);
        }
      } catch (err) {
        await interaction.editReply("❌ Terjadi kesalahan saat memendekkan tautan.");
      }
    }
  },

  // 7. /todo
  {
    name: 'todo',
    description: 'Kelola daftar tugas (To-Do List) Anda',
    options: [
      {
        name: 'add',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Menambahkan tugas baru ke To-Do List',
        options: [
          {
            name: 'tugas',
            type: ApplicationCommandOptionType.String,
            description: 'Tugas yang ingin ditambahkan',
            required: true
          }
        ]
      },
      {
        name: 'list',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Melihat daftar tugas Anda'
      },
      {
        name: 'done',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Menandai tugas sebagai selesai',
        options: [
          {
            name: 'todo_id',
            type: ApplicationCommandOptionType.Integer,
            description: 'ID tugas dari daftar (/todo list)',
            required: true
          }
        ]
      },
      {
        name: 'del',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Menghapus tugas dari To-Do List',
        options: [
          {
            name: 'todo_id',
            type: ApplicationCommandOptionType.Integer,
            description: 'ID tugas dari daftar (/todo list)',
            required: true
          }
        ]
      }
    ],
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      
      if (sub === 'add') {
        const task = interaction.options.getString('tugas');
        await addTodo(userId, task);
        await interaction.reply(`📝 Berhasil menambahkan: \`${task}\` ke daftar tugas Anda.`);
      } else if (sub === 'list') {
        const todos = await getTodos(userId);
        if (todos.length === 0) {
          return interaction.reply("ℹ️ To-Do List Anda kosong. Gunakan `/todo add` untuk menambahkan!");
        }
        
        const embed = new EmbedBuilder()
          .setTitle("📝 To-Do List Anda")
          .setColor("#2ECC71")
          .setFooter({ text: `Total tugas: ${todos.length}` });
          
        const activeList = [];
        const doneList = [];
        
        for (const item of todos) {
          const status = item.completed === 1 ? "✅" : "⏳";
          const taskStr = `\`ID: ${item.id}\` ${status} ${item.task}`;
          if (item.completed === 1) {
            doneList.push(taskStr);
          } else {
            activeList.push(taskStr);
          }
        }
        
        if (activeList.length > 0) {
          embed.addFields({ name: "⏳ Belum Selesai", value: activeList.join('\n'), inline: false });
        }
        if (doneList.length > 0) {
          embed.addFields({ name: "✅ Selesai", value: doneList.join('\n'), inline: false });
        }
        
        await interaction.reply({ embeds: [embed] });
      } else if (sub === 'done') {
        const todoId = interaction.options.getInteger('todo_id');
        const success = await completeTodo(todoId, userId);
        if (success) {
          await interaction.reply(`✅ Tugas \`ID: ${todoId}\` ditandai sebagai selesai!`);
        } else {
          await interaction.reply({ content: "❌ Tugas tidak ditemukan atau bukan milik Anda.", ephemeral: true });
        }
      } else if (sub === 'del') {
        const todoId = interaction.options.getInteger('todo_id');
        const success = await deleteTodo(todoId, userId);
        if (success) {
          await interaction.reply(`🗑️ Tugas \`ID: ${todoId}\` berhasil dihapus!`);
        } else {
          await interaction.reply({ content: "❌ Tugas tidak ditemukan atau bukan milik Anda.", ephemeral: true });
        }
      }
    }
  }
];
