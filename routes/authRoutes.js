const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Admin routes
router.post('/admin/signup', authController.adminSignup);
router.post('/admin/login', authController.adminLogin);

// User routes
router.post('/user/signup', authController.userSignup);
router.post('/user/login', authController.userLogin);

// Get current user (protected)
router.get('/me', auth, authController.getMe);

module.exports = router;