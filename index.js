/*
  Bot WhatsApp untuk query data suhu dari Firebase (Smart Exhaust Fan)
  ------------------------------------------
  Cara pakai:
  1. npm install
  2. Ganti FIREBASE_HOST di bawah dengan URL database Firebase kamu
     (tanpa https://, tanpa slash di akhir)
  3. node index.js
  4. Scan QR code yang muncul di terminal (WhatsApp -> Linked Devices -> Link a Device)
  5. Kirim pesan "cek suhu" dari nomor WA manapun, bot akan balas otomatis

  Bot ini TIDAK perlu berada di jaringan yang sama dengan ESP32 lagi,
  karena datanya diambil dari Firebase (internet), bukan IP lokal.
  Ini juga yang membuat bot ini bisa di-deploy ke Railway.
*/

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// ---- GANTI SESUAI FIREBASE PROJECT KAMU ----
const FIREBASE_HOST = 'https://smart-exhaust-fan-f948e-default-rtdb.asia-southeast1.firebasedatabase.app/';

const KEYWORDS = ['cek suhu', 'suhu', 'status', 'data'];

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // wajib untuk jalan di server Linux (Railway)
  },
});

client.on('qr', (qr) => {
  console.log('Scan QR code ini pakai WhatsApp (Linked Devices):');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Bot WhatsApp siap! Kirim pesan "cek suhu" untuk tes.');
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
