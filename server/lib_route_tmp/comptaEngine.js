/**
 * Moteur de calcul comptable (style Indy).
 *  - applyCategory : catégorise une écriture -> compte PCG, nature, TVA (HT/TVA/sens).
 *  - computeResultat : compte de résultat (produits - charges) à partir du HT.
 *  - computeTva : TVA collectée / déductible / crédit ou dû sur une période.
 *  - buildChecklist : "ce qui reste à faire" pour aller jusqu'à la liasse.
 *  - buildLiasse : agrégats de la liasse fiscale selon le régime (IS / IR).
 *
 * @author Rabah Ziane · 2026-07-07
 */
import { categoryInfo } from './comptaCatalog.js';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Applique une catégorie à une écriture. Renvoie les champs comptables dérivés.
 * @param {number} amountSigned montant signé (négatif = décaissement)
 * @param {string} categoryKey  clé du catalogue
 * @param {number} [tvaOverride] taux de TVA forcé (sinon défaut de la catégorie)
 */
export function applyCategory(amountSigned, categoryKey, tvaOverride) {
  const cat = categoryInfo(categoryKey);
  if (!cat) return { category_key: null, status: 'a_categoriser' };

  const ttc = Math.abs(Number(amountSigned) || 0);
  const rate = tvaOverride != null ? Number(tvaOverride) : Number(cat.tva || 0);
  const ht = rate > 0 ? ttc / (1 + rate / 100) : ttc;
  const tva = ttc - ht;

  let tva_sens = 'aucune';
  if (rate > 0) {
    if (cat.nature === 'produit') tva_sens = 'collectee';
    else if (cat.nature === 'charge' || cat.nature === 'immobilisation') tva_sens = 'deductible';
  }

  return {
    category_key: categoryKey,
    account: cat.account,
    nature: cat.nature,
    tva_rate: rate,
    amount_ht: r2(ht),
    tva_amount: r2(tva),
    tva_sens,
    status: 'categorisee',
  };
}

/** Compte de résultat : agrège les écritures catégorisées (base HT). */
export function computeResultat(entries) {
  let produits = 0, charges = 0;
  const byCategory = {};
  for (const e of entries) {
    if (!e.category_key || (e.nature !== 'produit' && e.nature !== 'charge')) continue;
    const ht = Number(e.amount_ht || 0);
    if (e.nature === 'produit') produits += ht; else charges += ht;
    const k = e.category_key;
    byCategory[k] = byCategory[k] || { category_key: k, account: e.account, nature: e.nature, total_ht: 0, count: 0 };
    byCategory[k].total_ht = r2(byCategory[k].total_ht + ht);
    byCategory[k].count += 1;
  }
  return {
    produits: r2(produits),
    charges: r2(charges),
    resultat: r2(produits - charges),
    byCategory: Object.values(byCategory).sort((a, b) => b.total_ht - a.total_ht),
  };
}

/** TVA sur une liste d'écritures (période déjà filtrée en amont). */
export function computeTva(entries, creditAnterieur = 0) {
  let collectee = 0, deductible = 0;
  for (const e of entries) {
    if (e.tva_sens === 'collectee') collectee += Number(e.tva_amount || 0);
    else if (e.tva_sens === 'deductible') deductible += Number(e.tva_amount || 0);
  }
  // Crédit de TVA reporté de l'année précédente (ligne 24 CA12) = à déduire.
  const credit = Number(creditAnterieur || 0);
  const solde = collectee - deductible - credit; // >0 = à payer, <0 = crédit
  return {
    collectee: r2(collectee),
    deductible: r2(deductible),
    credit_reporte: r2(credit),
    solde: r2(solde),
    sens: solde >= 0 ? 'a_payer' : 'credit',
  };
}

/**
 * "Ce qui reste à faire" pour arriver à la liasse fiscale officielle.
 * Chaque étape : { key, label, done, detail, blocking }.
 */
