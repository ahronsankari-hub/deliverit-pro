const r = require('express').Router();
const { uploadMiddleware, uploadProof } = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');

r.post('/proof/:id', auth, uploadMiddleware, uploadProof);

module.exports = r;
