const { DeliveryRequest, User, Bid } = require('../models');
const logger = require('../utils/logger');
const { emailInvoice } = require('./invoiceController');

// Lazy init — avoid crash when STRIPE_SECRET_KEY is not set
let _stripe = null;
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return _stripe;
};

// ── POST /api/payments/checkout/:requestId ─────────────────────────────────
exports.createCheckout = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: 'תשלומים אינם מוגדרים בסביבה זו' });
    }

    const request = await DeliveryRequest.findByPk(req.params.requestId, {
      include: [{ model: User, as: 'sender', attributes: ['id','name','email'] }],
    });
    if (!request) return res.status(404).json({ message: 'משלוח לא נמצא' });
    if (request.senderId !== req.user.id) return res.status(403).json({ message: 'אין הרשאה' });
    if (!['assigned','in_progress'].includes(request.status)) {
      return res.status(400).json({ message: 'לא ניתן לשלם במצב נוכחי' });
    }
    if (request.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'כבר שולם' });
    }

    const price = request.acceptedPrice;
    if (!price) return res.status(400).json({ message: 'לא נמצאה הצעת מחיר מאושרת' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: request.sender.email,
      line_items: [{
        price_data: {
          currency: 'ils',
          product_data: {
            name: `הובלה DeliverIt #${String(request.id).padStart(6,'0')}`,
            description: `מ: ${request.pickupAddress} ל: ${request.deliveryAddress}`,
          },
          unit_amount: Math.round(price * 100), // אגורות
        },
        quantity: 1,
      }],
      metadata: { requestId: String(request.id) },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3004'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL || 'http://localhost:3004'}/payment/cancel`,
      locale: 'auto',
    });

    // שמור session ID
    await request.update({ stripeSessionId: session.id, paymentStatus: 'pending' });

    logger.info('Stripe checkout created', { requestId: request.id, sessionId: session.id, amount: price });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    logger.error('createCheckout failed', { error: err.message });
    res.status(500).json({ message: 'שגיאה ביצירת עמוד תשלום' });
  }
};

// ── POST /api/payments/webhook ─────────────────────────────────────────────
exports.webhook = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.json({ received: true });

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn('Stripe webhook signature failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const requestId = session.metadata?.requestId;
    if (requestId) {
      try {
        const request = await DeliveryRequest.findByPk(requestId);
        if (request) {
          await request.update({ paymentStatus: 'paid', paidAt: new Date() });
          // שלח חשבונית במייל
          await emailInvoice(requestId);
          if (req.io) req.io.to(`request-${requestId}`).emit('payment:confirmed', { requestId });
          logger.info('Payment confirmed', { requestId, sessionId: session.id });
        }
      } catch (err) {
        logger.error('webhook payment update failed', { requestId, error: err.message });
      }
    }
  }

  res.json({ received: true });
};

// ── GET /api/payments/status/:requestId ────────────────────────────────────
exports.paymentStatus = async (req, res) => {
  try {
    const request = await DeliveryRequest.findByPk(req.params.requestId, {
      attributes: ['id','paymentStatus','stripeSessionId','acceptedPrice','paidAt'],
    });
    if (!request) return res.status(404).json({ message: 'לא נמצא' });

    const isSender  = request.senderId === req.user.id;
    const isCourier = request.assignedCourierId === req.user.id;
    const isAdmin   = req.user.role === 'admin';
    if (!isSender && !isCourier && !isAdmin) return res.status(403).json({ message: 'אין הרשאה' });

    res.json({
      status: request.paymentStatus || 'unpaid',
      amount: request.acceptedPrice,
      paidAt: request.paidAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'שגיאה' });
  }
};
