const r = require('express').Router();
const { auth } = require('../middleware/auth');
const wp = require('../utils/webpush');

r.use(auth);

r.post('/subscribe', (req, res) => {
  wp.subscribe(req.user.id, req.body);
  res.json({ ok: true });
});

r.post('/unsubscribe', (req, res) => {
  wp.unsubscribe(req.user.id);
  res.json({ ok: true });
});

r.get('/vapid-key', (_, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC || null });
});

module.exports = r;
