// Session-based auth
function requireSession(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

module.exports = { requireSession };