export function buildChecklist(company, entries) {
  const aCategoriser = entries.filter(e => e.status === 'a_categoriser').length;
  // Justificatifs attendus sur les charges/immos (pièces obligatoires).
  const besoinJustif = entries.filter(e => (e.nature === 'charge' || e.nature === 'immobilisation') && !e.justificatif).length;
  const total = entries.length;
  // Lignes "vérifiées" = pointées en vert (clic) par l'utilisateur.
  const reviewed = entries.filter(e => e.reviewed).length;
  const allReviewed = total > 0 && reviewed === total;

  const steps = [
    {
      key: 'qonto',
      label: 'Connecter le compte bancaire (Qonto)',
      done: !!company?.qonto?.connected,
      detail: company?.qonto?.connected ? `Dernière synchro : ${company.qonto.last_sync_at ? new Date(company.qonto.last_sync_at).toLocaleDateString('fr-FR') : '-'}` : 'Non connecté',
      blocking: true,
    },
    {
      key: 'report',
      label: "Reprendre la compta de l'année précédente (report à nouveau)",
      done: !!company?.report_a_nouveau?.saisi,
      detail: company?.report_a_nouveau?.saisi ? `Report ${company.report_a_nouveau.annee || ''} saisi` : 'Bilan d\'ouverture manquant',
      blocking: true,
    },
    {
      key: 'import',
      label: 'Importer les transactions de l\'exercice',
      done: total > 0,
      detail: `${total} transaction(s) importée(s)`,
      blocking: true,
    },
    {
      key: 'categorisation',
      label: 'Catégoriser toutes les transactions',
      done: total > 0 && aCategoriser === 0,
      detail: aCategoriser === 0 ? 'Tout est catégorisé' : `${aCategoriser} à catégoriser`,
      blocking: true,
    },
    {
      key: 'justificatifs',
      label: 'Joindre les justificatifs (charges & immobilisations)',
      // Attestation globale (option A) : l'utilisateur déclare détenir toutes ses pièces.
      done: besoinJustif === 0 || !!company?.justificatifs_atteste,
      detail: company?.justificatifs_atteste ? 'Pièces attestées détenues (dossier)' : (besoinJustif === 0 ? 'Justificatifs complets' : `${besoinJustif} pièce(s) manquante(s) — ou attester le dossier`),
      blocking: false,
    },
    {
      key: 'tva',
      label: 'Rapprocher et déclarer la TVA',
      // Vérifié dès que TOUTES les lignes sont pointées en vert (clic), ou en franchise.
      done: company?.regime_tva === 'franchise' || allReviewed,
      detail: company?.regime_tva === 'franchise' ? 'Franchise en base (pas de TVA)'
        : (allReviewed ? 'Toutes les lignes vérifiées (pointées en vert)' : `Pointez vos lignes (clic vert) : ${reviewed}/${total} vérifiées`),
      blocking: false,
    },
    {
      key: 'cloture',
      label: 'Clôturer l\'exercice',
      done: !!company?.cloture?.verrouille,
      detail: company?.cloture?.verrouille ? 'Exercice clôturé' : 'Non clôturé',
      blocking: true,
    },
  ];

  const blockingLeft = steps.filter(s => s.blocking && !s.done);
  return {
    steps,
    progress: Math.round((steps.filter(s => s.done).length / steps.length) * 100),
    liasse_prete: blockingLeft.length === 0,
    prochaine_action: (steps.find(s => !s.done) || null),
  };
}

/**
 * Agrégats de la liasse fiscale selon le régime.
 *  - IS société  -> formulaires 2065 (IS) + 2033 (bilan/CR simplifié) ou 2050-2059.
 *  - IR (BIC)    -> formulaire 2031 + 2033 (réel simplifié).
 *  - IR (BNC)    -> formulaire 2035 (recettes-dépenses).
 * On produit ici les totaux clés ; le rendu PDF officiel est une étape suivante.
 */
// Crédit d'Impôt Innovation : 20 % (métropole) des dépenses d'innovation
// éligibles, plafonnées à 400 000 € de base par an. Base = montant facturé par
// le prestataire agréé CII (Delivery Digital Nice ici). Créance sur l'État,
// imputable sur l'IS puis remboursable. @author Rabah Ziane 2026-07-08
function computeCII(entries) {
  const base = entries.filter(e => e.cii_eligible).reduce((s, e) => s + Math.abs(Number(e.amount) || 0), 0);
  const basePlafond = Math.min(400000, base);
  return { base: r2(base), base_retenue: r2(basePlafond), credit: r2(0.20 * basePlafond) };
}

