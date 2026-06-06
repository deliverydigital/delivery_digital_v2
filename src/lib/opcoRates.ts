/**
 * Règles de prise en charge OPCO 2026 - barèmes du plan de développement des
 * compétences. ATTENTION : les montants varient selon l'OPCO, la BRANCHE (IDCC)
 * et la modalité (inter/intra, présentiel/distanciel). On n'affiche que des
 * chiffres sourcés et on précise toujours "selon votre IDCC".
 *
 * Sources (barèmes 2026, fonds < 50 salariés - plan de développement) :
 *  - AKTO HCR (IDCC 1979/1980) : catalogue « Espace Formation » 100% ;
 *    hors catalogue inter 25 €/h présentiel, 15 €/h distanciel ; intra 1 000 €/jour
 *    (max 3 formations/an) ; plafond 3 000 €/an/entreprise. (akto.fr - règles 2026 HCR)
 *  - AKTO Restauration rapide (IDCC 1501) : coût réel plafonné 25 €/h/salarié,
 *    limite 1 200 €/jour, durée plafond 21h (inter & intra). (akto.fr - règles 2026)
 *  - OPCO EP (entreprises de proximité) : à défaut de forfait de branche, 9,15 €/h ;
 *    certaines branches financent davantage. (opcoep.fr)
 * Nos formations sont dispensées EN DISTANCIEL -> taux distanciel par défaut.
 * @author Rabah Ziane · 2026-06-02
 */

export type CompanySize = "tpe" | "pme" | "eti";

export type OpcoRule = {
  opco: string;
  label: string;
  hourlyCap: number;            // €/h coûts pédagogiques (0 = non standardisé)
  perTraineeYearCap?: number;
  perCompanyYearCap?: number;
  notes?: string;
};

/**
 * Règle simplifiée (utilisée par la synthèse du wizard) - taux DISTANCIEL par défaut.
 * Le simulateur détaillé du tableau de bord utilise BRANCHES_2026 (par IDCC + modalité).
 */
export function getRule(opco: string): OpcoRule {
  if (opco === "AKTO") {
    return {
      opco: "AKTO",
      label: "Plan de développement < 50 salariés (distanciel, hors catalogue)",
      hourlyCap: 15, // distanciel ; présentiel 25 €/h
      perCompanyYearCap: 3000,
      notes: "AKTO 2026 : 15 €/h distanciel (25 €/h présentiel), plafond 3 000 €/an. Varie selon l'IDCC ; formations du catalogue AKTO prises à 100%.",
    };
  }
  if (opco === "OPCO EP") {
    return {
      opco: "OPCO EP",
      label: "Plan de développement (forfait par défaut)",
      hourlyCap: 9.15,
      notes: "OPCO EP 2026 : 9,15 €/h à défaut d'accord de branche ; certaines branches financent davantage.",
    };
  }
  return {
    opco,
    label: "À étudier selon votre IDCC",
    hourlyCap: 0,
    notes: "Barème variable selon la branche - notre équipe étudie votre cas.",
  };
}

export type ReimbursementInput = {
  opco: string;
  size?: CompanySize;
  salariesCount: number;
  hoursPerTrainee: number;
  unitPriceHT: number;
};
export type ReimbursementOutput = {
  rule: OpcoRule;
  totalCostHT: number;
  perTraineeCovered: number;
  totalCovered: number;
  remainder: number;
  fullyCovered: boolean;
  detail: string[];
};

export function computeReimbursement(input: ReimbursementInput): ReimbursementOutput {
  const { opco, size = "tpe", salariesCount, hoursPerTrainee, unitPriceHT } = input;
  const rule = getRule(opco);
  const totalCostHT = Math.round(unitPriceHT * salariesCount);
  const detail: string[] = [];
  if (rule.hourlyCap === 0) {
    detail.push("Barème variable selon l'IDCC - prise en charge à confirmer avec l'OPCO.");
    return { rule, totalCostHT, perTraineeCovered: 0, totalCovered: 0, remainder: totalCostHT, fullyCovered: false, detail };
  }
  const hourlyCovered = rule.hourlyCap * hoursPerTrainee;
  detail.push(`${rule.opco} · ${rule.hourlyCap} €/h × ${hoursPerTrainee}h = ${Math.round(hourlyCovered)} € max par stagiaire`);
  let perTraineeCovered = Math.min(unitPriceHT, hourlyCovered);
  if (rule.perTraineeYearCap !== undefined) {
    perTraineeCovered = Math.min(perTraineeCovered, rule.perTraineeYearCap);
    detail.push(`Plafond annuel ${rule.perTraineeYearCap} €/salarié appliqué`);
  }
  let totalCovered = perTraineeCovered * salariesCount;
  if (rule.perCompanyYearCap !== undefined) {
    if (totalCovered > rule.perCompanyYearCap) { totalCovered = rule.perCompanyYearCap; detail.push(`Plafond entreprise ${rule.perCompanyYearCap} €/an atteint`); }
    else detail.push(`Sous le plafond entreprise (${rule.perCompanyYearCap} €/an)`);
  }
  totalCovered = Math.min(totalCovered, totalCostHT);
  const remainder = Math.max(0, totalCostHT - totalCovered);
  return {
    rule, totalCostHT,
    perTraineeCovered: Math.round(perTraineeCovered),
    totalCovered: Math.round(totalCovered),
    remainder: Math.round(remainder),
    fullyCovered: remainder === 0 && totalCostHT > 0,
    detail,
  };
}

