const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const TelegramBot = require('node-telegram-bot-api');

dotenv.config();
const app = express();

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Модель брони
const bookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  guests: Number,
  date: String,
  time: String,
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

// Telegram bot
const bot = new TelegramBot(process.env.TG_TOKEN, { polling: false });

// Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Отдаём index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// POST: бронирование
app.post('/api/book', async (req, res) => {
  const { name, phone, guests, date, time } = req.body;

  if (!name || !phone || !guests || !date || !time) {
    return res.status(400).json({ error: 'Пожалуйста, заполните все поля' });
  }

  try {
    const booking = await Booking.create({ name, phone, guests, date, time });

    // Отправка в Telegram
    const tgMessage = `📌 Новое бронирование:\n👤 ${name}\n📞 ${phone}\n👥 Гостей: ${guests}\n📅 ${date} в ${time}`;
    await bot.sendMessage(process.env.TG_CHAT_ID, tgMessage);

    // Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: 'Новое бронирование в Jumanji',
      text: tgMessage
    });

    res.json({ message: 'Бронирование успешно отправлено!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});
