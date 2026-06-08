const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;

const handler = (req, res) => {
  res.status(429).json({ message: 'יותר מדי בקשות — נסה שוב עוד רגע', retryAfter: Math.ceil(windowMs / 1000) });
};

// General API — 100 req/min per IP
exports.general = rateLimit({
  windowMs,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Auth endpoints — 10 req/min (מניעת brute force)
exports.auth = rateLimit({
  windowMs,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skipSuccessfulRequests: false,
});

// Bid submission — 30 req/min per IP
exports.bids = rateLimit({
  windowMs,
  max: parseInt(process.env.BID_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
