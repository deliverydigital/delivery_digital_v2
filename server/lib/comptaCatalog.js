/**
 * Catalogue de catégorisation comptable (inspiré Indy) + mapping vers le Plan
 * Comptable Général français. Chaque catégorie porte :
 *   - key    : identifiant stable
 *   - label  : libellé affiché
 *   - account: numéro de compte PCG (racine)
 *   - nature : 'produit' | 'charge' | 'immobilisation' | 'neutre' | 'tva'
 *              -> pilote le compte de résultat (produit/charge), le bilan
 *                 (immobilisation), ou est neutre (trésorerie, capital, emprunt).
 *   - tva    : taux de TVA par défaut (0 | 5.5 | 10 | 20)
 *
 * @author Rabah Ziane - 2026-07-07
 */

export const COMPTA_GROUPS = [
  {
    key: 'revenus', label: 'Revenus', color: '#22c55e',
    items: [
      { key: 'vente_produits_finis', label: 'Vente de produits finis', account: '701', nature: 'produit', tva: 20 },
      { key: 'vente_service', label: 'Vente de service', account: '706', nature: 'produit', tva: 20 },
      // Formation professionnelle : produit EXONÉRÉ de TVA (CGI art. 261-4-4°a,
      // organisme déclaré). Concerne les financements OPCO/AKTO. Compte 706.
      // @author Rabah Ziane - 2026-07-16
      { key: 'vente_formation', label: 'Prestation de formation (exonérée TVA)', account: '706', nature: 'produit', tva: 0 },
      { key: 'vente_services_annexes', label: 'Vente de services annexes', account: '708', nature: 'produit', tva: 20 },
      { key: 'autres_gains_divers', label: 'Autres gains divers', account: '758', nature: 'produit', tva: 0 },
      { key: 'vente_immobilisation', label: "Vente d'une immobilisation", account: '775', nature: 'produit', tva: 20 },
      { key: 'vente_titre_participation', label: 'Vente de titre de participation', account: '767', nature: 'produit', tva: 0 },
      { key: 'vente_marchandise', label: 'Vente de marchandise', account: '707', nature: 'produit', tva: 20 },
      { key: 'gain_change', label: 'Gain de change', account: '766', nature: 'produit', tva: 0 },
      { key: 'apport_associe', label: "Apport d'associé", account: '455', nature: 'neutre', tva: 0 },
      { key: 'depot_especes', label: "Dépôt d'espèces", account: '531', nature: 'neutre', tva: 0 },
      { key: 'emprunt_revenu', label: 'Emprunt', account: '164', nature: 'neutre', tva: 0 },
      { key: 'subvention_investissement', label: "Subventions d'investissement", account: '131', nature: 'neutre', tva: 0 },
      { key: 'subvention_exploitation', label: "Aides et subventions d'exploitation", account: '740', nature: 'produit', tva: 0 },
      { key: 'indemnites_assurances', label: "Indemnités d'assurances", account: '791', nature: 'produit', tva: 0 },
      { key: 'caution_recue_rendue_rev', label: 'Caution reçue ou rendue', account: '275', nature: 'neutre', tva: 0 },
      { key: 'capital', label: 'Capital', account: '101', nature: 'neutre', tva: 0 },
      { key: 'primes_emission', label: "Primes d'émission", account: '104', nature: 'neutre', tva: 0 },
    ],
  },
  {
    key: 'remunerations', label: 'Rémunérations', color: '#f97316',
    items: [
      { key: 'salaires', label: 'Salaires', account: '641', nature: 'charge', tva: 0 },
      { key: 'prelevement_source', label: 'Prélèvement à la source', account: '4421', nature: 'neutre', tva: 0 },
      { key: 'cotisations_sociales', label: 'Cotisations sociales', account: '645', nature: 'charge', tva: 0 },
      { key: 'titres_restaurants', label: 'Titres restaurants', account: '6474', nature: 'charge', tva: 0 },
      { key: 'cheques_vacances', label: 'Chèques vacances', account: '6474', nature: 'charge', tva: 0 },
      { key: 'autres_charges_sociales', label: 'Autres charges sociales', account: '648', nature: 'charge', tva: 0 },
      { key: 'personnel_interimaire', label: 'Personnel intérimaire', account: '6211', nature: 'charge', tva: 20 },
      { key: 'retrocession_versee', label: 'Rétrocession versée', account: '6228', nature: 'charge', tva: 0 },
      { key: 'indemnites_journalieres', label: 'Indemnités journalières reçues', account: '791', nature: 'produit', tva: 0 },
    ],
  },
  {
    key: 'fonctionnement', label: 'Fonctionnement', color: '#38bdf8',
    items: [
      { key: 'immobilisation_corporelle', label: 'Immobilisation corporelle', account: '215', nature: 'immobilisation', tva: 20 },
      { key: 'autre_immo_financiere', label: 'Autre immobilisation financière', account: '271', nature: 'immobilisation', tva: 0 },
      { key: 'titres_participation', label: 'Titres de participation', account: '261', nature: 'immobilisation', tva: 0 },
      { key: 'frais_acquisition_titres', label: "Frais d'acquisition sur titres de participation", account: '627', nature: 'charge', tva: 20 },
      { key: 'autre_immo_incorporelle', label: 'Autre immo. incorporelle', account: '205', nature: 'immobilisation', tva: 20 },
      { key: 'fonds_commercial', label: 'Fonds commercial', account: '206', nature: 'immobilisation', tva: 0 },
      { key: 'matiere_premiere', label: 'Matière première et consommables de production', account: '601', nature: 'charge', tva: 20 },
      { key: 'prestation_service', label: 'Prestation de service', account: '604', nature: 'charge', tva: 20 },
      { key: 'sous_traitance', label: 'Sous-traitance', account: '611', nature: 'charge', tva: 20 },
      { key: 'remboursement_associe', label: "Remboursement d'associé", account: '455', nature: 'neutre', tva: 0 },
      { key: 'retrait_especes', label: "Retrait d'espèces", account: '531', nature: 'neutre', tva: 0 },
      { key: 'honoraires_divers', label: 'Honoraires divers', account: '6226', nature: 'charge', tva: 20 },
      { key: 'materiel_outillage', label: 'Matériel et outillage', account: '2154', nature: 'immobilisation', tva: 20 },
      { key: 'perte_change', label: 'Perte de change', account: '666', nature: 'charge', tva: 0 },
      { key: 'frais_divers', label: 'Frais divers', account: '628', nature: 'charge', tva: 20 },
      { key: 'marchandise_revente', label: 'Marchandise pour la revente', account: '607', nature: 'charge', tva: 20 },
      { key: 'internet_telephone', label: 'Internet, téléphone et frais postaux', account: '626', nature: 'charge', tva: 20 },
      { key: 'frais_acte_contentieux', label: "Frais d'acte et de contentieux", account: '6227', nature: 'charge', tva: 20 },
    ],
  },
  {
    key: 'deplacements', label: 'Déplacements', color: '#14b8a6',
    items: [
      { key: 'frais_deplacement', label: 'Frais de déplacement', account: '6251', nature: 'charge', tva: 10 },
      { key: 'reception_congres', label: 'Réception et congrès', account: '6257', nature: 'charge', tva: 20 },
      { key: 'restaurant_repas', label: "Restaurant et repas d'affaires", account: '6257', nature: 'charge', tva: 10 },
      { key: 'credit_bail_vehicule', label: 'Crédit-bail véhicule', account: '6122', nature: 'charge', tva: 20 },
      { key: 'vehicule_carburant', label: 'Véhicule et carburant', account: '6061', nature: 'charge', tva: 20 },
    ],
  },
  {
    key: 'frais_fixes', label: 'Frais fixes', color: '#ec4899',
    items: [
      { key: 'a_categoriser', label: 'À catégoriser', account: '471', nature: 'neutre', tva: 0 },
      { key: 'loyers_charges', label: 'Loyers et charges locatives', account: '6132', nature: 'charge', tva: 20 },
      { key: 'abonnement_logiciel', label: 'Abonnement logiciel', account: '6226', nature: 'charge', tva: 20 },
      { key: 'eau_gaz_electricite', label: 'Eau, gaz, électricité', account: '6061', nature: 'charge', tva: 20 },
      { key: 'entretien_reparation', label: 'Entretien et réparation', account: '615', nature: 'charge', tva: 20 },
      { key: 'assurance_professionnelle', label: 'Assurance professionnelle', account: '616', nature: 'charge', tva: 0 },
      { key: 'caution_recue_rendue', label: 'Caution reçue ou rendue', account: '275', nature: 'neutre', tva: 0 },
      { key: 'depots_cautionnements', label: 'Dépôts et cautionnements versés ou récupérés', account: '275', nature: 'neutre', tva: 0 },
      { key: 'interet_emprunt', label: "Intérêt d'emprunt et Agio", account: '661', nature: 'charge', tva: 0 },
      { key: 'frais_bancaires', label: 'Frais bancaires', account: '627', nature: 'charge', tva: 20 },
      { key: 'emprunt_frais', label: 'Emprunt', account: '164', nature: 'neutre', tva: 0 },
      { key: 'carte_debit_differe', label: 'Carte à débit différé', account: '512', nature: 'neutre', tva: 0 },
      { key: 'location_materiel', label: 'Location de matériel', account: '6135', nature: 'charge', tva: 20 },
      { key: 'dons', label: 'Dons', account: '6238', nature: 'charge', tva: 0 },
      { key: 'redevances', label: 'Redevances', account: '651', nature: 'charge', tva: 20 },
      { key: 'charges_exceptionnelles', label: 'Charges exceptionnelles', account: '671', nature: 'charge', tva: 0 },
    ],
  },
  {
    key: 'taxes', label: 'Taxes', color: '#8b5cf6',
    items: [
      { key: 'impots_benefices', label: 'Impôts sur les bénéfices', account: '695', nature: 'charge', tva: 0 },
      { key: 'cfe', label: 'CFE', account: '63511', nature: 'charge', tva: 0 },
      { key: 'retenues_dividendes', label: 'Retenues sur dividendes', account: '457', nature: 'neutre', tva: 0 },
      { key: 'tva_payee', label: 'TVA payée', account: '44566', nature: 'tva', tva: 0 },
      { key: 'remboursement_tva', label: 'Remboursement de TVA', account: '44567', nature: 'tva', tva: 0 },
      { key: 'cotisations_professionnelles', label: 'Cotisations professionnelles', account: '6226', nature: 'charge', tva: 0 },
      { key: 'taxe_vehicules', label: 'Taxe sur les véhicules', account: '6355', nature: 'charge', tva: 0 },
      { key: 'amende', label: 'Amende', account: '6712', nature: 'charge', tva: 0 },
      { key: 'autres_impots_taxes', label: 'Autres impôts et taxes', account: '637', nature: 'charge', tva: 0 },
    ],
  },
  {
    key: 'tresorerie', label: 'Trésorerie / Neutre', color: '#64748b',
    items: [
      // Mouvements neutres : hors compte de résultat et hors TVA.
      { key: 'virement_interne', label: 'Virement interne (compte à compte)', account: '580', nature: 'neutre', tva: 0 },
      { key: 'a_categoriser_neutre', label: 'Autre mouvement neutre', account: '471', nature: 'neutre', tva: 0 },
    ],
  },
];

// Index plat key -> {..., group}
export const CATEGORY_BY_KEY = (() => {
  const m = {};
  for (const g of COMPTA_GROUPS) for (const it of g.items) m[it.key] = { ...it, group: g.key, groupLabel: g.label, groupColor: g.color };
  return m;
})();

export function categoryInfo(key) {
  return CATEGORY_BY_KEY[key] || null;
}