export function buildLiasse(company, entries) {
  const cr = computeResultat(entries);
  const tva = computeTva(entries, company.tva_credit_anterieur);
  const regime = company?.regime_fiscal || 'IS';
  const cii = computeCII(entries);

  const base = {
    entreprise: company?.name,
    siren: company?.siren,
    exercice: company?.exercice?.annee_courante,
    regime_fiscal: regime,
    chiffre_affaires: cr.produits,
    charges: cr.charges,
    resultat_comptable: cr.resultat,
    tva,
  };

  if (regime === 'IS') {
    const resultatAvant = cr.resultat;                          // résultat fiscal avant imputation
    const deficitReportable = Number(company?.deficit_reportable || 0);
    // Imputation des déficits antérieurs (reportables indéfiniment à l'IS).
    const deficitImpute = resultatAvant > 0 ? Math.min(resultatAvant, deficitReportable) : 0;
    const resultatFiscal = r2(resultatAvant - deficitImpute);
    const is = resultatFiscal > 0 ? estimateIS(resultatFiscal) : 0;
    // Déficit restant à reporter (stock - imputé + nouveau déficit éventuel).
    const deficitRestant = r2(deficitReportable - deficitImpute + (resultatAvant < 0 ? -resultatAvant : 0));
    return {
      ...base,
      formulaires: ['2065', '2033-A à 2033-G'],
      resultat_avant_deficit: r2(resultatAvant),
      deficit_reportable: r2(deficitReportable),
      deficit_impute: r2(deficitImpute),
      resultat_fiscal: resultatFiscal,
      impot_estime: r2(Math.max(0, is - cii.credit)),          // IS après imputation du CII
      is_brut: r2(is),
      cii,
      credit_impot_cii: cii.credit,
      // Le CII non imputé (IS=0) devient une créance remboursable sur l'État.
      cii_restituable: r2(Math.max(0, cii.credit - is)),
      deficit_restant: deficitRestant,
      note: 'IS après imputation des déficits antérieurs' + (cii.credit ? ' ; CII innovation (20 %) imputable puis restituable' : '') + '.',
    };
  }

  // IR
  const categorie = company?.categorie_ir || 'BIC';
  return {
    ...base,
    categorie_ir: categorie,
    formulaires: categorie === 'BNC' ? ['2035'] : ['2031', '2033-A à 2033-G'],
    benefice_imposable: r2(cr.resultat),
    note: 'Bénéfice reporté sur la déclaration de revenus du foyer (barème IR).',
  };
}

/**
 * Solde du compte courant d'associé (compte 455) par exercice = ce que la
 * société DOIT au dirigeant. Un apport (entrée de trésorerie) augmente le solde,
 * un remboursement (sortie) le diminue. Renvoie le détail année par année plus le
 * solde cumulé de clôture (positif = créance du dirigeant sur la société).
 * @author Rabah Ziane - 2026-07-16
 */
export function computeCompteCourantAssocie(entries) {
  const byYear = {};
  for (const e of entries) {
    if (String(e.account) !== '455') continue;
    const d = e.date ? new Date(e.date) : null;
    const annee = d && !isNaN(d) ? d.getFullYear() : 'sans_date';
    const montant = Number(e.amount || 0); // signé : + apport, - remboursement
    byYear[annee] = byYear[annee] || { annee, apports: 0, remboursements: 0, solde_annee: 0 };
    if (montant >= 0) byYear[annee].apports = r2(byYear[annee].apports + montant);
    else byYear[annee].remboursements = r2(byYear[annee].remboursements + Math.abs(montant));
    byYear[annee].solde_annee = r2(byYear[annee].solde_annee + montant);
  }
  const annees = Object.values(byYear).sort((a, b) => String(a.annee).localeCompare(String(b.annee)));
  let cumule = 0;
  for (const a of annees) { cumule = r2(cumule + a.solde_annee); a.solde_cumule = cumule; }
  // solde_du > 0 : la société doit ce montant au dirigeant (compte courant créditeur).
  return { annees, solde_du: cumule };
}

/** Barème IS 2026 : 15% jusqu'à 42 500 € (PME), 25% au-delà. */
function estimateIS(resultat) {
  const seuil = 42500;
  if (resultat <= seuil) return resultat * 0.15;
  return seuil * 0.15 + (resultat - seuil) * 0.25;
}

/**
 * Catégorise automatiquement une transaction à partir des DONNÉES QONTO
 * (catégorie, operation_type, TVA saisie) - bien plus fiable que les mots-clés.
 * Détecte les virements internes (neutres), mappe la catégorie Qonto vers le PCG,
 * et utilise la TVA réelle de Qonto quand elle est renseignée.
 * @author Rabah Ziane · 2026-07-08
 * @param {object} n  écriture normalisée (sortie de normalizeQontoTx)
 * @param {string} orgName  raison sociale (pour repérer les virements reçus)
 */
