const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

// תמיכה ב-DB_URL, DATABASE_URL, ו-PG* variables (Railway)
const DB_CONN = process.env.DB_URL || process.env.DATABASE_URL;

if (DB_CONN || process.env.PGHOST) {
  // Production: PostgreSQL
  const options = {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30_000,
      idle: 10_000,
    },
  };

  if (DB_CONN) {
    sequelize = new Sequelize(DB_CONN, options);
  } else {
    // PG* variables (Railway private network)
    sequelize = new Sequelize(
      process.env.PGDATABASE || 'railway',
      process.env.PGUSER || 'postgres',
      process.env.PGPASSWORD,
      {
        ...options,
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432'),
      }
    );
  }
} else {
  // Development: SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../deliverit.db'),
    logging: false,
  });
}

module.exports = sequelize;
