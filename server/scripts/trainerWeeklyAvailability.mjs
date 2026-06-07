/**
 * Rappel hebdomadaire (chaque vendredi) : invite les formateurs à renseigner / mettre à jour
 * leurs disponibilités pour la SEMAINE SUIVANTE. Envoyé aux formateurs actifs et activés
 * qui n'ont pas désactivé ce rappel (reminderPrefs.weeklyAvailability). Lancé par cron
 * vendredi matin. DRY=1 -> simulation. @author Rabah Ziane · 2026-06-07
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const DRY = process.env.DRY === '1';
const PUBLIC_BASE = 'https://deliverydigital.fr';
const BLUE = '#0066CC';
const LOGO = PUBLIC_BASE + '/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function transporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}

// Bornes (lun -> dim) de la semaine prochaine, en français.
function nextWeekLabel() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // lundi=0
  const nextMon = new Date(now); nextMon.setDate(now.getDate() + (7 - dow));
  const nextSun = new Date(nextMon); nextSun.setDate(nextMon.getDate() + 6);
  const f = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `du ${f(nextMon)} au ${f(nextSun)}`;
}

function html(name, weekLabel) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:540px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:${BLUE}"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${LOGO}" alt="Delivery Digital" style="height:38px"/></div><div style="padding:24px 26px">
  <p style="font-size:13px;font-weight:700;color:${BLUE};text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">Vos disponibilités</p>
  <p style="font-size:15px;color:#1d1d1f;margin:0 0 14px">Bonjour ${esc(name)},</p>
  <p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 16px">Pensez à <strong>renseigner ou mettre à jour vos disponibilités pour la semaine prochaine</strong> (${esc(weekLabel)}). Cela nous permet de vous proposer des cours aux bons créneaux. Vous pouvez bloquer une journée entière, une demi-journée ou des créneaux horaires précis.</p>
  <a href="${PUBLIC_BASE}/formateur" style="display:inline-block;background:${BLUE};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px">Mettre à jour mes disponibilités</a>
  <p style="font-size:11.5px;color:#86868b;margin:18px 0 0">Vous pouvez désactiver ce rappel depuis votre espace formateur.</p>
  </div></div></div>`;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const trainers = await User.find({ role: 'trainer', status: 'active' }).select('name email onboardingValidated reminderPrefs').lean();
  const weekLabel = nextWeekLabel();
  const tx = DRY ? null : transporter();
  let sent = 0;
  for (const t of trainers) {
    if (!t.email) continue;
    if (!t.onboardingValidated) continue; // uniquement comptes activés
    if (t.reminderPrefs?.weeklyAvailability === false) continue; // désactivé par le formateur
    console.log(`${DRY ? '[DRY] ' : ''}weekly -> ${t.email}`);
    if (!DRY) {
      try { await tx.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: t.email, subject: `Vos disponibilités pour la semaine prochaine (${weekLabel})`, html: html(t.name, weekLabel) }); }
      catch (e) { console.error('mail fail', t.email, e.message); continue; }
    }
    sent++;
  }
  console.log(`${DRY ? '[DRY] ' : ''}weekly done: trainers=${trainers.length} sent=${sent}`);
  await mongoose.disconnect();
}

run().then(() => process.exit(0)).catch((e) => { console.error('weekly reminders error:', e.message); process.exit(1); });
