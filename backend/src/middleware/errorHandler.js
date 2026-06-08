const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'כבר קיים רשומה כזו במערכת' });
  }

  // Sequelize validation
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'שגיאת נתונים',
      errors: err.errors.map(e => ({ field: e.path, msg: e.message })),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Token לא תקין' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token פג תוקף, התחבר מחדש' });
  }

  const status = err.status || err.statusCode || 500;

  logger.error(err.message, {
    status,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(status).json({
    message: status === 500 ? 'שגיאת שרת פנימית' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
