/*
  Bot WhatsApp untuk query data suhu dari Firebase (Smart Exhaust Fan)
  ------------------------------------------
  Versi ini menambahkan web server kecil supaya QR code bisa dibuka
  lewat browser (URL Railway kamu), karena ASCII QR di log Railway
  susah/gak bisa discan.

  Cara pakai di Railway:
  1. Pastikan service di-expose (Settings -> Networking -> Generate Domain)
  2. Buka https://<url-railway-kamu>.up.railway.app/qr untuk lihat QR
  3. Scan dari WhatsApp -> Linked Devices -> Link a Device
  4. Setelah login sukses, halaman /qr otomatis akan menunjukkan status "sudah login"
*/

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode'); // untuk generate QR sebagai image/base64
const axios = require('axios');
const express = require('express');

// ---- GANTI SESUAI FIREBASE PROJECT KAMU ----
const FIREBASE_HOST = 'smart-exhaust-fan-f948e-default-rtdb.asia-southeast1.firebasedatabase.app';

const KEYWORDS = ['cek suhu', 'suhu', 'status', 'data'];

// ---- State untuk web server ----
let lastQr = null;      // menyimpan QR terbaru dalam bentuk data URL (base64 image)
let isReady = false;    // status apakah bot sudah login & siap

// ---- Setup Express ----
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot WhatsApp jalan. Buka /qr untuk scan QR code.');
});

app.get('/qr', async (req, res) => {
  if (isReady) {
    return res.send(`
      <html>
        <body style="font-family: sans-serif; text-align:center; margin-top: 50px;">
          <h2>✅ Bot sudah login dan siap dipakai</h2>
          <p>Kirim pesan "cek suhu" ke nomor WhatsApp yang terhubung.</p>
        </body>
      </html>
    `);
  }

  if (!lastQr) {
    return res.send(`
      <html>
        <body style="font-family: sans-serif; text-align:center; margin-top: 50px;">
          <h2>⏳ Menunggu QR code...</h2>
          <p>Refresh halaman ini beberapa detik lagi.</p>
        </body>
      </html>
    `);
  }

  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="20">
        <title>Scan QR - WA Bot Suhu</title>
      </head>
      <body style="font-family: sans-serif; text-align:center; margin-top: 30px;">
        <h2>📱 Scan QR Code ini dari WhatsApp</h2>
        <p>WhatsApp &rarr; Linked Devices &rarr; Link a Device</p>
        <img src="${lastQr}" alt="QR Code" style="width: 300px; height: 300px;" />
        <p style="color: gray;">Halaman ini refresh otomatis tiap 20 detik (QR berganti otomatis).</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Web server jalan di port ${PORT}. Buka /qr untuk scan QR code.`);
});

// ---- Setup WhatsApp Client ----
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // penting untuk environment container/Railway
    ],
  },
});

client.on('qr', async (qr) => {
  console.log('QR code baru diterima, buka /qr di browser untuk scan.');
  // tetap tampilkan di log sebagai fallback
  qrcodeTerminal.generate(qr, { small: true });

  try {
    lastQr = await qrcode.toDataURL(qr);
  } catch (err) {
    console.error('Gagal generate QR image:', err.message);
  }
});

client.on('ready', () => {
  isReady = true;
  lastQr = null;
  console.log('Bot WhatsApp siap! Kirim pesan "cek suhu" untuk tes.');
});

client.on('disconnected', (reason) => {
  isReady = false;
  console.log('Bot terputus dari WhatsApp:', reason);
});

client.on('message', async (message) => {
  const text = message.body.toLowerCase().trim();

  const isMatch = KEYWORDS.some((kw) => text.includes(kw));
  if (!isMatch) return;

  try {
    const url = `https://${FIREBASE_HOST}/data.json`;
    const response = await axios.get(url, { timeout: 8000 });
    const d = response.data;

    if (!d) {
      await message.reply('⚠️ Belum ada data masuk dari ESP32.');
      return;
    }

    if (!d.sensor_valid) {
      await message.reply('⚠️ Sensor DHT22 sedang error di sisi ESP32, coba lagi sebentar.');
      return;
    }

    const balasan =
      `📊 *Status Smart Exhaust Fan*\n\n` +
      `🌡️ Suhu: ${d.suhu}°C\n` +
      `💧 Kelembapan: ${d.kelembapan}%\n` +
      `🌀 Fan: ${d.fan}\n` +
      `🚪 Selenoid Pintu: ${d.selenoid}`;

    await message.reply(balasan);
  } catch (err) {
    console.error('Gagal ambil data dari Firebase:', err.message);
    await message.reply('⚠️ Gagal mengambil data. Coba lagi beberapa saat lagi.');
  }
});

client.initialize();