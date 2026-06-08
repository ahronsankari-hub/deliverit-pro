const logger = require('../utils/logger');

let pub = null, sub = null;

async function createRedisAdapter(io) {
  if (!process.env.REDIS_URL) return;
  try {
    const { createClient } = require('redis');
    const { createAdapter } = require('@socket.io/redis-adapter');
    pub = createClient({ url: process.env.REDIS_URL });
    sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    io.adapter(createAdapter(pub, sub));
    logger.info('Socket.io Redis adapter connected');
  } catch (err) {
    logger.warn('Redis unavailable — using in-memory adapter (single server only)', { error: err.message });
  }
}

async function closeRedis() {
  try {
    if (pub) await pub.quit();
    if (sub) await sub.quit();
  } catch {}
}

module.exports = { createRedisAdapter, closeRedis };
