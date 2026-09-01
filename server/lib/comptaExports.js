/**
 * Exports comptables générés à partir des écritures catégorisées :
 *  - FEC (Fichier des Écritures Comptables, format DGFiP art. A47 A-1)
 *  - Grand Livre (écritures par compte)
 *  - Balance (totaux débit/crédit + solde par compte)
 * Chaque transaction Qonto est éclatée en écriture à partie double :
 *   encaissement -> Débit 512 (banque) / Crédit compte produit HT + Crédit 44571 (TVA collectée)
 *   décaissement -> Crédit 512 (banque) / Débit compte charge HT + Débit 44566 (TVA déductible)
 * @author Rabah Ziane · 2026-07-08
 */
import { categoryInfo } from './comptaCatalog.js';

const BANK = '512000', TVA_COLL = '445710', TVA_DED = '445660';
const d2 = n => Math.round((n || 0) * 100) / 100;
const num = n => d2(Math.abs(n)).toFixed(2).replace('.', ',');       // FEC : virgule décimale
const csvn = n => d2(n).toFixed(2).replace('.', ',');
const fdate = d => { const x = new Date(d); return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`; };
const clean = s => String(s || '').replace(/[\t\r\n]/g, ' ').trim();

// Génère les lignes d'écriture (partie double) de toutes les transactions.
export function ecritures(company, entries) {
  const out = []; let n = 0;
  for (const e of entries) {
    if (!e.category_key) continue;
    n++;
    const ttc = Math.abs(e.amount || 0), tva = Math.abs(e.tva_amount || 0);
    const ht = d2(Math.abs(e.amount_ht != null ? e.amount_ht : ttc) || (ttc - tva));
    const cat = categoryInfo(e.category_key) || {};
    const acc = (e.account || cat.account || '471000');
    const lib = clean(cat.label || e.category_key);
    const ecrNum = 'BQ' + String(n).padStart(6, '0');
    const dt = fdate(e.date), lab = clean(e.label || lib).slice(0, 120), piece = clean(e.external_id || '').slice(0, 20);
    const base = { jc: 'BQ', jl: 'Banque', num: ecrNum, date: dt, piece, lab };
    if (e.nature === 'neutre') {
      // virement interne : mouvement de trésorerie neutre (compte 580)
      if (e.side === 'credit') { out.push({ ...base, cpt: BANK, lib: 'Banque', d: ttc, c: 0 }); out.push({ ...base, cpt: '580000', lib: 'Virement interne', d: 0, c: ttc }); }
      else { out.push({ ...base, cpt: '580000', lib: 'Virement interne', d: ttc, c: 0 }); out.push({ ...base, cpt: BANK, lib: 'Banque', d: 0, c: ttc }); }
      continue;
    }
    if (e.side === 'credit') {
      out.push({ ...base, cpt: BANK, lib: 'Banque', d: ttc, c: 0 });
      out.push({ ...base, cpt: acc, lib, d: 0, c: ht });
      if (tva > 0) out.push({ ...base, cpt: TVA_COLL, lib: 'TVA collectée', d: 0, c: tva });
    } else {
      out.push({ ...base, cpt: BANK, lib: 'Banque', d: 0, c: ttc });
      out.push({ ...base, cpt: acc, lib, d: ht, c: 0 });
      if (tva > 0) out.push({ ...base, cpt: TVA_DED, lib: 'TVA déductible', d: tva, c: 0 });
    }
  }
  return out;
}

export function buildFEC(company, entries) {
  const cols = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'];
  const lines = [cols.join('\t')];
  for (const l of ecritures(company, entries)) {
    lines.push([l.jc, l.jl, l.num, l.date, l.cpt, l.lib, '', '', l.piece, l.date, l.lab, num(l.d), num(l.c), '', '', l.date, '', ''].join('\t'));
  }
  return lines.join('\r\n');
}

export function buildBalance(company, entries) {
  const acc = {};
  for (const l of ecritures(company, entries)) { acc[l.cpt] = acc[l.cpt] || { lib: l.lib, d: 0, c: 0 }; acc[l.cpt].d += l.d; acc[l.cpt].c += l.c; }
  const rows = [['Compte', 'Libellé', 'Débit', 'Crédit', 'Solde']];
  let td = 0, tc = 0;
  for (const [n, v] of Object.entries(acc).sort()) { const s = d2(v.d - v.c); td += v.d; tc += v.c; rows.push([n, v.lib, csvn(v.d), csvn(v.c), csvn(s)]); }
  rows.push(['', 'TOTAL', csvn(td), csvn(tc), csvn(td - tc)]);
  return '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
}

export function buildGrandLivre(company, entries) {
  const ecr = ecritures(company, entries).sort((a, b) => a.cpt.localeCompare(b.cpt) || a.date.localeCompare(b.date));
  const rows = [['Compte', 'Date', 'Journal', 'Pièce', 'Libellé', 'Débit', 'Crédit']];
  let cur = null, sd = 0, sc = 0;
  for (const l of ecr) {
    if (cur !== null && l.cpt !== cur) { rows.push(['', '', '', '', `-- Total ${cur}`, csvn(sd), csvn(sc)]); sd = sc = 0; }
    cur = l.cpt; sd += l.d; sc += l.c;
    rows.push([l.cpt, l.date, l.jc, l.piece, l.lib === 'Banque' ? l.lab : l.lib, csvn(l.d), csvn(l.c)]);
  }
  if (cur !== null) rows.push(['', '', '', '', `-- Total ${cur}`, csvn(sd), csvn(sc)]);
  return '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
}
