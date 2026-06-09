import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'bot_database.db');

let db;

export async function initDb() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Table for economy and leveling
  await db.exec(`
    CREATE TABLE IF NOT EXISTS economy (
      user_id TEXT,
      guild_id TEXT,
      coins INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      last_daily INTEGER DEFAULT 0,
      last_work INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    )
  `);

  // Table for moderation warnings
  await db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      guild_id TEXT,
      moderator_id TEXT,
      reason TEXT,
      timestamp INTEGER
    )
  `);

  // Table for reminders
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      channel_id TEXT,
      message TEXT,
      remind_time INTEGER
    )
  `);

  // Table for todos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      task TEXT,
      completed INTEGER DEFAULT 0,
      timestamp INTEGER
    )
  `);
  
  console.log("SQLite Database initialized.");
}

// --- ECONOMY & LEVELING METHODS ---

export async function getUser(userId, guildId) {
  const row = await db.get(
    "SELECT * FROM economy WHERE user_id = ? AND guild_id = ?",
    [userId, guildId]
  );
  
  if (row) {
    return row;
  }
  
  // Insert default if not exists
  await db.run(
    "INSERT INTO economy (user_id, guild_id) VALUES (?, ?)",
    [userId, guildId]
  );
  
  return {
    user_id: userId,
    guild_id: guildId,
    coins: 0,
    xp: 0,
    level: 1,
    last_daily: 0,
    last_work: 0
  };
}

export async function addXp(userId, guildId, xpAmount) {
  const userData = await getUser(userId, guildId);
  let currentXp = userData.xp + xpAmount;
  let currentLevel = userData.level;
  
  const xpNeeded = currentLevel * 150;
  let levelUp = false;
  
  if (currentXp >= xpNeeded) {
    currentXp -= xpNeeded;
    currentLevel += 1;
    levelUp = true;
  }
  
  await db.run(
    "UPDATE economy SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?",
    [currentXp, currentLevel, userId, guildId]
  );
  
  return { newLevel: currentLevel, levelUp };
}

export async function addCoins(userId, guildId, amount) {
  const userData = await getUser(userId, guildId);
  const newBalance = userData.coins + amount;
  
  await db.run(
    "UPDATE economy SET coins = ? WHERE user_id = ? AND guild_id = ?",
    [newBalance, userId, guildId]
  );
  
  return newBalance;
}

export async function updateDailyTime(userId, guildId, currentTime) {
  await db.run(
    "UPDATE economy SET last_daily = ? WHERE user_id = ? AND guild_id = ?",
    [currentTime, userId, guildId]
  );
}

export async function updateWorkTime(userId, guildId, currentTime) {
  await db.run(
    "UPDATE economy SET last_work = ? WHERE user_id = ? AND guild_id = ?",
    [currentTime, userId, guildId]
  );
}

export async function getEconomyLeaderboard(guildId, limit = 10) {
  return await db.all(
    "SELECT user_id, coins FROM economy WHERE guild_id = ? ORDER BY coins DESC LIMIT ?",
    [guildId, limit]
  );
}

export async function getLevelLeaderboard(guildId, limit = 10) {
  return await db.all(
    "SELECT user_id, level, xp FROM economy WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?",
    [guildId, limit]
  );
}

// --- WARNINGS METHODS ---

export async function addWarning(userId, guildId, moderatorId, reason) {
  await db.run(
    "INSERT INTO warnings (user_id, guild_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)",
    [userId, guildId, moderatorId, reason, Math.floor(Date.now() / 1000)]
  );
}

export async function getWarnings(userId, guildId) {
  return await db.all(
    "SELECT * FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY timestamp DESC",
    [userId, guildId]
  );
}

export async function clearWarnings(userId, guildId) {
  const result = await db.run(
    "DELETE FROM warnings WHERE user_id = ? AND guild_id = ?",
    [userId, guildId]
  );
  return result.changes;
}

// --- REMINDERS METHODS ---

export async function addReminder(userId, channelId, message, remindTime) {
  await db.run(
    "INSERT INTO reminders (user_id, channel_id, message, remind_time) VALUES (?, ?, ?, ?)",
    [userId, channelId, message, remindTime]
  );
}

export async function getPendingReminders(currentTime) {
  return await db.all(
    "SELECT * FROM reminders WHERE remind_time <= ?",
    [currentTime]
  );
}

export async function deleteReminder(reminderId) {
  await db.run(
    "DELETE FROM reminders WHERE id = ?",
    [reminderId]
  );
}

// --- TODOS METHODS ---

export async function addTodo(userId, task) {
  await db.run(
    "INSERT INTO todos (user_id, task, timestamp) VALUES (?, ?, ?)",
    [userId, task, Math.floor(Date.now() / 1000)]
  );
}

export async function getTodos(userId) {
  return await db.all(
    "SELECT * FROM todos WHERE user_id = ? ORDER BY completed ASC, timestamp DESC",
    [userId]
  );
}

export async function completeTodo(todoId, userId) {
  const result = await db.run(
    "UPDATE todos SET completed = 1 WHERE id = ? AND user_id = ?",
    [todoId, userId]
  );
  return result.changes > 0;
}

export async function deleteTodo(todoId, userId) {
  const result = await db.run(
    "DELETE FROM todos WHERE id = ? AND user_id = ?",
    [todoId, userId]
  );
  return result.changes > 0;
}
