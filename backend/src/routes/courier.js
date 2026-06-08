const r = require('express').Router();
const { auth } = require('../middleware/auth');
const { VehicleProfile, User, Review, DeliveryRequest } = require('../models');
const { myCourierBids } = require('../controllers/bidController');

r.use(auth);

r.get('/bids', myCourierBids);

// Public courier profile (any authenticated user can view)
r.get('/profile/:courierId', async (req, res) => {
  try {
    const courier = await User.findByPk(req.params.courierId, {
      attributes: ['id','name','companyName','avgRating','totalJobs','avatarUrl','createdAt'],
      include: [{ association: 'vehicle', required: false }],
    });
    if (!courier || courier.role !== 'courier')
      return res.status(404).json({ message: 'שליח לא נמצא' });

    const reviews = await Review.findAll({
      where: { toUserId: courier.id, type: 'sender_to_courier' },
      include: [{ model: User, as: 'reviewer', attributes: ['id','name'] }],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });
    res.json({ ...courier.toJSON(), reviews });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

r.post('/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await VehicleProfile.update(
      { currentLat: lat, currentLng: lng, lastSeen: new Date(), isOnline: true },
      { where: { courierId: req.user.id } }
    );
    req.io?.emit('courier:location', { courierId: req.user.id, lat, lng });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

r.get('/stats', async (req, res) => {
  try {
    const { Bid } = require('../models');
    const myBids  = await Bid.count({ where: { courierId: req.user.id } });
    const accepted = await Bid.count({ where: { courierId: req.user.id, status: 'accepted' } });
    const delivered = await DeliveryRequest.count({ where: { assignedCourierId: req.user.id, status: 'delivered' } });
    const active    = await DeliveryRequest.count({ where: { assignedCourierId: req.user.id, status: ['assigned','picked_up','in_transit'] } });
    res.json({ myBids, accepted, delivered, active, rating: req.user.avgRating });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Set offline on demand
r.post('/offline', async (req, res) => {
  try {
    await VehicleProfile.update({ isOnline: false }, { where: { courierId: req.user.id } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = r;
