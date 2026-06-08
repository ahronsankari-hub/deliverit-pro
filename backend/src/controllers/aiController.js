const { analyzePackageImages, suggestPrice } = require('../utils/ai');

/**
 * POST /api/ai/analyze
 * Body: { imageUrls: string[] }
 * מנתח תמונות של חבילה ומחזיר המלצות
 */
exports.analyze = async (req, res) => {
  try {
    const { imageUrls } = req.body;
    if (!imageUrls?.length) {
      return res.status(400).json({ message: 'נדרשות תמונות' });
    }

    const result = await analyzePackageImages(imageUrls);
    if (!result) {
      return res.status(503).json({
        message: 'AI לא זמין כרגע',
        fallback: true,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/ai/suggest-price
 * Body: { weightKg, cargoType, requiredVehicle, pickupAddress, dropoffAddress, isFragile, isUrgent, isHazardous }
 * מחזיר הצעת מחיר AI
 */
exports.suggestPriceHandler = async (req, res) => {
  try {
    const params = req.body;
    if (!params.weightKg || !params.requiredVehicle) {
      return res.status(400).json({ message: 'חסרים פרמטרים' });
    }

    const result = await suggestPrice(params);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
