/**
 * Remplissage du formulaire officiel 2031-SD (déclaration de résultat BIC - IR).
 * L'équivalent du 2065 pour les entreprises à l'IR : identité, exercice, régime,
 * et cadre C (résultat fiscal BIC : bénéfice col.1 / déficit col.2). Le bénéfice
 * remonte ensuite sur la déclaration de revenus de l'exploitant (2042-C-PRO).
 * @author Rabah Ziane · 2026-07-08
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildLiasse } from './comptaEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(__dirname, 'cerfa', '2031-sd.pdf');
const fmt = n => Math.round(n || 0).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');

export async function renderLiasse2031(company, entries) {
  const doc = await PDFDocument.load(fs.readFileSync(TEMPLATE));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const P = doc.getPages()[0], H = P.getHeight();
  const put = (x, top, t, s = 8) => (t != null && t !== '') && P.drawText(String(t), { x, y: H - top - s, size: s, font });
  const putR = (rx, top, t, s = 8) => { if (t == null || t === '') return; const w = font.widthOfTextAtSize(String(t), s); P.drawText(String(t), { x: rx - w, y: H - top - s, size: s, font }); };

  const l = buildLiasse(company, entries);
  const y = company?.exercice?.annee_courante || 2025;

  // Exercice + régime simplifié
  put(145, 119, `01/01/${y}`, 7);
  put(95, 131, `31/12/${y}`, 7);
  put(430, 119, 'X', 9);                 // régime simplifié d'imposition

  // A - Identité
  put(185, 178, company.name, 8);
  put(130, 192, company.adresse || [company.code_postal, company.ville].filter(Boolean).join(' '), 7);
  const siren = String(company.siren || company.siret || '').replace(/\D/g, '').slice(0, 9);
  if (siren.length === 9) put(75, 229, siren.split('').join('  '), 8);

  // C - Récapitulation : résultat fiscal BIC (bénéfice col.1 / déficit col.2)
  const benefice = l.benefice_imposable != null ? l.benefice_imposable : (l.resultat_comptable || 0);
  if (benefice >= 0) {
    putR(515, 297, fmt(benefice), 8);    // 1. Résultat fiscal - Bénéfice col.1
    putR(515, 391, fmt(benefice), 8);    // 4. Bénéfice imposable col.1
  } else {
    putR(568, 297, fmt(-benefice), 8);   // Déficit col.2
    putR(568, 391, fmt(-benefice), 8);
  }
  return Buffer.from(await doc.save());
}
