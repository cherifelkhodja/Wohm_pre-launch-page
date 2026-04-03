const { Resend } = require('resend');

let resend;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = 'WOHM <noreply@wohm.fr>';

async function sendAdminInvite(email, inviteUrl, invitedByName) {
  const r = getResend();
  await r.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Invitation — Administration WOHM',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0">
        <h2 style="color:#2EA3E0">WOHM — Invitation Admin</h2>
        <p>${invitedByName} vous invite à rejoindre l'administration de WOHM.</p>
        <p>Cliquez sur le lien ci-dessous pour créer votre compte :</p>
        <p><a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#2EA3E0;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Accepter l'invitation</a></p>
        <p style="color:#888;font-size:13px;margin-top:24px">Ce lien expire dans 48 heures.</p>
      </div>
    `,
  });
}

async function sendDailyDigest(recipients, count, date) {
  const r = getResend();
  const dateStr = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  await r.emails.send({
    from: FROM_EMAIL,
    to: recipients,
    subject: `WOHM — ${count} nouvelle(s) candidature(s) le ${dateStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0">
        <h2 style="color:#2EA3E0">Résumé quotidien — Candidatures</h2>
        <p style="font-size:18px"><strong>${count}</strong> nouvelle(s) candidature(s) reçue(s) aujourd'hui.</p>
        <p><a href="https://wohm.fr/admin/applications.html" style="display:inline-block;padding:12px 24px;background:#2EA3E0;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Voir les candidatures</a></p>
        <p style="color:#888;font-size:13px;margin-top:24px">${dateStr}</p>
      </div>
    `,
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendRejectionEmail(email, prenom, reason) {
  const r = getResend();
  const reasonBlock = reason
    ? `<p style="margin-top:16px;padding:12px 16px;background:#f5f5f5;border-left:3px solid #2EA3E0;color:#333;font-size:14px">${escapeHtml(reason)}</p>`
    : '';
  await r.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'WOHM — Retour sur votre candidature',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0">
        <h2 style="color:#2EA3E0">WOHM</h2>
        <p>Bonjour ${escapeHtml(prenom)},</p>
        <p>Nous avons bien étudié votre candidature et nous vous remercions pour l'intérêt que vous portez à WOHM.</p>
        <p>Malheureusement, nous ne sommes pas en mesure de donner suite à votre candidature pour le moment.</p>
        ${reasonBlock}
        <p style="color:#888;font-size:13px;margin-top:24px">Cordialement,<br>L'équipe WOHM</p>
      </div>
    `,
  });
}

module.exports = { sendAdminInvite, sendDailyDigest, sendRejectionEmail };
