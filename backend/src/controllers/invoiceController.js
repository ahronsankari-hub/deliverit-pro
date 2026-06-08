const PDFDocument = require('pdfkit');
const { DeliveryRequest, User, Bid } = require('../models');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_HE = {
  open: 'פתוח',
  bidding: 'במכרז',
  assigned: 'שובץ שליח',
  in_progress: 'בדרך',
  delivered: 'נמסר',
  cancelled: 'בוטל',
};

const VEHICLE_HE = {
  scooter: 'קטנוע',
  car: 'רכב פרטי',
  van: 'ואן/מסחרי',
  truck: 'משאית קלה',
  heavytruck: 'משאית כבדה',
};

// Draw a simple horizontal rule
function hRule(doc, y, r = 0, g = 0, b = 0, opacity = 0.1) {
  doc.save().strokeColor([r, g, b], opacity).lineWidth(0.5).moveTo(50, y).lineTo(545, y).stroke().restore();
}

// Right-aligned text helper (for RTL feel in LTR doc)
function textR(doc, text, x, y, width, opts = {}) {
  doc.text(text, x, y, { width, align: 'right', ...opts });
}

// ── Generate PDF buffer ───────────────────────────────────────────────────────
async function buildPDF(req_data, sender, courier, bid) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `חשבונית DeliverIt #${req_data.id}`, Author: 'DeliverIt' } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 495; // usable width
    const ORANGE = '#FF6B35';
    const DARK   = '#0A0F1E';
    const GRAY   = '#6B7280';

    // ── Header band ──────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 90).fill(DARK);

    // Logo text
    doc.fontSize(28).font('Helvetica-Bold').fillColor(ORANGE).text('DeliverIt', 50, 28, { continued: true });
    doc.fontSize(28).fillColor('white').text(' Pro', { continued: false });
    doc.fontSize(9).fillColor('rgba(255,255,255,0.4)').font('Helvetica').text('INVOICE / חשבונית מס', 50, 62);

    // Invoice #
    doc.fontSize(11).fillColor('white').font('Helvetica-Bold');
    textR(doc, `#${String(req_data.id).padStart(6, '0')}`, 350, 30, W - 300);
    doc.fontSize(9).fillColor('rgba(255,255,255,0.5)').font('Helvetica');
    textR(doc, new Date().toLocaleDateString('he-IL'), 350, 50, W - 300);

    let y = 110;

    // ── Status badge ─────────────────────────────────────────────────────────
    const statusText = STATUS_HE[req_data.status] || req_data.status;
    const badgeColor = req_data.status === 'delivered' ? '#10B981' : req_data.status === 'cancelled' ? '#EF4444' : ORANGE;
    doc.roundedRect(50, y, 90, 22, 4).fill(badgeColor + '22');
    doc.fontSize(10).fillColor(badgeColor).font('Helvetica-Bold').text(statusText, 55, y + 6, { width: 80, align: 'center' });
    y += 36;

    // ── Two-column: Sender | Courier ──────────────────────────────────────────
    hRule(doc, y - 4);
    y += 2;

    doc.fontSize(8).fillColor(GRAY).font('Helvetica').text('FROM / שולח', 50, y);
    doc.text('TO / שליח', 320, y);
    y += 14;

    doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text(sender.name, 50, y);
    doc.text(courier ? courier.name : 'לא שובץ', 320, y);
    y += 14;

    doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(sender.email, 50, y);
    if (courier) doc.text(courier.email, 320, y);
    y += 12;
    if (sender.phone) { doc.text(sender.phone, 50, y); y += 12; }
    y += 8;
    hRule(doc, y);
    y += 16;

    // ── Delivery details ─────────────────────────────────────────────────────
    doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text('פרטי המשלוח', 50, y);
    y += 18;

    const details = [
      ['תיאור', req_data.description || '—'],
      ['מוצא', req_data.pickupAddress],
      ['יעד', req_data.dropoffAddress],
      ['משקל', `${req_data.weightKg} ק"ג`],
      ['סוג רכב נדרש', VEHICLE_HE[req_data.vehicleType] || req_data.vehicleType],
      ['קוד מעקב', req_data.trackingCode],
      ...(req_data.biddingEndsAt ? [['סיום מכרז', new Date(req_data.biddingEndsAt).toLocaleString('he-IL')]] : []),
      ...(req_data.scheduledFor   ? [['מועד מתוכנן', new Date(req_data.scheduledFor).toLocaleString('he-IL')]] : []),
    ];

    for (const [label, value] of details) {
      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(label, 50, y, { width: 120 });
      doc.fontSize(9).fillColor(DARK).font('Helvetica').text(String(value), 175, y, { width: W - 125 });
      y += 16;
    }

    y += 8;
    hRule(doc, y);
    y += 16;

    // ── Price box ────────────────────────────────────────────────────────────
    if (req_data.acceptedPrice || bid?.price) {
      const price = req_data.acceptedPrice || bid.price;
      doc.rect(50, y, W, 56).fill(ORANGE + '12');
      doc.roundedRect(50, y, W, 56, 6).stroke(ORANGE + '40');

      doc.fontSize(11).fillColor(GRAY).font('Helvetica').text('מחיר הובלה', 65, y + 10);
      doc.fontSize(10).fillColor(GRAY).text('מע"מ (0%)', 65, y + 28);
      doc.fontSize(10).fillColor(GRAY).text('סה"כ לתשלום', 65, y + 44);

      doc.fontSize(16).fillColor(ORANGE).font('Helvetica-Bold').text(`₪${Number(price).toFixed(2)}`, 450, y + 8, { width: 80, align: 'right' });
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text('₪0.00', 450, y + 28, { width: 80, align: 'right' });
      doc.fontSize(14).fillColor(DARK).font('Helvetica-Bold').text(`₪${Number(price).toFixed(2)}`, 450, y + 44, { width: 80, align: 'right' });
      y += 70;
    }

    // ── Payment status ────────────────────────────────────────────────────────
    if (req_data.paymentStatus) {
      const paid = req_data.paymentStatus === 'paid';
      doc.fontSize(10).fillColor(paid ? '#10B981' : '#F59E0B').font('Helvetica-Bold')
        .text(paid ? '✓ שולם' : '⏳ ממתין לתשלום', 50, y);
      if (req_data.stripeSessionId) {
        doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(`Stripe ID: ${req_data.stripeSessionId}`, 50, y + 14);
        y += 14;
      }
      y += 20;
    }

    y += 10;
    hRule(doc, y);
    y += 16;

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.fontSize(8).fillColor(GRAY).font('Helvetica')
      .text('DeliverIt Pro · מערכת הובלות חכמה · https://deliverit.app', 50, y, { width: W, align: 'center' })
      .text(`מסמך זה הופק אוטומטית בתאריך ${new Date().toLocaleDateString('he-IL')}`, 50, y + 14, { width: W, align: 'center' });

    doc.end();
  });
}

