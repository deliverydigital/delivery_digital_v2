/**
 * Catalogue des formations que les agences partenaires vont vendre.
 * Source unique : utilisee par le catalogue de l'espace agence ET par le
 * selecteur de formation du wizard de dossier OPCO (montage par client).
 * @author Rabah Ziane - 2026-06-02
 */
export type Formation = {
  id: string;
  title: string;
  category: string;     // ex. "Hygiène · Sécurité"
  hours: number;        // 21
  priceHT: number;      // 525
  level: string;        // "Débutant"
  funding: string;      // "OPCO"
  rating: string;       // "9/10"
  flagship: boolean;    // badge "Phare"
  summary: string;
  programme: string[];  // modules / déroulé
};

export const FORMATIONS: Formation[] = [
  {
    id: "nutrition-allergenes",
    title: "Bases de la nutrition et sensibilisation aux allergènes (21h)",
    category: "Hygiène · Sécurité",
    hours: 21,
    priceHT: 525,
    level: "Débutant",
    funding: "OPCO",
    rating: "9/10",
    flagship: true,
    summary: "Acquérir les fondamentaux de la nutrition humaine et savoir identifier, prévenir et communiquer sur les 14 allergènes réglementaires (INCO 1169/2011).",
    programme: [
      "Jour 1 - Fondamentaux de la nutrition : macro/micronutriments, équilibre alimentaire, besoins selon les profils, lecture des étiquettes nutritionnelles.",
      "Jour 1 - Qualité nutritionnelle en restauration : cuisson, conservation des nutriments, alternatives saines.",
      "Jour 2 - Les 14 allergènes réglementaires (INCO 1169/2011) : reconnaissance, sources cachées, contaminations croisées.",
      "Jour 2 - Information du consommateur : affichage obligatoire des allergènes, communication en salle, gestion des demandes clients.",
      "Jour 3 - Prévention des contaminations croisées en cuisine : organisation, ustensiles dédiés, protocoles.",
      "Jour 3 - Cas pratiques, évaluation des acquis (QCM) et certificat de réalisation.",
    ],
  },
  {
    id: "hygiene-securite-dd",
    title: "Hygiène, Sécurité & Développement Durable - initiation (21h)",
    category: "Hygiène · Sécurité",
    hours: 21,
    priceHT: 525,
    level: "Débutant",
    funding: "OPCO",
    rating: "9/10",
    flagship: true,
    summary: "Maîtriser les bonnes pratiques d'hygiène et de sécurité en restauration (HACCP, arrêté du 5 oct. 2011) et intégrer des pratiques durables pour réduire l'empreinte environnementale.",
    programme: [
      "Jour 1 - Hygiène alimentaire & HACCP : microbiologie, dangers, méthode HACCP (7 principes), bonnes pratiques d'hygiène (BPH).",
      "Jour 1 - Chaîne du froid, DLC/DLUO, traçabilité, plan de nettoyage et désinfection.",
      "Jour 2 - Sécurité au travail : prévention des risques en cuisine (coupures, brûlures, TMS), gestes et postures, EPI.",
      "Jour 2 - Réglementation : Paquet Hygiène (CE 852/2004), arrêté du 5 octobre 2011, contrôles DDPP.",
      "Jour 3 - Développement durable : réduction du gaspillage alimentaire, tri des déchets / biodéchets, approvisionnement responsable, économies d'énergie.",
      "Jour 3 - Cas pratiques, évaluation des acquis (QCM) et certificat de réalisation.",
    ],
  },
];

export function getFormation(id: string): Formation | undefined {
  return FORMATIONS.find((f) => f.id === id);
}
