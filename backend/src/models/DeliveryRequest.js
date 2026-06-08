const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeliveryRequest = sequelize.define('DeliveryRequest', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  senderId:         { type: DataTypes.UUID, allowNull: false },
  trackingCode:     { type: DataTypes.STRING, unique: true },

  // Basic info
  title:            { type: DataTypes.STRING, allowNull: false },
  description:      { type: DataTypes.TEXT },
  cargoType:        { type: DataTypes.STRING, defaultValue: 'other' }, // food|envelope|carton|pallet|steel|furniture|vehicle|chemical|livestock|machinery|sack|other

  // Weight & dimensions
  weightKg:         { type: DataTypes.FLOAT, allowNull: false },
  lengthCm:         { type: DataTypes.FLOAT },
  widthCm:          { type: DataTypes.FLOAT },
  heightCm:         { type: DataTypes.FLOAT },
  volumeLiters:     { type: DataTypes.FLOAT }, // computed

  // Cargo-specific details (JSON stored as text)
  cargoDetails: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() { try { return JSON.parse(this.getDataValue('cargoDetails') || '{}'); } catch { return {}; } },
    set(v) { this.setDataValue('cargoDetails', JSON.stringify(v || {})); },
  },

  // Special requirements
  isFragile:        { type: DataTypes.BOOLEAN, defaultValue: false },
  requiresRefrig:   { type: DataTypes.BOOLEAN, defaultValue: false },
  requiresCrane:    { type: DataTypes.BOOLEAN, defaultValue: false },
  requiresLashing:  { type: DataTypes.BOOLEAN, defaultValue: false },
  isHazardous:      { type: DataTypes.BOOLEAN, defaultValue: false },
  hazardClass:      { type: DataTypes.STRING }, // ADR class
  requiresADR:      { type: DataTypes.BOOLEAN, defaultValue: false },
  isUrgent:         { type: DataTypes.BOOLEAN, defaultValue: false },
  keepWarm:         { type: DataTypes.BOOLEAN, defaultValue: false },

  // Pickup
  pickupAddress:    { type: DataTypes.STRING, allowNull: false },
  pickupLat:        { type: DataTypes.FLOAT },
  pickupLng:        { type: DataTypes.FLOAT },
  pickupContact:    { type: DataTypes.STRING },
  pickupPhone:      { type: DataTypes.STRING },
  pickupTime:       { type: DataTypes.DATE },

  // Dropoff
  dropoffAddress:   { type: DataTypes.STRING, allowNull: false },
  dropoffLat:       { type: DataTypes.FLOAT },
  dropoffLng:       { type: DataTypes.FLOAT },
  dropoffContact:   { type: DataTypes.STRING },
  dropoffPhone:     { type: DataTypes.STRING },
  dropoffTime:      { type: DataTypes.DATE },

  // Tender
  tenderType:         { type: DataTypes.STRING, allowNull: false },
  requiredVehicle:    { type: DataTypes.STRING },
  biddingEndsAt:      { type: DataTypes.DATE },
  minBudget:          { type: DataTypes.FLOAT },
  maxBudget:          { type: DataTypes.FLOAT },
  acceptedPrice:      { type: DataTypes.FLOAT },

  // Status
  status:             { type: DataTypes.STRING, defaultValue: 'open' },
  assignedCourierId:  { type: DataTypes.UUID },
  acceptedBidId:      { type: DataTypes.UUID },

  // Payment (Stripe)
  paymentStatus:      { type: DataTypes.STRING, defaultValue: 'unpaid' }, // unpaid|pending|paid|refunded
  stripeSessionId:    { type: DataTypes.STRING },
  paidAt:             { type: DataTypes.DATE },

  notes:              { type: DataTypes.TEXT },
  quantity:           { type: DataTypes.INTEGER, defaultValue: 1 },
  distanceKm:         { type: DataTypes.FLOAT },
  estimatedMinutes:   { type: DataTypes.INTEGER },
  actualPickupAt:     { type: DataTypes.DATE },
  actualDeliveryAt:   { type: DataTypes.DATE },
  proofPhotoUrl:      { type: DataTypes.STRING },
}, {
  indexes: [
    { fields: ['senderId'] },
    { fields: ['status'] },
    { fields: ['tenderType'] },
    { fields: ['biddingEndsAt'] },
    { fields: ['assignedCourierId'] },
    { fields: ['trackingCode'], unique: true },
    { fields: ['status', 'biddingEndsAt'] },   // הquery הכי נפוץ: open requests שלא פגו
  ],
});

module.exports = DeliveryRequest;
