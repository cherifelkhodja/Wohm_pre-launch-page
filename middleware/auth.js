// Bearer token auth (legacy, kept during transition)
function requireBearerAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

// Session-based auth
function requireSession(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

// Accepts either session or Bearer token (transition period)
function requireAdmin(req, res, next) {
  // Check session first
  if (req.session && req.session.adminId) {
    return next();
  }
  // Fallback to Bearer token
  const auth = req.headers.authorization;
  if (auth && auth === `Bearer ${process.env.ADMIN_TOKEN}`) {
    return next();
  }
  return res.status(401).json({ error: 'Non autorisé' });
}

module.exports = { requireBearerAdmin, requireSession, requireAdmin };
