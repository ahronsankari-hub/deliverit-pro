require('dotenv').config();
const express    = require('express');
const { createServer } = require('http');
const { Server }  = require('socket.io');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const path = require('path');
const { sequelize } = require('./models');
const { general: generalLimit } = require('./middleware/rateLimit');
const requestLogger = require('./middleware/requestLogger');
const errorHandler  = require('./middleware/errorHandler');
const logger        = require('./utils/logger');
const { createRedisAdapter, closeRedis } = require('./config/redis');

// ── App setup ────────────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*' },
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

app.set('trust proxy', 1);  // לסביבת cloud/nginx

app.use(helmet({
  crossOriginEmbedderPolicy: false,  // מאפשר socket.io
  contentSecurityPolicy: false,
}));
app.use(compression());

// CORS — בdev: כולם. בprod: רק הדומיינים הרשומים ב-CORS_ORIGIN (מופרדים בפסיק)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['*'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use(generalLimit);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// מעביר socket.io לכל ה-controllers
app.use((req, _, next) => { req.io = io; next(); });

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/courier',  require('./routes/courier'));
app.use('/api/reviews',  require('./routes/reviews'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/upload',   require('./routes/upload'));
app.use('/api/push',     require('./routes/push'));
app.use('/api/requests', require('./routes/invoices'));   // GET /api/requests/:id/invoice
app.use('/api/payments', require('./routes/payments'));   // Stripe checkout + webhook

app.get('/',       (_, res) => res.json({ name: 'DeliverIt Pro API', version: '2.0.0', env: process.env.NODE_ENV }));
app.get('/health', async (_, res) => {
  let db = 'unknown';
  try {
    await sequelize.authenticate();
    db = 'connected';
  } catch {
    db = 'disconnected';
  }
  // תמיד מחזיר 200 — Railway בודק רק שהשרת עונה, לא שDB מחובר
  res.json({ status: 'ok', db, time: new Date(), uptime: process.uptime() });
});

// 404
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} לא קיים` }));

// Central error handler — חייב להיות אחרון
app.use(errorHandler);

// ── Socket.io rooms ───────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join', (id) => { if (id) socket.join(id); });
  socket.on('disconnect', () => {});
});

// ── Auto-close expired tenders ────────────────────────────────────────────────
const { DeliveryRequest, Bid } = require('./models');
const { Op } = require('sequelize');

async function closeExpiredTenders() {
  try {
    const expired = await DeliveryRequest.findAll({
      where: { status: ['open', 'bidding'], biddingEndsAt: { [Op.lt]: new Date() } },
    });
    for (const r of expired) {
      const topBid = await Bid.findOne({
        where: { requestId: r.id, status: 'pending' },
        order: [['price', 'ASC']],
      });
      if (topBid) {
        await topBid.update({ status: 'accepted' });
        await r.update({ status: 'assigned', assignedCourierId: topBid.courierId, acceptedBidId: topBid.id, acceptedPrice: topBid.price });
        io.emit('bid:accepted', { requestId: r.id, courierId: topBid.courierId, auto: true });
        logger.info('Auto-accepted bid', { requestId: r.id, bidId: topBid.id, price: topBid.price });
      } else {
        await r.update({ status: 'cancelled' });
        logger.info('Auto-cancelled empty tender', { requestId: r.id });
      }
    }
  } catch (err) {
    logger.error('closeExpiredTenders failed', { error: err.message });
  }
}

setInterval(closeExpiredTenders, 30_000);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// מאזינים לפורט קודם — Railway צריך לראות שהשרת עונה מיד
// ה-DB sync רץ ברקע ולא חוסם את ה-healthcheck
httpServer.listen(PORT, () => {
  logger.info(`DeliverIt Pro API started`, { port: PORT, env: process.env.NODE_ENV });
  // sync ב-PostgreSQL — מוסיף עמודות חסרות, לא מוחק נתונים
  sequelize.sync().then(async () => {
    await createRedisAdapter(io);
    logger.info('DB sync complete, Redis ready');
  }).catch((err) => {
    logger.error('DB sync failed — server still running', { error: err.message });
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  httpServer.close(async () => {
    try {
      await sequelize.close();
      await closeRedis();
      logger.info('Database + Redis connections closed');
    } catch {}
    process.exit(0);
  });
  // אם תוך 10 שניות לא נסגר — כפה
  setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1); }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
