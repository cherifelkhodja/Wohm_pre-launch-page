const express = require('express');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { pool, initDB } = require('./db');

// Route modules
const publicSubscribeRoutes = require('./routes/public-subscribe');
const adminAuthRoutes = require('./routes/admin-auth');
const adminSubscriberRoutes = require('./routes/admin-subscribers');
const adminInviteRoutes = require('./routes/admin-invites');
const adminJobRoutes = require('./routes/admin-jobs');
const adminApplicationRoutes = require('./routes/admin-applications');
const publicJobRoutes = require('./routes/public-jobs');
const { startDigestCron } = require('./services/digest');
const publicApplyRoutes = require('./routes/public-apply');

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
      connectSrc: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xXssProtection: false,
}));

// --- CORS ---
app.use(cors({
  origin: ['https://wohm.fr', 'https://www.wohm.fr'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

// --- Body parser ---
app.use(express.json({ limit: '10kb' }));

// --- Sessions ---
app.use(session({
  store: new PgStore({
    pool,
    tableName: 'session',
    createTableIfMissing: false,
    pruneSessionInterval: 60 * 15, // prune expired sessions every 15 min
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

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

// --- Admin pages (protected by session, except login & setup) ---
app.use('/admin', (req, res, next) => {
  if (req.path === '/login.html' || req.path.startsWith('/setup') || req.path === '/shared.js') {
    return next();
  }
  if (!req.session || !req.session.adminId) {
    return res.redirect('/admin/login.html');
  }
  next();
}, express.static(path.join(__dirname, 'admin')));

// --- Static files (public) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- TEMPORARY: First admin setup (remove after use) ---
const bcryptSetup = require('bcryptjs');
app.post('/api/setup-first-admin', async (req, res) => {
  try {
    const existing = await pool.query('SELECT COUNT(*)::int AS count FROM admins');
    if (existing.rows[0].count > 0) {
      return res.status(403).json({ error: 'Un admin existe déjà. Route désactivée.' });
    }
    const { email, password, prenom } = req.body;
    if (!email || !password || !prenom) {
      return res.status(400).json({ error: 'email, password et prenom requis.' });
    }
    const hash = await bcryptSetup.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO admins (email, password_hash, prenom) VALUES ($1, $2, $3) RETURNING id, email, prenom',
      [email.trim().toLowerCase(), hash, prenom.trim()]
    );
    return res.json({ ok: true, admin: result.rows[0] });
  } catch (err) {
    console.error('Setup first admin error:', err.message);
    return res.status(500).json({ error: 'Erreur.' });
  }
});

// --- API Routes ---
app.use('/api', publicSubscribeRoutes);
app.use('/api', publicJobRoutes);
app.use('/api', publicApplyRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminInviteRoutes);
app.use('/api/admin', adminSubscriberRoutes);
app.use('/api/admin', adminJobRoutes);
app.use('/api/admin', adminApplicationRoutes);

// --- Job detail page (SSR) ---
app.get('/jobs/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'job-detail.html'));
});

// --- Start Server ---
async function start() {
  await initDB();
  startDigestCron();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WOHM server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app;
