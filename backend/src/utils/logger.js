const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message}${extra}`;
        })
      ),
    }),
    new transports.File({ filename: 'logs/error.log',   level: 'error', maxsize: 10_000_000, maxFiles: 5 }),
    new transports.File({ filename: 'logs/combined.log',                maxsize: 10_000_000, maxFiles: 10 }),
  ],
});

module.exports = logger;
