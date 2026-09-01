/**
 * PDF "synthèse cabinet" au format Sage (deux colonnes) :
 *   - Compte de résultat synthétique : CHARGES (gauche) / PRODUITS (droite), N et N-1.
 * Les lignes du PCG sont regroupées par préfixe de compte vers les postes officiels
 * du compte de résultat (achats, autres charges externes, impôts/taxes, personnel,
 * financier, exceptionnel, IS...). Rempli à partir des écritures catégorisées.
 * @author Rabah Ziane - 2026-07-18
 */
import PDFDocument from 'pdfkit';

const clean = (s) => String(s).replace(/[    ]/g, ' ');
const eur = (n) => (n ? clean(Math.round(n).toLocaleString('fr-FR')) : '');

// Regroupe les écritures (base HT) vers les postes du compte de résultat, par préfixe de compte.
export function mapCompteResultat(entries) {
  const P = { ventes_march: 0, production_vendue: 0, production_stockee: 0, production_immo: 0, subventions: 0, reprises: 0, autres_produits: 0, produits_financiers: 0, produits_except: 0 };
  const C = { achats_march: 0, var_stock_march: 0, achats_appro: 0, autres_charges_externes: 0, impots_taxes: 0, remuneration: 0, charges_sociales: 0, dot_amort: 0, dot_prov: 0, autres_charges: 0, charges_financieres: 0, charges_except: 0, impots_benefices: 0 };
  for (const e of entries) {
    if (!e.category_key || (e.nature !== 'produit' && e.nature !== 'charge')) continue;
    const ht = Number(e.amount_ht || 0);
    const a = String(e.account || '');
    if (e.nature === 'produit') {
      if (a.startsWith('707')) P.ventes_march += ht;
      else if (a.startsWith('70')) P.production_vendue += ht;   // 701-706 : ventes de biens/services
      else if (a.startsWith('71')) P.production_stockee += ht;
      else if (a.startsWith('72')) P.production_immo += ht;
      else if (a.startsWith('74')) P.subventions += ht;
      else if (a.startsWith('781') || a.startsWith('79')) P.reprises += ht;
      else if (a.startsWith('76')) P.produits_financiers += ht;
      else if (a.startsWith('77')) P.produits_except += ht;
      else P.autres_produits += ht;                            // 75x, 708...
    } else {
      if (a.startsWith('607')) C.achats_march += ht;
      else if (a.startsWith('601') || a.startsWith('602')) C.achats_appro += ht;
      else if (a.startsWith('603')) C.var_stock_march += ht;
      else if (a.startsWith('64')) { if (a.startsWith('645') || a.startsWith('646') || a.startsWith('647')) C.charges_sociales += ht; else C.remuneration += ht; }
      else if (a.startsWith('63')) C.impots_taxes += ht;
      else if (a.startsWith('66')) C.charges_financieres += ht;
      else if (a.startsWith('681')) C.dot_amort += ht;
      else if (a.startsWith('68')) C.dot_prov += ht;
      else if (a.startsWith('67')) C.charges_except += ht;
      else if (a.startsWith('69')) C.impots_benefices += ht;
      else if (a.startsWith('60') || a.startsWith('61') || a.startsWith('62')) C.autres_charges_externes += ht; // 604/605/61x/62x
      else C.autres_charges += ht;
    }
  }
  const totalProduitsExpl = P.ventes_march + P.production_vendue + P.production_stockee + P.production_immo + P.subventions + P.reprises + P.autres_produits + P.produits_financiers;
  const totalChargesExpl = C.achats_march + C.var_stock_march + C.achats_appro + C.autres_charges_externes + C.impots_taxes + C.remuneration + C.charges_sociales + C.dot_amort + C.dot_prov + C.autres_charges + C.charges_financieres;
  const totalProduits = totalProduitsExpl + P.produits_except;
  const totalCharges = totalChargesExpl + C.charges_except + C.impots_benefices;
  return { P, C, totalProduitsExpl, totalChargesExpl, totalProduits, totalCharges, resultat: totalProduits - totalCharges };
}

