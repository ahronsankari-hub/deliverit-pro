const r = require('express').Router();
const c = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { auth: authLimit } = require('../middleware/rateLimit');
const v = require('../middleware/validate');
const { body } = require('express-validator');

r.post('/register',        authLimit, v.register, v.check, c.register);
r.post('/login',           authLimit, v.login,    v.check, c.login);
r.post('/refresh',         c.refresh);
r.post('/logout',          auth, c.logout);
r.post('/forgot-password', authLimit, [body('email').isEmail()], v.check, c.forgotPassword);
r.post('/reset-password',  authLimit, [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
  v.check,
], c.resetPassword);
r.get('/me',    auth, c.me);
r.patch('/me',  auth, c.updateProfile);

module.exports = r;
