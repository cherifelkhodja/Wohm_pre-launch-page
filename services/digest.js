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

async function runDigest() {
  try {
    // Count applications created today
    const countResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM applications
      WHERE created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `);

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

    await sendDailyDigest(recipients, count, new Date());

    console.log(`Digest sent: ${count} application(s) to ${recipients.length} recipient(s).`);
  } catch (err) {
    console.error('Digest error:', err.message);
  }
}

async function checkMissedDigest() {
  try {
    const now = new Date();
    // Only check if it's past 18:00 local time
    const parisHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getHours();

    if (parisHour >= 18) {
      // We could track sent digests in a table, but for simplicity
      // we'll just skip the check — the cron will handle it going forward
      console.log('Digest: startup check — cron will handle scheduled runs.');
    }
  } catch (err) {
    console.error('Digest missed check error:', err.message);
  }
}

module.exports = { startDigestCron };
