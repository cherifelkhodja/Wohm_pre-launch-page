const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireSession } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rate-limiter');

const router = Router();
const loginLimiter = createRateLimiter(5, 60000);

// POST /api/admin/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const result = await pool.query(
      'SELECT id, email, prenom, password_hash FROM admins WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    // Always run bcrypt.compare to prevent timing-based user enumeration
    const DUMMY_HASH = '$2a$12$000000000000000000000uGqF.2y6bH0d4LeJkj36FqHD3I1TfJSq';
    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);

    if (!admin || !valid) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    // Regenerate session to prevent session fixation
    const adminData = { id: admin.id, email: admin.email, prenom: admin.prenom };
    return new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regenerate error:', err.message);
          return resolve(res.status(500).json({ error: 'Une erreur est survenue.' }));
        }
        req.session.adminId = adminData.id;
        req.session.adminEmail = adminData.email;
        req.session.adminPrenom = adminData.prenom;
        return resolve(res.json({ ok: true, admin: adminData }));
      });
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err.message);
      return res.status(500).json({ error: 'Erreur lors de la déconnexion.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ ok: true });
  });
});

// GET /api/admin/me
router.get('/me', requireSession, (req, res) => {
  return res.json({
    id: req.session.adminId,
    email: req.session.adminEmail,
    prenom: req.session.adminPrenom,
  });
});

module.exports = router;
