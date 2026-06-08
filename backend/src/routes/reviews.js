const r = require('express').Router();
const c = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');
const { body } = require('express-validator');
const { check } = require('../middleware/validate');

r.use(auth);
r.post('/', [
  body('requestId').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('text').optional().isLength({ max: 500 }),
  check,
], c.submit);
r.get('/user/:userId', c.forUser);
r.get('/can/:requestId', c.canReview);

module.exports = r;
