const r = require('express').Router();
const c = require('../controllers/adminController');
const { auth, role } = require('../middleware/auth');
const { auth: authLimit } = require('../middleware/rateLimit');

r.use(auth, role('admin'));
r.get('/stats',                c.stats);
r.get('/users',                c.listUsers);
r.get('/requests',             c.listRequests);
r.patch('/users/:id/toggle',   c.toggleUser);
r.post('/requests/:id/cancel', c.forceCancel);

module.exports = r;
