const { Router } = require('express');
const { pool } = require('../db');
const { requireSession } = require('../middleware/auth');
const { getPresignedCVUrl } = require('../services/s3');

const router = Router();

// Valid status transitions
const VALID_TRANSITIONS = {
  'new': ['contacte', 'refuse'],
  'contacte': ['entretien', 'refuse'],
  'entretien': ['valide', 'refuse'],
  'valide': [],
  'refuse': [],
};

// GET /api/admin/applications — list all applications with filters
router.get('/applications', requireSession, async (req, res) => {
  try {
    const { status, job_id } = req.query;
    const adminId = req.session.adminId;

    let where = [];
    let params = [adminId];
    let paramIdx = 2;

    if (status) {
      where.push(`a.status = $${paramIdx++}`);
      params.push(status);
    }
    if (job_id) {
      where.push(`a.job_posting_id = $${paramIdx++}`);
      params.push(job_id);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const result = await pool.query(`
      SELECT a.id, a.civilite, a.prenom, a.nom, a.email, a.telephone,
             a.poste_actuel, a.statut_pro, a.status, a.created_at,
             a.job_posting_id,
             j.title AS job_title,
             CASE WHEN av.admin_id IS NULL THEN true ELSE false END AS is_new
      FROM applications a
      LEFT JOIN job_postings j ON a.job_posting_id = j.id
      LEFT JOIN application_views av ON av.application_id = a.id AND av.admin_id = $1
      ${whereClause}
      ORDER BY a.created_at DESC
    `, params);

    return res.json(result.rows);
  } catch (err) {
    console.error('List applications error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// GET /api/admin/applications/new-count — count unseen applications
router.get('/applications/new-count', requireSession, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM applications a
      WHERE NOT EXISTS (
        SELECT 1 FROM application_views av
        WHERE av.application_id = a.id AND av.admin_id = $1
      )
    `, [req.session.adminId]);

    return res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('New count error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// GET /api/admin/applications/:id — application detail (marks as viewed)
router.get('/applications/:id', requireSession, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, j.title AS job_title, j.slug AS job_slug
      FROM applications a
      LEFT JOIN job_postings j ON a.job_posting_id = j.id
      WHERE a.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature non trouvée.' });
    }

    // Mark as viewed by this admin (upsert)
    await pool.query(`
      INSERT INTO application_views (admin_id, application_id)
      VALUES ($1, $2)
      ON CONFLICT (admin_id, application_id) DO UPDATE SET viewed_at = NOW()
    `, [req.session.adminId, req.params.id]);

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Get application error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// GET /api/admin/applications/:id/cv — presigned S3 URL for CV download
router.get('/applications/:id/cv', requireSession, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT cv_s3_key, cv_original_name FROM applications WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature non trouvée.' });
    }

    const url = await getPresignedCVUrl(result.rows[0].cv_s3_key);
    return res.json({ url, filename: result.rows[0].cv_original_name });
  } catch (err) {
    console.error('CV download error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// PATCH /api/admin/applications/:id/status — update application status
router.patch('/applications/:id/status', requireSession, async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Le statut est requis.' });
    }

    // Get current status
    const current = await pool.query('SELECT status FROM applications WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature non trouvée.' });
    }

    const currentStatus = current.rows[0].status;

    // Check valid transition
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        error: `Transition impossible de "${currentStatus}" vers "${status}".`,
      });
    }

    // Rejection requires a reason
    if (status === 'refuse') {
      if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim().length === 0) {
        return res.status(400).json({ error: 'La raison du refus est obligatoire.' });
      }
    }

    const result = await pool.query(
      `UPDATE applications
       SET status = $1, rejection_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [
        status,
        status === 'refuse' ? rejection_reason.trim() : null,
        req.params.id,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update status error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

module.exports = router;
