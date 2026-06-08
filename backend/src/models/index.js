const sequelize = require('../config/database');
const User = require('./User');
const VehicleProfile = require('./VehicleProfile');
const DeliveryRequest = require('./DeliveryRequest');
const Bid = require('./Bid');
const Review = require('./Review');

User.hasOne(VehicleProfile, { foreignKey: 'courierId', as: 'vehicle' });
VehicleProfile.belongsTo(User, { foreignKey: 'courierId', as: 'courier' });

User.hasMany(DeliveryRequest, { foreignKey: 'senderId', as: 'sentRequests' });
DeliveryRequest.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(DeliveryRequest, { foreignKey: 'assignedCourierId', as: 'assignedDeliveries' });
DeliveryRequest.belongsTo(User, { foreignKey: 'assignedCourierId', as: 'assignedCourier' });

User.hasMany(Bid, { foreignKey: 'courierId', as: 'bids' });
Bid.belongsTo(User, { foreignKey: 'courierId', as: 'courier' });

DeliveryRequest.hasMany(Bid, { foreignKey: 'requestId', as: 'bids' });
Bid.belongsTo(DeliveryRequest, { foreignKey: 'requestId', as: 'request' });

User.hasMany(Review,  { foreignKey: 'toUserId',   as: 'receivedReviews' });
User.hasMany(Review,  { foreignKey: 'fromUserId', as: 'givenReviews' });
Review.belongsTo(User, { foreignKey: 'fromUserId', as: 'reviewer' });
Review.belongsTo(User, { foreignKey: 'toUserId',   as: 'reviewed' });

module.exports = { sequelize, User, VehicleProfile, DeliveryRequest, Bid, Review };
