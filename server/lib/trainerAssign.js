/**
 * Auto-assignation d'un FORMATEUR à un dossier OPCO au moment de la réservation.
 * Dès qu'un dossier est créé (transmis directement OU via signature de convention),
 * on cherche un formateur dont les disponibilités RÉCURRENTES couvrent le créneau visio
 * choisi (heure de sessionStart) sur les 3 jours, et on crée son TrainerSession ->
 * le cours apparaît dans le dashboard du formateur ET chez le superadmin, sans étape manuelle.
 * Règle : 1 session par créneau (on évite de ré-assigner si le formateur est déjà pris sur
 * ce (jour, créneau)). @author Rabah Ziane - 2026-06-19
 */
import nodemailer from 'nodemailer';
import { User, TrainingProgram } from '../models/index.js';
import TrainerSession from '../models/TrainerSession.js';

const PUBLIC_BASE = 'https://deliverydigital.fr';
const DD_BLUE = '#0066CC';

// Heure (0-23) d'une date dans le fuseau Europe/Paris : le serveur tourne en UTC, mais les
// créneaux formateur sont en heure locale FR (16:00/17:00). @author Rabah Ziane - 2026-06-19
export function parisHour(d) {
  return parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date(d)), 10) || 0;
}
const parisSlotKey = (d) => `${String(parisHour(d)).padStart(2, '0')}:00`;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}

// Les 3 jours consécutifs d'une session à partir de sessionStart (jours JS getDay 0-6).
function sessionWeekdays(start) {
  return [0, 1, 2].map((k) => { const d = new Date(start); d.setDate(d.getDate() + k); return d.getDay(); });
}
// Clé date 'YYYY-MM-DD'.
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// Trouve un formateur dispo pour ce créneau (heure de start) + ces 3 jours de semaine,
// non déjà réservé sur ces dates/créneau. Renvoie le doc formateur ou null.
export async function findTrainerForSession(sessionStart) {
  if (!sessionStart) return null;
  const start = new Date(sessionStart);
  const fromStr = parisSlotKey(start);
  const weekdays = sessionWeekdays(start);
  const dates = [0, 1, 2].map((k) => { const d = new Date(start); d.setDate(d.getDate() + k); return dayKey(d); });
  const trainers = await User.find({ role: 'trainer', status: 'active' })
    .select('name email recurringAvailability hourlyRate').lean();
  const eligible = trainers.filter((t) => {
    const ra = t.recurringAvailability || {};
    const tdays = new Set((ra.days || []).map(Number));
    const hasSlot = (ra.slots || []).some((s) => s.from === fromStr);
    return hasSlot && weekdays.every((wd) => tdays.has(wd));
  });
  if (!eligible.length) return null;
  // Écarte ceux déjà pris sur l'un de ces (jour, créneau) - 1 session par créneau.
  for (const t of eligible) {
    const sessions = await TrainerSession.find({ trainerId: t._id, status: { $ne: 'cancelled' } }).select('sessionStart').lean();
    const conflict = sessions.some((s) => {
      if (!s.sessionStart) return false;
      const ss = new Date(s.sessionStart);
      if (parisSlotKey(ss) !== fromStr) return false; // créneau différent = pas de conflit
      const sDates = [0, 1, 2].map((k) => { const d = new Date(ss); d.setDate(d.getDate() + k); return dayKey(d); });
      return sDates.some((d) => dates.includes(d)); // un jour commun = conflit
    });
    if (!conflict) return t;
  }
  return null;
}

// Crée le TrainerSession pour le dossier (idempotent : ne recrée pas si déjà assigné).
export async function autoAssignTrainerToDossier(dossier) {
  try {
    if (!dossier?._id || !dossier.sessionStart) return null;
    const existing = await TrainerSession.findOne({ dossierId: dossier._id });
    if (existing) return existing;
    const trainer = await findTrainerForSession(dossier.sessionStart);
    if (!trainer) return null;
    let hours = 0;
    if (dossier.formationTitle) {
      const prog = await TrainingProgram.findOne({ title: dossier.formationTitle }).select('duration_hours').lean().catch(() => null);
      if (prog) hours = prog.duration_hours || 0;
    }
    if (!hours) hours = 21;
    const learners = (dossier.salaries || []).map((s) => ({ firstname: s.firstname, lastname: s.lastname, email: s.email, phone: s.telephone || s.phone || '' }));
    const session = await TrainerSession.create({
      trainerId: trainer._id, trainerName: trainer.name, source: 'opco', dossierId: dossier._id,
      formationTitle: dossier.formationTitle, hours,
      clientName: dossier.denom, clientEmail: dossier.clientEmail, location: 'Visioconférence', addr: dossier.addr,
      sessionStart: dossier.sessionStart, sessionEnd: dossier.sessionEnd,
      learners, hourlyRate: trainer.hourlyRate || 0,
      status: 'scheduled', assignedNotifiedAt: new Date(),
    });
    notifyTrainer(trainer, session);
    return session;
  } catch (e) { return null; }
}

async function notifyTrainer(trainer, s) {
  try {
    if (!trainer?.email) return;
    const when = s.sessionStart ? new Date(s.sessionStart).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }) : 'à planifier';
    const hh = s.sessionStart ? `${parisHour(s.sessionStart)}h-${parisHour(s.sessionStart) + 1}h` : '';
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: trainer.email, bcc: 'contact@deliverydigital.fr',
      subject: `Nouveau cours assigné - ${s.formationTitle || 'Formation'}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:${DD_BLUE}"></div><div style="padding:24px">`
        + `<p style="font-size:15px;color:#1d1d1f;margin:0 0 12px">Bonjour ${esc(trainer.name)},</p>`
        + `<p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 14px">Un nouveau cours vient de vous être assigné :</p>`
        + `<div style="background:#f5f5f7;border:1px solid #e5e5ea;border-radius:12px;padding:14px 16px;margin:0 0 16px;font-size:14px;color:#1d1d1f">`
        + `<p style="margin:0 0 4px"><strong>Formation :</strong> ${esc(s.formationTitle || '-')}</p>`
        + `<p style="margin:0 0 4px"><strong>Client :</strong> ${esc(s.clientName || '-')}</p>`
        + `<p style="margin:0 0 4px"><strong>1er jour :</strong> ${esc(when)}${hh ? ` (${hh})` : ''}</p>`
        + `<p style="margin:0"><strong>Apprenants :</strong> ${(s.learners || []).length}</p></div>`
        + `<a href="${PUBLIC_BASE}/formateur" style="display:inline-block;background:${DD_BLUE};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px">Voir mon cours</a>`
        + `</div></div></div>`,
    });
  } catch (e) { /* email best effort */ }
}
