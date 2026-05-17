/**
 * Rapport email hebdomadaire SEO :
 * - Resume positions
 * - Top movers (up/down)
 * - Keywords a risque
 * - Recommandations
 *
 * @author Rabah Ziane - 2026-05-17
 */
import nodemailer from 'nodemailer';
import KeywordRanking from '../models/KeywordRanking.js';

function createTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function deltaFromHistory(item, daysAgo = 7) {
  const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
  const history = item.history || [];
  // Find oldest point >= cutoff
  const oldest = history.find((h) => new Date(h.date).getTime() >= cutoff) || history[0];
  if (!oldest || oldest.ourPosition === null || oldest.ourPosition === undefined) return null;
  if (item.ourPosition === null || item.ourPosition === undefined) return -1000; // dropped out
  return oldest.ourPosition - item.ourPosition; // positive = improved
}

function fmtPos(p) {
  if (p === null || p === undefined) return 'hors top 10';
  if (p <= 3) return `#${p} (🟢 top 3)`;
  if (p <= 10) return `#${p} (🔵 page 1)`;
  if (p <= 20) return `#${p} (🟠 page 2)`;
  return `#${p} (page 3+)`;
}

function color(p) {
  if (p === null) return '#86868B';
  if (p <= 3) return '#1F7A4D';
  if (p <= 10) return '#1F5865';
  if (p <= 20) return '#B26A00';
  return '#86868B';
}

async function buildReportData() {
  const items = await KeywordRanking.find({ active: true }).lean();

  // Compute deltas
  const enriched = items.map((it) => ({ ...it, delta: deltaFromHistory(it, 7) }));

  // Sort
  const climbers = enriched.filter((x) => x.delta !== null && x.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 10);
  const droppers = enriched.filter((x) => x.delta !== null && x.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 10);
  const top3 = enriched.filter((x) => x.ourPosition !== null && x.ourPosition <= 3).slice(0, 20);
  const page1 = enriched.filter((x) => x.ourPosition !== null && x.ourPosition > 3 && x.ourPosition <= 10);
  const page2 = enriched.filter((x) => x.ourPosition !== null && x.ourPosition > 10 && x.ourPosition <= 20);
  const quickWins = enriched.filter((x) => x.ourPosition !== null && x.ourPosition > 10 && x.ourPosition <= 20).sort((a, b) => a.ourPosition - b.ourPosition).slice(0, 15);

  return { items: enriched, climbers, droppers, top3, page1, page2, quickWins, total: items.length };
}

