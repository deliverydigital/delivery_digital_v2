/**
 * Catalogue des formations que les agences partenaires vont vendre.
 * Source unique : utilisee par le catalogue de l'espace agence ET par le
 * selecteur de formation du wizard de dossier OPCO (montage par client).
 * Contenu aligne sur les programmes officiels DELIVERY Digital (PDF telechargeables).
 * @author Rabah Ziane - 2026-06-02
 */
export type FormationModule = { title: string; hours: number; points: string[] };
export type Formation = {
  id: string;
  title: string;
  category: string;        // ex. "Hygiène · Sécurité"
  hours: number;           // 21
  priceHT: number;         // 525
  level: string;           // "Débutant"
  funding: string;         // "OPCO"
  rating: string;          // "9/10"
  flagship: boolean;       // badge "Phare"
  summary: string;         // résumé court (carte)
  description: string;     // description longue (modale)
  publicVise: string;
  prerequis: string;
  objectifs: string[];
  modalites: string[];
  methodesMobilisees: string[];
  methodesEvaluation: string[];
  modules: FormationModule[];
  accessibilite: string;
  delaiAcces: string;
  participantsMax: number;
  certification: string;
  derniereMaj: string;     // ex. "02/06/2026"
  indicateurs: { satisfaction: number; reussite: number; recommandation: number; presence: number };
  programmePdfUrl: string; // PDF officiel telechargeable
  programme: string[];     // résumé par jour (utilisé par le wizard)
};