// Bilan synthétique format Sage. `bilan` = objet à clés Cerfa (sortie de liasse2033.computeBilan).
// Les montants négatifs (report/résultat déficitaire) sont affichés entre parenthèses.
export function renderBilanSynthetique(company, bilan) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 40, bottom: 40, left: 34, right: 34 } });
      const chunks = [];
      doc.on('data', (d) => chunks.push(d));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const N = bilan || {};
      const annee = company?.exercice?.annee_courante || new Date().getFullYear();
      const ink = '#1D1D1F', grey = '#6E6E73', line = '#C7C7CC';
      const L = 34, R = 807, midX = 421;
      const bl = (n) => (n < 0 ? '(' + eur(-n) + ')' : eur(n)); // parenthèses si négatif

      doc.fillColor(ink).font('Helvetica-Bold').fontSize(13).text('BILAN SYNTHÉTIQUE', L, 40, { width: R - L, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(company?.name || '-', L, 66);
      doc.font('Helvetica').fontSize(8.5).fillColor(grey).text(`Édition du 01/01/${annee} au 31/12/${annee}   ·   Hors brouillard   ·   Régime réel simplifié`, L, 80);

      // Colonnes ACTIF (Brut / Amort. / Net N / Net N-1) | PASSIF (Net N / Net N-1)
      const aLabel = { x: L + 4, w: 165 };
      const aBrut = { x: 200, w: 58 }, aAmort = { x: 260, w: 62 }, aNet = { x: 324, w: 44 }, aNet1 = { x: 370, w: 46 };
      const pLabel = { x: midX + 4, w: 240 };
      const pNet = { x: 690, w: 55 }, pNet1 = { x: 748, w: 54 };

      let y = 104;
      doc.rect(L, y, R - L, 22).fill('#F2F2F7');
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(7.5);
      doc.text('ACTIF', aLabel.x, y + 7, { width: aLabel.w });
      doc.text('Brut', aBrut.x, y + 7, { width: aBrut.w, align: 'right' });
      doc.text('Amort./Prov.', aAmort.x, y + 7, { width: aAmort.w, align: 'right' });
      doc.text(`Net ${annee}`, aNet.x, y + 7, { width: aNet.w, align: 'right' });
      doc.text(`Net ${annee - 1}`, aNet1.x, y + 7, { width: aNet1.w, align: 'right' });
      doc.text('PASSIF', pLabel.x, y + 7, { width: pLabel.w });
      doc.text(`Net ${annee}`, pNet.x, y + 7, { width: pNet.w, align: 'right' });
      doc.text(`Net ${annee - 1}`, pNet1.x, y + 7, { width: pNet1.w, align: 'right' });
      doc.moveTo(midX, y).lineTo(midX, y + 22).strokeColor(line).lineWidth(0.7).stroke();
      y += 26;
      const y0 = y, rowH = 14;

      const aRow = (label, brut, amort, net, opts = {}) => {
        doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 7.8 : 7.6).fillColor(ink);
        doc.text(label, aLabel.x + (opts.indent || 0), y, { width: aLabel.w });
        if (brut != null) doc.text(bl(brut), aBrut.x, y, { width: aBrut.w, align: 'right' });
        if (amort != null) doc.text(bl(amort), aAmort.x, y, { width: aAmort.w, align: 'right' });
        if (net != null) doc.text(bl(net), aNet.x, y, { width: aNet.w, align: 'right' });
        y += rowH;
      };
      const pRow = (yy, label, net, opts = {}) => {
        doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 7.8 : 7.6).fillColor(ink);
        doc.text(label, pLabel.x + (opts.indent || 0), yy, { width: pLabel.w });
        if (net != null) doc.text(bl(net), pNet.x, yy, { width: pNet.w, align: 'right' });
      };

      const creances = N['074'] || 0, dispo = N['086'] || 0, totalActif = N['112'] || 0;
      // ----- ACTIF -----
      aRow('Actif immobilisé', null, null, null, { bold: true });
      aRow('   Immobilisations incorporelles', 0, 0, 0);
      aRow('   Immobilisations corporelles', 0, 0, 0);
      aRow('   Immobilisations financières', 0, 0, 0);
      aRow('   TOTAL I', 0, 0, 0, { bold: true });
      aRow('Actif circulant', null, null, null, { bold: true });
      aRow('   Stocks et en-cours', null, null, null);
      aRow('   Créances clients et autres', creances, null, creances);
      aRow('   Valeurs mobilières de placement', null, null, null);
      aRow('   Disponibilités', dispo, null, dispo);
      aRow('   TOTAL II', totalActif, 0, totalActif, { bold: true });
      aRow('Charges constatées d\'avance (III)', null, null, null);
      aRow('TOTAL GÉNÉRAL (I+II+III)', totalActif, 0, totalActif, { bold: true });
      const yEnd = y;

      // ----- PASSIF -----
      let py = y0;
      pRow(py, 'Capitaux propres', null, { bold: true }); py += rowH;
      pRow(py, '   Capital', N['120'] || 0); py += rowH;
      pRow(py, '   Écarts de réévaluation / Réserves', null); py += rowH;
      pRow(py, '   Report à nouveau', N['134'] || 0); py += rowH;
      pRow(py, "   Résultat de l'exercice (bénéfice ou perte)", N['136'] || 0); py += rowH;
      pRow(py, '   Subventions / Provisions réglementées', null); py += rowH;
      pRow(py, '   TOTAL I', N['142'] || 0, { bold: true }); py += rowH;
      pRow(py, 'Provisions pour risques et charges (II)', null); py += rowH;
      pRow(py, 'Dettes', null, { bold: true }); py += rowH;
      pRow(py, '   Emprunts et dettes assimilées', N['156'] || 0); py += rowH;
      pRow(py, '   Fournisseurs et comptes rattachés', N['166'] || 0); py += rowH;
      pRow(py, '   Autres dettes (compte courant associé)', N['175'] || 0); py += rowH;
      pRow(py, '   TOTAL III', N['176'] || 0, { bold: true }); py += rowH;
      pRow(py, "Produits constatés d'avance (IV)", null); py += rowH;
      pRow(py, 'TOTAL GÉNÉRAL (I+II+III+IV)', N['180'] || 0, { bold: true });

      doc.rect(L, y0 - 4, R - L, yEnd - y0 + 8).strokeColor(line).lineWidth(0.7).stroke();
      doc.moveTo(midX, y0 - 4).lineTo(midX, yEnd + 4).strokeColor(line).lineWidth(0.7).stroke();

      doc.fontSize(7).fillColor('#B0B0B5').font('Helvetica')
        .text(`Bilan synthétique · ${company?.name || ''} · Exercice ${annee} · Généré par DELIVERY Digital Comptabilité`, L, 538, { width: R - L, align: 'center' });

      doc.end();
    } catch (e) { reject(e); }
  });
}

