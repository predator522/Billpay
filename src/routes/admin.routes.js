const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { adminMiddleware } = require('../middleware/auth.middleware');

router.get('/users', adminMiddleware, adminController.getAllUsers);
router.get('/pending-deposits', adminMiddleware, adminController.getPendingDeposits);
router.post('/approve/:depositId', adminMiddleware, adminController.approveDeposit);
router.post('/reject/:depositId', adminMiddleware, adminController.rejectDeposit);
router.get('/stats', adminMiddleware, adminController.getStats);
router.post('/update-api-key', adminMiddleware, adminController.updateBitraApiKey);

module.exports = router;