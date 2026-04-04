const { Router } = require('express');
const { pool } = require('../db');
const { requireSession } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rate-limiter');

const router = Router();
const adminLimiter = createRateLimiter(10, 60000);

router.get('/subscribers', adminLimiter, requireSession, async (req, res) => {
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

router.get('/subscribers/count', adminLimiter, requireSession, async (req, res) => {
  try {
    const { from, to } = req.query;
    let where = [];
    let params = [];
    let paramIdx = 1;

    if (from) {
      where.push(`created_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      where.push(`created_at < ($${paramIdx++}::date + interval '1 day')`);
      params.push(to);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM subscribers ${whereClause}`, params);
    return res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Count subscribers error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// CSV helper
function csvEscape(val) {
  if (val == null) return '';
  var s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

router.get('/subscribers/export', adminLimiter, requireSession, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT prenom, email, vehicule, created_at FROM subscribers ORDER BY created_at DESC'
    );

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="subscribers-${today}.csv"`);

    // BOM for Excel compatibility
    let csv = '\uFEFF';
    csv += 'Prénom,Email,Voiture,Date d\'inscription\n';

    for (const row of result.rows) {
      csv += [
        csvEscape(row.prenom),
        csvEscape(row.email),
        csvEscape(row.vehicule),
        csvEscape(row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : ''),
      ].join(',') + '\n';
    }

    return res.send(csv);
  } catch (err) {
    console.error('Export subscribers error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

router.get('/visits', adminLimiter, requireSession, async (req, res) => {
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

router.get('/visits/count', adminLimiter, requireSession, async (req, res) => {
  try {
    const { from, to } = req.query;
    let where = [];
    let params = [];
    let paramIdx = 1;

    if (from) {
      where.push(`created_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      where.push(`created_at < ($${paramIdx++}::date + interval '1 day')`);
      params.push(to);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const total = await pool.query(`SELECT COUNT(*)::int AS count FROM visits ${whereClause}`, params);
    const unique = await pool.query(`SELECT COUNT(DISTINCT ip)::int AS count FROM visits ${whereClause}`, params);
    return res.json({ total: total.rows[0].count, unique_ips: unique.rows[0].count });
  } catch (err) {
    console.error('Count visits error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

module.exports = router;
