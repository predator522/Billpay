require('dotenv').config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'BITRA_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_ADMIN_CHAT_ID',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'APP_URL',
  'APP_NAME',
  'APP_ICON_URL',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'BANK_NAME',
  'BANK_ACCOUNT_NUMBER',
  'BANK_ACCOUNT_NAME',
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Missing environment variable: ${envVar}`);
  }
});

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  BITRA_API_KEY: process.env.BITRA_API_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
  TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  APP_NAME: process.env.APP_NAME || 'BillPay',
  APP_ICON_URL: process.env.APP_ICON_URL,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  BANK_NAME: process.env.BANK_NAME,
  BANK_ACCOUNT_NUMBER: process.env.BANK_ACCOUNT_NUMBER,
  BANK_ACCOUNT_NAME: process.env.BANK_ACCOUNT_NAME,
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
