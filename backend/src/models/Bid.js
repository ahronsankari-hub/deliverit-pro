const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/*
  status: pending | accepted | rejected | withdrawn | expired
*/
const Bid = sequelize.define('Bid', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId:        { type: DataTypes.UUID, allowNull: false },
  courierId:        { type: DataTypes.UUID, allowNull: false },
  price:            { type: DataTypes.FLOAT, allowNull: false },
  estimatedMinutes: { type: DataTypes.INTEGER },
  message:          { type: DataTypes.TEXT },
  status:           { type: DataTypes.STRING, defaultValue: 'pending' },
  vehicleType:      { type: DataTypes.STRING },
  courierRating:    { type: DataTypes.FLOAT },
  expiresAt:        { type: DataTypes.DATE },
}, {
  indexes: [
    { fields: ['requestId'] },
    { fields: ['courierId'] },
    { fields: ['status'] },
    { fields: ['requestId', 'courierId'] },   // למניעת הצעה כפולה
    { fields: ['requestId', 'price'] },        // מיון מהיר לפי מחיר
  ],
});

module.exports = Bid;
