/**
 * AI utilities — ניתוח חבילות ותמחור חכם
 * משתמש ב-Claude API (Anthropic)
 * אם ANTHROPIC_API_KEY לא מוגדר — מחזיר null ו-fallback נעשה בצד הקליינט
 */

const logger = require('./logger');

let _client = null;

function getAI() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (_client) return _client;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return _client;
  } catch (e) {
    logger.warn('Anthropic SDK load failed', { error: e.message });
    return null;
  }
}

// מיפוי: סוג מטען → סוג רכב מומלץ
const VEHICLE_MAP = {
  envelope:   'flash',
  small:      'flash',
  food:       'standard',
  carton:     'standard',
  sack:       'standard',
  pallet:     'extended',
  furniture:  'extended',
  appliance:  'large',
  machinery:  'large',
  vehicle:    'large',
  chemical:   'extended',
  hazardous:  'extended',
  livestock:  'extended',
  steel:      'large',
};

/**
 * analyzePackageImages
 * מקבל מערך של URLs לתמונות, מחזיר ניתוח AI של החבילה
 *
 * @param {string[]} imageUrls
 * @returns {Promise<{
 *   cargoType: string,
 *   estimatedWeightKg: number,
 *   estimatedLengthCm: number,
 *   estimatedWidthCm: number,
 *   estimatedHeightCm: number,
 *   recommendedVehicle: string,
 *   isFragile: boolean,
 *   isHazardous: boolean,
 *   description: string,
 *   confidence: 'high'|'medium'|'low',
 *   aiSummary: string,
 * } | null>}
 */
exports.analyzePackageImages = async (imageUrls) => {
  const ai = getAI();
  if (!ai || !imageUrls?.length) return null;

  try {
    // בנה content עם התמונות
    const imageContent = imageUrls.slice(0, 4).map(url => ({
      type: 'image',
      source: { type: 'url', url },
    }));

    const response = await ai.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `אתה מומחה לוגיסטיקה ומשלוחים. נתח את התמונות האלה של חבילה/מוצר לשליחה.
החזר JSON בדיוק בפורמט הזה (ללא טקסט נוסף):
{
  "cargoType": "envelope|food|carton|pallet|steel|furniture|vehicle|chemical|livestock|machinery|sack|other",
  "estimatedWeightKg": <מספר>,
  "estimatedLengthCm": <מספר>,
  "estimatedWidthCm": <מספר>,
  "estimatedHeightCm": <מספר>,
  "recommendedVehicle": "flash|standard|extended|large|extra",
  "isFragile": <true|false>,
  "isHazardous": <false>,
  "description": "<תיאור קצר בעברית של המוצר>",
  "confidence": "high|medium|low",
  "aiSummary": "<משפט קצר בעברית: מה זה, גודל משוער, לאיזה שליח מתאים>"
}

כללים:
- flash = עד 5 ק"ג, מעטפות/קטן
- standard = עד 50 ק"ג, קרטונים/בינוניים
- extended = עד 300 ק"ג, ריהוט/מכשירים
- large = מעל 300 ק"ג או משאיות`,
          },
        ],
      }],
    });

    const text = response.content[0]?.text?.trim() || '';
    // extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const result = JSON.parse(jsonMatch[0]);

    // וודא recommendedVehicle מבוסס על cargoType אם לא הגיע
    if (!result.recommendedVehicle) {
      result.recommendedVehicle = VEHICLE_MAP[result.cargoType] || 'standard';
    }

    logger.info('AI package analysis complete', { cargoType: result.cargoType, vehicle: result.recommendedVehicle });
    return result;

  } catch (err) {
    logger.warn('AI package analysis failed', { error: err.message });
    return null;
  }
};

/**
 * suggestPrice
 * מחשב מחיר מוצע לאיסוף ומשלוח לפי פרמטרים של הבקשה
 *
 * @param {{
 *   weightKg: number,
 *   cargoType: string,
 *   requiredVehicle: string,
 *   pickupAddress: string,
 *   dropoffAddress: string,
 *   isFragile: boolean,
 *   isUrgent: boolean,
 *   isHazardous: boolean,
 * }} params
 * @returns {Promise<{minPrice: number, maxPrice: number, suggestedPrice: number, explanation: string} | null>}
 */
exports.suggestPrice = async (params) => {
  const ai = getAI();
  if (!ai) return fallbackPrice(params);

  try {
    const response = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `אתה מומחה תמחור שילוח בישראל.
פרטי המשלוח:
- משקל: ${params.weightKg} ק"ג
- סוג מטען: ${params.cargoType}
- רכב נדרש: ${params.requiredVehicle}
- מקור: ${params.pickupAddress}
- יעד: ${params.dropoffAddress}
- שביר: ${params.isFragile ? 'כן' : 'לא'}
- דחוף: ${params.isUrgent ? 'כן' : 'לא'}
- מסוכן: ${params.isHazardous ? 'כן' : 'לא'}

החזר JSON בדיוק (ללא טקסט נוסף):
{
  "minPrice": <מספר שלם בשקלים>,
  "maxPrice": <מספר שלם בשקלים>,
  "suggestedPrice": <מספר שלם בשקלים — ממוצע הגיוני>,
  "explanation": "<משפט קצר בעברית למה המחיר הזה>"
}`,
      }],
    });

    const text = response.content[0]?.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    const result = JSON.parse(jsonMatch[0]);
    logger.info('AI price suggestion', result);
    return result;

  } catch (err) {
    logger.warn('AI price suggestion failed', { error: err.message });
    return fallbackPrice(params);
  }
};

// fallback pricing כשאין AI
function fallbackPrice(params) {
  const base = { flash: 40, standard: 80, extended: 200, large: 500, extra: 1000 };
  const b = base[params.requiredVehicle] || 80;
  const urgentMult = params.isUrgent ? 1.5 : 1;
  const fragMult = params.isFragile ? 1.2 : 1;
  const hazMult = params.isHazardous ? 1.4 : 1;
  const suggested = Math.round(b * urgentMult * fragMult * hazMult);
  return {
    minPrice: Math.round(suggested * 0.7),
    maxPrice: Math.round(suggested * 1.5),
    suggestedPrice: suggested,
    explanation: 'מחיר משוער לפי סוג רכב ומשקל',
  };
}
