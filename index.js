import { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } from 'discord.js';
import dotenv from 'dotenv';
import { initDb, addXp, getPendingReminders, deleteReminder } from './database.js';

// Load environment variables
dotenv.config();
const TOKEN = process.env.DISCORD_TOKEN;

// Import Commands
import { commands as aiCommands, getGroqResponse } from './commands/ai.js';
import { commands as modCommands } from './commands/moderation.js';
import { commands as utilCommands } from './commands/utility.js';
import { commands as gameCommands } from './commands/games.js';
import { commands as infoCommands } from './commands/info.js';
import { commands as ecoCommands } from './commands/economy.js';

const allCommandsList = [
  ...aiCommands,
  ...modCommands,
  ...utilCommands,
  ...gameCommands,
  ...infoCommands,
  ...ecoCommands
];

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// Setup collection for commands
client.commands = new Collection();
for (const cmd of allCommandsList) {
  client.commands.set(cmd.name, cmd);
}

// XP Cooldowns track (user_id -> last_xp_time)
const xpCooldowns = new Map();

// Bot Ready Event
client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag} (ID: ${client.user.id})`);
  
  // Initialize SQLite Database
  await initDb();
  
  // Register Slash Commands Globally
  console.log("Registering slash commands globally...");
  try {
    const rawCommands = allCommandsList.map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      options: cmd.options || []
    }));
    await client.application.commands.set(rawCommands);
    console.log(`Successfully registered ${rawCommands.length} slash commands globally!`);
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
  
  // Set Bot Activity status
  client.user.setPresence({
    activities: [{ name: 'Membantu Anda | Ketik /tanya', type: ActivityType.Custom }],
    status: 'online'
  });
  
  // Start reminder check loop every 15 seconds
  setInterval(checkReminders, 15000);
});

// Message Event (for XP leveling and mentioning AI)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  
  const userId = message.author.id;
  const guildId = message.guild.id;
  
  // 1. Leveling System
  const currentTime = Date.now();
  const lastXpTime = xpCooldowns.get(userId) || 0;
  
  if (currentTime - lastXpTime >= 60000) { // 60 seconds cooldown
    const xpEarned = Math.floor(Math.random() * 11) + 10; // 10 to 20 XP
    const { newLevel, levelUp } = await addXp(userId, guildId, xpEarned);
    xpCooldowns.set(userId, currentTime);
    
    if (levelUp) {
      try {
        const embed = new EmbedBuilder()
          .setTitle("🎉 LEVEL UP! 🎉")
          .setDescription(`Selamat ${message.author}, kamu naik ke **Level ${newLevel}**!`)
          .setColor("#FFD700")
          .setThumbnail(message.author.displayAvatarURL());
          
        await message.channel.send({ embeds: [embed] });
      } catch (err) {
        console.error("Error sending level up message:", err);
      }
    }
  }
  
  // 2. AI Chat via Mention
  if (message.mentions.has(client.user) && !message.mentions.everyone) {
    const mentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
    const cleanContent = message.content.replace(mentionRegex, '').trim();
    
    if (cleanContent.length > 0) {
      try {
        await message.channel.sendTyping();
        const aiResponse = await getGroqResponse(cleanContent, userId);
        
        // Handle message length limit (2000 characters)
        if (aiResponse.length > 2000) {
          const chunks = aiResponse.match(/[\s\S]{1,1950}/g) || [];
          await message.reply(chunks[0]);
          for (let i = 1; i < chunks.length; i++) {
            await message.channel.send(chunks[i]);
          }
        } else {
          await message.reply(aiResponse);
        }
      } catch (error) {
        console.error("AI Mention error:", error);
        await message.reply("❌ Terjadi kesalahan saat memproses permintaan AI Anda.");
      }
    } else {
      await message.reply("Halo! Ada yang bisa saya bantu? Gunakan `/tanya` untuk mengobrol dengan saya!");
    }
  }
});

// Interaction Event (Slash Commands execution)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    const errContent = {
      content: "❌ Terjadi kesalahan internal saat menjalankan perintah ini.",
      ephemeral: true
    };
    
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errContent);
    } else {
      await interaction.reply(errContent);
    }
  }
});

// Background task: Check Reminders
async function checkReminders() {
  const currentTime = Math.floor(Date.now() / 1000);
  try {
    const pending = await getPendingReminders(currentTime);
    
    for (const reminder of pending) {
      const channel = client.channels.cache.get(reminder.channel_id) || 
                      await client.channels.fetch(reminder.channel_id).catch(() => null);
                      
      const embed = new EmbedBuilder()
        .setTitle("⏰ PENGINGAT! ⏰")
        .setDescription(`<@${reminder.user_id}>, ini pengingat Anda:\n**${reminder.message}**`)
        .setColor("#E67E22");
        
      if (channel) {
        try {
          await channel.send({ content: `<@${reminder.user_id}>`, embeds: [embed] });
        } catch (e) {
          console.error("Failed to send reminder in channel:", e);
        }
      } else {
        // Send via DM
        try {
          const user = client.users.cache.get(reminder.user_id) || 
                       await client.users.fetch(reminder.user_id).catch(() => null);
          if (user) {
            await user.send({ embeds: [embed] });
          }
        } catch (e) {
          console.error("Failed to send DM reminder:", e);
        }
      }
      
      // Delete reminder from database
      await deleteReminder(reminder.id);
    }
  } catch (error) {
    console.error("Error checking reminders:", error);
  }
}

// Log in
if (!TOKEN) {
  console.error("ERROR: DISCORD_TOKEN is not defined in environment variables.");
} else {
  client.login(TOKEN);
}
