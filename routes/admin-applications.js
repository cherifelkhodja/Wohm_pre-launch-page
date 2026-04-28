const { Router } = require('express');
const archiver = require('archiver');
const { pool } = require('../db');
const { requireSession } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rate-limiter');
const { getPresignedCVUrl, getCVStream } = require('../services/s3');

const router = Router();
const adminLimiter = createRateLimiter(10, 60000);

// Valid status transitions
const VALID_TRANSITIONS = {
  'new': ['a_contacter', 'refuse'],
  'a_contacter': ['contacte', 'refuse'],
  'contacte': ['entretien', 'refuse'],
  'entretien': ['valide', 'refuse'],
  'valide': [],
  'refuse': [],
};

// CSV helper
function csvEscape(val) {
  if (val == null) return '';
  var s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

var statutProLabels = { 'salarie': 'Salarié', 'stagiaire': 'Stagiaire', 'alternant': 'Alternant' };
var statusLabels = { 'new': 'Nouveau', 'a_contacter': 'À contacter', 'contacte': 'Contacté', 'entretien': 'Entretien', 'valide': 'Validé', 'refuse': 'Refusé' };

// GET /api/admin/applications/export — export all applications as CSV
router.get('/applications/export', adminLimiter, requireSession, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.civilite, a.prenom, a.nom, a.email, a.telephone,
             a.poste_actuel, a.statut_pro, a.salaire_actuel, a.salaire_souhaite,
             a.status, a.created_at,
             j.title AS job_title
      FROM applications a
      LEFT JOIN job_postings j ON a.job_posting_id = j.id
      ORDER BY a.created_at DESC
    `);

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="applications-${today}.csv"`);

    // BOM for Excel compatibility
    let csv = '\uFEFF';
    csv += 'Civilité,Prénom,Nom,Email,Téléphone,Poste,Statut pro,Salaire actuel,Salaire souhaité,Offre,Statut,Date\n';

    for (const row of result.rows) {
      csv += [
        csvEscape(row.civilite),
        csvEscape(row.prenom),
        csvEscape(row.nom),
        csvEscape(row.email),
        csvEscape(row.telephone),
        csvEscape(row.poste_actuel),
        csvEscape(statutProLabels[row.statut_pro] || row.statut_pro),
        csvEscape(row.salaire_actuel),
        csvEscape(row.salaire_souhaite),
        csvEscape(row.job_title || 'Candidature spontanée'),
        csvEscape(statusLabels[row.status] || row.status),
        csvEscape(row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : ''),
      ].join(',') + '\n';
    }

    return res.send(csv);
  } catch (err) {
    console.error('Export applications error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// GET /api/admin/applications — list all applications with filters
router.get('/applications', requireSession, async (req, res) => {
  try {
    const { status, job_id, spontaneous, from, to } = req.query;
    const adminId = req.session.adminId;

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    let where = [];
    let params = [adminId];
    let paramIdx = 2;

    if (status) {
      where.push(`a.status = $${paramIdx++}`);
      params.push(status);
    }
    if (spontaneous === '1') {
      where.push('a.job_posting_id IS NULL');
    } else if (job_id) {
      where.push(`a.job_posting_id = $${paramIdx++}`);
      params.push(job_id);
    }
    if (from) {
      where.push(`a.created_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      where.push(`a.created_at < ($${paramIdx++}::date + interval '1 day')`);
      params.push(to);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Fetch limit+1 to detect if more rows exist beyond the requested page
    const limitIdx = paramIdx++;
    const offsetIdx = paramIdx++;
    params.push(limit + 1, offset);

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
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, params);

    const hasMore = result.rows.length > limit;
    const items = hasMore ? result.rows.slice(0, limit) : result.rows;
    return res.json({ items: items, hasMore: hasMore, limit: limit, offset: offset });
  } catch (err) {
    console.error('List applications error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// GET /api/admin/applications/count — total applications matching optional filters
router.get('/applications/count', adminLimiter, requireSession, async (req, res) => {
  try {
    const { status, job_id, spontaneous, from, to } = req.query;

    let where = [];
    let params = [];
    let paramIdx = 1;

    if (status) {
      where.push(`status = $${paramIdx++}`);
      params.push(status);
    }
    if (spontaneous === '1') {
      where.push('job_posting_id IS NULL');
    } else if (job_id) {
      where.push(`job_posting_id = $${paramIdx++}`);
      params.push(job_id);
    }
    if (from) {
      where.push(`created_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      where.push(`created_at < ($${paramIdx++}::date + interval '1 day')`);
      params.push(to);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM applications ${whereClause}`, params);
    return res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Count applications error:', err.message);
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

// GET /api/admin/applications/:id/cv — presigned S3 URL for CV (inline or download)
router.get('/applications/:id/cv', requireSession, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT cv_s3_key, cv_original_name FROM applications WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature non trouvée.' });
    }

    const { cv_s3_key, cv_original_name } = result.rows[0];
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    const url = await getPresignedCVUrl(cv_s3_key, {
      disposition,
      filename: cv_original_name,
    });

    // Infer file type from original filename for viewer handling
    const ext = (cv_original_name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    const extension = ext ? ext[1] : null;

    return res.json({ url, filename: cv_original_name, extension });
  } catch (err) {
    console.error('CV download error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// POST /api/admin/applications/bulk-cv — stream a ZIP archive of selected CVs
router.post('/applications/bulk-cv', adminLimiter, requireSession, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'La liste des IDs est requise.' });
    }
    if (ids.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 CV par téléchargement.' });
    }

    const placeholders = ids.map(function(_, i) { return '$' + (i + 1); }).join(', ');
    const result = await pool.query(
      'SELECT id, prenom, nom, cv_s3_key, cv_original_name FROM applications WHERE id IN (' + placeholders + ')',
      ids
    );

    const rows = result.rows.filter(function(r) { return r.cv_s3_key; });
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Aucun CV disponible pour les candidatures sélectionnées.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="cvs-' + today + '.zip"');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('warning', function(err) { console.warn('Archive warning:', err.message); });
    archive.on('error', function(err) {
      console.error('Archive error:', err.message);
      try { res.end(); } catch (_) {}
    });
    archive.pipe(res);

    const usedNames = new Map();
    function uniqueName(base, ext) {
      const candidate = base + ext;
      const count = usedNames.get(candidate) || 0;
      usedNames.set(candidate, count + 1);
      return count === 0 ? candidate : base + '_' + (count + 1) + ext;
    }

    function sanitize(s) {
      return String(s || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    for (const row of rows) {
      try {
        const stream = await getCVStream(row.cv_s3_key);
        const extMatch = (row.cv_original_name || row.cv_s3_key || '').toLowerCase().match(/\.([a-z0-9]+)$/);
        const ext = extMatch ? '.' + extMatch[1] : '';
        const base = sanitize(row.prenom) + '_' + sanitize(row.nom);
        const name = uniqueName(base || ('cv_' + row.id), ext);
        archive.append(stream, { name: name });
      } catch (err) {
        console.error('Skip CV ' + row.id + ':', err.message);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('Bulk CV download error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Une erreur est survenue.' });
    }
    try { res.end(); } catch (_) {}
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

// PATCH /api/admin/applications/bulk-status — bulk update application statuses
router.patch('/applications/bulk-status', requireSession, async (req, res) => {
  try {
    const { ids, status, rejection_reason } = req.body;

    // Validate ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'La liste des IDs est requise.' });
    }

    // Validate status
    const allStatuses = Object.keys(VALID_TRANSITIONS);
    if (!status || !allStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }

    // Rejection requires a reason
    if (status === 'refuse') {
      if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim().length === 0) {
        return res.status(400).json({ error: 'La raison du refus est obligatoire.' });
      }
    }

    // Fetch all applications to validate they exist and transitions are allowed
    const placeholders = ids.map(function(_, i) { return '$' + (i + 1); }).join(', ');
    const result = await pool.query(
      'SELECT id, status, email, prenom FROM applications WHERE id IN (' + placeholders + ')',
      ids
    );

    if (result.rows.length !== ids.length) {
      var foundIds = result.rows.map(function(r) { return r.id; });
      var missing = ids.filter(function(id) { return !foundIds.includes(id); });
      return res.status(404).json({ error: 'Candidature(s) non trouvée(s) : ' + missing.join(', ') });
    }

    // Check all transitions are valid
    var invalidTransitions = [];
    result.rows.forEach(function(app) {
      var allowed = VALID_TRANSITIONS[app.status];
      if (!allowed || !allowed.includes(status)) {
        invalidTransitions.push(app.id);
      }
    });

    if (invalidTransitions.length > 0) {
      return res.status(400).json({
        error: 'Transition impossible pour ' + invalidTransitions.length + ' candidature(s). Vérifiez que le statut actuel permet cette transition.',
      });
    }

    // Perform bulk update
    const updatePlaceholders = ids.map(function(_, i) { return '$' + (i + 3); }).join(', ');
    await pool.query(
      'UPDATE applications SET status = $1, rejection_reason = $2, updated_at = NOW() WHERE id IN (' + updatePlaceholders + ')',
      [status, status === 'refuse' ? rejection_reason.trim() : null].concat(ids)
    );

    return res.json({ updated: ids.length });
  } catch (err) {
    console.error('Bulk status update error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// GET /api/admin/applications/:id/notes — list notes for an application
router.get('/applications/:id/notes', requireSession, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, a.prenom AS admin_name
      FROM application_notes n
      LEFT JOIN admins a ON n.admin_id = a.id
      WHERE n.application_id = $1
      ORDER BY n.created_at DESC
    `, [req.params.id]);

    return res.json(result.rows);
  } catch (err) {
    console.error('List notes error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// POST /api/admin/applications/:id/notes — create a note
router.post('/applications/:id/notes', requireSession, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Le contenu de la note est requis.' });
    }

    const result = await pool.query(`
      INSERT INTO application_notes (application_id, admin_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.params.id, req.session.adminId, content.trim()]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create note error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

module.exports = router;
