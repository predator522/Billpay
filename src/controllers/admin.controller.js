const pool = require('../config/db');
const { sendApprovalNotification } = require('../services/telegram.service');

exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, username, wallet_balance, created_at FROM users WHERE role = $1 ORDER BY created_at DESC',
      ['user']
    );

    res.json({
      total_users: result.rows.length,
      users: result.rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

exports.getPendingDeposits = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT md.id, md.user_id, md.amount, md.user_note, md.screenshot_url, md.created_at, u.email, u.name FROM manual_deposits md JOIN users u ON md.user_id = u.id WHERE md.status = $1 ORDER BY md.created_at DESC',
      ['pending']
    );

    res.json({
      total_pending: result.rows.length,
      deposits: result.rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching deposits', error: error.message });
  }
};

exports.approveDeposit = async (req, res) => {
  const client = await pool.connect();
  try {
    const { depositId } = req.params;
    const { admin_note } = req.body;

    // Start transaction
    await client.query('BEGIN');

    // Check deposit status and lock it
    const depositResult = await client.query(
      'SELECT id, user_id, amount, status FROM manual_deposits WHERE id = $1 FOR UPDATE',
      [depositId]
    );

    if (depositResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Deposit not found' });
    }

    const deposit = depositResult.rows[0];

    // Prevent double-approval
    if (deposit.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Deposit already processed' });
    }

    // Update deposit status
    await client.query(
      'UPDATE manual_deposits SET status = $1, admin_note = $2, approved_at = NOW() WHERE id = $3',
      ['approved', admin_note || '', depositId]
    );

    // Credit user wallet
    await client.query(
      'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
      [deposit.amount, deposit.user_id]
    );

    await client.query('COMMIT');

    // Notify user via Telegram if they have subscribed
    try {
      await sendApprovalNotification(deposit.user_id, deposit.amount);
    } catch (telegramError) {
      console.error('❌ Telegram notification error:', telegramError);
    }

    res.json({
      message: 'Deposit approved successfully',
      deposit: {
        id: depositId,
        amount: deposit.amount,
        status: 'approved',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Approval failed', error: error.message });
  } finally {
    client.release();
  }
};

exports.rejectDeposit = async (req, res) => {
  const client = await pool.connect();
  try {
    const { depositId } = req.params;
    const { reason } = req.body;

    await client.query('BEGIN');

    const depositResult = await client.query(
      'SELECT id, status FROM manual_deposits WHERE id = $1 FOR UPDATE',
      [depositId]
    );

    if (depositResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Deposit not found' });
    }

    if (depositResult.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Deposit already processed' });
    }

    await client.query(
      'UPDATE manual_deposits SET status = $1, admin_note = $2 WHERE id = $3',
      ['rejected', reason || '', depositId]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Deposit rejected',
      deposit: {
        id: depositId,
        status: 'rejected',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Rejection failed', error: error.message });
  } finally {
    client.release();
  }
};

exports.getStats = async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']);
    const totalBalance = await pool.query('SELECT SUM(wallet_balance) FROM users WHERE role = $1', ['user']);
    const dailySales = await pool.query(
      'SELECT SUM(amount) FROM transactions WHERE status = $1 AND DATE(created_at) = CURRENT_DATE',
      ['successful']
    );

    res.json({
      total_users: parseInt(usersCount.rows[0].count),
      total_wallet_balance: totalBalance.rows[0].sum || 0,
      daily_sales: dailySales.rows[0].sum || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

exports.updateBitraApiKey = async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || apiKey.trim().length === 0) {
      return res.status(400).json({ message: 'API key cannot be empty' });
    }

    // Update environment variable
    process.env.BITRA_API_KEY = apiKey;

    res.json({
      message: 'BitraHQ API key updated successfully',
      apiKey: apiKey.substring(0, 10) + '***',
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update API key', error: error.message });
  }
};
