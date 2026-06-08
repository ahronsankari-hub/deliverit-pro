const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

// תמיכה ב-DB_URL, DATABASE_URL (Railway)
const DB_CONN = process.env.DB_URL || process.env.DATABASE_URL;

if (DB_CONN) {
  // Production: PostgreSQL — Railway מחייב SSL עבור חיבורים חיצוניים
  sequelize = new Sequelize(DB_CONN, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30_000,
      idle: 10_000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else if (process.env.PGHOST) {
  // Railway private network — ללא SSL
  sequelize = new Sequelize(
    process.env.PGDATABASE || 'railway',
    process.env.PGUSER || 'postgres',
    process.env.PGPASSWORD,
    {
      dialect: 'postgres',
      logging: false,
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
      pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },
    }
  );
} else {
  // Development: SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../deliverit.db'),
    logging: false,
  });
}

module.exports = sequelize;
