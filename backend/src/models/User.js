const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Roles: sender (שולח), courier (שליח), admin
const User = sequelize.define('User', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:       { type: DataTypes.STRING, allowNull: false },
  email:      { type: DataTypes.STRING, allowNull: false, unique: true },
  password:   { type: DataTypes.STRING, allowNull: false },
  role:       { type: DataTypes.STRING, defaultValue: 'sender' },
  phone:      { type: DataTypes.STRING },
  companyName:{ type: DataTypes.STRING },
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
  avgRating:  { type: DataTypes.FLOAT, defaultValue: 5.0 },
  totalJobs:  { type: DataTypes.INTEGER, defaultValue: 0 },
  avatarUrl:        { type: DataTypes.STRING },
  refreshToken:     { type: DataTypes.STRING },
  resetToken:       { type: DataTypes.STRING },
  resetTokenExpiry: { type: DataTypes.DATE },
}, {
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role'] },
  ],
});

module.exports = User;
