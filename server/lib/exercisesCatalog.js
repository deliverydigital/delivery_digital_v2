/**
 * Exercices en situation de travail (AFEST) envoyés dans le groupe WhatsApp APRÈS l'heure de
 * visioconférence de chaque journée. Volume : 6 h par jour sur le poste de travail, soit
 * 18 h d'AFEST + 3 h de visio = les 21 h de la formation.
 *
 * Aucune durée n'est fixée par exercice et aucun découpage matin/après-midi : les apprenants
 * travaillent pendant leur service et s'organisent comme ils peuvent. Ils partagent leurs
 * réalisations dans le groupe WhatsApp au fur et à mesure - c'est la trace d'exécution.
 *
 * Découpage calé sur le diaporama HSDD (57 diapositives) et sur le poids de chaque partie :
 *   - Hygiène & sécurité alimentaire  : diapos 4-24  -> jour 1 entier + début du jour 2
 *   - Sécurité du personnel           : diapos 25-43 -> fin du jour 2 + début du jour 3
 *   - Développement durable & AGEC    : diapos 44-56 -> fin du jour 3
 * @author Rabah Ziane · 2026-07-20
 */

const HSDD = [
  {
    theme: 'Hygiène et bonnes pratiques',
    items: [
      'Cartographie des risques : parcourez votre cuisine et relevez, pour chaque poste, les risques microbiologiques, chimiques et physiques. À partager : votre tableau avec au moins 2 risques par catégorie.',
      'Relevé des températures : mesurez et enregistrez toutes les enceintes froides, chaudes et les plats en cours de service, puis comparez aux valeurs vues en visio. À partager : la grille remplie et une photo d\'un relevé.',
      'Contrôle des DLC : vérifiez les dates des produits ouverts, l\'étiquetage secondaire et les conditions de stockage. À partager : les non-conformités trouvées et ce que vous avez corrigé.',
      'Marche en avant : dessinez le plan de votre cuisine et tracez le parcours d\'une matière première de la réception à l\'assiette, en marquant les croisements sale/propre. À partager : la photo du plan annoté.',
      'Lavage des mains : observez 3 collègues et cochez les étapes réellement faites (paume, dos, doigts, poignets, séchage). À partager : ce que vous avez constaté.',
      'Tenues et postes : relevez les écarts sur les tenues (bijoux, cheveux, ongles, chaussures) et l\'état des plans de travail en fin de service. À partager : des photos avant/après remise en conformité.',
    ],
  },
  {
    theme: 'HACCP, plan de maîtrise sanitaire et sécurité du personnel',
    items: [
      'Mini-plan HACCP : choisissez un plat de votre carte et remplissez le tableau danger → CCP → limite critique → surveillance → action corrective sur au moins 3 étapes. À partager : le tableau complété.',
      'Méthode des 5M : prenez une non-conformité réelle et classez ses causes en Main-d\'œuvre, Matériel, Matière, Méthode, Milieu. À partager : votre analyse et l\'action retenue.',
      'Traçabilité et PMS : contrôlez vos étiquettes de denrées, documents de contrôle et échantillons témoins. À partager : ce qui manque et comment vous comptez le mettre à jour.',
      'Brûlures et incendie : repérez les sources de brûlure, vérifiez la présence, la date de contrôle et l\'accessibilité des extincteurs, et l\'adéquation avec le type de feu (classe F pour les huiles). À partager : les anomalies relevées.',
      'Feu de graisse : rédigez et affichez la procédure à suivre, puis expliquez-la à l\'équipe. À partager : la photo de l\'affichage en place.',
      'Coupures : vérifiez l\'affûtage et le rangement des couteaux, appliquez la découpe main en « griffe » et contrôlez la trousse de secours. À partager : la photo du poste de découpe sécurisé.',
    ],
  },
  {
    theme: 'Fin sécurité et développement durable',
    items: [
      'Sécurité au sol : repérez sols glissants, obstacles, câbles et zones mal éclairées sur l\'ensemble du service. À partager : les points dangereux et la mesure appliquée ou demandée.',
      'Installations électriques : contrôlez l\'état des câbles, prises, multiprises et leur proximité avec les points d\'eau. À partager : ce qui doit être vu par un professionnel.',
      'Produits chimiques : vérifiez l\'étiquetage, le stockage séparé des denrées, les fiches de données de sécurité et les équipements de protection. À partager : la photo du local remis en conformité.',
      'Gaspillage alimentaire : pesez les déchets d\'un service complet en séparant préparation et retours assiette. À partager : les deux pesées et 3 causes identifiées.',
      'Tri des biodéchets : conformément à l\'obligation en vigueur depuis le 1er janvier 2024, organisez les bacs (verre, biodéchets, cartons, plastiques), affichez les consignes et sensibilisez l\'équipe. À partager : la photo de la zone de tri.',
      'Eau et énergie : relevez les gaspillages sur un service (éclairages inutiles, fours préchauffés trop tôt, robinets, joints de chambres froides). À partager : votre liste et les actions proposées.',
    ],
  },
];

const CATALOG = {
  'hygiene-security': HSDD,
  'hygiene-security-afest': HSDD,
  'hsdd-21h-1050': HSDD,
};

/** Retrouve le programme d'exercices d'une formation, par clé catalogue puis par intitulé. */
function programFor(formationKey, formationTitle) {
  if (formationKey && CATALOG[formationKey]) return CATALOG[formationKey];
  const t = String(formationTitle || '').toLowerCase();
  if (t.includes('hygi') && (t.includes('sécurit') || t.includes('securit'))) return HSDD;
  return null;
}

/**
 * Texte prêt à coller dans le groupe WhatsApp pour la journée `index` (0-based).
 * Renvoie '' si la formation n'a pas (encore) de programme d'exercices.
 */
export function exercisesForDay(formationKey, formationTitle, index) {
  const prog = programFor(formationKey, formationTitle);
  const day = prog && prog[index];
  if (!day) return '';
  return [
    `Jour ${index + 1} - ${day.theme}`,
    `6 h en situation de travail, à réaliser pendant votre service.`,
    '',
    ...day.items.map((it, i) => `${i + 1}. ${it}`),
  ].join('\n');
}

/**
 * Dossier du coffre-fort DD contenant les supports pédagogiques de la formation (diaporama,
 * exercices, ressources). Le coffre vit hors du dossier public `uploads/` : les fichiers sont
 * servis par une route authentifiée, jamais par une URL devinable.
 * @author Rabah Ziane · 2026-07-20
 */
const MATERIALS = {
  'hygiene-security': 'Hygiène Sécurité et Développement Durable (21h)',
  'hygiene-security-afest': 'Hygiène Sécurité et Développement Durable (21h)',
  'hsdd-21h-1050': 'Hygiène Sécurité et Développement Durable (21h)',
};

export function materialsFolderFor(formationKey, formationTitle) {
  if (formationKey && MATERIALS[formationKey]) return MATERIALS[formationKey];
  const t = String(formationTitle || '').toLowerCase();
  if (t.includes('hygi') && (t.includes('sécurit') || t.includes('securit'))) return MATERIALS['hygiene-security'];
  return null;
}

export default CATALOG;
