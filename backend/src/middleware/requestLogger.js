const logger = require('../utils/logger');

module.exports = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.path} ${res.statusCode} ${ms}ms`, {
      ip: req.ip,
      userId: req.user?.id,
    });
  });
  next();
};