export function renderCompteResultatSynthetique(company, entries) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 40, bottom: 40, left: 34, right: 34 } });
      const chunks = [];
      doc.on('data', (d) => chunks.push(d));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const m = mapCompteResultat(entries);
      const annee = company?.exercice?.annee_courante || new Date().getFullYear();
      const ink = '#1D1D1F', grey = '#6E6E73', line = '#C7C7CC';
      const L = 34, R = 807; // A4 paysage : 842 - 34

      doc.fillColor(ink).font('Helvetica-Bold').fontSize(13).text('COMPTE DE RÉSULTAT SYNTHÉTIQUE', L, 40, { width: R - L, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(company?.name || '-', L, 66);
      doc.font('Helvetica').fontSize(8.5).fillColor(grey).text(`Édition du 01/01/${annee} au 31/12/${annee}   ·   Hors brouillard   ·   Régime réel simplifié`, L, 80);

      // Colonnes : bloc CHARGES (gauche) | bloc PRODUITS (droite)
      const midX = 421;
      const cLabel = { x: L + 4, w: 250 };
      const cN = { x: 288, w: 60 }, cN1 = { x: 352, w: 62 };
      const pLabel = { x: midX + 4, w: 250 };
      const pN = { x: 676, w: 60 }, pN1 = { x: 740, w: 62 };

      let y = 104;
      // En-têtes de colonnes
      doc.rect(L, y, R - L, 20).fill('#F2F2F7');
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(8);
      doc.text('CHARGES (Hors taxes)', cLabel.x, y + 6, { width: cLabel.w });
      doc.text(`Exercice N`, cN.x, y + 3, { width: cN.w, align: 'right' }); doc.fontSize(6.5).text('Net', cN.x, y + 12, { width: cN.w, align: 'right' });
      doc.fontSize(8).text(`Exercice N-1`, cN1.x, y + 3, { width: cN1.w, align: 'right' }); doc.fontSize(6.5).text('Net', cN1.x, y + 12, { width: cN1.w, align: 'right' });
      doc.fontSize(8).text('PRODUITS (Hors taxes)', pLabel.x, y + 6, { width: pLabel.w });
      doc.text(`Exercice N`, pN.x, y + 3, { width: pN.w, align: 'right' }); doc.fontSize(6.5).text('Net', pN.x, y + 12, { width: pN.w, align: 'right' });
      doc.fontSize(8).text(`Exercice N-1`, pN1.x, y + 3, { width: pN1.w, align: 'right' }); doc.fontSize(6.5).text('Net', pN1.x, y + 12, { width: pN1.w, align: 'right' });
      doc.moveTo(midX, y).lineTo(midX, y + 20).strokeColor(line).lineWidth(0.7).stroke();
      y += 24;

      const rowH = 14;
      const cRow = (label, val, opts = {}) => {
        doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 8 : 7.8).fillColor(ink);
        doc.text(label, cLabel.x + (opts.indent || 0), y, { width: cLabel.w });
        if (val) doc.text(eur(val), cN.x, y, { width: cN.w, align: 'right' });
        return rowH;
      };
      const pRow = (yy, label, val, opts = {}) => {
        doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 8 : 7.8).fillColor(ink);
        doc.text(label, pLabel.x + (opts.indent || 0), yy, { width: pLabel.w });
        if (val) doc.text(eur(val), pN.x, yy, { width: pN.w, align: 'right' });
      };

      const y0 = y;
      // ----- CHARGES (gauche) -----
      cRow("CHARGES D'EXPLOITATION", null, { bold: true }); y += rowH;
      cRow('Achats de marchandises', m.C.achats_march, { indent: 8 }); y += rowH;
      cRow('Achats / variation de stock', m.C.achats_appro + m.C.var_stock_march, { indent: 8 }); y += rowH;
      cRow('Autres charges externes', m.C.autres_charges_externes, { indent: 8 }); y += rowH;
      cRow('Impôts, taxes et versements assimilés', m.C.impots_taxes, { indent: 8 }); y += rowH;
      cRow('Rémunération du personnel', m.C.remuneration, { indent: 8 }); y += rowH;
      cRow('Charges sociales', m.C.charges_sociales, { indent: 8 }); y += rowH;
      cRow('Dotations aux amortissements', m.C.dot_amort, { indent: 8 }); y += rowH;
      cRow('Dotations aux provisions', m.C.dot_prov, { indent: 8 }); y += rowH;
      cRow('Autres charges', m.C.autres_charges, { indent: 8 }); y += rowH;
      cRow('CHARGES FINANCIÈRES', m.C.charges_financieres, { indent: 0 }); y += rowH + 2;
      cRow('TOTAL (I)', m.totalChargesExpl, { bold: true, indent: 8 }); y += rowH + 4;
      cRow('CHARGES EXCEPTIONNELLES (II)', m.C.charges_except, { bold: true }); y += rowH;
      cRow('IMPÔTS SUR LES BÉNÉFICES (III)', m.C.impots_benefices, { bold: true }); y += rowH + 4;
      cRow('TOTAL DES CHARGES (I+II+III)', m.totalCharges, { bold: true }); y += rowH + 6;
      const resPos = m.resultat >= 0;
      cRow(resPos ? 'BÉNÉFICE' : 'PERTE', resPos ? m.resultat : -m.resultat, { bold: true }); y += rowH;
      cRow('TOTAL GÉNÉRAL', m.totalCharges + (resPos ? m.resultat : 0), { bold: true }); y += rowH;
      const yEnd = y;

      // ----- PRODUITS (droite) -----
      let py = y0;
      pRow(py, "PRODUITS D'EXPLOITATION", null, { bold: true }); py += rowH;
      pRow(py, 'Ventes de marchandises', m.P.ventes_march, { indent: 8 }); py += rowH;
      pRow(py, 'Production vendue (biens et services)', m.P.production_vendue, { indent: 8 }); py += rowH;
      pRow(py, 'Production stockée', m.P.production_stockee, { indent: 8 }); py += rowH;
      pRow(py, 'Production immobilisée', m.P.production_immo, { indent: 8 }); py += rowH;
      pRow(py, "Subventions d'exploitation", m.P.subventions, { indent: 8 }); py += rowH;
      pRow(py, 'Reprises sur amort. et provisions', m.P.reprises, { indent: 8 }); py += rowH;
      pRow(py, 'Autres produits', m.P.autres_produits, { indent: 8 }); py += rowH;
      pRow(py, 'PRODUITS FINANCIERS', m.P.produits_financiers, { indent: 0 }); py += rowH + 2;
      pRow(py, 'TOTAL (I)', m.totalProduitsExpl, { bold: true, indent: 8 }); py += rowH + 4;
      pRow(py, 'PRODUITS EXCEPTIONNELS (II)', m.P.produits_except, { bold: true }); py += rowH + 4 + rowH;
      pRow(py, 'TOTAL DES PRODUITS (I+II)', m.totalProduits, { bold: true }); py += rowH + 6;
      pRow(py, resPos ? '' : 'BÉNÉFICE (report)', resPos ? 0 : (-m.resultat > 0 ? 0 : 0)); py += rowH;
      pRow(py, 'TOTAL GÉNÉRAL', m.totalProduits + (resPos ? 0 : -m.resultat), { bold: true });

      // Cadre + séparateur vertical
      doc.rect(L, y0 - 4, R - L, yEnd - y0 + 8).strokeColor(line).lineWidth(0.7).stroke();
      doc.moveTo(midX, y0 - 4).lineTo(midX, yEnd + 4).strokeColor(line).lineWidth(0.7).stroke();

      doc.fontSize(7).fillColor('#B0B0B5').font('Helvetica')
        .text(`Compte de résultat synthétique · ${company?.name || ''} · Exercice ${annee} · Généré par DELIVERY Digital Comptabilité`, L, 538, { width: R - L, align: 'center' });

      doc.end();
    } catch (e) { reject(e); }
  });
}
