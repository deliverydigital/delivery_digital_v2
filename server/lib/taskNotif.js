/**
 * Notification email d'un INTERVENANT tagué sur une tâche du suivi dossier OPCO.
 * Partagé entre l'admin DDN (agencyAdmin.js) et l'espace agence (agencySelf.js).
 * Côté client/intervenant, l'émetteur reste toujours « Delivery Digital » (jamais le nom
 * de l'agence partenaire). @author Rabah Ziane - 2026-07-10
 */
import nodemailer from 'nodemailer';

const PUBLIC_BASE = 'https://deliverydigital.fr';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const STEP_LABELS = { transmis: 'Transmis', acces: 'Accès OPCO', montage: 'Montage OPCO', instruction: 'En instruction', accepted: 'Financement accepté', scheduled: 'Programmé', completed: 'Terminé', invoiced: 'Facturé', paid: 'Payé' };

function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}

// Envoie la notif à l'intervenant. Renvoie true si l'email a bien été envoyé.
export async function sendTaskNotif({ to, name, denom, label, step, comment }) {
  const email = String(to || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const LOGO = `${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png`;
  const stepTxt = STEP_LABELS[step] || step || '';
  const hi = name && String(name).trim() ? `Bonjour ${esc(String(name).trim())},` : 'Bonjour,';
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px">`
    + `<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden">`
    + `<div style="height:5px;background:#0066CC"></div>`
    + `<div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${LOGO}" alt="Delivery Digital" style="height:38px;width:auto" /></div>`
    + `<div style="padding:26px">`
    + `<p style="font-size:18px;font-weight:800;color:#1d1d1f;margin:0 0 12px">Nouvelle tâche à traiter</p>`
    + `<p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 14px">${hi}<br><br>Une tâche vous a été assignée par Delivery Digital${denom ? ` sur le dossier <strong>${esc(denom)}</strong>` : ''}.</p>`
    + `<div style="background:#f5f5f7;border:1px solid #e5e5ea;border-radius:12px;padding:14px 16px;margin:0 0 16px">`
    + (stepTxt ? `<p style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#86868b;font-weight:700;margin:0 0 6px">Étape · ${esc(stepTxt)}</p>` : '')
    + `<p style="font-size:15px;color:#1d1d1f;font-weight:700;line-height:1.5;margin:0">${esc(label || '')}</p>`
    + (comment ? `<p style="font-size:13px;color:#3a3a3c;line-height:1.5;margin:8px 0 0">💬 ${esc(comment)}</p>` : '')
    + `</div>`
    + `<p style="font-size:13px;color:#3a3a3c;line-height:1.6;margin:0">Une question ? Répondez simplement à cet email.</p>`
    + `<p style="font-size:12px;color:#86868b;margin:18px 0 0">Delivery Digital · Organisme de formation certifié QUALIOPI</p>`
    + `</div></div></div>`;
  const text = `${name ? 'Bonjour ' + name + ',' : 'Bonjour,'}\n\nUne tâche vous a été assignée par Delivery Digital${denom ? ' sur le dossier ' + denom : ''}.\n\n${stepTxt ? '[' + stepTxt + '] ' : ''}${label || ''}${comment ? '\nCommentaire : ' + comment : ''}\n\nUne question ? Répondez à cet email.\n\nDelivery Digital - Organisme de formation certifié QUALIOPI`;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: email, bcc: 'contact@deliverydigital.fr', replyTo: 'contact@deliverydigital.fr',
      subject: `Nouvelle tâche à traiter${denom ? ' - ' + denom : ''}`,
      html, text,
    });
    return true;
  } catch (e) { console.error('task-notif mail failed:', e.message); return false; }
}
