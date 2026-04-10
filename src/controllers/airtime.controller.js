const pool = require('../config/db');
const { buyAirtime } = require('../services/bitra.service');

exports.buyAirtime = async (req, res) => {
  const client = await pool.connect();
  try {
    const { network, phone, amount } = req.validated;

    // Start transaction
    await client.query('BEGIN');

    // Get user wallet
    const userResult = await client.query(
      'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const userWallet = userResult.rows[0].wallet_balance;

    if (userWallet < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // Generate unique ref
    const ref = `airtime_${req.userId}_${Date.now()}`;

    // Call BitraHQ API
    const bitraResponse = await buyAirtime({
      network,
      phone,
      amount,
      ref,
    });

    // Create transaction record
    const transactionResult = await client.query(
      'INSERT INTO transactions (ref_id, user_id, service, network, phone, amount, status, response) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [
        ref,
        req.userId,
        'airtime',
        network,
        phone,
        amount,
        bitraResponse.status === 'successful' ? 'successful' : 'failed',
        JSON.stringify(bitraResponse),
      ]
    );

    // Deduct from wallet if successful
    if (bitraResponse.status === 'successful') {
      await client.query(
        'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
        [amount, req.userId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Airtime purchase processed',
      transaction: {
        id: transactionResult.rows[0].id,
        ref_id: ref,
        status: bitraResponse.status,
        amount,
        network,
        phone,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Airtime purchase failed', error: error.message });
  } finally {
    client.release();
  }
};