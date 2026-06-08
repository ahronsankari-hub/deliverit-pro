const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { analyze, suggestPriceHandler } = require('../controllers/aiController');

const router = Router();

router.post('/analyze',       auth, analyze);
router.post('/suggest-price', auth, suggestPriceHandler);

module.exports = router;
