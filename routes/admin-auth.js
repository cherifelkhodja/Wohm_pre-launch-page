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

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;
    req.session.adminPrenom = admin.prenom;

    return res.json({
      ok: true,
      admin: { id: admin.id, email: admin.email, prenom: admin.prenom },
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
