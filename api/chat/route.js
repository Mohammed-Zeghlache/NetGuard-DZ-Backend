const express = require('express');
const router = express.Router();
const {
    healthCheck,
    sendMessage,
    analyzeNetwork,
    interpretSpeed
} = require('./controller');

// Routes
router.get('/health', healthCheck);
router.post('/chat', sendMessage);
router.post('/analyze-network', analyzeNetwork);
router.post('/interpret-speed', interpretSpeed);

module.exports = router;