const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { pool, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Railway reverse proxy
app.set('trust proxy', true);

// --- Security Headers (helmet) ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xXssProtection: false, // Modern: disabled, CSP takes over
}));

// --- CORS ---
app.use(cors({
  origin: ['https://wohm.fr', 'https://www.wohm.fr'],
  methods: ['GET', 'POST'],
}));

// --- Body parser ---
app.use(express.json({ limit: '1kb' }));

// --- Block directory access ---
app.use((req, res, next) => {
  if (req.path !== '/' && req.path.endsWith('/')) {
    return res.status(403).json({ error: 'Accès interdit' });
  }
  next();
});

// --- Track page visits by IP ---
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path === '/') {
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || null;
    pool.query(
      'INSERT INTO visits (ip, path, user_agent) VALUES ($1, $2, $3)',
      [ip, '/', userAgent]
    ).catch(err => console.error('Visit tracking error:', err.message));
  }
  next();
});

// --- Static files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Rate Limiter (in-memory) ---
function createRateLimiter(maxRequests, windowMs) {
  const requests = new Map();

  // Clean up expired entries every 60s
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests) {
      if (now > data.resetTime) {
        requests.delete(ip);
      }
    }
  }, 60000);

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({ error: 'Trop de requêtes. Réessayez plus tard.' });
    }

    record.count++;
    return next();
  };
}

const subscribeLimiter = createRateLimiter(5, 60000);   // 5 req/min/IP
const adminLimiter = createRateLimiter(10, 60000);       // 10 req/min/IP

// --- Admin Auth Middleware ---
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

// --- Validation Helpers ---
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
      errors.push('Le véhicule doit être une chaîne de caractères.');
    } else if (body.vehicule.trim().length > 255) {
      errors.push('Le véhicule ne doit pas dépasser 255 caractères.');
    }
  }

  return errors;
}

// --- Routes ---

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Subscribe
app.post('/api/subscribe', subscribeLimiter, async (req, res) => {
  try {
    const errors = validateSubscribeInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }

    const prenom = req.body.prenom.trim();
    const email = req.body.email.trim().toLowerCase();
    const vehicule = req.body.vehicule ? req.body.vehicule.trim() : null;
    const ip = req.ip;

    await pool.query(
      `INSERT INTO subscribers (prenom, email, vehicule, ip)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [prenom, email, vehicule, ip]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue. Réessayez plus tard.' });
  }
});

// Admin: list subscribers
app.get('/api/subscribers', adminLimiter, requireAdmin, async (req, res) => {
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

// Admin: count subscribers
app.get('/api/subscribers/count', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*)::int AS count FROM subscribers');
    return res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Count subscribers error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// Admin: visits by IP
app.get('/api/visits', adminLimiter, requireAdmin, async (req, res) => {
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

// Admin: visit counts (total + unique IPs)
app.get('/api/visits/count', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*)::int AS count FROM visits');
    const unique = await pool.query('SELECT COUNT(DISTINCT ip)::int AS count FROM visits');
    return res.json({ total: total.rows[0].count, unique_ips: unique.rows[0].count });
  } catch (err) {
    console.error('Count visits error:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// --- Start Server ---
async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WOHM server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
