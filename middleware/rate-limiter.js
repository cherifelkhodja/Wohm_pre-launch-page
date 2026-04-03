function createRateLimiter(maxRequests, windowMs) {
  const requests = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests) {
      if (now > data.resetTime) {
        requests.delete(ip);
      }
    }
  }, 60000);

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({ error: 'Trop de requêtes. Réessayez plus tard.' });
    }

    record.count++;
    return next();
  };
}

module.exports = { createRateLimiter };
