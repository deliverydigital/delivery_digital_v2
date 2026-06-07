/**
 * Rappels automatiques des cours aux formateurs : 48h, 24h et 1h avant le début.
 * Lancé par cron système toutes les 15 min. Un seul email par palier (flags anti-doublon).
 * Robuste au retard du cron : envoie le palier le plus urgent franchi et neutralise les
 * paliers plus larges devenus sans objet. DRY=1 -> simulation (n'envoie rien, ne sauve rien).
 * @author Rabah Ziane · 2026-06-07
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import TrainerSession from '../models/TrainerSession.js';
import User from '../models/User.js';

const DRY = process.env.DRY === '1';
const PUBLIC_BASE = 'https://deliverydigital.fr';
const BLUE = '#0066CC';
const LOGO = PUBLIC_BASE + '/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const THRESHOLDS = [{ key: 'h48', h: 48, label: '48 h' }, { key: 'h24', h: 24, label: '24 h' }, { key: 'h1', h: 1, label: '1 h' }];

function transporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}

function emailHtml(trainer, s, label, whenStr) {
  const wa = s.whatsappGroupCreated ? '' : `<p style="font-size:13px;color:#b5740a;background:#fff7e6;border:1px solid #ffd699;border-radius:10px;padding:10px 12px;margin:0 0 16px">⚠️ Pensez à créer le <strong>groupe WhatsApp</strong> avec les apprenants + le responsable pédagogique (voir la rubrique Instructions).</p>`;
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:540px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:${BLUE}"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${LOGO}" alt="Delivery Digital" style="height:38px"/></div><div style="padding:24px 26px">
  <p style="font-size:13px;font-weight:700;color:${BLUE};text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">Rappel · votre cours dans ${label}</p>
  <p style="font-size:15px;color:#1d1d1f;margin:0 0 14px">Bonjour ${esc(trainer.name)},</p>
  <p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 14px">Votre cours approche :</p>
  <div style="background:#f5f5f7;border:1px solid #e5e5ea;border-radius:12px;padding:14px 16px;margin:0 0 16px;font-size:14px;color:#1d1d1f">
    <p style="margin:0 0 4px"><strong>Formation :</strong> ${esc(s.formationTitle || '-')}</p>
    <p style="margin:0 0 4px"><strong>Quand :</strong> ${esc(whenStr)}</p>
    <p style="margin:0 0 4px"><strong>Client :</strong> ${esc(s.clientName || '-')}</p>
    <p style="margin:0 0 4px"><strong>Lieu :</strong> ${esc(s.location || '-')}${s.addr ? ' · ' + esc(s.addr) : ''}</p>
    <p style="margin:0"><strong>Apprenants :</strong> ${(s.learners || []).length}</p>
  </div>
  ${wa}
  <a href="${PUBLIC_BASE}/formateur" style="display:inline-block;background:${BLUE};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px">Voir mon cours</a>
  </div></div></div>`;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const now = Date.now();
  // Sessions planifiées, à venir, dans les 48h.
  const horizon = new Date(now + 48 * 3600000);
  const sessions = await TrainerSession.find({ status: 'scheduled', sessionStart: { $gt: new Date(now), $lte: horizon } }).lean();
  const tx = DRY ? null : transporter();
  let sent = 0, scanned = sessions.length;
  for (const s of sessions) {
    const hoursUntil = (new Date(s.sessionStart).getTime() - now) / 3600000;
    const trainer = await User.findById(s.trainerId).select('name email reminderPrefs').lean();
    if (!trainer?.email) continue;
    const pref = trainer.reminderPrefs || {};
    const prefKey = { h48: 'course48', h24: 'course24', h1: 'course1' };
    const r = s.reminders || {};
    // Palier éligible = seuil franchi, pas encore envoyé, ET activé par le formateur.
    const elig = THRESHOLDS.filter((t) => hoursUntil <= t.h && !r[t.key] && pref[prefKey[t.key]] !== false);
    if (!elig.length) continue;
    const pick = elig.reduce((a, b) => (a.h < b.h ? a : b)); // le plus urgent
    const whenStr = new Date(s.sessionStart).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    console.log(`${DRY ? '[DRY] ' : ''}reminder ${pick.label} -> ${trainer.email} | ${s.formationTitle} | ${whenStr} | restant ${hoursUntil.toFixed(1)}h`);
    if (!DRY) {
      try {
        await tx.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: trainer.email, bcc: 'contact@deliverydigital.fr', subject: `Rappel : votre cours ${s.formationTitle || ''} dans ${pick.label}`.trim(), html: emailHtml(trainer, s, pick.label, whenStr) });
      } catch (e) { console.error('mail fail', s._id, e.message); continue; }
      const set = { reminderSentAt: new Date() };
      elig.forEach((t) => { set[`reminders.${t.key}`] = true; }); // neutralise aussi les paliers plus larges
      await TrainerSession.updateOne({ _id: s._id }, { $set: set });
    }
    sent++;
  }
  console.log(`${DRY ? '[DRY] ' : ''}done: scanned=${scanned} sent=${sent}`);
  await mongoose.disconnect();
}

run().then(() => process.exit(0)).catch((e) => { console.error('reminders error:', e.message); process.exit(1); });
