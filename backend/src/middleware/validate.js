const { body, param, query, validationResult } = require('express-validator');

// Middleware שמפעיל את כל ה-validators ומחזיר שגיאה מסודרת
exports.check = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'שגיאת קלט',
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
};

// ─── Auth ────────────────────────────────────────────────────────────────────
exports.register = [
  body('name').trim().notEmpty().withMessage('שם חובה').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('אימייל לא תקין'),
  body('password').isLength({ min: 6 }).withMessage('סיסמה חייבת להיות לפחות 6 תווים'),
  body('role').optional().isIn(['sender', 'courier']).withMessage('תפקיד לא חוקי'),
  body('phone').optional().isMobilePhone('any').withMessage('מספר טלפון לא תקין'),
];

exports.login = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('סיסמה חובה'),
];

// ─── Delivery Request ─────────────────────────────────────────────────────────
exports.createRequest = [
  body('title').trim().notEmpty().withMessage('כותרת חובה').isLength({ max: 200 }),
  body('weightKg').isFloat({ min: 0.01, max: 50000 }).withMessage('משקל לא תקין (0.01–50000 ק"ג)'),
  body('pickupAddress').trim().notEmpty().withMessage('כתובת איסוף חובה').isLength({ max: 300 }),
  body('dropoffAddress').trim().notEmpty().withMessage('כתובת מסירה חובה').isLength({ max: 300 }),
  body('cargoType').optional().isIn(['food','envelope','carton','pallet','steel','furniture','vehicle','chemical','livestock','machinery','sack','other']),
  body('tenderType').optional().isIn(['flash','standard','extended','large']),
  body('requiredVehicle').optional().isIn(['scooter','car','van','truck','heavytruck']),
  body('minBudget').optional().isFloat({ min: 0 }),
  body('maxBudget').optional().isFloat({ min: 0 }),
  body('lengthCm').optional().isFloat({ min: 0 }),
  body('widthCm').optional().isFloat({ min: 0 }),
  body('heightCm').optional().isFloat({ min: 0 }),
  body('quantity').optional().isInt({ min: 1, max: 10000 }),
  body('description').optional().isLength({ max: 1000 }),
  body('notes').optional().isLength({ max: 1000 }),
];

// ─── Bids ─────────────────────────────────────────────────────────────────────
exports.submitBid = [
  param('requestId').isUUID().withMessage('מזהה בקשה לא תקין'),
  body('price').isFloat({ min: 1, max: 1_000_000 }).withMessage('מחיר לא תקין'),
  body('estimatedMinutes').optional().isInt({ min: 1, max: 10080 }),
  body('message').optional().isLength({ max: 500 }),
];

// ─── Pagination ───────────────────────────────────────────────────────────────
exports.pagination = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];
