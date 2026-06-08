/**
 * Vehicle types, tender logic, and cargo specifications
 */
const VEHICLE_SPECS = {
  scooter:    { maxKg: 5,        label: 'קטנוע',         emoji: '🛵', color:'#FF6B35' },
  car:        { maxKg: 50,       label: 'רכב פרטי',      emoji: '🚗', color:'#3B82F6' },
  van:        { maxKg: 500,      label: 'רכב מסחרי',     emoji: '🚐', color:'#8B5CF6' },
  truck:      { maxKg: 3500,     label: 'משאית קלה',     emoji: '🚛', color:'#10B981' },
  heavytruck: { maxKg: Infinity, label: 'משאית כבדה',    emoji: '🚚', color:'#EF4444' },
};

const TENDER_SPECS = {
  flash:    { durationMin: 180,  label: 'מכרז מהיר',   emoji: '⚡', vehicles: ['scooter'] },
  standard: { durationMin: 360,  label: 'מכרז רגיל',   emoji: '📦', vehicles: ['car', 'scooter'] },
  extended: { durationMin: 720,  label: 'מכרז מורחב',  emoji: '🚐', vehicles: ['van', 'car'] },
  large:    { durationMin: 2880, label: 'מכרז גדול',   emoji: '🏭', vehicles: ['truck', 'heavytruck'] },
};

// Cargo type definitions — what info is required for each type
const CARGO_TYPES = {
  food:      { label:'🍔 אוכל', fields:['bagCount','keepWarm','refrigerated'], icon:'🍔' },
  envelope:  { label:'✉️ מסמך/מעטפה', fields:['quantity','urgent'], icon:'✉️' },
  carton:    { label:'📦 קרטון', fields:['dims','quantity','fragile','stackable'], icon:'📦' },
  pallet:    { label:'🪵 משטח', fields:['dims','palletType','quantity','material'], icon:'🪵' },
  sack:      { label:'🛍️ שקים', fields:['bagCount','weight'], icon:'🛍️' },
  steel:     { label:'🔩 פלדה/מתכת', fields:['dims','weight','lashing','crane'], icon:'🔩' },
  furniture: { label:'🛋️ ריהוט', fields:['dims','assembly','fragile'], icon:'🛋️' },
  vehicle:   { label:'🚗 כלי רכב', fields:['vehicleModel','running','crane'], icon:'🚗' },
  chemical:  { label:'⚗️ חומרים', fields:['hazClass','adr','weight'], icon:'⚗️' },
  livestock: { label:'🐄 בעלי חיים', fields:['species','count','temp'], icon:'🐄' },
  machinery: { label:'⚙️ מכונות', fields:['dims','weight','crane','disassembly'], icon:'⚙️' },
  other:     { label:'📋 אחר', fields:['dims','weight'], icon:'📋' },
};

// STRICT vehicle matching — courier sees ONLY what their vehicle can handle
function canVehicleHandle(vehicleType, requiredVehicle) {
  // A larger vehicle can always handle smaller requirements
  const order = ['scooter', 'car', 'van', 'truck', 'heavytruck'];
  const vIdx = order.indexOf(vehicleType);
  const rIdx = order.indexOf(requiredVehicle);
  return vIdx >= rIdx;
}

// Exact vehicle match or one size up (not everyone can drive a truck)
function isGoodMatch(vehicleType, requiredVehicle) {
  const order = ['scooter', 'car', 'van', 'truck', 'heavytruck'];
  const vIdx = order.indexOf(vehicleType);
  const rIdx = order.indexOf(requiredVehicle);
  return vIdx === rIdx || vIdx === rIdx + 1; // exact match or one size bigger
}

function getRequiredVehicle(weightKg) {
  if (weightKg <= 5)    return 'scooter';
  if (weightKg <= 50)   return 'car';
  if (weightKg <= 500)  return 'van';
  if (weightKg <= 3500) return 'truck';
  return 'heavytruck';
}

function getTenderType(vehicleType) {
  if (vehicleType === 'scooter') return 'flash';
  if (vehicleType === 'car')     return 'standard';
  if (vehicleType === 'van')     return 'extended';
  return 'large';
}

function getBiddingDeadline(tenderType) {
  const spec = TENDER_SPECS[tenderType];
  const d = new Date();
  d.setMinutes(d.getMinutes() + spec.durationMin);
  return d;
}

// What equipment is required for this cargo
function getRequirements(cargoType, extraFields = {}) {
  const reqs = [];
  if (cargoType === 'steel')    reqs.push('ציוד קשירה', 'אישור הובלת מתכת');
  if (cargoType === 'chemical') reqs.push(`ADR תעודת ${extraFields.hazClass || ''}`, 'רכב מאושר חומ"ס');
  if (cargoType === 'livestock') reqs.push('רישיון הובלת בע"ח', 'רכב עם אוורור');
  if (cargoType === 'vehicle')  reqs.push('טריילר / מוביל רכבים');
  if (extraFields.crane)        reqs.push('עגורן / מנוף');
  if (extraFields.lashing)      reqs.push('ציוד קשירה מקצועי');
  if (extraFields.adr)          reqs.push('רישיון ADR');
  if (extraFields.keepWarm)     reqs.push('תיק תרמי / שמירת חום');
  if (extraFields.refrigerated) reqs.push('רכב קירור');
  return reqs;
}

module.exports = { VEHICLE_SPECS, TENDER_SPECS, CARGO_TYPES, getRequiredVehicle, getTenderType, getBiddingDeadline, canVehicleHandle, isGoodMatch, getRequirements };
