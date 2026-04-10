const pool = require('../config/db');
const { sendPhotoToAdmins } = require('../services/telegram.service');

exports.getBalance = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT wallet_balance FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ wallet_balance: result.rows[0].wallet_balance });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching balance', error: error.message });
  }
};

exports.manualFund = async (req, res) => {
  try {
    const { amount, user_note } = req.validated;

    if (!req.file) {
      return res.status(400).json({ message: 'Screenshot is required' });
    }

    const screenshotUrl = req.file.path;

    // Get user details
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Save manual deposit
    const depositResult = await pool.query(
      'INSERT INTO manual_deposits (user_id, amount, bank_name, user_note, screenshot_url, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at',
      [req.userId, amount, process.env.BANK_NAME, user_note || '', screenshotUrl, 'pending']
    );

    const deposit = depositResult.rows[0];

    // Send notification to Telegram admins
    try {
      await sendPhotoToAdmins({
        photoUrl: screenshotUrl,
        depositId: deposit.id,
        userName: user.name,
        userEmail: user.email,
        amount: amount,
        note: user_note || 'No note provided',
      });
    } catch (telegramError) {
      console.error('❌ Telegram notification error:', telegramError);
      // Don't fail the request if telegram fails
    }

    res.status(201).json({
      message: 'Deposit request submitted for approval',
      deposit: {
        id: deposit.id,
        amount,
        status: 'pending',
        created_at: deposit.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Deposit submission failed', error: error.message });
  }
};