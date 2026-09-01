/**
 * Génère le PDF « Programme de formation » (design de marque DELIVERY Digital,
 * logo net + bloc identité), avec le TARIF et le CONTENU dynamiques du programme.
 * Réplique la mise en page du programme brandé officiel. @author Rabah Ziane · 2026-07-10
 */
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const INK = '#111111';
const GREY = '#555555';
// WinAnsi n'encode pas U+202F/U+00A0 : nettoyage des espaces spéciaux.
const clean = (s) => String(s == null ? '' : s).replace(/[    ]/g, ' ');

function logoPath() {
  // Logo DELIVERY Digital (X coloré + texte) - PAS le logo DeliveryEat (scooter).
  const cands = [
    path.join(process.cwd(), 'public', 'logo-delivery-digital.png'),
    path.join(process.cwd(), 'dist', 'logo-delivery-digital.png'),
  ];
  for (const c of cands) { try { if (fs.existsSync(c)) return c; } catch {} }
  return null;
}

export function generateProgramPdf(p, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="programme-${(p.program_id || 'formation')}.pdf"`);
  doc.pipe(res);

  const L = 56;
  const W = doc.page.width - 112;

  // --- Logo (net) ---
  const lg = logoPath();
  if (lg) { try { doc.image(lg, L, 46, { width: 200 }); } catch {} }
  doc.y = 150;

  // --- Bloc identité organisme ---
  doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text('DELIVERY Digital Nice', L, doc.y);
  doc.font('Helvetica').fontSize(10.5).fillColor(INK);
  doc.text('Siret : 90294519500029', L);
  doc.text('470 promenade des Anglais, 06200 Nice', L);
  doc.text('Numéro de déclaration d’activité : 93061064306', L);
  doc.text('contact@deliverydigital.fr', L);
  doc.moveDown(1.4);

  // --- Titre centré ---
  doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text('Programme de formation', L, doc.y, { width: W, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(15).text(clean(p.title || ''), { width: W, align: 'center' });
  doc.moveDown(1.2);

  // --- Champs (label gras + valeur) ---
  const field = (label, value) => {
    if (value == null || value === '') return;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(label + ' : ', { continued: true });
    doc.font('Helvetica').text(clean(value));
    doc.moveDown(0.7);
  };
  field('Durée', (p.duration_hours || 21) + ' heures');
  field('Tarif', (p.price != null ? p.price : '') + ' € TTC par apprenant');
  field('Délai d’accès', p.access_delay || '1 semaine');
  field('Public visé', p.target_audience);
  field('Prérequis', p.prerequisites || 'Aucun prérequis');

  const heading = (t) => {
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(t);
    doc.moveDown(0.4);
  };
  const bullets = (items) => (items || []).forEach((it) => {
    doc.font('Helvetica').fontSize(10.5).fillColor(INK).text('•  ' + clean(it), { width: W, indent: 4 });
    doc.moveDown(0.15);
  });

  if ((p.objectives || []).length) { heading('Objectifs pédagogiques'); bullets(p.objectives); }

  if ((p.modules || []).length) {
    heading('Programme détaillé');
    (p.modules || []).forEach((mod) => {
      const h = mod.duration_hours || mod.hours;
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').fontSize(11.5).fillColor(INK).text(clean(mod.title) + (h ? '  (' + h + 'h)' : ''), { width: W });
      doc.moveDown(0.1);
      bullets(mod.topics || mod.points || mod.content);
    });
  }
  if ((p.methods || []).length) { heading('Moyens et méthodes pédagogiques'); bullets(p.methods); }
  if ((p.evaluation_methods || []).length) { heading('Modalités d’évaluation'); bullets(p.evaluation_methods); }
  if (p.accessibility_info) { heading('Accessibilité'); doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(clean(p.accessibility_info), { width: W }); }

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.font('Helvetica').fontSize(8).fillColor(GREY).text(
      'DELIVERY Digital Nice · SIRET 902 945 195 00029 · Déclaration d’activité 93061064306 · Certification QUALIOPI N°252411-3',
      L, doc.page.height - 40, { width: W, align: 'center' }
    );
  }
  doc.end();
}
