const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { Readable } = require('stream');

exports.getTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, ref_id, service, network, phone, amount, status, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
};

exports.downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    // Get transaction
    const transactionResult = await pool.query(
      'SELECT t.*, u.email, u.name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.id = $1 AND t.user_id = $2',
      [id, req.userId]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    // Only allow download for successful transactions
    if (transaction.status !== 'successful') {
      return res.status(400).json({ message: 'Can only download receipt for successful transactions' });
    }

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt_${transaction.ref_id}.pdf"`);

    doc.pipe(res);

    // Add watermark
    const addWatermark = () => {
      doc.save();
      doc.opacity(0.1);
      doc.fontSize(60);
      doc.rotate(45, { origin: [300, 400] });
      doc.text('BillPay', { align: 'center' });
      doc.rotate(-45, { origin: [300, 400] });
      doc.restore();
    };

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('BillPay', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Transaction Receipt', { align: 'center' });
    doc.moveDown();

    // Watermark
    addWatermark();

    // Transaction details
    doc.fontSize(11).font('Helvetica-Bold').text('TRANSACTION DETAILS', { underline: true });
    doc.moveDown(0.5);

    const detailsData = [
      ['Reference ID:', transaction.ref_id],
      ['Date & Time:', new Date(transaction.created_at).toLocaleString()],
      ['Status:', transaction.status.toUpperCase()],
      ['', ''],
      ['CUSTOMER INFORMATION', ''],
      ['Name:', transaction.name],
      ['Email:', transaction.email],
      ['', ''],
      ['SERVICE DETAILS', ''],
      ['Service:', transaction.service.toUpperCase()],
      ['Network:', transaction.network],
      ['Phone Number:', transaction.phone],
      ['Amount:', `₦${transaction.amount.toLocaleString()}`],
    ];

    doc.fontSize(10).font('Helvetica');
    detailsData.forEach(([label, value]) => {
      if (label === '' && value === '') {
        doc.moveDown(0.3);
      } else if (label.toUpperCase() === label && label !== '') {
        doc.font('Helvetica-Bold').text(label);
        doc.font('Helvetica');
      } else {
        doc.text(`${label} ${value}`, { width: 500 });
      }
    });

    doc.moveDown();

    // Generate QR Code
    try {
      const qrCodeUrl = `${process.env.APP_URL}/verify/${transaction.ref_id}`;
      const qrCode = await QRCode.toDataURL(qrCodeUrl);
      doc.image(qrCode, { width: 100, align: 'center' });
      doc.fontSize(8).text('Scan to verify transaction', { align: 'center' });
    } catch (qrError) {
      console.error('QR Code generation error:', qrError);
    }

    doc.moveDown();

    // Footer
    doc.fontSize(9).text('Thank you for using BillPay', { align: 'center' });
    doc.fontSize(8).text('https://billpay.com.ng', { align: 'center' });
    doc.fontSize(7).fillColor('#999').text(`Receipt generated on ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Receipt generation failed', error: error.message });
  }
};