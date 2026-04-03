const { Router } = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rate-limiter');

const router = Router();
const adminLimiter = createRateLimiter(10, 60000);

router.get('/subscribers', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, prenom, email, vehicule, created_at FROM subscribers ORDER BY created_at DESC'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('List subscribers error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

router.get('/subscribers/count', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*)::int AS count FROM subscribers');
    return res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Count subscribers error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

router.get('/visits', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ip, COUNT(*)::int AS visits, MAX(created_at) AS last_visit
      FROM visits
      GROUP BY ip
      ORDER BY visits DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('List visits error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

router.get('/visits/count', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*)::int AS count FROM visits');
    const unique = await pool.query('SELECT COUNT(DISTINCT ip)::int AS count FROM visits');
    return res.json({ total: total.rows[0].count, unique_ips: unique.rows[0].count });
  } catch (err) {
    console.error('Count visits error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

module.exports = router;
