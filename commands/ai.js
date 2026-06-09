import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;
const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

let groq = null;
if (apiKey) {
  groq = new Groq({ apiKey });
} else {
  console.warn("WARNING: GROQ_API_KEY is missing in environment variables. AI features will fail.");
}

// Conversation memories: userId -> array of message objects
const memories = new Map();

const systemPrompt = 
  "Anda adalah Antigravity, asisten AI Discord yang ramah, sopan, dan sangat cerdas. " +
  "Anda selalu merespons dalam Bahasa Indonesia yang alami, santun, dan mudah dipahami. " +
  "Bantulah pengguna dengan pertanyaan mereka secara akurat, ringkas, dan kreatif.";

export async function getGroqResponse(prompt, userId, customSystem = null) {
  if (!groq) {
    return "❌ API Key Groq tidak dikonfigurasi. Harap hubungi administrator bot.";
  }
  
  if (!memories.has(userId)) {
    memories.set(userId, [
      { role: 'system', content: customSystem || systemPrompt }
    ]);
  }
  
  const history = memories.get(userId);
  history.push({ role: 'user', content: prompt });
  
  // Keep history size within limits (system prompt + 10 history messages)
  if (history.length > 11) {
    const sys = history[0];
    const recent = history.slice(-10);
    memories.set(userId, [sys, ...recent]);
  }
  
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: memories.get(userId),
      model: modelName,
      temperature: 0.7,
      max_tokens: 1500
    });
    
    const reply = chatCompletion.choices[0].message.content;
    history.push({ role: 'assistant', content: reply });
    
    return reply;
  } catch (error) {
    console.error("Groq API Error:", error);
    // Remove last user prompt so they can try again
    const currentHist = memories.get(userId);
    if (currentHist && currentHist.length > 1 && currentHist[currentHist.length - 1].role === 'user') {
      currentHist.pop();
    }
    return `❌ Terjadi kesalahan saat menghubungi AI: \`${error.message}\``;
  }
}

