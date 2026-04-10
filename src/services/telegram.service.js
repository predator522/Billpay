const { Telegraf } = require('telegraf');
const pool = require('../config/db');

let bot;

exports.initializeTelegramBot = async () => {
  bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  // /start command
  bot.start((ctx) => {
    ctx.reply('Welcome to BillPay Bot! I help admins approve wallet fund requests.');
  });

  // /addadmin command - Add new admin
  bot.command('addadmin', async (ctx) => {
    try {
      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        return ctx.reply('Usage: /addadmin <chat_id>');
      }

      const newChatId = BigInt(args[1]);
      const adminChatId = BigInt(ctx.from.id);

      // Check if requester is admin
      const isAdmin = await pool.query(
        'SELECT chat_id FROM telegram_admins WHERE chat_id = $1',
        [adminChatId]
      );

      if (isAdmin.rows.length === 0) {
        return ctx.reply('❌ You are not an admin. Only admins can add new admins.');
      }

      // Check if already admin
      const alreadyAdmin = await pool.query(
        'SELECT chat_id FROM telegram_admins WHERE chat_id = $1',
        [newChatId]
      );

      if (alreadyAdmin.rows.length > 0) {
        return ctx.reply('⚠️ This user is already an admin.');
      }

      // Add new admin
      await pool.query(
        'INSERT INTO telegram_admins (chat_id, added_by, added_at) VALUES ($1, $2, NOW())',
        [newChatId, adminChatId]
      );

      ctx.reply(`✅ New admin added: ${newChatId}`);

      // Notify new admin
      try {
        await ctx.telegram.sendMessage(newChatId, '👋 You have been added as a BillPay admin! You can now approve wallet fund requests.');
      } catch (error) {
        console.error('Error notifying new admin:', error);
      }
    } catch (error) {
      console.error('❌ Error in /addadmin:', error);
      ctx.reply(`❌ Error: ${error.message}`);
    }
  });

  // /listadmins command
  bot.command('listadmins', async (ctx) => {
    try {
      const adminChatId = BigInt(ctx.from.id);

      // Check if requester is admin
      const isAdmin = await pool.query(
        'SELECT chat_id FROM telegram_admins WHERE chat_id = $1',
        [adminChatId]
      );

      if (isAdmin.rows.length === 0) {
        return ctx.reply('❌ You are not an admin.');
      }

      const result = await pool.query('SELECT chat_id, added_by, added_at FROM telegram_admins ORDER BY added_at DESC');

      if (result.rows.length === 0) {
        return ctx.reply('No admins found.');
      }

      let message = '👨‍💼 **BillPay Admin List:**\n\n';
      result.rows.forEach((admin, index) => {
        message += `${index + 1}. Chat ID: \`${admin.chat_id}\`\n   Added by: ${admin.added_by}\n   Date: ${new Date(admin.added_at).toLocaleString()}\n\n`;
      });

      ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error('❌ Error in /listadmins:', error);
      ctx.reply(`❌ Error: ${error.message}`);
    }
  });

  // /removeadmin command
  bot.command('removeadmin', async (ctx) => {
    try {
      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        return ctx.reply('Usage: /removeadmin <chat_id>');
      }

      const chatIdToRemove = BigInt(args[1]);
      const adminChatId = BigInt(ctx.from.id);

      // Check if requester is admin
      const isAdmin = await pool.query(
        'SELECT chat_id FROM telegram_admins WHERE chat_id = $1',
        [adminChatId]
      );

      if (isAdmin.rows.length === 0) {
        return ctx.reply('❌ You are not an admin.');
      }

      // Remove admin
      const result = await pool.query(
        'DELETE FROM telegram_admins WHERE chat_id = $1 RETURNING chat_id',
        [chatIdToRemove]
      );

      if (result.rows.length === 0) {
        return ctx.reply(`⚠️ Admin with chat ID ${chatIdToRemove} not found.`);
      }

      ctx.reply(`✅ Admin ${chatIdToRemove} has been removed.`);
    } catch (error) {
      console.error('❌ Error in /removeadmin:', error);
      ctx.reply(`❌ Error: ${error.message}`);
    }
  });

  // /setapikey command - Update BitraHQ API key
  bot.command('setapikey', async (ctx) => {
    try {
      const adminChatId = BigInt(ctx.from.id);

      // Check if requester is admin
      const isAdmin = await pool.query(
        'SELECT chat_id FROM telegram_admins WHERE chat_id = $1',
        [adminChatId]
      );

      if (isAdmin.rows.length === 0) {
        return ctx.reply('❌ You are not an admin.');
      }

      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        return ctx.reply('Usage: /setapikey <new_api_key>');
      }

      const newApiKey = args[1];
      process.env.BITRA_API_KEY = newApiKey;

      ctx.reply(`✅ BitraHQ API key updated successfully!\nNew key: ${newApiKey.substring(0, 10)}***`);
    } catch (error) {
      console.error('❌ Error in /setapikey:', error);
      ctx.reply(`❌ Error: ${error.message}`);
    }
  });

  // Handle callback queries (Approve/Reject buttons)
  bot.action(/approve_(\d+)/, async (ctx) => {
    try {
      const depositId = ctx.match[1];
      const adminChatId = BigInt(ctx.from.id);

      // Check if requester is admin
      const isAdmin = await pool.query(
        'SELECT chat_id FROM telegram_admins WHERE chat_id = $1',
        [adminChatId]
      );

      if (isAdmin.rows.length === 0) {
        return ctx.answerCbQuery('❌ You are not an admin!');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Check and lock deposit
        const depositResult = await client.query(
          'SELECT id, user_id, amount, status FROM manual_deposits WHERE id = $1 FOR UPDATE',
          [depositId]
        );

        if (depositResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return ctx.answerCbQuery('❌ Deposit not found!');
        }

        const deposit = depositResult.rows[0];

        // Prevent double-approval
        if (deposit.status !== 'pending') {
          await client.query('ROLLBACK');
          return ctx.answerCbQuery(`⚠️ Already ${deposit.status}!`);
        }

        // Update deposit
        await client.query(
          'UPDATE manual_deposits SET status = $1, approved_at = NOW() WHERE id = $2',
          ['approved', depositId]
        );

        // Credit wallet
        await client.query(
          'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
          [deposit.amount, deposit.user_id]
        );

        await client.query('COMMIT');

        // Edit message
        await ctx.editMessageCaption(`✅ APPROVED by admin ${ctx.from.first_name}`);
        await ctx.answerCbQuery(`✅ Deposit approved! User credited ₦${deposit.amount}`);

        // Notify user
        const userResult = await pool.query(
          'SELECT id FROM users WHERE id = $1',
          [deposit.user_id]
        );

        if (userResult.rows.length > 0) {
          try {
            // Send notification to user if they've started the bot
            // (Would need to store user chat_id separately - future enhancement)
          } catch (error) {
            console.error('Error notifying user:', error);
          }
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error in approve_action:', error);
      ctx.answerCbQuery(`❌ Error: ${error.message}`);
    }
  });

  // Reject button
  bot.action(/reject_(\d+)/, async (ctx) => {
    try {
      const depositId = ctx.match[1];
      const adminChatId = BigInt(ctx.from.id);

      const isAdmin = await pool.query(
        'SELECT chat_id FROM telegram_admins WHERE chat_id = $1',
        [adminChatId]
      );

      if (isAdmin.rows.length === 0) {
        return ctx.answerCbQuery('❌ You are not an admin!');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const depositResult = await client.query(
          'SELECT id, status FROM manual_deposits WHERE id = $1 FOR UPDATE',
          [depositId]
        );

        if (depositResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return ctx.answerCbQuery('❌ Deposit not found!');
        }

        if (depositResult.rows[0].status !== 'pending') {
          await client.query('ROLLBACK');
          return ctx.answerCbQuery(`⚠️ Already ${depositResult.rows[0].status}!`);
        }

        await client.query(
          'UPDATE manual_deposits SET status = $1 WHERE id = $2',
          ['rejected', depositId]
        );

        await client.query('COMMIT');

        await ctx.editMessageCaption(`❌ REJECTED by admin ${ctx.from.first_name}`);
        await ctx.answerCbQuery(`✅ Deposit rejected!`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error in reject_action:', error);
      ctx.answerCbQuery(`❌ Error: ${error.message}`);
    }
  });

  // Start polling
  bot.launch();
  console.log('🤖 Telegram bot started');

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

exports.bot = bot;

exports.sendPhotoToAdmins = async ({ photoUrl, depositId, userName, userEmail, amount, note }) => {
  try {
    const adminsResult = await pool.query('SELECT chat_id FROM telegram_admins');

    if (adminsResult.rows.length === 0) {
      console.warn('⚠️ No admins to notify');
      return;
    }

    const caption = `📸 **New Fund Request**\n\n👤 User: ${userName}\n📧 Email: ${userEmail}\n💰 Amount: ₦${amount}\n📝 Note: ${note}\n\n⏰ Awaiting approval...`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve_${depositId}` },
          { text: '❌ Reject', callback_data: `reject_${depositId}` },
        ],
      ],
    };

    for (const admin of adminsResult.rows) {
      try {
        await bot.telegram.sendPhoto(
          admin.chat_id,
          photoUrl,
          {
            caption,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard,
          }
        );
      } catch (error) {
        console.error(`❌ Failed to send to admin ${admin.chat_id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error sending photo to admins:', error);
    throw error;
  }
};

exports.sendApprovalNotification = async (userId, amount) => {
  try {
    // This would require storing user's Telegram chat ID
    // For now, this is a placeholder for future enhancement
    console.log(`✅ User ${userId} wallet credited with ₦${amount}`);
  } catch (error) {
    console.error('❌ Error sending approval notification:', error);
  }
};