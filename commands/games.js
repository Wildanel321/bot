import { 
  ApplicationCommandOptionType, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} from 'discord.js';
import { addCoins } from '../database.js';

// Guess games state tracker
const guessGames = new Map();

// Helper to escape HTML characters in trivia
function decodeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&deg;/g, "°");
}

export const commands = [
  // 1. /roll
  {
    name: 'roll',
    description: 'Melempar dadu keberuntungan',
    options: [
      {
        name: 'sisi',
        type: ApplicationCommandOptionType.Integer,
        description: 'Jumlah sisi dadu (default: 6)',
        required: false
      }
    ],
    async execute(interaction) {
      const sides = interaction.options.getInteger('sisi') || 6;
      if (sides < 2) {
        return interaction.reply({ content: "❌ Dadu harus memiliki minimal 2 sisi.", ephemeral: true });
      }
      
      const rollRes = Math.floor(Math.random() * sides) + 1;
      await interaction.reply(`🎲 Anda melempar dadu ${sides} sisi dan mendapatkan angka: **${rollRes}**!`);
    }
  },

  // 2. /coinflip
  {
    name: 'coinflip',
    description: 'Melempar koin (angka atau gambar)',
    async execute(interaction) {
      const result = Math.random() < 0.5 ? "🪙 Koin: ANGKA" : "🖼️ Koin: GAMBAR";
      await interaction.reply(result);
    }
  },

  // 3. /meme
  {
    name: 'meme',
    description: 'Mengambil meme lucu secara acak',
    async execute(interaction) {
      await interaction.deferReply();
      try {
        const resp = await fetch("https://meme-api.com/gimme");
        if (!resp.ok) {
          return interaction.editReply("❌ Gagal mengambil meme dari server API.");
        }
        
        const data = await resp.json();
        
        const embed = new EmbedBuilder()
          .setTitle(data.title || "Meme Lucu")
          .setURL(data.postLink)
          .setColor("#E74C3C")
          .setImage(data.url)
          .setFooter({ text: `Subreddit: r/${data.subreddit} | 👍 ${data.ups}` });
          
        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        await interaction.editReply("❌ Terjadi kesalahan pada server API Meme.");
      }
    }
  },

  // 4. /trivia
  {
    name: 'trivia',
    description: 'Bermain kuis trivia seru!',
    async execute(interaction) {
      await interaction.deferReply();
      
      try {
        const resp = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
        if (!resp.ok) {
          return interaction.editReply("❌ Gagal mendapatkan pertanyaan kuis.");
        }
        
        const data = await resp.json();
        if (data.response_code !== 0) {
          return interaction.editReply("❌ Tidak dapat memuat pertanyaan trivia saat ini.");
        }
        
        const result = data.results[0];
        const question = decodeHtml(result.question);
        const correctAnswer = decodeHtml(result.correct_answer);
        const incorrectAnswers = result.incorrect_answers.map(decodeHtml);
        
        // Shuffle options
        const options = [...incorrectAnswers, correctAnswer];
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        
        const correctIndex = options.indexOf(correctAnswer);
        const labels = ["A", "B", "C", "D"];
        
        const embed = new EmbedBuilder()
          .setTitle(`🧠 Kuis Trivia (${decodeHtml(result.category)})`)
          .setDescription(`**Tingkat Kesulitan:** ${result.difficulty.toUpperCase()}\n\n**Pertanyaan:**\n${question}`)
          .setColor("#F1C40F")
          .setFooter({ text: "Pilih jawaban di bawah dalam waktu 30 detik!" });
          
        const row = new ActionRowBuilder();
        for (let i = 0; i < options.length; i++) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`trivia_${i}`)
              .setLabel(`${labels[i]}. ${options[i].substring(0, 70)}`)
              .setStyle(ButtonStyle.Secondary)
          );
        }
        
        const reply = await interaction.editReply({ embeds: [embed], components: [row] });
        const collector = reply.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000
        });
        
        let answered = false;
        
        collector.on('collect', async (i) => {
          if (i.user.id !== interaction.user.id) {
            return i.reply({ content: "❌ Hanya orang yang memicu perintah ini yang bisa menjawab!", ephemeral: true });
          }
          
          answered = true;
          collector.stop();
          
          const clickedId = i.customId;
          const clickedIndex = parseInt(clickedId.replace('trivia_', ''), 10);
          const isCorrect = clickedIndex === correctIndex;
          
          // Edit styles
          const updatedRow = new ActionRowBuilder();
          for (let idx = 0; idx < options.length; idx++) {
            const btn = new ButtonBuilder()
              .setCustomId(`trivia_${idx}`)
              .setLabel(`${labels[idx]}. ${options[idx].substring(0, 70)}`)
              .setDisabled(true);
              
            if (idx === correctIndex) {
              btn.setStyle(ButtonStyle.Success);
            } else if (idx === clickedIndex) {
              btn.setStyle(ButtonStyle.Danger);
            } else {
              btn.setStyle(ButtonStyle.Secondary);
            }
            updatedRow.addComponents(btn);
          }
          
          const title = isCorrect ? "🎉 Jawaban Benar!" : "❌ Jawaban Salah!";
          const color = isCorrect ? "#00FF00" : "#FF0000";
          const resEmbed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`**Pertanyaan:**\n${question}\n\nAnda menjawab: **${options[clickedIndex]}**\nJawaban yang benar: **${correctAnswer}**`)
            .setColor(color);
            
          await i.update({ embeds: [resEmbed], components: [updatedRow] });
        });
        
        collector.on('end', async () => {
          if (!answered) {
            const disabledRow = new ActionRowBuilder();
            for (let idx = 0; idx < options.length; idx++) {
              disabledRow.addComponents(
                new ButtonBuilder()
                  .setCustomId(`trivia_${idx}`)
                  .setLabel(`${labels[idx]}. ${options[idx].substring(0, 70)}`)
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true)
              );
            }
            
            const timeoutEmbed = new EmbedBuilder()
              .setTitle("⏰ Waktu Habis!")
              .setDescription(`Pertanyaan:\n${question}\n\nJawaban yang benar: **${correctAnswer}**`)
              .setColor("#808080");
              
            await interaction.editReply({ embeds: [timeoutEmbed], components: [disabledRow] });
          }
        });
      } catch (err) {
        console.error(err);
        await interaction.editReply("❌ Terjadi kesalahan saat memuat kuis trivia.");
      }
    }
  },

  // 5. /rps
  {
    name: 'rps',
    description: 'Bermain Batu-Gunting-Kertas melawan bot',
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setTitle("✊ Batu - Gunting - Kertas ✌️")
        .setDescription("Silakan pilih salah satu tombol di bawah untuk menantang bot!")
        .setColor("#3498DB");
        
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rps_Batu').setLabel('Batu').setEmoji('✊').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rps_Kertas').setLabel('Kertas').setEmoji('🖐️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rps_Gunting').setLabel('Gunting').setEmoji('✌️').setStyle(ButtonStyle.Primary)
      );
      
      const reply = await interaction.reply({ embeds: [embed], components: [row] });
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
      });
      
      let played = false;
      const choices = ["Batu", "Kertas", "Gunting"];
      const emojis = { Batu: "✊", Kertas: "🖐️", Gunting: "✌️" };
      
      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: "❌ Hanya orang yang memicu perintah ini yang bisa bermain!", ephemeral: true });
        }
        
        played = true;
        collector.stop();
        
        const userChoice = i.customId.replace('rps_', '');
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
        let result, color;
        if (userChoice === botChoice) {
          result = "🤝 Hasil Seri (Draw)!";
          color = "#808080";
        } else if (
          (userChoice === "Batu" && botChoice === "Gunting") ||
          (userChoice === "Kertas" && botChoice === "Batu") ||
          (userChoice === "Gunting" && botChoice === "Kertas")
        ) {
          result = "🎉 Anda Menang!";
          color = "#00FF00";
        } else {
          result = "🤖 Bot Menang!";
          color = "#FF0000";
        }
        
        const updatedRow = new ActionRowBuilder();
        for (const choice of choices) {
          const btn = new ButtonBuilder()
            .setCustomId(`rps_${choice}`)
            .setLabel(choice)
            .setEmoji(emojis[choice])
            .setDisabled(true);
            
          if (choice === userChoice) {
            btn.setStyle(ButtonStyle.Success);
          } else if (choice === botChoice) {
            btn.setStyle(ButtonStyle.Danger);
          } else {
            btn.setStyle(ButtonStyle.Secondary);
          }
          updatedRow.addComponents(btn);
        }
        
        const resEmbed = new EmbedBuilder()
          .setTitle("✊ Batu - Gunting - Kertas ✌️")
          .setDescription(`Pilihan Anda: ${emojis[userChoice]} **${userChoice}**\nPilihan Bot: ${emojis[botChoice]} **${botChoice}**\n\n**Hasil:** ${result}`)
          .setColor(color);
          
        await i.update({ embeds: [resEmbed], components: [updatedRow] });
      });
      
      collector.on('end', async () => {
        if (!played) {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rps_Batu').setLabel('Batu').setEmoji('✊').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('rps_Kertas').setLabel('Kertas').setEmoji('🖐️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('rps_Gunting').setLabel('Gunting').setEmoji('✌️').setStyle(ButtonStyle.Primary).setDisabled(true)
          );
          await interaction.editReply({ components: [disabledRow] });
        }
      });
    }
  },

  // 6. /guess
  {
    name: 'guess',
    description: 'Permainan tebak angka acak',
    options: [
      {
        name: 'start',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Mulai game tebak angka baru (1-100)'
      },
      {
        name: 'input',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Masukkan tebakan angka Anda',
        options: [
          {
            name: 'angka',
            type: ApplicationCommandOptionType.Integer,
            description: 'Masukkan tebakan angka Anda (1-100)',
            required: true
          }
        ]
      }
    ],
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild ? interaction.guild.id : '0';
      
      if (sub === 'start') {
        const numberToGuess = Math.floor(Math.random() * 100) + 1;
        guessGames.set(userId, { number: numberToGuess, attempts: 0 });
        
        await interaction.reply("🎮 **Permainan Dimulai!** Aku sudah memikirkan sebuah angka antara **1** dan **100**. Gunakan perintah `/guess input` untuk menebak!");
      } else if (sub === 'input') {
        if (!guessGames.has(userId)) {
          return interaction.reply({ content: "❌ Anda belum memulai permainan. Ketik `/guess start` terlebih dahulu untuk bermain!", ephemeral: true });
        }
        
        const guess = interaction.options.getInteger('angka');
        const game = guessGames.get(userId);
        game.attempts += 1;
        const secret = game.number;
        
        if (guess < secret) {
          await interaction.reply(`📉 Tebakan **${guess}** terlalu **KECIL**! (Percobaan #${game.attempts})`);
        } else if (guess > secret) {
          await interaction.reply(`📈 Tebakan **${guess}** terlalu **BESAR**! (Percobaan #${game.attempts})`);
        } else {
          // Success!
          const attempts = game.attempts;
          guessGames.delete(userId);
          
          const coinsAwarded = Math.max(10, 100 - (attempts * 5));
          const newBalance = await addCoins(userId, guildId, coinsAwarded);
          
          const embed = new EmbedBuilder()
            .setTitle("🎉 Tebakan Tepat!")
            .setDescription(`Selamat ${interaction.user}! Angka yang aku pikirkan memang **${secret}**.\nAnda berhasil menebak dalam **${attempts}** percobaan.\n\n🪙 Anda mendapatkan hadiah **{coins_awarded} koin**!`)
            .setColor("#00FF00")
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields({ name: "Saldo Sekarang", value: `🪙 ${newBalance} koin`, inline: false });
            
          await interaction.reply({ embeds: [embed] });
        }
      }
    }
  }
];
