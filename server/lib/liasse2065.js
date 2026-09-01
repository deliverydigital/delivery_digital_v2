/**
 * Remplissage du formulaire officiel 2065-SD (déclaration de résultat IS) - PDF plat.
 * Cadre A (identité), exercice, régime, cadre B (activité), cadre C (résultat fiscal),
 * cadre F (comptabilité informatisée). Le détail bilan/résultat est sur les 2033.
 * @author Rabah Ziane · 2026-07-08
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildLiasse } from './comptaEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(__dirname, 'cerfa', '2065-sd.pdf');
const fmt = n => Math.round(n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ');

export async function renderLiasse2065(company, entries) {
  const doc = await PDFDocument.load(fs.readFileSync(TEMPLATE));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const P = doc.getPages()[0], H = P.getHeight();
  const put = (x, top, t, s = 8) => (t != null && t !== '') && P.drawText(String(t), { x, y: H - top - s, size: s, font });
  const putR = (rx, top, t, s = 8) => { if (t == null || t === '') return; const w = font.widthOfTextAtSize(String(t), s); P.drawText(String(t), { x: rx - w, y: H - top - s, size: s, font }); };

  const l = buildLiasse(company, entries);
  const y = company?.exercice?.annee_courante || 2025;

  // Exercice + régime
  put(150, 103, `01/01/${y}`, 7);
  put(252, 103, `31/12/${y}`, 7);
  put(305, 103, 'X', 9);                 // régime simplifié d'imposition

  // Cadre A - identité
  put(130, 178, company.name, 8);
  put(315, 186, company.adresse || [company.code_postal, company.ville].filter(Boolean).join(' '), 7);
  const siret = String(company.siret || '').replace(/\D/g, '');
  if (siret.length === 14) put(74, 193, siret.split('').join('  '), 7);

  // Cadre B - activité
  put(130, 293, company.activite || 'Programmation, conseil et autres activités informatiques', 7);

  // Cadre C - résultat fiscal (après imputation des déficits antérieurs)
  const rf = l.resultat_fiscal || 0;
  if (rf >= 0) putR(250, 337, fmt(rf), 8);        // bénéfice imposable à 15 % (PME)
  else putR(553, 319, fmt(-rf), 8);               // déficit

  // Cadre F - comptabilité informatisée
  put(258, 594, 'X', 8);                           // OUI (case après le libellé)
  put(470, 594, 'DELIVERY Digital', 7);            // logiciel utilisé

  return Buffer.from(await doc.save());
}
