/**
 * Règles de prise en charge OPCO 2026 - AKTO (HCR) et OPCO EP.
 * Sources : barèmes officiels publiés par les OPCO pour 2026
 *  - AKTO HCR : 32 €/h, plafond 1 800 €/an/salarié (plan de développement < 50 sal.)
 *  - OPCO EP : 25 €/h, plafond 2 500 €/an entreprise (TPE < 11) ou 3 000 € (11-49 sal.)
 * Le reste à charge ne tient compte que du coût pédagogique HT (frais annexes hors barème).
 * @author Rabah Ziane · 2026-04-26
 */

export type CompanySize = "tpe" | "pme" | "eti";

export type OpcoRule = {
  opco: string;
  label: string;                // ex. "Plan de développement HCR < 50 salariés"
  hourlyCap: number;            // €/h plafonné par stagiaire
  perTraineeYearCap?: number;   // plafond annuel par salarié (€)
  perCompanyYearCap?: number;   // plafond annuel par entreprise (€)
  notes?: string;
};

/**
 * Récupère la règle applicable selon OPCO + taille entreprise.
 * Pour 2026, on prend l'enveloppe "plan de développement des compétences" - la formation
 * Hygiène HACCP est un module obligatoire (arrêté 5 oct. 2011), généralement éligible 100%.
 */
export function getRule(opco: string, size: CompanySize = "tpe"): OpcoRule {
  if (opco === "AKTO") {
    return {
      opco: "AKTO",
      label: size === "tpe" ? "Plan de développement HCR - TPE" : "Plan de développement HCR < 50 salariés",
      hourlyCap: 32,
      perTraineeYearCap: 1800,
      notes: "Hôtels-Cafés-Restaurants · Barème AKTO 2026 plan de développement.",
    };
  }
  if (opco === "OPCO EP") {
    return {
      opco: "OPCO EP",
      label: size === "tpe" ? "Plan TPE < 11 salariés" : "Plan PME 11-49 salariés",
      hourlyCap: 25,
      perCompanyYearCap: size === "tpe" ? 2500 : 3000,
      notes: "OPCO Entreprises de Proximité · Barème 2026.",
    };
  }
  // Fallback générique : on n'avance aucun chiffre faux, on reste prudent.
  return {
    opco,
    label: "À étudier au cas par cas",
    hourlyCap: 0,
    notes: "Barème non standardisé pour cet OPCO - contacter notre équipe pour devis.",
  };
}

export type ReimbursementInput = {
  opco: string;
  size?: CompanySize;
  salariesCount: number;
  hoursPerTrainee: number;     // ex. 21h
  unitPriceHT: number;         // tarif facturé par stagiaire (€HT)
};

export type ReimbursementOutput = {
  rule: OpcoRule;
  totalCostHT: number;             // tarif × salariés
  perTraineeCovered: number;       // pris en charge par stagiaire
  totalCovered: number;            // pris en charge total
  remainder: number;               // reste à charge entreprise
  fullyCovered: boolean;           // true si reste à charge = 0
  detail: string[];                // lignes de calcul humainement lisibles
};

export function computeReimbursement(input: ReimbursementInput): ReimbursementOutput {
  const { opco, size = "tpe", salariesCount, hoursPerTrainee, unitPriceHT } = input;
  const rule = getRule(opco, size);
  const totalCostHT = Math.round(unitPriceHT * salariesCount);
  const detail: string[] = [];

  if (rule.hourlyCap === 0) {
    detail.push(`OPCO non standardisé · prise en charge à étudier au cas par cas.`);
    return { rule, totalCostHT, perTraineeCovered: 0, totalCovered: 0, remainder: totalCostHT, fullyCovered: false, detail };
  }

  // Plafond horaire × nombre d'heures
  const hourlyCovered = rule.hourlyCap * hoursPerTrainee;
  detail.push(`${rule.opco} · ${rule.hourlyCap} €/h × ${hoursPerTrainee}h = ${hourlyCovered} € max par stagiaire`);

  // Plafond annuel par stagiaire
  let perTraineeCovered = Math.min(unitPriceHT, hourlyCovered);
  if (rule.perTraineeYearCap !== undefined) {
    perTraineeCovered = Math.min(perTraineeCovered, rule.perTraineeYearCap);
    detail.push(`Plafond annuel ${rule.perTraineeYearCap} €/salarié appliqué`);
  }

  let totalCovered = perTraineeCovered * salariesCount;

  // Plafond annuel entreprise (OPCO EP)
  if (rule.perCompanyYearCap !== undefined) {
    if (totalCovered > rule.perCompanyYearCap) {
      totalCovered = rule.perCompanyYearCap;
      detail.push(`Plafond entreprise ${rule.perCompanyYearCap} €/an atteint`);
    } else {
      detail.push(`Sous le plafond entreprise (${rule.perCompanyYearCap} €/an)`);
    }
  }

  totalCovered = Math.min(totalCovered, totalCostHT);
  const remainder = Math.max(0, totalCostHT - totalCovered);
  const fullyCovered = remainder === 0 && totalCostHT > 0;

  return {
    rule,
    totalCostHT,
    perTraineeCovered: Math.round(perTraineeCovered),
    totalCovered: Math.round(totalCovered),
    remainder: Math.round(remainder),
    fullyCovered,
    detail,
  };
}

/** Tarif standard de la formation Hygiène + Sécurité + DD (21h présentiel). */
export const FORMATION_TARIFS = {
  hours: 21,
  unitPriceHT: 525, // € HT par stagiaire
} as const;