function renderHtml(data, periodLabel) {
  const { climbers, droppers, top3, page1, page2, quickWins, total } = data;
  const styles = {
    body: 'font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; background: #F6FAFA; padding: 24px; color: #1D1D1F; line-height: 1.5;',
    container: 'max-width: 720px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);',
    h1: 'font-size: 28px; margin: 0 0 4px; font-weight: 700;',
    eyebrow: 'font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #1F5865; font-weight: 700; margin: 0 0 8px;',
    sub: 'color: #86868B; margin: 0 0 24px; font-size: 14px;',
    h2: 'font-size: 16px; margin: 24px 0 12px; font-weight: 700; color: #1D1D1F; border-top: 1px solid #eee; padding-top: 20px;',
    kpiRow: 'display: table; width: 100%; margin-bottom: 20px;',
    kpi: 'display: table-cell; text-align: center; padding: 10px; background: #FAFAFC; border-radius: 10px;',
    pill: 'display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;',
    table: 'width: 100%; border-collapse: collapse; margin-bottom: 12px;',
    th: 'text-align: left; padding: 8px; font-size: 11.5px; color: #86868B; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #eee;',
    td: 'padding: 8px; font-size: 13px; border-bottom: 1px solid #f3f3f3;',
    footer: 'margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; color: #86868B; font-size: 11.5px; text-align: center;',
  };

  const row = (it) => `
    <tr>
      <td style="${styles.td}"><strong>${it.keyword}</strong></td>
      <td style="${styles.td}"><span style="${styles.pill} background: ${color(it.ourPosition)}20; color: ${color(it.ourPosition)};">${fmtPos(it.ourPosition)}</span></td>
      <td style="${styles.td} text-align: right;">${it.delta === null ? '—' : it.delta === 0 ? '=' : it.delta > 0 ? `<span style="color:#1F7A4D;">▲ +${it.delta}</span>` : `<span style="color:#A33;">▼ ${it.delta}</span>`}</td>
    </tr>
  `;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Rapport SEO ${periodLabel}</title></head>
<body style="${styles.body}">
  <div style="${styles.container}">
    <p style="${styles.eyebrow}">Rapport ${periodLabel}</p>
    <h1 style="${styles.h1}">SEO &amp; Positions</h1>
    <p style="${styles.sub}">${total} mots-clés trackés · ${top3.length} en top 3 · ${page1.length} en page 1 · ${page2.length} en page 2</p>

    <div style="${styles.kpiRow}">
      <div style="${styles.kpi}"><div style="font-size: 11px; color: #86868B; text-transform: uppercase;">Top 3</div><div style="font-size: 24px; font-weight: 700; color: #1F7A4D;">${top3.length}</div></div>
      <div style="width: 6px;"></div>
      <div style="${styles.kpi}"><div style="font-size: 11px; color: #86868B; text-transform: uppercase;">Page 1</div><div style="font-size: 24px; font-weight: 700; color: #1F5865;">${page1.length}</div></div>
      <div style="width: 6px;"></div>
      <div style="${styles.kpi}"><div style="font-size: 11px; color: #86868B; text-transform: uppercase;">Quick wins</div><div style="font-size: 24px; font-weight: 700; color: #B26A00;">${quickWins.length}</div></div>
      <div style="width: 6px;"></div>
      <div style="${styles.kpi}"><div style="font-size: 11px; color: #86868B; text-transform: uppercase;">Total</div><div style="font-size: 24px; font-weight: 700; color: #1D1D1F;">${total}</div></div>
    </div>

    ${climbers.length > 0 ? `
    <h2 style="${styles.h2}">📈 Top progressions cette semaine</h2>
    <table style="${styles.table}">
      <thead><tr><th style="${styles.th}">Mot-clé</th><th style="${styles.th}">Position actuelle</th><th style="${styles.th} text-align: right;">Évolution</th></tr></thead>
      <tbody>${climbers.map(row).join('')}</tbody>
    </table>` : ''}

    ${droppers.length > 0 ? `
    <h2 style="${styles.h2}">📉 Régressions à surveiller</h2>
    <table style="${styles.table}">
      <thead><tr><th style="${styles.th}">Mot-clé</th><th style="${styles.th}">Position actuelle</th><th style="${styles.th} text-align: right;">Évolution</th></tr></thead>
      <tbody>${droppers.map(row).join('')}</tbody>
    </table>` : ''}

    ${quickWins.length > 0 ? `
    <h2 style="${styles.h2}">⚡ Quick wins (page 2 → page 1)</h2>
    <p style="color: #86868B; font-size: 12.5px; margin: 0 0 12px;">Mots-clés à un effort de la page 1. Optimiser ces pages = +200-300% de clics.</p>
    <table style="${styles.table}">
      <thead><tr><th style="${styles.th}">Mot-clé</th><th style="${styles.th}">Position</th><th style="${styles.th} text-align: right;">7j</th></tr></thead>
      <tbody>${quickWins.map(row).join('')}</tbody>
    </table>` : ''}

    ${top3.length > 0 ? `
    <h2 style="${styles.h2}">👑 Top 3 à protéger</h2>
    <table style="${styles.table}">
      <thead><tr><th style="${styles.th}">Mot-clé</th><th style="${styles.th}">Position</th><th style="${styles.th} text-align: right;">7j</th></tr></thead>
      <tbody>${top3.map(row).join('')}</tbody>
    </table>` : ''}

    <div style="${styles.footer}">
      <p>Rapport généré automatiquement par DELIVERY Digital · <a href="https://deliverydigital.fr/admin/rankings" style="color: #0066CC; text-decoration: none;">Voir le dashboard live</a></p>
    </div>
  </div>
</body></html>`;
}

export async function sendRankingReport({ to = process.env.REPORT_EMAIL || 'zianetransport@gmail.com', periodLabel = 'hebdomadaire' } = {}) {
  const data = await buildReportData();
  if (data.total === 0) return { sent: false, reason: 'no_keywords' };

  const html = renderHtml(data, periodLabel);
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `📊 Rapport SEO ${periodLabel} · ${data.top3.length} top3 · ${data.page1.length} page1 · ${data.climbers.length} progressions`,
    html,
  });
  return { sent: true, messageId: info.messageId, stats: { total: data.total, top3: data.top3.length, page1: data.page1.length, climbers: data.climbers.length, droppers: data.droppers.length } };
}

export { buildReportData };
