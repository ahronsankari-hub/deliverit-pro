const { Bid, DeliveryRequest, User, VehicleProfile } = require('../models');
const email = require('../utils/email');
const wp    = require('../utils/webpush');

// ── Submit bid ───────────────────────────────────────────────────────────────
exports.submit = async (req, res) => {
  try {
    const request = await DeliveryRequest.findByPk(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'בקשה לא נמצאה' });
    if (!['open','bidding'].includes(request.status))
      return res.status(400).json({ message: 'המכרז סגור' });
    if (new Date() > new Date(request.biddingEndsAt))
      return res.status(400).json({ message: 'זמן המכרז פג' });

    // Check courier has right vehicle
    const vp = await VehicleProfile.findOne({ where: { courierId: req.user.id } });
    if (!vp) return res.status(400).json({ message: 'אין פרופיל רכב' });

    const { canVehicleHandle } = require('../utils/tender');
    if (!canVehicleHandle(vp.vehicleType, request.requiredVehicle))
      return res.status(400).json({ message: 'הרכב שלך אינו מתאים למשלוח זה' });

    // Remove existing bid from same courier
    await Bid.destroy({ where: { requestId: request.id, courierId: req.user.id, status: 'pending' } });

    const bid = await Bid.create({
      requestId: request.id,
      courierId: req.user.id,
      price: req.body.price,
      estimatedMinutes: req.body.estimatedMinutes,
      message: req.body.message,
      vehicleType: vp.vehicleType,
      courierRating: req.user.avgRating,
    });

    await request.update({ status: 'bidding' });

    req.io?.emit('bid:new', { requestId: request.id, senderId: request.senderId, bidId: bid.id, price: bid.price });

    // Email + Push לשולח
    const sender = await User.findByPk(request.senderId, { attributes: ['email','name'] });
    if (sender) {
      email.bidReceived(sender.email, sender.name, request.title, req.body.price);
      wp.push(request.senderId, { title: 'הצעה חדשה! 💰', body: `₪${req.body.price} על "${request.title}"`, url: '/' });
    }

    res.status(201).json(bid);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Accept bid (sender) ──────────────────────────────────────────────────────
exports.accept = async (req, res) => {
  try {
    const bid = await Bid.findByPk(req.params.bidId, {
      include: [{ model: DeliveryRequest, as: 'request' }],
    });
    if (!bid) return res.status(404).json({ message: 'הצעה לא נמצאה' });
    if (bid.request.senderId !== req.user.id)
      return res.status(403).json({ message: 'אין הרשאה' });

    // Accept this bid, reject others
    await Bid.update({ status: 'rejected' }, { where: { requestId: bid.requestId, id: { [require('sequelize').Op.ne]: bid.id } } });
    await bid.update({ status: 'accepted' });
    await bid.request.update({
      status: 'assigned',
      assignedCourierId: bid.courierId,
      acceptedBidId: bid.id,
      acceptedPrice: bid.price,
    });

    req.io?.emit('bid:accepted', { requestId: bid.requestId, courierId: bid.courierId, price: bid.price });

    // Email + Push לשליח שזכה
    const courier = await User.findByPk(bid.courierId, { attributes: ['email','name'] });
    if (courier) {
      email.bidAccepted(courier.email, courier.name, bid.request.title, bid.price);
      wp.push(bid.courierId, { title: 'ההצעה שלך התקבלה! 🎉', body: `₪${bid.price} — ${bid.request.title}`, url: '/' });
    }

    res.json({ bid, request: bid.request });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Withdraw bid (courier) ───────────────────────────────────────────────────
exports.withdraw = async (req, res) => {
  try {
    const bid = await Bid.findOne({ where: { requestId: req.params.requestId, courierId: req.user.id, status: 'pending' } });
    if (!bid) return res.status(404).json({ message: 'הצעה לא נמצאה' });
    await bid.update({ status: 'withdrawn' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── List bids for a request ──────────────────────────────────────────────────
exports.listForRequest = async (req, res) => {
  try {
    const bids = await Bid.findAll({
      where: { requestId: req.params.requestId },
      include: [{ model: User, as: 'courier', attributes: ['id','name','avgRating','totalJobs','phone'], include: [{ association: 'vehicle', required: false }] }],
      order: [['price', 'ASC']],
    });
    res.json(bids);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Courier's own bids ────────────────────────────────────────────────────────
exports.myCourierBids = async (req, res) => {
  try {
    const bids = await Bid.findAll({
      where: { courierId: req.user.id },
      include: [{ model: DeliveryRequest, as: 'request', include: [{ model: User, as: 'sender', attributes: ['name','companyName'] }] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(bids);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Lower existing bid (courier) — במכרז פעיל ──────────────────────────────
exports.lowerBid = async (req, res) => {
  try {
    const { newPrice } = req.body;
    if (!newPrice || newPrice <= 0) return res.status(400).json({ message: 'מחיר לא תקין' });

    const request = await DeliveryRequest.findByPk(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'בקשה לא נמצאה' });
    if (!['open','bidding'].includes(request.status))
      return res.status(400).json({ message: 'המכרז סגור' });
    if (new Date() > new Date(request.biddingEndsAt))
      return res.status(400).json({ message: 'זמן המכרז פג' });

    const existing = await Bid.findOne({
      where: { requestId: request.id, courierId: req.user.id, status: 'pending' }
    });
    if (!existing) return res.status(404).json({ message: 'אין הצעה קיימת להורדה' });
    if (newPrice >= existing.price)
      return res.status(400).json({ message: `יש להציע מחיר נמוך מ-₪${existing.price}` });

    const oldPrice = existing.price;
    await existing.update({ price: newPrice });

    // עדכון real-time לכולם
    req.io?.emit('bid:lowered', {
      requestId: request.id,
      bidId: existing.id,
      courierId: req.user.id,
      oldPrice,
      newPrice,
      courierName: req.user.name,
    });

    // שלח push לשולח
    const wp = require('../utils/webpush');
    wp.push(request.senderId, {
      title: '💸 הצעה הורדה!',
      body: `${req.user.name} הוריד ל-₪${newPrice} על "${request.title}"`,
      url: '/',
    });

    res.json({ ok: true, bid: existing });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Notify all eligible couriers about new tender ───────────────────────────
exports.notifyCouriers = async (requestId, io) => {
  try {
    const request = await DeliveryRequest.findByPk(requestId, {
      include: [{ model: User, as: 'sender', attributes: ['name','companyName'] }]
    });
    if (!request) return;

    // שליחת socket לכל השליחים
    io?.emit('tender:new', {
      requestId: request.id,
      title: request.title,
      requiredVehicle: request.requiredVehicle,
      weightKg: request.weightKg,
      pickupAddress: request.pickupAddress,
      dropoffAddress: request.dropoffAddress,
      biddingEndsAt: request.biddingEndsAt,
      minBudget: request.minBudget,
      maxBudget: request.maxBudget,
      senderName: request.sender?.companyName || request.sender?.name,
    });

    // Push notification לשליחים רשומים
    const { Op } = require('sequelize');
    const VehicleProfile = require('../models').VehicleProfile;
    const { canVehicleHandle } = require('../utils/tender');

    const couriers = await User.findAll({
      where: { role: 'courier', isActive: true },
      include: [{ model: VehicleProfile, as: 'vehicle', required: true }],
    });

    const wp = require('../utils/webpush');
    for (const c of couriers) {
      if (canVehicleHandle(c.vehicle?.vehicleType, request.requiredVehicle)) {
        wp.push(c.id, {
          title: '🚨 מכרז חדש!',
          body: `${request.title} — ${request.pickupAddress} ← ${request.dropoffAddress}`,
          url: `/courier/bids/${requestId}`,
        });
      }
    }
  } catch (err) {
    const logger = require('../utils/logger');
    logger.warn('notifyCouriers failed', { error: err.message });
  }
};
