const r = require('express').Router();
const c = require('../controllers/requestController');
const b = require('../controllers/bidController');
const { auth } = require('../middleware/auth');
const { bids: bidsLimit } = require('../middleware/rateLimit');
const v = require('../middleware/validate');

r.get('/track/:code', c.track);
r.use(auth);

r.post('/',    v.createRequest, v.check, c.create);
r.get('/',     v.pagination,    v.check, c.list);
r.get('/:id',  c.getOne);
r.patch('/:id/status', c.updateStatus);
r.post('/:id/cancel',  c.cancel);

// Bids
r.post('/:requestId/bids',        bidsLimit, v.submitBid, v.check, b.submit);
r.patch('/:requestId/bids/lower', auth, b.lowerBid);   // הורדת מחיר במכרז
r.delete('/:requestId/bids',      b.withdraw);
r.get('/:requestId/bids',         b.listForRequest);
r.post('/bids/:bidId/accept',     b.accept);

module.exports = r;
