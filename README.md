# WA Bot Suhu - Smart Exhaust Fan

Bot WhatsApp untuk cek data suhu/kelembapan/status fan/selenoid secara real-time dari ESP32, lewat perantara Firebase Realtime Database.

## Arsitektur

```
ESP32 (baca sensor) --> Firebase Realtime Database --> Bot WA (Railway) --> User WA
```

## Setup Lokal

1. Install dependency:
   ```
   npm install
   ```

2. Ganti `FIREBASE_HOST` di `index.js` dengan URL database Firebase kamu (tanpa `https://`, tanpa slash di akhir).

3. Jalankan:
   ```
   node index.js
   ```

4. Scan QR code yang muncul di terminal pakai WhatsApp (Settings -> Linked Devices -> Link a Device).

5. Kirim pesan **"cek suhu"** dari nomor WA manapun ke nomor yang di-link, bot akan balas data terbaru.

## Deploy ke Railway

1. Push repo ini ke GitHub (lihat langkah di bawah).
2. Buka [railway.app](https://railway.app) -> New Project -> Deploy from GitHub repo -> pilih repo ini.
3. Railway otomatis build pakai `nixpacks.toml` (sudah termasuk Chromium untuk Puppeteer).
4. Buka tab **Deployments -> View Logs** untuk melihat QR code, scan dari situ.
5. Setelah login sukses, bot langsung aktif.

**Catatan:** sesi login WhatsApp (`LocalAuth`) tersimpan di filesystem container. Kalau pakai Railway free tier tanpa Volume, sesi bisa hilang tiap redeploy sehingga perlu scan ulang QR. Untuk sesi permanen, tambahkan Railway Volume yang di-mount ke folder `.wwebjs_auth`.

## Environment

Tidak ada environment variable wajib untuk versi ini (semua konfigurasi langsung di `index.js`). Kalau mau lebih aman, `FIREBASE_HOST` bisa dipindah ke environment variable Railway daripada hardcode di kode.

## Struktur File

- `index.js` - kode utama bot WhatsApp
- `package.json` - daftar dependency
- `nixpacks.toml` - konfigurasi build Railway (install Chromium)
- `.gitignore` - file/folder yang tidak ikut di-push ke GitHub