const INDICATEURS = { satisfaction: 96, reussite: 100, recommandation: 100, presence: 100 };
const ACCESSIBILITE = "La formation est accessible aux personnes en situation de handicap. Merci de nous contacter à contact@deliverydigital.fr pour discuter des aménagements nécessaires.";
const METHODES_MOBILISEES = ["Visioconférences interactives avec formateur", "Plateforme pédagogique en ligne", "Activités pratiques"];
const METHODES_EVALUATION = ["Évaluation en début de formation", "Évaluation en fin de formation"];
const MODALITES = ["En distanciel en visio-conférence avec un formateur."];

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
    description: "Cette formation permet d'acquérir les bases fondamentales de la nutrition humaine, de comprendre les groupes d'aliments et l'équilibre alimentaire, et de maîtriser la prévention des allergies alimentaires (14 allergènes réglementaires INCO). Elle prépare les professionnels du secteur alimentaire à proposer des menus équilibrés et à sécuriser leurs pratiques face aux risques allergènes.",
    publicVise: "Cette formation est destinée à l'ensemble des professionnels du secteur alimentaire, personnel de restauration, gestionnaires d'établissements, éducateurs en santé, ou toute personne souhaitant acquérir des bases solides en nutrition et comprendre les enjeux liés aux allergènes alimentaires.",
    prerequis: "Aucun prérequis",
    objectifs: [
      "Acquérir les bases fondamentales de la nutrition humaine.",
      "Comprendre les groupes d'aliments et leur rôle dans l'équilibre alimentaire.",
      "Identifier les principaux allergènes et adopter les bonnes pratiques pour prévenir les risques.",
      "Mettre en place des menus équilibrés et adaptés aux besoins spécifiques.",
      "Intégrer la prévention des allergies dans les pratiques professionnelles.",
    ],
    modalites: MODALITES,
    methodesMobilisees: METHODES_MOBILISEES,
    methodesEvaluation: METHODES_EVALUATION,
    modules: [
      {
        title: "Jour 1 - Bases de la nutrition", hours: 7, points: [
          "Introduction à la nutrition : définitions, enjeux, cadre réglementaire.",
          "Les besoins nutritionnels selon les âges et les publics.",
          "Les familles d'aliments : rôles, apports, recommandations.",
          "Les macronutriments : protéines, glucides, lipides - fonctions et sources.",
          "Les micronutriments : vitamines, minéraux - rôles essentiels et carences.",
          "Lecture d'étiquettes alimentaires : repérer les apports nutritionnels et additifs.",
          "Activité pratique : analyse d'un menu type (école, restaurant, hôpital...).",
        ],
      },
      {
        title: "Jour 2 - Nutrition appliquée et allergies alimentaires", hours: 9, points: [
          "Les repères du Programme National Nutrition Santé (PNNS).",
          "Équilibre alimentaire : fréquence, quantités, distribution sur la journée.",
          "Les régimes spécifiques : végétarien, sans gluten, diabétique, hypocalorique...",
          "Introduction aux allergies alimentaires : définitions, mécanismes, différences avec intolérances.",
          "Les 14 allergènes à déclaration obligatoire (règlement INCO).",
          "Risques liés aux allergènes : contamination croisée, stockage, préparation.",
          "Lecture et interprétation des étiquetages avec allergènes.",
          "Études de cas : gestion des allergies en restauration collective.",
          "Mise en situation : création d'un menu équilibré tenant compte des contraintes allergènes.",
        ],
      },
      {
        title: "Jour 3 - Prévention, éducation nutritionnelle et sécurité", hours: 5, points: [
          "Protocoles de sécurité pour éviter les contaminations allergènes.",
          "Procédures en cas de réaction allergique : premiers gestes, appel des secours.",
          "Formation et sensibilisation du personnel.",
          "Sensibilisation du public à une alimentation saine.",
          "Supports de communication nutritionnelle : affiches, ateliers, étiquetage clair.",
        ],
      },
    ],
    accessibilite: ACCESSIBILITE,
    delaiAcces: "1 semaine",
    participantsMax: 1,
    certification: "Attestation de formation",
    derniereMaj: "02/06/2026",
    indicateurs: INDICATEURS,
    programmePdfUrl: "/uploads/formations/programme-nutrition-allergenes.pdf",
    programme: [
      "Jour 1 - Bases de la nutrition (7h)",
      "Jour 2 - Nutrition appliquée et allergies alimentaires (9h)",
      "Jour 3 - Prévention, éducation nutritionnelle et sécurité (5h)",
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
    description: "La formation Hygiène, Sécurité et Développement Durable est conçue pour sensibiliser les professionnels de la restauration et de l'industrie agro-alimentaire aux bonnes pratiques en matière de gestion des risques sanitaires, de sécurité au travail et de développement durable. Elle couvre les principaux enjeux d'hygiène, de sécurité et de respect de l'environnement.",
    publicVise: "Cette formation est destinée à l'ensemble des professionnels du secteur alimentaire, tels que les cuisiniers, chefs de cuisine, responsables de cuisine, personnel de restauration collective, gestionnaires d'établissements alimentaires, ainsi que toute personne impliquée dans la gestion de l'hygiène, de la sécurité et du développement durable dans les industries alimentaires.",
    prerequis: "Aucun prérequis",
    objectifs: [
      "Mettre en œuvre les bonnes pratiques d'hygiène alimentaire selon les exigences réglementaires (HACCP, PMS, TIAC, etc.).",
      "Assurer la sécurité du personnel et des clients en respectant les normes en cuisine.",
      "Intégrer des pratiques respectueuses de l'environnement dans l'organisation du travail.",
    ],
    modalites: MODALITES,
    methodesMobilisees: METHODES_MOBILISEES,
    methodesEvaluation: METHODES_EVALUATION,
    modules: [
      {
        title: "Jour 1 - Hygiène alimentaire", hours: 7, points: [
          "Introduction à l'hygiène en restauration collective : enjeux, rôle dans la sécurité alimentaire, cadre réglementaire.",
          "Les principaux risques alimentaires : microbiologiques, chimiques, physiques.",
          "Les TIAC : définitions, causes, conséquences, mesures de prévention.",
          "Hygiène du personnel : tenue, lavage des mains, santé, gestes barrières.",
          "Hygiène des locaux et du matériel : nettoyage, désinfection, plan de nettoyage.",
          "Organisation de la cuisine : zones sales, zones propres, marche en avant.",
          "Méthode des 5M : analyse des causes de contamination et prévention des risques.",
        ],
      },
      {
        title: "Jour 2 - Hygiène alimentaire (suite)", hours: 9, points: [
          "Méthode HACCP : identification des dangers, points critiques, surveillance, actions correctives.",
          "Application des 7 principes HACCP à la cuisine collective.",
          "Le Plan de Maîtrise Sanitaire : structure, documents à tenir, obligations réglementaires.",
          "Contrôle des températures : stockage, cuisson, refroidissement, liaison chaude/froide.",
          "Traçabilité : étiquetage des produits, plats témoins, archivage des documents.",
          "Études de cas : ruptures de chaîne du froid, contaminations croisées, non-conformités.",
          "Mise en situation : analyse de documents HACCP et PMS.",
        ],
      },
      {
        title: "Jour 3 - Sécurité et Développement durable", hours: 5, points: [
          "Sécurité en cuisine : identification des risques (brûlures, coupures, chutes, chocs électriques).",
          "Incendies en cuisine : types de feux, extincteurs adaptés, protocoles d'extinction et d'évacuation.",
          "Gestes de premiers secours en cas de blessure ou de brûlure.",
          "Développement durable : tri des déchets, réduction du gaspillage alimentaire.",
          "Économie des ressources : gestion de l'eau, de l'énergie, entretien du matériel.",
          "Approvisionnement responsable : produits locaux, circuits courts, écoresponsabilité.",
          "Diagnostic 5M appliqué au gaspillage et proposition d'actions durables.",
        ],
      },
    ],
    accessibilite: ACCESSIBILITE,
    delaiAcces: "1 semaine",
    participantsMax: 1,
    certification: "Attestation de formation",
    derniereMaj: "02/06/2026",
    indicateurs: INDICATEURS,
    programmePdfUrl: "/uploads/formations/programme-hygiene-securite-dd.pdf",
    programme: [
      "Jour 1 - Hygiène alimentaire (7h)",
      "Jour 2 - Hygiène alimentaire suite, HACCP & PMS (9h)",
      "Jour 3 - Sécurité en cuisine & développement durable (5h)",
    ],
  },
];

export function getFormation(id: string): Formation | undefined {
  return FORMATIONS.find((f) => f.id === id);
}
