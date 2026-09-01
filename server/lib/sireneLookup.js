/**
 * Recherche d'entreprise par SIREN / SIRET / nom via l'API publique gratuite
 * `recherche-entreprises.api.gouv.fr` (données Sirene officielles, sans clé).
 * Sert à auto-remplir la fiche entreprise du module Comptabilité.
 *
 * @author Rabah Ziane · 2026-07-07
 */

const API = 'https://recherche-entreprises.api.gouv.fr/search';

// Codes catégorie juridique INSEE (niveau III) -> notre enum forme.
function mapForme(nat) {
  const c = String(nat || '');
  if (c.startsWith('1')) return 'EI';       // entrepreneur individuel
  if (c === '5498') return 'EURL';          // SARL unipersonnelle
  if (c.startsWith('54')) return 'SARL';    // SARL et assimilées
  if (c === '5710') return 'SAS';           // société par actions simplifiée
  if (c === '5720') return 'SASU';
  if (c.startsWith('57')) return 'SAS';
  if (c.startsWith('65')) return 'SCI';     // sociétés civiles (dont SCI 6540)
  return 'autre';
}

// Clé TVA intracommunautaire française : (12 + 3*(SIREN % 97)) % 97.
export function tvaIntraFR(siren) {
  const s = String(siren || '').replace(/\D/g, '');
  if (s.length !== 9) return null;
  const key = (12 + 3 * (Number(s) % 97)) % 97;
  return `FR${String(key).padStart(2, '0')}${s}`;
}

/**
 * @param {string} q  SIREN (9), SIRET (14) ou raison sociale.
 * @returns {Promise<Array>} jusqu'à 5 entreprises normalisées.
 */
export async function rechercheEntreprise(q) {
  const query = String(q || '').trim();
  if (!query) return [];
  const digits = query.replace(/\D/g, '');
  // Si SIREN/SIRET saisi, on cible précisément ; sinon recherche texte.
  const param = (digits.length === 9 || digits.length === 14) ? digits : query;

  const url = `${API}?q=${encodeURIComponent(param)}&page=1&per_page=5`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`sirene_http_${res.status}`);
  const data = await res.json();

  return (data.results || []).map((r) => {
    const s = r.siege || {};
    const siren = r.siren;
    return {
      name: r.nom_raison_sociale || r.nom_complet || '',
      siren,
      siret: s.siret || null,
      forme: mapForme(r.nature_juridique),
      nature_juridique: r.nature_juridique || null,
      tva_intra: tvaIntraFR(siren),
      code_ape: r.activite_principale || s.activite_principale || null,
      libelle_ape: r.libelle_activite_principale || null,
      adresse: s.adresse || s.geo_adresse || null,
      code_postal: s.code_postal || null,
      ville: s.libelle_commune || null,
      date_creation: r.date_creation || null,
      etat: r.etat_administratif || (s.etat_administratif) || null, // A = actif, C = cessé
    };
  });
}