// ── GET /api/requests/:id/invoice ─────────────────────────────────────────────
exports.downloadInvoice = async (req, res) => {
  try {
    const request = await DeliveryRequest.findByPk(req.params.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id','name','email','phone'] },
        { model: User, as: 'assignedCourier', attributes: ['id','name','email','phone'], required: false },
      ],
    });

    if (!request) return res.status(404).json({ message: 'משלוח לא נמצא' });

    // Only sender, courier, or admin may download
    const uid = req.user.id;
    const isAdmin   = req.user.role === 'admin';
    const isSender  = request.senderId === uid;
    const isCourier = request.assignedCourierId === uid;
    if (!isAdmin && !isSender && !isCourier) {
      return res.status(403).json({ message: 'אין הרשאה' });
    }

    const bid = request.acceptedBidId
      ? await Bid.findByPk(request.acceptedBidId)
      : null;

    const pdfBuffer = await buildPDF(request, request.sender, request.assignedCourier, bid);

    const filename = `invoice_${request.trackingCode || request.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    logger.info('Invoice downloaded', { requestId: request.id, userId: uid });
  } catch (err) {
    logger.error('invoiceController.downloadInvoice', { error: err.message });
    res.status(500).json({ message: 'שגיאה ביצירת PDF' });
  }
};

// ── Called internally after delivery ─────────────────────────────────────────
exports.emailInvoice = async (requestId) => {
  try {
    const request = await DeliveryRequest.findByPk(requestId, {
      include: [
        { model: User, as: 'sender', attributes: ['id','name','email','phone'] },
        { model: User, as: 'assignedCourier', attributes: ['id','name','email','phone'], required: false },
      ],
    });
    if (!request || !request.sender?.email) return;

    const bid = request.acceptedBidId ? await Bid.findByPk(request.acceptedBidId) : null;
    const pdfBuffer = await buildPDF(request, request.sender, request.assignedCourier, bid);

    await sendEmail({
      to: request.sender.email,
      subject: `✅ חשבונית DeliverIt — משלוח #${String(request.id).padStart(6,'0')} נמסר`,
      html: `
        <div style="font-family:Arial,sans-serif;direction:rtl;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px">
          <div style="text-align:center;margin-bottom:20px">
            <h1 style="color:#FF6B35;margin:0">DeliverIt Pro</h1>
          </div>
          <h2 style="color:#0A0F1E">המשלוח נמסר! 🎉</h2>
          <p>שלום <strong>${request.sender.name}</strong>,</p>
          <p>המשלוח שלך <strong>#${String(request.id).padStart(6,'0')}</strong> נמסר בהצלחה.</p>
          ${request.acceptedPrice ? `<p>סכום ששולם: <strong style="color:#FF6B35">₪${Number(request.acceptedPrice).toFixed(2)}</strong></p>` : ''}
          <p>החשבונית המלאה מצורפת לדוא"ל זה.</p>
          <hr style="border:1px solid #e5e7eb;margin:20px 0">
          <p style="color:#9ca3af;font-size:12px">DeliverIt Pro · מערכת הובלות חכמה</p>
        </div>
      `,
      attachments: [{
        filename: `invoice_${request.trackingCode || request.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    logger.info('Invoice emailed after delivery', { requestId });
  } catch (err) {
    logger.error('emailInvoice failed', { requestId, error: err.message });
  }
};
