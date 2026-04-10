require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');
const { initializeTelegramBot } = require('./src/services/telegram.service');

const app = require('./src/app');

// Security Middleware
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com"],
    scriptSrc: ["'self'", "cdn.tailwindcss.com", "cdn.jsdelivr.net"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
  },
}));

// Disable x-powered-by
app.disable('x-powered-by');

// CORS
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body Parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/wallet', require('./src/routes/wallet.routes'));
app.use('/api/airtime', require('./src/routes/airtime.routes'));
app.use('/api/data', require('./src/routes/data.routes'));
app.use('/api/transactions', require('./src/routes/transaction.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));
app.use('/api/telegram', require('./src/routes/telegram.routes'));

// Error Handler
app.use(require('./src/middleware/error.middleware'));

// Initialize Admin User & Telegram Bot
async function initializeAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const hashedPassword = bcrypt.hashSync(adminPassword, 12);

    // Check if admin exists
    const adminExists = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND role = $2',
      [adminEmail, 'admin']
    );

    if (adminExists.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (email, name, username, password, role, wallet_balance) VALUES ($1, $2, $3, $4, $5, $6)',
        [adminEmail, 'BillPay Admin', 'billpayadmin', hashedPassword, 'admin', 999999]
      );
      console.log('✅ Admin user created:', adminEmail);
    }

    // Add initial Telegram admin if not exists
    const telegramAdminId = BigInt(process.env.TELEGRAM_ADMIN_CHAT_ID);
    const telegramAdminExists = await pool.query(
      'SELECT chat_id FROM telegram_admins WHERE chat_id = $1',
      [telegramAdminId]
    );

    if (telegramAdminExists.rows.length === 0) {
      await pool.query(
        'INSERT INTO telegram_admins (chat_id, added_by, added_at) VALUES ($1, $2, NOW())',
        [telegramAdminId, BigInt(0)] // 0 means system/initial admin
      );
      console.log('✅ Initial Telegram admin added:', telegramAdminId);
    }
  } catch (error) {
    console.error('❌ Admin initialization error:', error);
  }
}

// Start Server
const PORT = process.env.PORT || 5000;
server = app.listen(PORT, async () => {
  console.log(`🚀 BillPay server running on port ${PORT}`);
  
  // Initialize DB & Admin
  await initializeAdmin();
  
  // Initialize Telegram Bot
  try {
    await initializeTelegramBot();
    console.log('✅ Telegram bot initialized');
  } catch (error) {
    console.error('❌ Telegram bot error:', error);
  }
});

module.exports = app;