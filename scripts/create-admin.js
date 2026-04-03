#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { pool, initDB } = require('../db');

const BCRYPT_ROUNDS = 12;

async function createAdmin() {
  const [,, email, password, prenom] = process.argv;

  if (!email || !password || !prenom) {
    console.error('Usage: node scripts/create-admin.js <email> <password> <prenom>');
    process.exit(1);
  }

  try {
    await initDB();

    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      console.error(`Admin with email ${email} already exists.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await pool.query(
      'INSERT INTO admins (email, password_hash, prenom) VALUES ($1, $2, $3) RETURNING id, email, prenom',
      [email.toLowerCase(), passwordHash, prenom.trim()]
    );

    console.log('Admin created successfully:', result.rows[0]);
  } catch (err) {
    console.error('Error creating admin:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();
