const router = require('express').Router();
const { downloadInvoice } = require('../controllers/invoiceController');
const { auth } = require('../middleware/auth');

router.get('/:id/invoice', auth, downloadInvoice);

module.exports = router;
