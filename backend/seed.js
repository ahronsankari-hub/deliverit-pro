require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, VehicleProfile, DeliveryRequest, Bid } = require('./src/models');
const { getRequiredVehicle, getTenderType, getBiddingDeadline } = require('./src/utils/tender');

const h = (p) => bcrypt.hash(p, 10);

async function seed() {
  await sequelize.sync({ force: true });

  // ── Admin ────────────────────────────────────────────────────────────────────
  await User.create({ name: 'מנהל מערכת', email: 'admin@deliverit.com', password: await h('admin123'), role: 'admin', phone: '052-0000000' });

  // ── Senders ─────────────────────────────────────────────────────────────────
  const s1 = await User.create({ name: 'אהרון סנקרי', email: 'demo@deliverit.com', password: await h('demo1234'), role: 'sender', phone: '052-5879723', companyName: 'Demo Corp' });
  const s2 = await User.create({ name: 'חברת ABC', email: 'abc@company.com', password: await h('abc1234'), role: 'sender', phone: '03-1234567', companyName: 'ABC בע"מ' });

  // ── Couriers ─────────────────────────────────────────────────────────────────
  const couriers = [
    { name: 'יוסי כהן',    email: 'yosi@courier.com',       phone:'050-1111111', v:{ vehicleType:'scooter',    maxWeightKg:5,    licensePlate:'אא-1234', city:'תל אביב' } },
    { name: 'מוחמד עלי',   email: 'mohammad@courier.com',   phone:'050-2222222', v:{ vehicleType:'scooter',    maxWeightKg:5,    licensePlate:'בב-5678', city:'בת ים' } },
    { name: 'שרה לוי',     email: 'sara@courier.com',       phone:'050-3333333', v:{ vehicleType:'car',        maxWeightKg:50,   licensePlate:'גג-9012', city:'חולון' } },
    { name: 'דוד גולן',    email: 'david@courier.com',      phone:'050-4444444', v:{ vehicleType:'car',        maxWeightKg:50,   licensePlate:'דד-3456', city:'תל אביב' } },
    { name: 'אחמד חסן',    email: 'ahmad@courier.com',      phone:'050-5555555', v:{ vehicleType:'van',        maxWeightKg:500,  licensePlate:'הה-7890', city:'רמת גן' } },
    { name: 'רוני כץ',     email: 'roni@courier.com',       phone:'050-6666666', v:{ vehicleType:'van',        maxWeightKg:500,  licensePlate:'וו-1234', city:'פ"ת' } },
    { name: 'משה גולד',    email: 'moshe@courier.com',      phone:'050-7777777', v:{ vehicleType:'truck',      maxWeightKg:3500, licensePlate:'זז-5678', city:'אשדוד' } },
    { name: 'ג\'ורג מיכאל', email: 'george@courier.com',   phone:'050-8888888', v:{ vehicleType:'truck',      maxWeightKg:3500, licensePlate:'חח-9012', city:'חיפה' } },
    { name: 'אברהם פריד',  email: 'avraham@courier.com',   phone:'050-9999999', v:{ vehicleType:'heavytruck', maxWeightKg:20000,licensePlate:'טט-3456', city:'נתב"ג' } },
  ];
  const courierUsers = [];
  for (const c of couriers) {
    const u = await User.create({ name:c.name, email:c.email, phone:c.phone, password:await h('courier123'), role:'courier', avgRating:+(4+Math.random()).toFixed(1), totalJobs:Math.floor(Math.random()*200)+10 });
    await VehicleProfile.create({ courierId:u.id, isOnline:true, currentLat:32.01+Math.random()*0.1, currentLng:34.76+Math.random()*0.1, ...c.v });
    courierUsers.push(u);
  }

  // ── Delivery Requests — realistic examples ────────────────────────────────────
  const requests = [

    // ⚡ SCOOTER — Flash tenders
    {
      title: '3 שקיות אוכל ממסעדה',
      cargoType: 'food',
      weightKg: 2.5,
      cargoDetails: { bagCount: 3, keepWarm: true, restaurantName: 'בורגר בר' },
      keepWarm: true, isUrgent: true,
      pickupAddress: 'רחוב הרצל 10, תל אביב', pickupLat:32.069, pickupLng:34.775,
      dropoffAddress: 'שדרות רוטשילד 30, תל אביב', dropoffLat:32.063, dropoffLng:34.773,
      senderId: s1.id, minBudget:18, maxBudget:35,
    },
    {
      title: 'מסמכים חוזה + 2 מעטפות',
      cargoType: 'envelope',
      weightKg: 0.3,
      cargoDetails: { quantity: 3, urgent: true, type: 'חוזה עסקי' },
      isUrgent: true,
      pickupAddress: 'רחוב ויצמן 5, ת"א', pickupLat:32.081, pickupLng:34.811,
      dropoffAddress: 'רחוב ז\'בוטינסקי 2, ר"ג', dropoffLat:32.082, dropoffLng:34.810,
      senderId: s2.id, minBudget:15, maxBudget:28,
    },

    // 📦 CAR — Standard tenders
    {
      title: '5 קרטונים — ציוד משרדי',
      cargoType: 'carton',
      weightKg: 35,
      lengthCm: 60, widthCm: 40, heightCm: 40,
      cargoDetails: { quantity: 5, dimensions: '60×40×40 ס"מ', volumeLiters: 96, stackable: true, material: 'ציוד משרדי' },
      pickupAddress: 'הרמה 20, גבעתיים', pickupLat:32.074, pickupLng:34.811,
      dropoffAddress: 'יגאל אלון 90, תל אביב', dropoffLat:32.073, dropoffLng:34.793,
      senderId: s1.id, minBudget:60, maxBudget:120,
    },
    {
      title: '2 שקים — בגדים',
      cargoType: 'sack',
      weightKg: 20,
      cargoDetails: { bagCount: 2, material: 'בגדים יד שנייה', weightPerBag: 10 },
      pickupAddress: 'דרך מנחם בגין 30, ת"א', pickupLat:32.058, pickupLng:34.789,
      dropoffAddress: 'רחוב ביאליק 5, רמת השרון', dropoffLat:32.149, dropoffLng:34.840,
      senderId: s2.id, minBudget:50, maxBudget:90,
    },

    // 🚐 VAN — Extended tenders
    {
      title: '3 משטחים ישראלים — אריחים',
      cargoType: 'pallet',
      weightKg: 280,
      lengthCm: 120, widthCm: 100, heightCm: 140,
      cargoDetails: {
        palletCount: 3,
        palletType: 'ישראלי 100×120',
        palletDims: '120×100×140 ס"מ',
        material: 'אריחי קרמיקה',
        stackable: false,
        volumeCbm: 5.04,
      },
      isFragile: true,
      pickupAddress: 'אזה"ת שפירים, רחובות', pickupLat:31.885, pickupLng:34.820,
      dropoffAddress: 'בן גוריון 50, אשקלון', dropoffLat:31.669, dropoffLng:34.571,
      senderId: s1.id, minBudget:280, maxBudget:500,
    },
    {
      title: 'ספה + שולחן — ריהוט משומש',
      cargoType: 'furniture',
      weightKg: 95,
      lengthCm: 220, widthCm: 90, heightCm: 85,
      cargoDetails: { items: ['ספה תלת מושבית', 'שולחן סלון'], assembly: false, floors: 3, elevator: true },
      pickupAddress: 'אייקאה ראשל"צ', pickupLat:31.981, pickupLng:34.800,
      dropoffAddress: 'הרצל 44, בת ים', dropoffLat:32.011, dropoffLng:34.751,
      senderId: s2.id, minBudget:200, maxBudget:380,
    },

    // 🚛 TRUCK — Large tenders
    {
      title: '8 טון — פרופילי פלדה U200',
      cargoType: 'steel',
      weightKg: 8000,
      lengthCm: 1200, widthCm: 240, heightCm: 40,
      cargoDetails: {
        steelType: 'פרופיל U200',
        quantity: 40,
        unitWeight: 200,
        dims: '12 מטר אורך, U200',
        lashingPoints: 8,
        requiresStraps: true,
        deliveryCondition: 'חומר יבש בלבד',
        unloadingEquipment: 'מלגזה נדרשת',
      },
      requiresCrane: false,
      requiresLashing: true,
      pickupAddress: 'מפעל הפלדה, מפרץ חיפה', pickupLat:32.790, pickupLng:34.989,
      dropoffAddress: 'אתר בנייה, ראשל"צ', dropoffLat:31.972, dropoffLng:34.799,
      senderId: s2.id, minBudget:1800, maxBudget:3200,
    },
    {
      title: '15 משטחים אירופאיים — חומרי בנייה',
      cargoType: 'pallet',
      weightKg: 3000,
      lengthCm: 120, widthCm: 80, heightCm: 160,
      cargoDetails: {
        palletCount: 15,
        palletType: 'אירופאי 80×120',
        material: 'שקי מלט + לבנים',
        totalVolumeCbm: 23,
        stackable: false,
        unloadingEquipment: 'מלגזה נדרשת',
      },
      pickupAddress: 'מחסן נגב, אשדוד', pickupLat:31.806, pickupLng:34.649,
      dropoffAddress: 'פרויקט בנייה, נתניה', dropoffLat:32.329, dropoffLng:34.867,
      senderId: s1.id, minBudget:1200, maxBudget:2200,
    },

    // 🚚 HEAVY TRUCK
    {
      title: 'מכונת CNC — 18 טון',
      cargoType: 'machinery',
      weightKg: 18000,
      lengthCm: 480, widthCm: 220, heightCm: 260,
      cargoDetails: {
        machineType: 'מכונת CNC תעשייתית',
        manufacturer: 'Haas',
        requiresCrane: true,
        craneCapacityTon: 25,
        requiresDisassembly: false,
        specialPermit: 'משא כבד — נדרש אישור',
        securityEscort: false,
      },
      requiresCrane: true,
      pickupAddress: 'מפעל תכ"א, קריית גת', pickupLat:31.607, pickupLng:34.772,
      dropoffAddress: 'פארק תעשייה, מגדל העמק', pickupLat:32.676, pickupLng:35.240,
      senderId: s2.id, minBudget:5000, maxBudget:9500,
    },
  ];

  const created = [];
  for (const rData of requests) {
    const vehicle = getRequiredVehicle(rData.weightKg);
    const tenderType = getTenderType(vehicle);
    const endsAt = getBiddingDeadline(tenderType);
    const req = await DeliveryRequest.create({
      ...rData,
      requiredVehicle: vehicle,
      tenderType,
      biddingEndsAt: endsAt,
      status: 'open',
      trackingCode: 'DL-' + Math.random().toString(36).slice(-6).toUpperCase(),
    });
    created.push(req);
  }

  // ── Bids — only on matching vehicle tenders ───────────────────────────────
  // Scooter couriers bid on scooter tenders
  const scooterReqs = created.filter(r => r.requiredVehicle === 'scooter');
  const carReqs     = created.filter(r => r.requiredVehicle === 'car');
  const vanReqs     = created.filter(r => r.requiredVehicle === 'van');
  const truckReqs   = created.filter(r => r.requiredVehicle === 'truck');

  const [yosi, moh, sara, david, ahmad, roni, moshe, george] = courierUsers;

  for (const req of scooterReqs) {
    await Bid.create({ requestId:req.id, courierId:yosi.id, price:Math.round(req.maxBudget * 0.7), estimatedMinutes:12, vehicleType:'scooter', courierRating:yosi.avgRating, status:'pending' });
    await Bid.create({ requestId:req.id, courierId:moh.id,  price:Math.round(req.maxBudget * 0.85), estimatedMinutes:18, vehicleType:'scooter', courierRating:moh.avgRating, status:'pending', message:'מגיע תוך 20 דקות' });
    await req.update({ status:'bidding' });
  }
  for (const req of carReqs) {
    await Bid.create({ requestId:req.id, courierId:sara.id,  price:Math.round(req.maxBudget * 0.75), estimatedMinutes:35, vehicleType:'car', courierRating:sara.avgRating, status:'pending' });
    await Bid.create({ requestId:req.id, courierId:david.id, price:Math.round(req.maxBudget * 0.9), estimatedMinutes:28, vehicleType:'car', courierRating:david.avgRating, status:'pending', message:'רכב נקי, יוצא מיד' });
    await req.update({ status:'bidding' });
  }
  for (const req of vanReqs) {
    await Bid.create({ requestId:req.id, courierId:ahmad.id, price:Math.round(req.maxBudget * 0.65), estimatedMinutes:60, vehicleType:'van', courierRating:ahmad.avgRating, status:'pending', message:'ואן 9 מ"ק, ניסיון בריהוט' });
    await Bid.create({ requestId:req.id, courierId:roni.id,  price:Math.round(req.maxBudget * 0.8), estimatedMinutes:45, vehicleType:'van', courierRating:roni.avgRating, status:'pending' });
    await req.update({ status:'bidding' });
  }
  for (const req of truckReqs) {
    await Bid.create({ requestId:req.id, courierId:moshe.id,  price:Math.round(req.maxBudget * 0.7), estimatedMinutes:120, vehicleType:'truck', courierRating:moshe.avgRating, status:'pending', message:'משאית 12 טון, ציוד קשירה' });
    await Bid.create({ requestId:req.id, courierId:george.id, price:Math.round(req.maxBudget * 0.8), estimatedMinutes:90,  vehicleType:'truck', courierRating:george.avgRating, status:'pending' });
    await req.update({ status:'bidding' });
  }

  console.log(`\n✅ DeliverIt Pro — Seed מוכן!\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 שולח:     demo@deliverit.com  / demo1234');
  console.log('🛵 שליח קטנוע: yosi@courier.com   / courier123  (רק flash!)');
  console.log('🚗 שליח רכב:   sara@courier.com   / courier123  (רק standard!)');
  console.log('🚐 שליח ואן:   ahmad@courier.com  / courier123  (רק extended!)');
  console.log('🚛 שליח משאית: moshe@courier.com  / courier123  (רק large!)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}
seed().catch(console.error);
