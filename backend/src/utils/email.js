const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || 'DeliverIt <noreply@deliverit.co.il>';

async function send(to, subject, html, attachments = []) {
  if (!process.env.SMTP_USER) return; // email disabled in dev
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, attachments });
    logger.info('Email sent', { to, subject });
  } catch (err) {
    logger.error('Email failed', { to, subject, error: err.message });
  }
}

// Public generic send (used by invoiceController)
exports.sendEmail = ({ to, subject, html, attachments }) => send(to, subject, html, attachments);

exports.bidReceived = (senderEmail, senderName, requestTitle, price) =>
  send(senderEmail, `הצעה חדשה על "${requestTitle}"`,
    `<div dir="rtl" style="font-family:sans-serif"><h2>שלום ${senderName},</h2>
     <p>קיבלת הצעה חדשה של <strong>₪${price}</strong> על המשלוח <strong>${requestTitle}</strong>.</p>
     <p>היכנס ל-DeliverIt לצפייה בכל ההצעות.</p></div>`);

exports.bidAccepted = (courierEmail, courierName, requestTitle, price) =>
  send(courierEmail, `ההצעה שלך התקבלה!`,
    `<div dir="rtl" style="font-family:sans-serif"><h2>מזל טוב ${courierName}!</h2>
     <p>ההצעה שלך של <strong>₪${price}</strong> על <strong>${requestTitle}</strong> התקבלה.</p>
     <p>היכנס ל-DeliverIt לפרטי המשלוח.</p></div>`);

exports.tenderClosed = (senderEmail, senderName, requestTitle, price) =>
  send(senderEmail, `מכרז "${requestTitle}" נסגר`,
    `<div dir="rtl" style="font-family:sans-serif"><h2>שלום ${senderName},</h2>
     <p>המכרז <strong>${requestTitle}</strong> נסגר והוקצה שליח במחיר <strong>₪${price}</strong>.</p></div>`);

exports.statusUpdate = (recipientEmail, name, requestTitle, status) => {
  const msgs = { picked_up: 'החבילה נאספה 📦', in_transit: 'החבילה בדרך אליך 🚀', delivered: 'החבילה נמסרה בהצלחה ✅' };
  const msg = msgs[status];
  if (!msg) return;
  send(recipientEmail, `עדכון משלוח: ${requestTitle}`,
    `<div dir="rtl" style="font-family:sans-serif"><h2>שלום ${name},</h2><p>${msg}</p><p>משלוח: <strong>${requestTitle}</strong></p></div>`);
};
