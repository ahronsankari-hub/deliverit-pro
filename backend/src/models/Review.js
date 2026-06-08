const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId:  { type: DataTypes.UUID, allowNull: false },
  fromUserId: { type: DataTypes.UUID, allowNull: false },
  toUserId:   { type: DataTypes.UUID, allowNull: false },
  rating:     { type: DataTypes.INTEGER, allowNull: false },
  text:       { type: DataTypes.TEXT },
  type:       { type: DataTypes.STRING }, // sender_to_courier | courier_to_sender
}, {
  indexes: [
    { fields: ['toUserId'] },
    { fields: ['fromUserId'] },
    { fields: ['requestId'] },
    { fields: ['requestId', 'fromUserId'], unique: true },
  ],
});

module.exports = Review;
