const pool = require('../config/db');
const { bot } = require('../services/telegram.service');

exports.handleWebhook = async (req, res) => {
  try {
    const { secret } = req.query;

    // Verify webhook secret
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Process webhook with Telegraf
    await bot.handleUpdate(req.body);

    res.json({ ok: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

// Admin can update API key via bot command (optional alternative)
exports.updateApiKeyViaBot = async (req, res) => {
  try {
    // This would be handled by Telegram bot command
    res.json({ message: 'Use Telegram bot /setapikey command instead' });
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};