# 🤖 Antigravity Discord Bot (Node.js - Multi-Fungsi & Asisten AI Groq)

Bot Discord multi-fungsi modular yang cerdas, modern, dan interaktif dengan **44 fitur unik** yang dikembangkan menggunakan **Node.js (discord.js v14)** dan terintegrasi secara asinkron dengan **Groq SDK** sebagai asisten AI pembantu berbahasa Indonesia.

---

## 🚀 Fitur Utama (Total 44 Fitur)

### 🧠 1. Asisten AI & NLP (Groq SDK) - 7 Fitur
* `/tanya` - Mengobrol interaktif dengan AI dengan memori percakapan (maksimal 10 putaran).
* `/ringkas` - Meringkas paragraf atau teks panjang menjadi poin-poin penting.
* `/terjemah` - Menerjemahkan kalimat ke bahasa target apa pun secara akurat.
* `/jelaskan-kode` - Menjelaskan fungsi baris kode pemrograman terstruktur secara terperinci.
* `/perbaiki` - Mengoreksi ejaan, tata bahasa (grammar), dan tanda baca pada teks.
* `/sentimen` - Menganalisis suasana emosi kalimat (Positif, Negatif, Netral).
* `/reset-ai` - Membersihkan riwayat percakapan Anda dengan AI.

### 🔨 2. Moderasi Server - 8 Fitur
* `/kick` - Mengeluarkan anggota bermasalah dari server.
* `/ban` - Memblokir anggota secara permanen dari server.
* `/unban` - Membuka pemblokiran anggota berdasarkan Discord ID mereka.
* `/clear` - Menghapus pesan di saluran secara massal (1 - 100 pesan).
* `/timeout` - Membisukan (mute) sementara anggota bermasalah (dalam durasi menit).
* `/warn` - Peringatan formal yang tercatat di database SQLite.
* `/warnings` - Memeriksa daftar riwayat peringatan milik anggota tertentu.
* `/clearwarn` - Menghapus semua riwayat peringatan dari anggota.

### 🛠️ 3. Utilitas & Produktivitas - 10 Fitur
* `/calculate` - Menghitung rumus matematika secara instan menggunakan parser aman regex.
* `/qrcode` - Membuat kode QR instan untuk teks atau tautan web apa saja.
* `/poll` - Membuat jajak pendapat (voting) interaktif dengan maksimal 5 pilihan menggunakan reaksi angka.
* `/weather` - Mengecek perkiraan cuaca terkini kota apa pun di dunia secara akurat (via Open-Meteo).
* `/remind` - Menjadwalkan pengingat otomatis di masa mendatang (contoh: `10m`, `2h`, `1d`).
* `/shorten` - Memendekkan tautan web yang panjang secara instan (via is.gd).
* `/todo add` - Menambahkan tugas baru ke To-Do List pribadi Anda.
* `/todo list` - Menampilkan daftar tugas Anda (dikategorikan Belum Selesai/Selesai).
* `/todo done` - Menandai tugas tertentu sebagai selesai berdasarkan ID.
* `/todo del` - Menghapus tugas dari To-Do List.

### 🎮 4. Hiburan & Permainan - 7 Fitur
* `/roll` - Melempar dadu keberuntungan dengan jumlah sisi yang dapat diatur.
* `/coinflip` - Melempar koin virtual (Angka vs Gambar).
* `/meme` - Mengambil meme lucu acak terkini dari Reddit.
* `/trivia` - Kuis trivia pilihan ganda interaktif menggunakan tombol UI (A, B, C, D) (via Open Trivia DB).
* `/rps` - Bermain Batu-Gunting-Kertas melawan bot menggunakan tombol pilihan interaktif.
* `/guess start` - Memulai permainan tebak angka acak rahasia dari 1 sampai 100.
* `/guess input` - Memasukkan tebakan angka Anda dan mendapatkan petunjuk (Lebih Besar / Lebih Kecil).