export const FORMATION_TARIFS = { hours: 21, unitPriceHT: 525 } as const;

/* ====================================================================== *
 * BAREMES DETAILLES 2026 PAR BRANCHE (IDCC) ET MODALITE - pour le
 * simulateur "afficher tout" du tableau de bord agence.
 * kind: 'full' = 100% pris en charge · 'hour' = €/h · 'day' = €/jour.
 * ====================================================================== */
export type BaremeLigne = {
  modalite: string;            // ex. "Inter-entreprise, distanciel"
  kind: "full" | "hour" | "day";
  value?: number;              // €/h ou €/jour selon kind
  maxHours?: number;           // nombre d'heures max pris en charge (ex. boucherie = 7h)
  capEuro?: number;            // plafond € par stagiaire/action (kind full)
  capText: string;             // plafond lisible
  note?: string;
};
export type Branche = {
  id: string;
  opco: string;
  idcc: string;                // ex. "1979 / 1980"
  label: string;               // ex. "Hôtels, Cafés, Restaurants (HCR)"
  lignes: BaremeLigne[];
  source: string;
  known: boolean;              // false = barème à confirmer (on n'invente pas)
  remarque?: string;
};

export const BRANCHES_2026: Branche[] = [
  {
    id: "akto-hcr",
    opco: "AKTO",
    idcc: "1979 / 1980",
    label: "Hôtels, Cafés, Restaurants (HCR)",
    known: true,
    source: "akto.fr - Règles de prise en charge 2026 HCR",
    lignes: [
      { modalite: "Inter-entreprise, présentiel (hors catalogue)", kind: "hour", value: 25, capText: "plafond 3 000 €/an/entreprise" },
      { modalite: "Inter-entreprise, distanciel (hors catalogue)", kind: "hour", value: 15, capText: "plafond 3 000 €/an/entreprise" },
      { modalite: "Intra-entreprise", kind: "day", value: 1000, capText: "max 3 formations/an · plafond 3 000 €/an" },
    ],
  },
  {
    id: "akto-resto-rapide",
    opco: "AKTO",
    idcc: "1501",
    label: "Restauration rapide",
    known: true,
    source: "akto.fr - Règles de prise en charge 2026 Restauration rapide",
    lignes: [
      { modalite: "Présentiel ou visio en direct", kind: "hour", value: 25, capText: "max 21h · plafond annuel 4 000 € (<11 sal.) ou 9 000 € (11-49 sal.)" },
    ],
    remarque: "Plafond annuel selon l'effectif : 4 000 € (< 11 salariés), 9 000 € (11 à 49 salariés). Budget AFEST +3 600 €/an.",
  },
  {
    id: "opco-ep-boulangerie",
    opco: "OPCO EP",
    idcc: "843",
    label: "Boulangerie-pâtisserie artisanale",
    known: true,
    source: "opcoep.fr - boulangerie-pâtisserie 2026",
    lignes: [
      { modalite: "Hygiène et sécurité, présentiel", kind: "hour", value: 30, maxHours: 14, capText: "30 € HT/h · durée max prise en charge 14 h" },
    ],
    remarque: "Boulangerie-pâtisserie (IDCC 843) : formation « Hygiène et sécurité » à 30 € HT/h, prise en charge limitée à 14 h (→ 420 € finançables). Plafond entreprise 3 500 € HT/an (< 50 salariés). Durée mini 4 h ; action < 140 h sur 3 mois max. NON financés : distanciel et AFEST (présentiel uniquement), intitulés hors plaquette. Pas de frais annexes ni de salaire. Dans la limite des fonds disponibles.",
  },
  {
    id: "opco-ep-boucherie",
    opco: "OPCO EP",
    idcc: "992",
    label: "Boucherie / charcuterie",
    known: true,
    source: "opcoep.fr - boucherie 2026",
    lignes: [
      { modalite: "Hygiène & bonnes pratiques (guide BPH), présentiel", kind: "hour", value: 50, maxHours: 7, capText: "50 € HT/h · durée max prise en charge 7 h · hors HACCP" },
    ],
    remarque: "Boucherie (IDCC 992) : formation « Hygiène et bonnes pratiques » (guide BPH Boucherie) à 50 € HT/h, prise en charge limitée à 7 h (→ 350 € finançables), HORS formation HACCP. Plafond entreprise 5 000 € HT/an. Distanciel/AFEST/intra non financés. Frais annexes : entreprises de moins de 11 salariés exclusivement.",
  },
];

export function getBranche(id: string): Branche | undefined {
  return BRANCHES_2026.find((b) => b.id === id);
}

/** Calcule le pris en charge d'une ligne de barème pour un coût/heures/jours donnés (par stagiaire). */
export function couvertureLigne(l: BaremeLigne, costHT: number, hours: number, days: number): number {
  if (l.kind === "full") return Math.min(costHT, l.capEuro ?? costHT);
  if (l.kind === "hour" && l.value) { const h = l.maxHours ? Math.min(hours, l.maxHours) : hours; return Math.min(costHT, Math.round(l.value * h)); }
  if (l.kind === "day" && l.value) return Math.min(costHT, Math.round(l.value * days));
  return 0;
}

/** Meilleur montant finançable d'une branche (sur toutes ses modalités) = ce qu'on facture. */
export function meilleurFinancement(b: Branche, costHT: number, hours: number, days: number): number {
  return Math.max(0, ...b.lignes.map((l) => couvertureLigne(l, costHT, hours, days)));
}
