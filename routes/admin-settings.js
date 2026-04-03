const { Router } = require('express');
const { pool } = require('../db');
const { requireSession } = require('../middleware/auth');
const { sanitizeHtml } = require('../services/sanitize');

const router = Router();

const ALLOWED_SETTINGS_KEYS = ['company_presentation'];

// GET /api/admin/settings/:key — read a setting
router.get('/settings/:key', requireSession, async (req, res) => {
  try {
    if (!ALLOWED_SETTINGS_KEYS.includes(req.params.key)) {
      return res.status(400).json({ error: 'Clé de paramètre invalide.' });
    }

    const result = await pool.query(
      'SELECT value, updated_at FROM site_settings WHERE key = $1',
      [req.params.key]
    );
    if (result.rows.length === 0) {
      return res.json({ value: null });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Get setting error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// PUT /api/admin/settings/:key — update a setting
router.put('/settings/:key', requireSession, async (req, res) => {
  try {
    if (!ALLOWED_SETTINGS_KEYS.includes(req.params.key)) {
      return res.status(400).json({ error: 'Clé de paramètre invalide.' });
    }

    let { value } = req.body;
    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'La valeur est requise.' });
    }

    // Sanitize HTML content to prevent stored XSS
    value = sanitizeHtml(value);

    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [req.params.key, value]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('Update setting error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// GET /api/settings/company-presentation — public endpoint for job pages
router.get('/settings/company-presentation', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT value FROM site_settings WHERE key = 'company_presentation'"
    );
    if (result.rows.length === 0) {
      return res.json({ value: null });
    }
    return res.json({ value: result.rows[0].value });
  } catch (err) {
    console.error('Get presentation error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

module.exports = router;
