const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/*
  vehicleType values:
    scooter   — קטנוע / אופניים חשמליים  (≤5 kg, small)
    car       — רכב פרטי                 (≤50 kg, medium)
    van       — רכב מסחרי / ואן          (≤500 kg, large)
    truck     — משאית קלה (≤3500 kg)
    heavytruck— משאית כבדה (>3500 kg)
*/
const VehicleProfile = sequelize.define('VehicleProfile', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courierId:     { type: DataTypes.UUID, allowNull: false, unique: true },
  vehicleType:   { type: DataTypes.STRING, allowNull: false },
  licensePlate:  { type: DataTypes.STRING },
  maxWeightKg:   { type: DataTypes.FLOAT, allowNull: false },
  maxVolumeCm3:  { type: DataTypes.FLOAT },   // cm³
  maxLengthCm:   { type: DataTypes.FLOAT },
  maxWidthCm:    { type: DataTypes.FLOAT },
  maxHeightCm:   { type: DataTypes.FLOAT },
  currentLat:    { type: DataTypes.FLOAT },
  currentLng:    { type: DataTypes.FLOAT },
  isOnline:      { type: DataTypes.BOOLEAN, defaultValue: false },
  lastSeen:      { type: DataTypes.DATE },
  city:          { type: DataTypes.STRING },
  description:   { type: DataTypes.TEXT },
  photoUrl:      { type: DataTypes.STRING },
});

module.exports = VehicleProfile;
