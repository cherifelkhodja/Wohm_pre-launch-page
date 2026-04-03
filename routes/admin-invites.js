const { Router } = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireSession } = require('../middleware/auth');
const { sendAdminInvite } = require('../services/email');

const router = Router();
const BCRYPT_ROUNDS = 12;
const INVITE_EXPIRY_HOURS = 48;

// POST /api/admin/invites — send invitation to new admin
router.post('/invites', requireSession, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "L'email est requis." });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if admin already exists
    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [trimmedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Cet admin existe déjà.' });
    }

    // Check for pending invite
    const pending = await pool.query(
      'SELECT id FROM admin_invites WHERE email = $1 AND accepted_at IS NULL AND expires_at > NOW()',
      [trimmedEmail]
    );
    if (pending.rows.length > 0) {
      return res.status(409).json({ error: 'Une invitation est déjà en cours pour cet email.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO admin_invites (email, token, invited_by, expires_at) VALUES ($1, $2, $3, $4)',
      [trimmedEmail, token, req.session.adminId, expiresAt]
    );

    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://wohm.fr' : `http://localhost:${process.env.PORT || 3000}`;
    const inviteUrl = `${baseUrl}/admin/setup.html?token=${token}`;

    await sendAdminInvite(trimmedEmail, inviteUrl, req.session.adminPrenom);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Invite error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// GET /api/admin/setup/:token — validate invitation token
router.get('/setup/:token', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email FROM admin_invites WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()',
      [req.params.token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation invalide ou expirée.' });
    }

    return res.json({ email: result.rows[0].email });
  } catch (err) {
    console.error('Setup validate error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// POST /api/admin/setup/:token — accept invite and create account
router.post('/setup/:token', async (req, res) => {
  try {
    const { prenom, password } = req.body;

    if (!prenom || !password) {
      return res.status(400).json({ error: 'Prénom et mot de passe requis.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    const invite = await pool.query(
      'SELECT id, email, invited_by FROM admin_invites WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()',
      [req.params.token]
    );

    if (invite.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation invalide ou expirée.' });
    }

    const { email, invited_by } = invite.rows[0];

    // Check if admin already exists (race condition guard)
    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ce compte existe déjà.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const admin = await pool.query(
      'INSERT INTO admins (email, password_hash, prenom) VALUES ($1, $2, $3) RETURNING id, email, prenom',
      [email, passwordHash, prenom.trim()]
    );

    // Mark invitation as accepted
    await pool.query('UPDATE admin_invites SET accepted_at = NOW() WHERE token = $1', [req.params.token]);

    // Auto-login the new admin
    req.session.adminId = admin.rows[0].id;
    req.session.adminEmail = admin.rows[0].email;
    req.session.adminPrenom = admin.rows[0].prenom;

    return res.json({ ok: true, admin: admin.rows[0] });
  } catch (err) {
    console.error('Setup accept error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

module.exports = router;
