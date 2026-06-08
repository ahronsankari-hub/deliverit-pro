const { DeliveryRequest, Bid, User, VehicleProfile } = require('../models');
const { getRequiredVehicle, getTenderType, getBiddingDeadline, canVehicleHandle } = require('../utils/tender');
const email = require('../utils/email');
const { emailInvoice } = require('./invoiceController');
const { Op } = require('sequelize');

const genCode = () => 'DL-' + Math.random().toString(36).slice(-6).toUpperCase();

// ── Create delivery request ──────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { weightKg, lengthCm, widthCm, heightCm } = req.body;
    const vol = (lengthCm || 0) * (widthCm || 0) * (heightCm || 0);
    const requiredVehicle = req.body.requiredVehicle || getRequiredVehicle(weightKg, vol);
    const tenderType = req.body.tenderType || getTenderType(requiredVehicle);
    const biddingEndsAt = getBiddingDeadline(tenderType);

    const request = await DeliveryRequest.create({
      ...req.body,
      senderId: req.user.id,
      requiredVehicle,
      tenderType,
      biddingEndsAt,
      trackingCode: genCode(),
      status: 'open',
    });

    req.io?.emit('request:new', { id: request.id, tenderType, requiredVehicle });

    // שלח notifications לשליחים מתאימים ברקע
    const { notifyCouriers } = require('./bidController');
    notifyCouriers(request.id, req.io).catch(() => {});

    res.status(201).json(request);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── List requests (sender sees own, courier sees open matching) ──────────────
exports.list = async (req, res) => {
  try {
    const { status, tenderType, q } = req.query;
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const searchWhere = q ? {
      [Op.or]: [
        { title:          { [Op.like]: `%${q}%` } },
        { pickupAddress:  { [Op.like]: `%${q}%` } },
        { dropoffAddress: { [Op.like]: `%${q}%` } },
        { trackingCode:   { [Op.like]: `%${q}%` } },
      ],
    } : {};

    if (req.user.role === 'sender') {
      const { count, rows } = await DeliveryRequest.findAndCountAll({
        where: { senderId: req.user.id, ...(status ? { status } : {}), ...searchWhere },
        include: [{ model: Bid, as: 'bids', include: [{ model: User, as: 'courier', attributes: ['id','name','avgRating','totalJobs'] }] }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });
      return res.json({ total: count, limit, offset, data: rows });
    }

    // Courier: see open requests matching their vehicle
    const vp = req.user.vehicle;
    if (!vp) return res.json({ total: 0, limit, offset, data: [] });

    const { count, rows } = await DeliveryRequest.findAndCountAll({
      where: {
        status: ['open', 'bidding'],
        biddingEndsAt: { [Op.gt]: new Date() },
        ...(tenderType ? { tenderType } : {}),
        ...searchWhere,
      },
      include: [
        { model: Bid, as: 'bids', required: false },
        { model: User, as: 'sender', attributes: ['id','name','companyName','avgRating'] },
      ],
      order: [['biddingEndsAt', 'ASC']],
      limit,
      offset,
    });

    const filtered = rows.filter(r => canVehicleHandle(vp.vehicleType, r.requiredVehicle));
    res.json({ total: filtered.length, limit, offset, data: filtered });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Get single request ───────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const r = await DeliveryRequest.findByPk(req.params.id, {
      include: [
        { model: Bid, as: 'bids', include: [{ model: User, as: 'courier', attributes: ['id','name','avgRating','totalJobs','phone'], include: [{ association: 'vehicle', required: false }] }] },
        { model: User, as: 'sender', attributes: ['id','name','companyName','phone','avgRating'] },
      ],
    });
    if (!r) return res.status(404).json({ message: 'לא נמצא' });
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Track by code (public) ───────────────────────────────────────────────────
exports.track = async (req, res) => {
  try {
    const r = await DeliveryRequest.findOne({
      where: { trackingCode: req.params.code },
      include: [{ model: User, as: 'sender', attributes: ['name','companyName'] }],
    });
    if (!r) return res.status(404).json({ message: 'לא נמצא' });
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Cancel request (sender only) ─────────────────────────────────────────────
exports.cancel = async (req, res) => {
  try {
    const r = await DeliveryRequest.findByPk(req.params.id);
    if (!r) return res.status(404).json({ message: 'לא נמצא' });
    if (r.senderId !== req.user.id) return res.status(403).json({ message: 'אין הרשאה' });
    if (!['open','bidding'].includes(r.status)) return res.status(400).json({ message: 'לא ניתן לבטל בשלב זה' });
    await Bid.update({ status: 'rejected' }, { where: { requestId: r.id, status: 'pending' } });
    await r.update({ status: 'cancelled' });
    req.io?.emit('request:cancelled', { id: r.id, senderId: r.senderId });
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Update status (courier only) ─────────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const r = await DeliveryRequest.findByPk(req.params.id);
    if (!r) return res.status(404).json({ message: 'לא נמצא' });
    const updates = { status: req.body.status };
    if (req.body.status === 'picked_up') updates.actualPickupAt = new Date();
    if (req.body.status === 'picked_up') updates.actualPickupAt = new Date();
    if (req.body.status === 'delivered') {
      updates.actualDeliveryAt = new Date();
      await User.increment('totalJobs', { where: { id: r.assignedCourierId } });
    }
    await r.update(updates);
    req.io?.emit('request:status', { id: r.id, status: req.body.status, senderId: r.senderId });

    // Email לשולח על עדכון סטטוס
    const sender = await User.findByPk(r.senderId, { attributes: ['email','name'] });
    if (sender) email.statusUpdate(sender.email, sender.name, r.title, req.body.status);

    // חשבונית אוטומטית כאשר נמסר
    if (req.body.status === 'delivered') {
      emailInvoice(r.id).catch(() => {}); // non-blocking
    }

    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
