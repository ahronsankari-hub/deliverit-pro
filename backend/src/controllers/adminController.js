const { User, DeliveryRequest, Bid, Review, VehicleProfile } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

exports.stats = async (req, res) => {
  try {
    const [users, requests, bids, delivered, revenue] = await Promise.all([
      User.count(),
      DeliveryRequest.count(),
      Bid.count(),
      DeliveryRequest.count({ where: { status: 'delivered' } }),
      DeliveryRequest.sum('acceptedPrice', { where: { status: 'delivered' } }),
    ]);
    const active = await DeliveryRequest.count({ where: { status: ['open','bidding','assigned','picked_up','in_transit'] } });
    const couriers = await User.count({ where: { role: 'courier' } });
    const senders  = await User.count({ where: { role: 'sender' } });
    res.json({ users, couriers, senders, requests, active, delivered, bids, revenue: revenue || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.listUsers = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const role   = req.query.role;
    const { count, rows } = await User.findAndCountAll({
      where: role ? { role } : {},
      attributes: { exclude: ['password'] },
      include: [{ association: 'vehicle', required: false }],
      order: [['createdAt', 'DESC']],
      limit, offset,
    });
    res.json({ total: count, limit, offset, data: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.listRequests = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const { status } = req.query;
    const { count, rows } = await DeliveryRequest.findAndCountAll({
      where: status ? { status } : {},
      include: [
        { model: User, as: 'sender',  attributes: ['id','name','email'] },
        { model: Bid,  as: 'bids',    attributes: ['id','price','status'] },
      ],
      order: [['createdAt', 'DESC']],
      limit, offset,
    });
    res.json({ total: count, limit, offset, data: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.toggleUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });
    if (user.role === 'admin') return res.status(403).json({ message: 'לא ניתן לחסום אדמין' });
    await user.update({ isActive: !user.isActive });
    res.json({ id: user.id, isActive: user.isActive });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.forceCancel = async (req, res) => {
  try {
    const r = await DeliveryRequest.findByPk(req.params.id);
    if (!r) return res.status(404).json({ message: 'לא נמצא' });
    await Bid.update({ status: 'rejected' }, { where: { requestId: r.id, status: 'pending' } });
    await r.update({ status: 'cancelled' });
    req.io?.emit('request:cancelled', { id: r.id, adminForced: true });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
