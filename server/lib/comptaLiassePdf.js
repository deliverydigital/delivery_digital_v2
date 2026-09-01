/**
 * Génération PDF de la synthèse comptable officielle (style cabinet / Sage).
 * Produit un document A4 propre :
 *   - Bilan synthétique : ACTIF (Brut / Amort.-Prov. / Net N / Net N-1)
 *                         PASSIF (Net N / Net N-1)
 *   - Compte de résultat (produits / charges / résultat, N et N-1)
 *   - Détermination de l'impôt (IS après imputation des déficits) + récap TVA
 * Les données N proviennent des écritures catégorisées ; N-1 du report à nouveau.
 *
 * @author Rabah Ziane · 2026-07-08
 */
import PDFDocument from 'pdfkit';

// pdfkit/Helvetica (WinAnsi) n'encode pas l'espace fine insécable (U+202F) ni
// l'insécable (U+00A0) que produit toLocaleString('fr-FR') -> on les remplace
// par une espace ASCII normale.
const clean = (s) => String(s).replace(/[\u202f\u00a0\u2007\u2009]/g, ' ');
const eur = (n) => clean(Math.round(n || 0).toLocaleString('fr-FR'));
const money = (n) => clean((n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export function renderLiassePdf(company, liasse, resultat, bilan) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 42, bottom: 46, left: 40, right: 40 } });
      const chunks = [];
      doc.on('data', (d) => chunks.push(d));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const L = 40, R = 555, W = R - L;
      const N = (bilan && bilan.N) || {}, N1 = (bilan && bilan.N1) || {};
      const annee = (bilan && bilan.annee) || company?.exercice?.annee_courante || new Date().getFullYear();
      const ink = '#1D1D1F', grey = '#6E6E73', line = '#D2D2D7';

      // ---------- En-tête ----------
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(16).text('DELIVERY Digital', L, 42);
      doc.font('Helvetica').fontSize(9).fillColor(grey).text('Comptabilité', R - 150, 47, { width: 150, align: 'right' });
      doc.moveTo(L, 66).lineTo(R, 66).strokeColor(line).lineWidth(1).stroke();

      doc.fillColor(ink).font('Helvetica-Bold').fontSize(19).text('Bilan & Compte de résultat', L, 78);
      doc.font('Helvetica').fontSize(10).fillColor(grey)
        .text(`${company?.name || '-'}${company?.siret ? '  ·  SIRET ' + company.siret : ''}`, L, 104)
        .text(`Exercice du 01/01/${annee} au 31/12/${annee}  ·  Régime ${liasse?.regime_fiscal || 'IS'} réel simplifié`, L, 118);

      // Helpers table ----------------------------------------------------------
      const section = (title, y) => {
        doc.rect(L, y, W, 18).fill('#F2F2F7');
        doc.fillColor(ink).font('Helvetica-Bold').fontSize(9.5).text(title, L + 8, y + 5);
        return y + 18;
      };
      const cols4 = [
        { x: L + 6, w: 210, align: 'left' },
        { x: 258, w: 72, align: 'right' },
        { x: 332, w: 72, align: 'right' },
        { x: 406, w: 68, align: 'right' },
        { x: 476, w: 73, align: 'right' },
      ];
      const cols2 = [
        { x: L + 6, w: 360, align: 'left' },
        { x: 408, w: 66, align: 'right' },
        { x: 476, w: 73, align: 'right' },
      ];
      const row = (cols, cells, y, opts = {}) => {
        const { bold, size = 8.5, color = ink, rule } = opts;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color);
        cells.forEach((t, i) => t !== '' && t != null && doc.text(String(t), cols[i].x, y, { width: cols[i].w, align: cols[i].align }));
        if (rule) doc.moveTo(L, y + 12).lineTo(R, y + 12).strokeColor(line).lineWidth(rule === 2 ? 1 : 0.5).stroke();
        return y + (opts.h || 13);
      };

      // ---------- BILAN : ACTIF ----------
      let y = 142;
      y = section('BILAN SYNTHÉTIQUE  —  ACTIF', y) + 2;
      y = row(cols4, ['', 'Brut', 'Amort./Prov.', `Net ${annee}`, `Net ${annee - 1}`], y, { bold: true, size: 7.5, color: grey, rule: 1 }) + 1;
      const creaB = N['074'] || 0, dispoB = N['086'] || 0;
      y = row(cols4, ['Actif immobilisé', '', '', eur(0), eur(0)], y, { bold: true });
      y = row(cols4, ['Actif circulant', '', '', '', ''], y, { bold: true });
      y = row(cols4, ['   Créances (comptes courants, clients)', eur(creaB), '', eur(creaB), eur(N1.creances)], y);
      y = row(cols4, ['   Disponibilités', eur(dispoB), '', eur(dispoB), eur(N1.dispo)], y);
      y = row(cols4, ['TOTAL GÉNÉRAL ACTIF', eur(N['112']), eur(0), eur(N['112']), eur(N1.totalActif)], y, { bold: true, rule: 2, h: 15 });

      // ---------- BILAN : PASSIF ----------
      y += 6;
      y = section('BILAN SYNTHÉTIQUE  —  PASSIF', y) + 2;
      y = row(cols2, ['', `Net ${annee}`, `Net ${annee - 1}`], y, { bold: true, size: 7.5, color: grey, rule: 1 }) + 1;
      y = row(cols2, ['Capitaux propres', '', ''], y, { bold: true });
      y = row(cols2, ['   Capital social', eur(N['120']), eur(N1.capital)], y);
      y = row(cols2, ['   Report à nouveau', eur(N['134']), eur(N1.report)], y);
      y = row(cols2, ["   Résultat de l'exercice", eur(N['136']), eur(N1.resultat)], y);
      y = row(cols2, ['   Total capitaux propres (I)', eur(N['142']), eur(N1.capitaux)], y, { bold: true, rule: 1 });
      y = row(cols2, ['Dettes', '', ''], y, { bold: true });
      y = row(cols2, ['   Emprunts et dettes assimilées', eur(N['156']), eur(N1.emprunts)], y);
      y = row(cols2, ['   Fournisseurs et avances reçues', eur(N['166']), eur(N1.fournisseurs)], y);
      y = row(cols2, ['   Autres dettes (comptes courants associés)', eur(N['175']), eur(N1.autresDettes)], y);
      y = row(cols2, ['   Total dettes (III)', eur(N['176']), eur(N1.emprunts + N1.fournisseurs + N1.autresDettes)], y, { bold: true, rule: 1 });
      y = row(cols2, ['TOTAL GÉNÉRAL PASSIF', eur(N['180']), eur(N1.totalActif)], y, { bold: true, rule: 2, h: 15 });

      // ---------- COMPTE DE RÉSULTAT ----------
      y += 8;
      y = section('COMPTE DE RÉSULTAT SIMPLIFIÉ', y) + 2;
      y = row(cols2, ['', `${annee}`, `${annee - 1}`], y, { bold: true, size: 7.5, color: grey, rule: 1 }) + 1;
      y = row(cols2, ["Produits d'exploitation (chiffre d'affaires)", money(resultat?.produits), ''], y);
      y = row(cols2, ["Charges d'exploitation", money(resultat?.charges), ''], y);
      y = row(cols2, ["RÉSULTAT DE L'EXERCICE", money(resultat?.resultat), money(bilan?.resultatN1)], y, { bold: true, rule: 2, h: 15 });

      // ---------- IMPÔT + TVA ----------
      y += 8;
      y = section("DÉTERMINATION DE L'IMPÔT ET TVA", y) + 4;
      const c2 = [{ x: L + 6, w: 360, align: 'left' }, { x: 340, w: 209, align: 'right' }];
      const put = (label, val, opts = {}) => { y = row(c2, [label, val], y, opts); };
      if ((liasse?.regime_fiscal || 'IS') === 'IS') {
        put('Résultat fiscal avant imputation des déficits', money(liasse?.resultat_avant_deficit ?? resultat?.resultat));
        put('Déficits antérieurs imputés', '- ' + money(liasse?.deficit_impute || 0));
        put('Résultat fiscal imposable', money(liasse?.resultat_fiscal || 0), { bold: true });
        put('Impôt sur les sociétés (IS) estimé', money(liasse?.impot_estime || 0), { bold: true });
        if (liasse?.deficit_restant) put('Déficit restant à reporter', money(liasse.deficit_restant), { color: grey });
        if (liasse?.credit_impot_cii) {
          put(`Crédit d'Impôt Innovation (CII 20 % sur ${eur(liasse?.cii?.base_retenue || 0)} €)`, money(liasse.credit_impot_cii), { bold: true });
          if (liasse?.cii_restituable) put("  dont créance restituable par l'État", money(liasse.cii_restituable), { color: grey });
        }
      }
      const tva = liasse?.tva || {};
      y += 4;
      put('TVA collectée', money(tva.collectee));
      put('TVA déductible', money(tva.deductible));
      if (tva.credit_reporte) put('Crédit de TVA reporté (N-1)', money(tva.credit_reporte));
      put(tva.sens === 'credit' ? 'Crédit de TVA' : 'TVA à payer', money(Math.abs(tva.solde || 0)), { bold: true });

      // ---------- Pied ----------
      doc.fontSize(7).fillColor('#B0B0B5').font('Helvetica')
        .text(`Synthèse générée par DELIVERY Digital Comptabilité · Exercice N = ${annee}, N-1 = ${annee - 1}`, L, 804, { width: W, align: 'center' });

      doc.end();
    } catch (e) { reject(e); }
  });
}
