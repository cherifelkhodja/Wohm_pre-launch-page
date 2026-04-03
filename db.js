const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    // --- Existing tables ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        vehicule VARCHAR(255),
        ip VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip VARCHAR(45) NOT NULL,
        path VARCHAR(255) NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // --- Admin users ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // --- Admin invitations ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        invited_by UUID REFERENCES admins(id),
        accepted_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // --- Session table (connect-pg-simple) ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        PRIMARY KEY (sid)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
    `);

    // --- Job postings ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_postings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        profile TEXT,
        location VARCHAR(255),
        remote_policy VARCHAR(50),
        contract_type VARCHAR(50) NOT NULL,
        experience_level VARCHAR(50),
        skills TEXT[],
        is_archived BOOLEAN DEFAULT false,
        created_by UUID REFERENCES admins(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // --- Applications ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_posting_id UUID REFERENCES job_postings(id),
        civilite VARCHAR(5),
        prenom VARCHAR(100) NOT NULL,
        nom VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        telephone VARCHAR(20) NOT NULL,
        poste_actuel VARCHAR(255) NOT NULL,
        annees_experience INTEGER,
        statut_pro VARCHAR(20) NOT NULL,
        salaire_actuel INTEGER,
        salaire_souhaite INTEGER,
        duree_stage VARCHAR(100),
        ecole VARCHAR(255),
        date_debut_souhaitee DATE,
        disponibilite VARCHAR(20) NOT NULL,
        niveau_anglais VARCHAR(20) NOT NULL,
        cv_s3_key VARCHAR(512) NOT NULL,
        cv_original_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'new',
        rejection_reason TEXT,
        ip VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // --- Application views (new badge tracking per admin) ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_views (
        admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
        application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
        viewed_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (admin_id, application_id)
      );
    `);

    // --- Site settings (key/value store) ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // --- Migrations (add columns if missing) ---
    await client.query(`
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS annees_experience INTEGER;
    `).catch(() => {});

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
