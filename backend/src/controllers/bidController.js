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
