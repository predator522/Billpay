const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateSignup, validateLogin } = require('../middleware/validate.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/signup', validateSignup, authController.signup);
router.post('/login', validateLogin, authController.login);
router.post('/admin-login', validateLogin, authController.adminLogin);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