### 📖 5. Informasi & Pencarian - 6 Fitur
* `/userinfo` - Menampilkan profil pengguna, tanggal pembuatan akun, tanggal bergabung, role, dan izin penting.
* `/serverinfo` - Menampilkan statistik server, jumlah anggota (manusia & bot), saluran, emoji, dan tingkat boost.
* `/botinfo` - Menampilkan statistik kesehatan bot (Ping, Uptime proses, Versi library, jumlah server, dll.).
* `/avatar` - Mengambil foto profil ukuran penuh milik anggota mana saja.
* `/wiki` - Mencari ringkasan artikel di Wikipedia bahasa Indonesia (dengan fallback bahasa Inggris).
* `/define` - Kamus AI interaktif untuk mendefinisikan kata apa pun dalam KBBI formal maupun bahasa gaul (slang).

### 🪙 6. Leveling & Ekonomi (Database SQLite) - 6 Fitur
* `/daily` - Klaim hadiah koin gratis harian Anda (cooldown 24 jam).
* `/balance` - Cek saldo dompet koin dan level XP saat ini.
* `/work` - Bekerja secara serabutan dengan teks humoris Indonesia untuk meraih upah koin (cooldown 1 jam).
* `/leaderboard` - Melihat 10 peringkat teratas server berdasarkan saldo Koin (Kekayaan) atau Level XP (Keaktifan).
* `/rank` - Menampilkan kartu level XP lengkap dengan persentase dan progress bar emoji (`🟩🟩🟩⬜⬜⬜⬜⬜⬜⬜ 30%`).
* `/pay` - Mentransfer koin pribadi Anda kepada anggota lain secara aman.

---

## 🛠️ Prasyarat Instalasi

1. **Node.js v18.0.0 ke atas** (rekomendasi untuk mendukung fungsi `fetch` bawaan).
2. **Discord Developer Portal Setup**:
   * Buat aplikasi baru dan tambahkan bot di [Discord Developer Portal](https://discord.com/developers/applications).
   * **Sangat Penting:** Aktifkan **Privileged Gateway Intents** berikut di bagian tab **Bot**:
     * `PRESENCE INTENT` (opsional)
     * `SERVER MEMBERS INTENT` (diaktifkan untuk fitur info member, rank, dan moderasi)
     * `MESSAGE CONTENT INTENT` (diaktifkan agar bot dapat mendeteksi chat mention AI)
   * Salin **Bot Token** Anda.
3. **Groq API Key**:
   * Daftarkan diri Anda di [Groq Console](https://console.groq.com/).
   * Buat API Key baru dan salin.

---

## ⚙️ Langkah Instalasi & Pengaturan

1. Buka folder bot di komputer Anda atau panel hosting Anda.
2. Pasang semua pustaka dependency yang dibutuhkan menggunakan npm:
   ```bash
   npm install
   ```
3. Buka file `.env` menggunakan editor teks, lalu isi token Discord dan Groq API Key Anda:
   ```env
   DISCORD_TOKEN=isi_token_discord_anda_di_sini
   GROQ_API_KEY=isi_groq_api_key_anda_di_sini
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

---

## 🚀 Cara Menjalankan Bot

Jalankan bot menggunakan npm melalui terminal:
```bash
npm start
```

Setelah bot menyala, Anda akan melihat log di konsol:
```text
Bot logged in as Antigravity#1234 (ID: 123456789012345678)
SQLite Database initialized.
Registering slash commands globally...
Successfully registered 44 slash commands globally!
```

### 💡 Catatan Sinkronisasi Slash Commands
* Slash commands disinkronkan secara global secara otomatis setiap kali bot dinyalakan (`client.application.commands.set`). Perlu diketahui bahwa Discord terkadang memerlukan waktu hingga beberapa menit (atau langsung instan) untuk menyebarkan menu slash commands baru ke seluruh server tempat bot bergabung.
