const { Router } = require('express');
const { pool } = require('../db');
const { createRateLimiter } = require('../middleware/rate-limiter');

const router = Router();
const subscribeLimiter = createRateLimiter(5, 60000);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSubscribeInput(body) {
  const errors = [];

  if (!body.prenom || typeof body.prenom !== 'string' || body.prenom.trim().length === 0) {
    errors.push('Le prénom est requis.');
  } else if (body.prenom.trim().length > 100) {
    errors.push('Le prénom ne doit pas dépasser 100 caractères.');
  }

  if (!body.email || typeof body.email !== 'string' || body.email.trim().length === 0) {
    errors.push("L'email est requis.");
  } else if (!EMAIL_REGEX.test(body.email.trim())) {
    errors.push("L'email n'est pas valide.");
  } else if (body.email.trim().length > 255) {
    errors.push("L'email ne doit pas dépasser 255 caractères.");
  }

  if (body.vehicule !== undefined && body.vehicule !== null) {
    if (typeof body.vehicule !== 'string') {
      errors.push('La voiture doit être une chaîne de caractères.');
    } else if (body.vehicule.trim().length > 255) {
      errors.push('La voiture ne doit pas dépasser 255 caractères.');
    }
  }

  return errors;
}

router.post('/subscribe', subscribeLimiter, async (req, res) => {
  try {
    const errors = validateSubscribeInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }

    const prenom = req.body.prenom.trim();
    const email = req.body.email.trim().toLowerCase();
    const vehicule = req.body.vehicule ? req.body.vehicule.trim() : null;
    const ip = req.ip;

    const result = await pool.query(
      `INSERT INTO subscribers (prenom, email, vehicule, ip)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [prenom, email, vehicule, ip]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ error: 'Cet email est déjà inscrit.' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue. Réessayez plus tard.' });
  }
});

module.exports = router;
