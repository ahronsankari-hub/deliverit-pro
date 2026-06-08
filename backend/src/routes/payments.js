const router = require('express').Router();
const { createCheckout, webhook, paymentStatus } = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');
const express = require('express');

// Webhook חייב raw body לפני express.json()
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.io = req.app.get('io');  // forward io
  next();
}, webhook);

router.post('/checkout/:requestId', auth, createCheckout);
router.get('/status/:requestId',    auth, paymentStatus);

module.exports = router;
