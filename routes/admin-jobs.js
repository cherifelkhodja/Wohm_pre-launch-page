const { Router } = require('express');
const { pool } = require('../db');
const { requireSession } = require('../middleware/auth');
const { generateSlug, ensureUniqueSlug } = require('../services/slug');
const { sanitizeHtml } = require('../services/sanitize');

const router = Router();

const VALID_CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Alternance'];
const VALID_REMOTE_POLICIES = ['sur_site', 'teletravail_partiel', 'teletravail_complet'];
const VALID_EXPERIENCE_LEVELS = ['Junior', 'Confirmé', 'Senior'];

function validateJobInput(body) {
  const errors = [];

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push('Le titre est requis.');
  } else if (body.title.trim().length > 255) {
    errors.push('Le titre ne doit pas dépasser 255 caractères.');
  }

  if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
    errors.push('La description est requise.');
  }

  if (!body.contract_type || !VALID_CONTRACT_TYPES.includes(body.contract_type)) {
    errors.push('Type de contrat invalide.');
  }

  if (body.remote_policy && !VALID_REMOTE_POLICIES.includes(body.remote_policy)) {
    errors.push('Politique de télétravail invalide.');
  }

  if (body.experience_level && !VALID_EXPERIENCE_LEVELS.includes(body.experience_level)) {
    errors.push("Niveau d'expérience invalide.");
  }

  if (body.location && typeof body.location === 'string' && body.location.trim().length > 255) {
    errors.push('La localisation ne doit pas dépasser 255 caractères.');
  }

  return errors;
}

// GET /api/admin/jobs — list all jobs (including archived)
router.get('/jobs', requireSession, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.*, a.prenom AS created_by_name
      FROM job_postings j
      LEFT JOIN admins a ON j.created_by = a.id
      ORDER BY j.created_at DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('List jobs error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// POST /api/admin/jobs — create job posting
router.post('/jobs', requireSession, async (req, res) => {
  try {
    const errors = validateJobInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }

    const { title, description, profile, location, remote_policy, contract_type, experience_level, skills } = req.body;

    const baseSlug = generateSlug(title.trim());
    const slug = await ensureUniqueSlug(pool, baseSlug);

    const skillsArray = Array.isArray(skills) ? skills.filter(s => typeof s === 'string' && s.trim()) : [];

    const result = await pool.query(
      `INSERT INTO job_postings (title, slug, description, profile, location, remote_policy, contract_type, experience_level, skills, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        title.trim(),
        slug,
        sanitizeHtml(description.trim()),
        profile ? sanitizeHtml(profile.trim()) : null,
        location ? location.trim() : null,
        remote_policy || null,
        contract_type,
        experience_level || null,
        skillsArray.length > 0 ? skillsArray : null,
        req.session.adminId,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create job error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// PUT /api/admin/jobs/:id — update job posting
router.put('/jobs/:id', requireSession, async (req, res) => {
  try {
    const errors = validateJobInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }

    const { title, description, profile, location, remote_policy, contract_type, experience_level, skills, slug: customSlug } = req.body;

    let slug;
    if (customSlug && typeof customSlug === 'string') {
      slug = await ensureUniqueSlug(pool, generateSlug(customSlug.trim()), req.params.id);
    } else {
      slug = await ensureUniqueSlug(pool, generateSlug(title.trim()), req.params.id);
    }

    const skillsArray = Array.isArray(skills) ? skills.filter(s => typeof s === 'string' && s.trim()) : [];

    const result = await pool.query(
      `UPDATE job_postings
       SET title = $1, slug = $2, description = $3, profile = $4, location = $5,
           remote_policy = $6, contract_type = $7, experience_level = $8, skills = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        title.trim(), slug, sanitizeHtml(description.trim()), profile ? sanitizeHtml(profile.trim()) : null,
        location ? location.trim() : null, remote_policy || null, contract_type,
        experience_level || null, skillsArray.length > 0 ? skillsArray : null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update job error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// PATCH /api/admin/jobs/:id/archive — toggle archive status
router.patch('/jobs/:id/archive', requireSession, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE job_postings SET is_archived = NOT is_archived, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Archive job error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// DELETE /api/admin/jobs/:id — hard delete
router.delete('/jobs/:id', requireSession, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM job_postings WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée.' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete job error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

module.exports = router;
