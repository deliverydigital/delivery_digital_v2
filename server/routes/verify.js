/**
 * Page publique de vérification d'une formation (cible du QR code des attestations / vitrophanies).
 * Confirme, sans authentification, que la formation a bien eu lieu (établissement, intitulé, dates,
 * apprenants formés). @author Rabah Ziane - 2026-07-29
 */
import express from 'express';
import FormationCertificate from '../models/FormationCertificate.js';

const router = express.Router();
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const jour = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

router.get('/:token', async (req, res) => {
  const c = await FormationCertificate.findOne({ token: req.params.token }).lean();
  const page = (title, body, ok) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#0b0d12;color:#e9edf5;margin:0;padding:24px;display:flex;justify-content:center}
.card{max-width:560px;width:100%;background:#151922;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px;margin-top:24px}
.badge{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:13px;padding:7px 14px;border-radius:999px}
.ok{background:rgba(52,199,89,.15);color:#5AD07E}.ko{background:rgba(255,69,58,.15);color:#FF6B60}
h1{font-size:20px;margin:16px 0 4px}.muted{color:#98a2b3;font-size:13px}
.row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px}
.k{color:#98a2b3}.v{font-weight:600;text-align:right}
.list{margin:6px 0 0;padding-left:18px}.list li{font-size:14px;margin:2px 0}
.foot{margin-top:20px;color:#6b7280;font-size:12px;text-align:center}</style></head>
<body><div class="card">${body}<p class="foot">Vérification officielle · Delivery Digital · organisme de formation certifié QUALIOPI</p></div></body></html>`;

  if (!c) {
    res.status(404).type('html').send(page('Vérification', `<span class="badge ko">Certificat introuvable</span><h1>Aucune formation trouvée</h1><p class="muted">Ce lien de vérification n'est pas valide.</p>`, false));
    return;
  }
  const traineesLi = (c.trainees || []).map((t) => `<li>${esc([t.firstname, t.lastname].filter(Boolean).join(' ') || 'Salarié formé')}</li>`).join('');
  const dates = c.sessionStart ? (c.sessionEnd && jour(c.sessionEnd) !== jour(c.sessionStart) ? `du ${jour(c.sessionStart)} au ${jour(c.sessionEnd)}` : `le ${jour(c.sessionStart)}`) : '';
  const body = `<span class="badge ok">✓ Formation vérifiée</span>
    <h1>${esc(c.denom || 'Établissement')}</h1>
    <p class="muted">Cette formation a bien été réalisée par Delivery Digital.</p>
    <div class="row"><span class="k">Formation</span><span class="v">${esc(c.formationTitle || '')}</span></div>
    ${dates ? `<div class="row"><span class="k">Dates</span><span class="v">${esc(dates)}</span></div>` : ''}
    ${c.city ? `<div class="row"><span class="k">Lieu</span><span class="v">${esc(c.city)}</span></div>` : ''}
    ${c.trainerName ? `<div class="row"><span class="k">Formateur</span><span class="v">${esc(c.trainerName)}</span></div>` : ''}
    ${traineesLi ? `<div class="row" style="display:block"><span class="k">Salariés formés (${(c.trainees || []).length})</span><ul class="list">${traineesLi}</ul></div>` : ''}`;
  res.type('html').send(page(`Formation vérifiée · ${c.denom || ''}`, body, true));
});

export default router;
