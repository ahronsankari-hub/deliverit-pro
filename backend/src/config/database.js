const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

// תמיכה ב-DB_URL (מקומי) ו-DATABASE_URL (Railway)
const DB_CONN = process.env.DB_URL || process.env.DATABASE_URL;
if (DB_CONN) {
  // Production: PostgreSQL
  // Railway's proxy (acela.proxy.rlwy.net) — no SSL at the proxy layer
  const sslConfig = process.env.DB_SSL === 'true'
    ? { require: true, rejectUnauthorized: false }
    : undefined;

  sequelize = new Sequelize(DB_CONN, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,           // לא ליצור חיבורים עד שצריך
      acquire: 60_000,  // המתן עד דקה
      idle: 10_000,
    },
    dialectOptions: sslConfig ? { ssl: sslConfig } : {},
  });
} else {
  // Development: SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../deliverit.db'),
    logging: false,
  });
}

module.exports = sequelize;
