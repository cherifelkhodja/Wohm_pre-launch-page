const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

// GET /api/jobs — list active (non-archived) job postings
router.get('/jobs', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const [result, countResult] = await Promise.all([
      pool.query(`
        SELECT id, title, slug, description, profile, location, remote_policy,
               contract_type, experience_level, skills, created_at
        FROM job_postings
        WHERE is_archived = false
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*)::int AS total FROM job_postings WHERE is_archived = false'),
    ]);
    res.set('X-Total-Count', String(countResult.rows[0].total));
    return res.json(result.rows);
  } catch (err) {
    console.error('List public jobs error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// GET /api/jobs/:slug — single job posting by slug
router.get('/jobs/:slug', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, slug, description, profile, location, remote_policy,
             contract_type, experience_level, skills, created_at
      FROM job_postings
      WHERE slug = $1 AND is_archived = false
    `, [req.params.slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée.' });
    }

    // Track unique view by IP
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || null;
    pool.query(
      `INSERT INTO job_views (job_posting_id, ip, user_agent)
       VALUES ($1, $2, $3)
       ON CONFLICT (job_posting_id, ip) DO NOTHING`,
      [result.rows[0].id, ip, userAgent]
    ).catch(err => console.error('Job view tracking error:', err.message));

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Get public job error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

module.exports = router;
