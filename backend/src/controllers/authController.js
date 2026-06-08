const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { User, VehicleProfile } = require('../models');
const email   = require('../utils/email');

const SECRET  = process.env.JWT_SECRET || 'deliverit-secret-2024';
const REFRESH  = process.env.JWT_REFRESH_SECRET || 'deliverit-refresh-2024';

const makeTokens = (id) => ({
  token:        jwt.sign({ id }, SECRET,  { expiresIn: '15m' }),
  refreshToken: jwt.sign({ id }, REFRESH, { expiresIn: '30d' }),
});

const safeUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  phone: u.phone, companyName: u.companyName,
  avgRating: u.avgRating, totalJobs: u.totalJobs,
  avatarUrl: u.avatarUrl, vehicle: u.vehicle || null,
});

exports.register = async (req, res) => {
  try {
    const { name, email: mail, password, role, phone, companyName, vehicle } = req.body;
    if (await User.findOne({ where: { email: mail } }))
      return res.status(400).json({ message: 'אימייל כבר קיים' });

    const { token, refreshToken } = makeTokens('tmp');
    const user = await User.create({
      name, email: mail, phone, companyName,
      password: await bcrypt.hash(password, 12),
      role: role || 'sender',
    });
    const tokens = makeTokens(user.id);
    await user.update({ refreshToken: tokens.refreshToken });

    if (role === 'courier' && vehicle)
      await VehicleProfile.create({ courierId: user.id, ...vehicle });

    res.status(201).json({ ...tokens, user: safeUser(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email: mail, password } = req.body;
    const user = await User.findOne({ where: { email: mail }, include: [{ association: 'vehicle', required: false }] });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'אימייל או סיסמה שגויים' });
    if (!user.isActive) return res.status(403).json({ message: 'החשבון חסום. צור קשר עם התמיכה' });

    const tokens = makeTokens(user.id);
    await user.update({ refreshToken: tokens.refreshToken });
    res.json({ ...tokens, user: safeUser(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'חסר refresh token' });
    const decoded = jwt.verify(refreshToken, REFRESH);
    const user = await User.findByPk(decoded.id, { include: [{ association: 'vehicle', required: false }] });
    if (!user || user.refreshToken !== refreshToken)
      return res.status(401).json({ message: 'Token לא תקין' });

    const tokens = makeTokens(user.id);
    await user.update({ refreshToken: tokens.refreshToken });
    res.json({ ...tokens, user: safeUser(user) });
  } catch { res.status(401).json({ message: 'Token פג תוקף, התחבר מחדש' }); }
};

exports.logout = async (req, res) => {
  try {
    await req.user.update({ refreshToken: null });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    // Always return 200 — don't reveal if email exists
    if (!user) return res.json({ ok: true });

    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.update({ resetToken: token, resetTokenExpiry: expiry });

    const link = `${process.env.FRONTEND_URL || 'http://localhost:3004'}/reset-password?token=${token}`;
    await email.send(user.email, 'איפוס סיסמה — DeliverIt',
      `<div dir="rtl" style="font-family:sans-serif">
        <h2>שלום ${user.name},</h2>
        <p>לחץ על הקישור לאיפוס סיסמתך (תקף שעה אחת):</p>
        <a href="${link}" style="background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin:16px 0">אפס סיסמה</a>
        <p style="color:#888;font-size:12px">אם לא ביקשת איפוס, התעלם מהודעה זו.</p>
      </div>`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ where: { resetToken: token } });
    if (!user || new Date() > new Date(user.resetTokenExpiry))
      return res.status(400).json({ message: 'קישור פג תוקף או לא תקין' });

    await user.update({
      password:         await bcrypt.hash(password, 12),
      resetToken:       null,
      resetTokenExpiry: null,
      refreshToken:     null, // force re-login everywhere
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.me = (req, res) => res.json(safeUser(req.user));

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'companyName', 'avatarUrl'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    await req.user.update(updates);
    if (req.user.role === 'courier' && req.body.vehicle) {
      const vp = await VehicleProfile.findOne({ where: { courierId: req.user.id } });
      vp ? await vp.update(req.body.vehicle) : await VehicleProfile.create({ courierId: req.user.id, ...req.body.vehicle });
    }
    res.json(safeUser(await req.user.reload({ include: [{ association: 'vehicle', required: false }] })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};