const QONTO_CAT_MAP = {
  other_income: 'vente_service', income: 'vente_service', sales: 'vente_service',
  subscription: 'abonnement_logiciel', fees: 'frais_bancaires', salary: 'salaires',
  tax: 'impots_benefices', office_rental: 'loyers_charges', utility: 'eau_gaz_electricite',
  insurance: 'assurance_professionnelle', transport: 'frais_deplacement', logistics: 'frais_deplacement',
  restaurant_and_bar: 'restaurant_repas', hotel_and_lodging: 'frais_deplacement', gas_station: 'vehicule_carburant',
  gasoline: 'vehicule_carburant', telecommunication: 'internet_telephone', it_and_electronics: 'materiel_outillage',
  hardware_and_equipment: 'materiel_outillage', marketing: 'frais_divers', legal_and_accounting: 'honoraires_divers',
  manufacturing: 'marchandise_revente', goods_for_resale: 'marchandise_revente', refund: 'autres_gains_divers',
  other_expense: 'frais_divers',
};

export function categorizeQontoTx(n, orgName = '') {
  const org = (orgName || '').toLowerCase().trim();
  const cp = String(n.counterparty || '').toLowerCase();

  // === Règles par contrepartie, PRIORITAIRES sur la détection de virement interne ===
  // Qonto tague ces paiements en operation_type "transfer" ; ce ne sont POURTANT
  // PAS des mouvements internes -> on les traite avant le bloc "virement interne".
  // @author Rabah Ziane - 2026-07-16

  // Prestataires étrangers / indépendants (Kamran Omar, Delivery Digital Technology
  // à Dubai, Aziz Ziane) -> sous-traitance (611), TVA 0 (prestation hors UE / indep).
  // (jp morgan ag = prestataire externe "Bluestar" payé via cette banque)
  if (n.side === 'debit' && /kamran|delivery digital technology|aziz|jp morgan/.test(cp)) {
    return applyCategory(n.amount, 'sous_traitance', 0);
  }
  // Formation financée par un OPCO (AKTO, Atlas, Afdas...) -> produit EXONÉRÉ de TVA
  // (CGI art. 261-4-4°a). `return` immédiat = court-circuite l'override TVA plus bas.
  if (n.side === 'credit' && /akto|opco|afdas|atlas|ocapiat|constructys|uniformation|opcommerce/.test(cp)) {
    return applyCategory(n.amount, 'vente_formation');
  }
  // Dirigeant (compte perso N26 - libellé Ziane Rabah Kamel / Ziane Kamel, etc.) :
  // ENTRÉE = apport en compte courant d'associé (455) ; SORTIE = frais professionnels
  // (628, TVA 0 sans justificatif). Exclut "aziz" (prestataire, traité au-dessus).
  if (/ziane/.test(cp) && (/rabah/.test(cp) || /kamel/.test(cp))) {
    return n.side === 'credit'
      ? applyCategory(n.amount, 'apport_associe')
      : applyCategory(n.amount, 'frais_divers', 0);
  }

  // Virement interne réel (compte à compte Qonto : Trésorerie, Compte principal...) -> neutre.
  const isOwnCredit = n.side === 'credit' && org && cp.includes(org);
  if (n.qonto_category === 'treasury_and_interco' || n.operation_type === 'transfer' || isOwnCredit) {
    return {
      category_key: 'virement_interne', account: '580', nature: 'neutre',
      tva_rate: 0, amount_ht: 0, tva_amount: 0, tva_sens: 'aucune', status: 'categorisee',
    };
  }
  const key = QONTO_CAT_MAP[n.qonto_category] || (n.side === 'credit' ? 'vente_service' : 'frais_divers');
  const d = applyCategory(n.amount, key);
  // TVA réelle saisie dans Qonto -> prioritaire (plus fiable que le taux par défaut).
  if (n.qonto_vat_amount != null && n.qonto_vat_rate != null) {
    const ttc = Math.abs(Number(n.amount) || 0);
    d.tva_amount = r2(n.qonto_vat_amount);
    d.amount_ht = r2(ttc - n.qonto_vat_amount);
    d.tva_rate = n.qonto_vat_rate;
  }
  // Opération étrangère (Émirats, devise ≠ EUR, hors EU) -> TVA française NON récupérable.
  if (n.is_external) {
    const ttc = Math.abs(Number(n.amount) || 0);
    d.tva_rate = 0; d.tva_amount = 0; d.amount_ht = r2(ttc); d.tva_sens = 'aucune';
  }
  return d;
}
