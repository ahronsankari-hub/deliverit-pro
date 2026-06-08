const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

// תמיכה ב-DB_URL (מקומי) ו-DATABASE_URL (Railway)
const DB_CONN = process.env.DB_URL || process.env.DATABASE_URL;
if (DB_CONN) {
  // Production: PostgreSQL
  sequelize = new Sequelize(DB_CONN, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,          // עד 20 חיבורים במקביל
      min: 2,
      acquire: 30_000,
      idle: 10_000,
    },
    dialectOptions: {
      ssl: (process.env.DB_SSL === 'true' || process.env.DATABASE_URL) ? { require: true, rejectUnauthorized: false } : false,
      statement_timeout: 10_000,  // query נהרג אחרי 10 שניות
    },
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
