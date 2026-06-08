const webpush = require('web-push');
const logger  = require('./logger');

if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:admin@deliverit.co.il',
    process.env.VAPID_PUBLIC,
    process.env.VAPID_PRIVATE
  );
}

// In-memory store (replace with DB/Redis in production)
const subscriptions = new Map(); // userId → subscription

exports.subscribe = (userId, subscription) => {
  subscriptions.set(userId, subscription);
};

exports.unsubscribe = (userId) => {
  subscriptions.delete(userId);
};

exports.push = async (userId, payload) => {
  if (!process.env.VAPID_PUBLIC) return;
  const sub = subscriptions.get(userId);
  if (!sub) return;
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410) subscriptions.delete(userId); // expired
    else logger.warn('Web push failed', { userId, error: err.message });
  }
};

// Generate VAPID keys (run once, copy to .env):
// node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k)"
