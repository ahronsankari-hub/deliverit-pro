const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { DeliveryRequest } = require('../models');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `proof_${req.params.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('קובץ חייב להיות תמונה (jpg/png/webp)'));
  },
});

exports.uploadMiddleware = upload.single('photo');

exports.uploadProof = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'לא נשלחה תמונה' });

    const request = await DeliveryRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'משלוח לא נמצא' });
    if (request.assignedCourierId !== req.user.id)
      return res.status(403).json({ message: 'רק השליח המוקצה יכול להעלות הוכחה' });

    const url = `/uploads/${req.file.filename}`;
    await request.update({ proofPhotoUrl: url, status: 'delivered', actualDeliveryAt: new Date() });
    await require('../models').User.increment('totalJobs', { where: { id: req.user.id } });

    req.io?.emit('request:status', { id: request.id, status: 'delivered', senderId: request.senderId });
    res.json({ url, message: 'המסירה אושרה בהצלחה' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
