const { Review, DeliveryRequest, User } = require('../models');
const { Op } = require('sequelize');

// ── Submit review ────────────────────────────────────────────────────────────
exports.submit = async (req, res) => {
  try {
    const { requestId, rating, text } = req.body;
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'דירוג חייב להיות 1–5' });

    const request = await DeliveryRequest.findByPk(requestId);
    if (!request) return res.status(404).json({ message: 'משלוח לא נמצא' });
    if (request.status !== 'delivered') return res.status(400).json({ message: 'ניתן לדרג רק לאחר מסירה' });

    const isSender  = request.senderId          === req.user.id;
    const isCourier = request.assignedCourierId === req.user.id;
    if (!isSender && !isCourier) return res.status(403).json({ message: 'אין הרשאה' });

    const type    = isSender ? 'sender_to_courier' : 'courier_to_sender';
    const toUserId = isSender ? request.assignedCourierId : request.senderId;

    const existing = await Review.findOne({ where: { requestId, fromUserId: req.user.id } });
    if (existing) return res.status(400).json({ message: 'כבר דירגת משלוח זה' });

    await Review.create({ requestId, fromUserId: req.user.id, toUserId, rating, text, type });

    // Update avgRating on the reviewed user
    const reviews = await Review.findAll({ where: { toUserId } });
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await User.update({ avgRating: Math.round(avg * 10) / 10 }, { where: { id: toUserId } });

    res.status(201).json({ ok: true, newAvg: avg });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Get reviews for a user ────────────────────────────────────────────────────
exports.forUser = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { toUserId: req.params.userId },
      include: [{ model: User, as: 'reviewer', attributes: ['id', 'name', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    res.json(reviews);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Check if current user can review a request ───────────────────────────────
exports.canReview = async (req, res) => {
  try {
    const request = await DeliveryRequest.findByPk(req.params.requestId);
    if (!request || request.status !== 'delivered') return res.json({ can: false });

    const isParty = request.senderId === req.user.id || request.assignedCourierId === req.user.id;
    if (!isParty) return res.json({ can: false });

    const existing = await Review.findOne({ where: { requestId: req.params.requestId, fromUserId: req.user.id } });
    res.json({ can: !existing, alreadyReviewed: !!existing });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