export const commands = [
  // 1. /tanya
  {
    name: 'tanya',
    description: 'Mengobrol dengan AI Antigravity menggunakan Groq API',
    options: [
      {
        name: 'pertanyaan',
        type: ApplicationCommandOptionType.String,
        description: 'Pertanyaan atau topik yang ingin dibahas',
        required: true
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const question = interaction.options.getString('pertanyaan');
      const response = await getGroqResponse(question, interaction.user.id);
      
      if (response.length > 2000) {
        const chunks = response.match(/[\s\S]{1,1950}/g) || [];
        await interaction.editReply(chunks[0]);
        for (let i = 1; i < chunks.length; i++) {
          await interaction.channel.send(chunks[i]);
        }
      } else {
        await interaction.editReply(response);
      }
    }
  },
  
  // 2. /ringkas
  {
    name: 'ringkas',
    description: 'Meringkas teks panjang menjadi ringkas dan padat',
    options: [
      {
        name: 'teks',
        type: ApplicationCommandOptionType.String,
        description: 'Teks panjang yang ingin diringkas',
        required: true
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const text = interaction.options.getString('teks');
      
      if (!groq) {
        return interaction.editReply("❌ API Key Groq tidak dikonfigurasi.");
      }
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'Anda adalah asisten peringkas teks profesional.' },
            { role: 'user', content: `Tolong ringkas teks berikut secara padat, jelas, dan poin-poin penting saja:\n\n${text}` }
          ],
          model: modelName,
          temperature: 0.5
        });
        
        await interaction.editReply(completion.choices[0].message.content.substring(0, 2000));
      } catch (error) {
        await interaction.editReply(`❌ Error: \`${error.message}\``);
      }
    }
  },
  
  // 3. /terjemah
  {
    name: 'terjemah',
    description: 'Menerjemahkan teks ke bahasa tujuan',
    options: [
      {
        name: 'teks',
        type: ApplicationCommandOptionType.String,
        description: 'Teks yang ingin diterjemahkan',
        required: true
      },
      {
        name: 'bahasa_tujuan',
        type: ApplicationCommandOptionType.String,
        description: 'Bahasa target (contoh: Inggris, Jepang, Indonesia)',
        required: true
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const text = interaction.options.getString('teks');
      const targetLang = interaction.options.getString('bahasa_tujuan');
      
      if (!groq) {
        return interaction.editReply("❌ API Key Groq tidak dikonfigurasi.");
      }
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'Anda adalah penerjemah bahasa yang akurat. Hanya berikan hasil terjemahannya saja.' },
            { role: 'user', content: `Terjemahkan teks berikut ke bahasa ${targetLang}. Hanya berikan hasil terjemahannya saja tanpa penjelasan tambahan:\n\n"${text}"` }
          ],
          model: modelName,
          temperature: 0.3
        });
        
        await interaction.editReply(completion.choices[0].message.content.substring(0, 2000));
      } catch (error) {
        await interaction.editReply(`❌ Error: \`${error.message}\``);
      }
    }
  },
  
  // 4. /jelaskan-kode
  {
    name: 'jelaskan-kode',
    description: 'Menjelaskan baris kode pemrograman',
    options: [
      {
        name: 'kode',
        type: ApplicationCommandOptionType.String,
        description: 'Baris kode yang ingin dijelaskan',
        required: true
      },
      {
        name: 'bahasa_pemrograman',
        type: ApplicationCommandOptionType.String,
        description: 'Bahasa pemrograman kode tersebut (opsional)',
        required: false
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const code = interaction.options.getString('kode');
      const lang = interaction.options.getString('bahasa_pemrograman') || 'Autodetect';
      
      if (!groq) {
        return interaction.editReply("❌ API Key Groq tidak dikonfigurasi.");
      }
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'Anda adalah insinyur perangkat lunak senior dan tutor pemrograman yang hebat.' },
            { role: 'user', content: `Jelaskan kode berikut (Bahasa Pemrograman: ${lang}) secara detail, terstruktur, dan mudah dipahami:\n\n\`\`\`\n${code}\n\`\`\`` }
          ],
          model: modelName,
          temperature: 0.5
        });
        
        const reply = completion.choices[0].message.content;
        
        if (reply.length > 2000) {
          const chunks = reply.match(/[\s\S]{1,1950}/g) || [];
          await interaction.editReply(chunks[0]);
          for (let i = 1; i < chunks.length; i++) {
            await interaction.channel.send(chunks[i]);
          }
        } else {
          await interaction.editReply(reply);
        }
      } catch (error) {
        await interaction.editReply(`❌ Error: \`${error.message}\``);
      }
    }
  },
  
  // 5. /perbaiki
  {
    name: 'perbaiki',
    description: 'Memperbaiki kesalahan tata bahasa (grammar/spelling)',
    options: [
      {
        name: 'teks',
        type: ApplicationCommandOptionType.String,
        description: 'Kalimat/teks yang ingin diperbaiki',
        required: true
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const text = interaction.options.getString('teks');
      
      if (!groq) {
        return interaction.editReply("❌ API Key Groq tidak dikonfigurasi.");
      }
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'Anda adalah ahli tata bahasa dan bahasa yang ramah.' },
            { role: 'user', content: `Perbaiki kesalahan tata bahasa, ejaan, dan tanda baca pada teks berikut. Tunjukkan versi yang benar dan berikan penjelasan singkat tentang apa yang diperbaiki:\n\n"${text}"` }
          ],
          model: modelName,
          temperature: 0.4
        });
        
        await interaction.editReply(completion.choices[0].message.content.substring(0, 2000));
      } catch (error) {
        await interaction.editReply(`❌ Error: \`${error.message}\``);
      }
    }
  },
  
  // 6. /sentimen
  {
    name: 'sentimen',
    description: 'Menganalisis sentimen/emosi dari sebuah kalimat',
    options: [
      {
        name: 'teks',
        type: ApplicationCommandOptionType.String,
        description: 'Kalimat yang ingin dianalisis sentimennya',
        required: true
      }
    ],
    async execute(interaction) {
      await interaction.deferReply();
      const text = interaction.options.getString('teks');
      
      if (!groq) {
        return interaction.editReply("❌ API Key Groq tidak dikonfigurasi.");
      }
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'Anda adalah analis sentimen psikologis yang akurat.' },
            { role: 'user', content: `Analisis emosi dan sentimen dari teks berikut. Tentukan apakah sentimennya Positif, Negatif, atau Netral. Jelaskan secara singkat emosi yang terdeteksi:\n\n"${text}"` }
          ],
          model: modelName,
          temperature: 0.3
        });
        
        await interaction.editReply(completion.choices[0].message.content.substring(0, 2000));
      } catch (error) {
        await interaction.editReply(`❌ Error: \`${error.message}\``);
      }
    }
  },
  
  // 7. /reset-ai
  {
    name: 'reset-ai',
    description: 'Menghapus memori/konteks obrolan AI Anda',
    async execute(interaction) {
      const userId = interaction.user.id;
      if (memories.has(userId)) {
        memories.delete(userId);
        await interaction.reply("🧹 Memori percakapan Anda dengan AI telah dibersihkan!");
      } else {
        await interaction.reply({ content: "ℹ️ Anda belum memiliki memori percakapan aktif dengan AI.", ephemeral: true });
      }
    }
  }
];
