/**
 * Remplissage du formulaire officiel 2033-SD (liasse réel simplifié).
 * Remplit le compte de résultat (2033-B) + l'identité à partir des écritures
 * catégorisées. Le bilan (2033-A) reste à compléter (données non suivies).
 * @author Rabah Ziane · 2026-07-08
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(__dirname, 'cerfa', '2033-sd.pdf');

// case 2033-B -> {p:index page, r:X d'alignement droite, y:top}
const C = {
 '210':{p:1,r:503,y:86},'214':{p:1,r:503,y:98},'218':{p:1,r:503,y:111},'222':{p:1,r:503,y:123},
 '224':{p:1,r:503,y:135},'226':{p:1,r:503,y:147},'230':{p:1,r:503,y:158},'232':{p:1,r:503,y:170},
 '234':{p:1,r:503,y:181},'238':{p:1,r:503,y:202},'242':{p:1,r:503,y:225},'244':{p:1,r:503,y:237},
 '250':{p:1,r:503,y:249},'252':{p:1,r:503,y:261},'264':{p:1,r:503,y:322},'270':{p:1,r:503,y:335},
 '280':{p:1,r:200,y:347},'294':{p:1,r:503,y:347},'290':{p:1,r:503,y:358},'300':{p:1,r:503,y:373},
 '306':{p:1,r:503,y:403},'310':{p:1,r:503,y:415},'312':{p:1,r:405,y:428},
};
const r2 = n => Math.round((n || 0) * 100) / 100;
const fmt = n => Math.round(n || 0).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');

function caseOf(acc, nat) {
  const a = String(acc || '');
  if (nat === 'produit') {
    if (a.startsWith('707')) return '210';
    if (a.startsWith('701') || a.startsWith('704') || a.startsWith('703')) return '214';
    if (a.startsWith('706') || a.startsWith('708')) return '218';
    if (a.startsWith('74')) return '226';
    if (a.startsWith('76')) return '280';
    if (a.startsWith('77') || a.startsWith('79')) return '290';
    return '230';
  }
  if (nat === 'charge') {
    if (a.startsWith('607')) return '234';
    if (a.startsWith('601') || a.startsWith('602')) return '238';
    if (a.startsWith('63')) return '242';
    if (a.startsWith('641') || a.startsWith('644')) return '250';
    if (a.startsWith('645') || a.startsWith('646') || a.startsWith('647') || a.startsWith('648')) return '252';
    if (a.startsWith('66')) return '294';
    if (a.startsWith('67')) return '300';
    if (a.startsWith('69')) return '306';
    return '244';
  }
  return null;
}

export function computeCases2033(entries) {
  const s = {}; const add = (c, v) => { if (c) s[c] = r2((s[c] || 0) + v); };
  for (const e of entries) { if (!e.category_key || e.nature === 'neutre') continue; add(caseOf(e.account, e.nature), e.amount_ht || 0); }
  s['222'] = r2((s['210'] || 0) + (s['214'] || 0) + (s['218'] || 0));
  s['232'] = r2(s['222'] + (s['224'] || 0) + (s['226'] || 0) + (s['230'] || 0));
  s['264'] = r2((s['234'] || 0) + (s['236'] || 0) + (s['238'] || 0) + (s['240'] || 0) + (s['242'] || 0) + (s['244'] || 0) + (s['250'] || 0) + (s['252'] || 0) + (s['254'] || 0) + (s['256'] || 0) + (s['262'] || 0));
  s['270'] = r2(s['232'] - s['264']);
  const totP = r2(s['232'] + (s['280'] || 0) + (s['290'] || 0));
  const totC = r2(s['264'] + (s['294'] || 0) + (s['300'] || 0) + (s['306'] || 0));
  s['310'] = r2(totP - totC); s['312'] = s['310'] >= 0 ? s['310'] : 0;
  return s;
}

// ---- BILAN 2033-A (page 1) ---- Actif Brut->342, Actif Net->448, Passif->565
const B = {
  '072': { r: 342, y: 353 }, '074': { r: 448, y: 353 }, '084': { r: 342, y: 382 }, '086': { r: 448, y: 382 },
  '110': { r: 342, y: 427 }, '112': { r: 448, y: 427 },
  '120': { r: 565, y: 470 }, '134': { r: 565, y: 544 }, '136': { r: 565, y: 558 }, '142': { r: 565, y: 603 },
  '156': { r: 565, y: 632 }, '166': { r: 565, y: 661 }, '175': { r: 565, y: 708 }, '176': { r: 565, y: 738 }, '180': { r: 565, y: 753 },
};
// Bilan de clôture N = ouverture (report N-1) + mouvements de l'exercice, en PARTIE DOUBLE.
//  - Trésorerie (512)          : vrai solde bancaire au 31/12 (Qonto).
//  - Créances clients (411)    : ouverture + factures ÉMISES de l'exercice (écritures manuelles produit, TTC).
//  - Dettes fournisseurs (401) : ouverture + factures REÇUES de l'exercice (écritures manuelles charge, TTC).
//  - Créance / dette de TVA    : crédit de TVA (actif) ou TVA à payer (passif) de l'exercice.
//  - Capitaux propres          : capital + report à nouveau + résultat N.
//  - Compte courant associé (455) : variable d'équilibre (débiteur = créance actif, créditeur = dette passif).
// -> Actif = Passif garanti, comme un logiciel de compta. @author Rabah Ziane - 2026-07-18
export function computeBilan(company, casesCR, treso, entries = []) {
  const rn = (company.report_a_nouveau && company.report_a_nouveau.comptes) || [];
  const bal = (pre) => rn.filter(c => String(c.account || '').startsWith(pre)).reduce((s, c) => s + (c.solde || 0), 0);
  const result = casesCR['310'] || 0;
  const capital = bal('101'), report = bal('11');
  const capitaux = r2(capital + report + result);

  // Mouvements de l'exercice : factures inter-société / manuelles non réglées en banque (accruals)
  // + position de TVA. Les opérations bancaires (source qonto) passent déjà par la trésorerie.
  let accrProduit = 0, accrCharge = 0, tvaColl = 0, tvaDed = 0;
  for (const e of entries) {
    if (e.source === 'manuel') {
      if (e.nature === 'produit') accrProduit += Number(e.amount || 0);        // facture émise -> créance TTC
      else if (e.nature === 'charge') accrCharge += -Number(e.amount || 0);    // facture reçue -> dette TTC
    }
    if (e.tva_sens === 'collectee') tvaColl += Number(e.tva_amount || 0);
    else if (e.tva_sens === 'deductible') tvaDed += Number(e.tva_amount || 0);
  }
  const creditTvaAnt = Number(company.tva_credit_anterieur || 0);
  const tvaSolde = r2(tvaColl - tvaDed - creditTvaAnt);          // >0 = à payer (dette), <0 = crédit (créance)
  const creanceTva = tvaSolde < 0 ? r2(-tvaSolde) : 0;
  const detteTva = tvaSolde > 0 ? r2(tvaSolde) : 0;

  const emprunts = r2(-bal('164'));
  const fournisseurs = r2(-bal('401') + accrCharge);            // ouverture + factures reçues de l'exercice
  const creancesHorsCC = r2(bal('46') + bal('41') + accrProduit + creanceTva);
  const dispo = r2(treso || 0);
  // Compte courant d'associé = variable d'équilibre.
  const diff = r2((capitaux + emprunts + fournisseurs + detteTva) - (creancesHorsCC + dispo));
  const creances = diff >= 0 ? r2(creancesHorsCC + diff) : creancesHorsCC;   // CC débiteur -> créance
  const autresDettes = diff < 0 ? r2(-diff) : 0;                              // CC créditeur -> dette
  const totalActif = r2(creances + dispo);
  const totalDettes = r2(emprunts + fournisseurs + detteTva + autresDettes);
  return { '072': creances, '074': creances, '084': dispo, '086': dispo, '110': totalActif, '112': totalActif,
    '120': capital, '134': report, '136': result, '142': capitaux,
    '156': emprunts, '166': fournisseurs, '175': autresDettes, '176': totalDettes, '180': totalActif };
}

export async function renderLiasse2033(company, entries, treso = 0) {
  const doc = await PDFDocument.load(fs.readFileSync(TEMPLATE));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const cases = computeCases2033(entries);
  for (const [num, v] of Object.entries(cases)) {
    const pos = C[num]; if (!pos || !v) continue;
    const pg = pages[pos.p], H = pg.getHeight();
    const t = fmt(v), w = font.widthOfTextAtSize(t, 8);
    pg.drawText(t, { x: pos.r - w, y: H - pos.y - 8, size: 8, font });
  }
  const p1 = pages[0], H1 = p1.getHeight();
  // Bilan 2033-A
  const bilan = computeBilan(company, cases, treso, entries);
  for (const [num, v] of Object.entries(bilan)) {
    const pos = B[num]; if (!pos) continue;
    const t = fmt(v), w = font.widthOfTextAtSize(t, 7);
    p1.drawText(t, { x: pos.r - w, y: H1 - pos.y - 7, size: 7, font });
  }
  const put = (x, y, t, s = 9) => t && p1.drawText(String(t), { x, y: H1 - y - 8, size: s, font });
  put(200, 92, company.name);
  put(120, 106, company.adresse || [company.code_postal, company.ville].filter(Boolean).join(' '), 8);
  put(90, 132, (company.siret || '').replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4'));
  put(540, 122, '31 / 12 / ' + (company.exercice?.annee_courante || 2025), 7);
  return Buffer.from(await doc.save());
}
