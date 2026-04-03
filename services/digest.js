const cron = require('node-cron');
const { pool } = require('../db');
const { sendDailyDigest } = require('./email');

function startDigestCron() {
  // Run every day at 18:00 Europe/Paris
  cron.schedule('0 18 * * *', async () => {
    await runDigest();
  }, { timezone: 'Europe/Paris' });

  // On startup, check if we missed today's digest
  checkMissedDigest();

  console.log('Daily digest cron scheduled (18:00 Europe/Paris)');
}

async function runDigest(date) {
  try {
    const targetDate = date || new Date();

    // Check if already sent for this date
    const alreadySent = await pool.query(
      "SELECT id FROM digest_sent WHERE sent_date = $1::date",
      [targetDate]
    );
    if (alreadySent.rows.length > 0) {
      console.log('Digest: already sent for this date, skipping.');
      return;
    }

    // Count applications created on the target date
    const countResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM applications
      WHERE created_at >= $1::date
        AND created_at < $1::date + INTERVAL '1 day'
    `, [targetDate]);

    const count = countResult.rows[0].count;

    if (count === 0) {
      console.log('Digest: no new applications today, skipping email.');
      return;
    }

    // Get all admin emails
    const admins = await pool.query('SELECT email FROM admins');
    const recipients = admins.rows.map(a => a.email);

    if (recipients.length === 0) {
      console.log('Digest: no admin emails found, skipping.');
      return;
    }

    // Also send to configured recipient if set
    const extraRecipient = process.env.DIGEST_RECIPIENT_EMAIL;
    if (extraRecipient && !recipients.includes(extraRecipient)) {
      recipients.push(extraRecipient);
    }

    await sendDailyDigest(recipients, count, targetDate);

    // Track that digest was sent
    await pool.query(
      'INSERT INTO digest_sent (sent_date, app_count) VALUES ($1::date, $2) ON CONFLICT (sent_date) DO NOTHING',
      [targetDate, count]
    );

    console.log(`Digest sent: ${count} application(s) to ${recipients.length} recipient(s).`);
  } catch (err) {
    console.error('Digest error:', err.message);
  }
}

async function checkMissedDigest() {
  try {
    const now = new Date();
    const parisHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getHours();

    if (parisHour >= 18) {
      console.log('Digest: startup after 18h, checking if today\'s digest was sent...');
      await runDigest(now);
    }
  } catch (err) {
    console.error('Digest missed check error:', err.message);
  }
}

module.exports = { startDigestCron };
