export const staticPrograms = [
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Créez et gérez des sites web professionnels avec WordPress',
    category: 'web',
    duration: '35 heures',
    price: 1200,
    level: 'beginner',
    nextSession: new Date('2024-03-15'),
    available: true,
    objectives: [
      'Installer et configurer WordPress',
      'Créer et gérer du contenu',
      'Personnaliser l\'apparence',
      'Gérer les plugins et thèmes'
    ],
    prerequisites: 'Connaissances de base en informatique',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: false
  },
  {
    id: 'photoshop',
    name: 'Photoshop',
    description: 'Maîtrisez les outils de retouche photo et de création graphique',
    category: 'design',
    duration: '28 heures',
    price: 800,
    level: 'beginner',
    nextSession: new Date('2024-03-20'),
    available: true,
    objectives: [
      'Maîtriser l\'interface Photoshop',
      'Réaliser des retouches photo',
      'Créer des compositions graphiques',
      'Optimiser les images pour le web'
    ],
    prerequisites: 'Connaissances de base en informatique',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: false
  },
  {
    id: 'canva',
    name: 'Canva',
    description: 'Créez des designs professionnels facilement avec Canva',
    category: 'design',
    duration: '21 heures',
    price: 600,
    level: 'beginner',
    nextSession: new Date('2024-04-01'),
    available: true,
    objectives: [
      'Maîtriser l\'interface Canva',
      'Créer des designs pour les réseaux sociaux',
      'Réaliser des présentations professionnelles',
      'Optimiser ses créations pour différents supports'
    ],
    prerequisites: 'Aucun prérequis',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: false
  },
  {
    id: 'excel',
    name: 'Excel',
    description: 'Maîtrisez Excel pour l\'analyse de données et la gestion',
    category: 'office',
    duration: '35 heures',
    price: 900,
    level: 'intermediate',
    nextSession: new Date('2024-03-25'),
    available: true,
    objectives: [
      'Maîtriser les formules avancées',
      'Créer des tableaux croisés dynamiques',
      'Automatiser avec les macros',
      'Analyser et visualiser les données'
    ],
    prerequisites: 'Connaissances de base d\'Excel',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'dev-web-mobile',
    name: 'Développeur Web et Web Mobile',
    description: 'Formation complète pour devenir développeur web et mobile avec les technologies modernes',
    category: 'web',
    duration: '400 heures',
    price: 8000,
    level: 'intermediate',
    nextSession: new Date('2024-04-15'),
    available: true,
    objectives: [
      'Maîtriser HTML, CSS et JavaScript',
      'Développer avec React et Node.js',
      'Créer des applications mobiles avec React Native',
      'Comprendre les bases de données et APIs',
      'Déployer des applications en production'
    ],
    prerequisites: 'Connaissances de base en informatique et logique',
    certification: 'Titre professionnel reconnu par l\'État',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'reflex-english-1',
    name: 'Reflex English Niveau 1',
    description: 'Apprentissage de l\'anglais niveau débutant avec méthode interactive',
    category: 'languages',
    duration: '60 heures',
    price: 1500,
    level: 'beginner',
    nextSession: new Date('2024-03-18'),
    available: true,
    objectives: [
      'Acquérir les bases de l\'anglais',
      'Comprendre des conversations simples',
      'S\'exprimer dans des situations courantes',
      'Préparer le niveau A2'
    ],
    prerequisites: 'Aucun prérequis',
    certification: 'Préparation TOEIC',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'reflex-english-2',
    name: 'Reflex English Niveau 2',
    description: 'Perfectionnement en anglais niveau intermédiaire',
    category: 'languages',
    duration: '60 heures',
    price: 1500,
    level: 'intermediate',
    nextSession: new Date('2024-04-05'),
    available: true,
    objectives: [
      'Améliorer la compréhension orale',
      'Développer l\'expression écrite',
      'Maîtriser la grammaire intermédiaire',
      'Préparer le niveau B1'
    ],
    prerequisites: 'Niveau A2 en anglais ou Reflex English 1',
    certification: 'Préparation TOEIC',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'reflex-english-3',
    name: 'Reflex English Niveau 3',
    description: 'Anglais avancé pour un niveau professionnel',
    category: 'languages',
    duration: '60 heures',
    price: 1500,
    level: 'advanced',
    nextSession: new Date('2024-04-10'),
    available: true,
    objectives: [
      'Atteindre un niveau professionnel',
      'Maîtriser l\'anglais des affaires',
      'Préparer les certifications',
      'Communiquer avec aisance'
    ],
    prerequisites: 'Niveau B1 en anglais ou Reflex English 2',
    certification: 'Préparation TOEIC',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'hygiene-security',
    name: 'Hygiène, Sécurité et Développement Durable',
    description: 'Formation complète en hygiène, sécurité et pratiques durables pour le secteur de la restauration',
    category: 'safety',
    duration: '14 heures',
    price: 350,
    level: 'beginner',
    nextSession: new Date('2024-03-22'),
    available: true,
    objectives: [
      'Acquérir des compétences en matière de bonnes pratiques d\'hygiène',
      'Identifier et prévenir les risques de sécurité',
      'Intégrer des pratiques durables'
    ],
    prerequisites: 'Aucun prérequis',
    certification: 'Attestation HACCP',
    opcoEligible: true,
    cpfEligible: false
  },
  {
    id: 'hygiene-security-afest',
    name: 'Hygiène, Sécurité et Développement Durable - AFEST',
    description: 'Formation en situation de travail (AFEST) pour l\'hygiène et la sécurité en restauration',
    category: 'safety',
    duration: '21 heures',
    price: 525,
    level: 'beginner',
    nextSession: new Date('2024-04-08'),
    available: true,
    objectives: [
      'Appliquer les bonnes pratiques d\'hygiène en situation réelle',
      'Identifier et corriger les non-conformités',
      'Mettre en place des actions correctives'
    ],
    prerequisites: 'Être en poste dans un établissement de restauration',
    certification: 'Attestation HACCP',
    opcoEligible: true,
    cpfEligible: false
  },
  {
    id: 'conduite-securitaire',
    name: 'Conduite Sécuritaire',
    description: 'Formation à la conduite préventive et sécuritaire',
    category: 'safety',
    duration: '14 heures',
    price: 400,
    level: 'beginner',
    nextSession: new Date('2024-03-28'),
    available: true,
    objectives: [
      'Adopter une conduite préventive',
      'Réduire les risques d\'accidents',
      'Maîtriser les techniques d\'éco-conduite',
      'Connaître la réglementation'
    ],
    prerequisites: 'Permis de conduire valide',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: false
  },
  {
    id: 'autocad-sketchup-revit',
    name: 'AutoCAD, SketchUp, et Revit',
    description: 'Maîtrisez les logiciels de CAO et BIM pour l\'architecture et l\'ingénierie',
    category: 'design',
    duration: '100 heures',
    price: 2500,
    level: 'intermediate',
    nextSession: new Date('2024-04-20'),
    available: true,
    objectives: [
      'Maîtriser AutoCAD pour le dessin 2D',
      'Créer des modèles 3D avec SketchUp',
      'Utiliser Revit pour le BIM',
      'Optimiser les workflows de conception'
    ],
    prerequisites: 'Connaissances en dessin technique ou architecture',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'reflex-espagnol-1',
    name: 'Reflex Espagnol Niveau 1',
    description: 'Apprentissage de l\'espagnol niveau débutant',
    category: 'languages',
    duration: '60 heures',
    price: 1500,
    level: 'beginner',
    nextSession: new Date('2024-04-12'),
    available: true,
    objectives: [
      'Acquérir les bases de l\'espagnol',
      'Comprendre des conversations simples',
      'S\'exprimer dans des situations courantes'
    ],
    prerequisites: 'Aucun prérequis',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'reflex-espagnol-2',
    name: 'Reflex Espagnol Niveau 2',
    description: 'Perfectionnement en espagnol niveau intermédiaire',
    category: 'languages',
    duration: '60 heures',
    price: 1500,
    level: 'intermediate',
    nextSession: new Date('2024-04-18'),
    available: true,
    objectives: [
      'Améliorer la compréhension',
      'Développer l\'expression',
      'Maîtriser la grammaire intermédiaire'
    ],
    prerequisites: 'Niveau A2 en espagnol ou Reflex Espagnol 1',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'reflex-espagnol-3',
    name: 'Reflex Espagnol Niveau 3',
    description: 'Espagnol avancé pour un niveau professionnel',
    category: 'languages',
    duration: '60 heures',
    price: 1500,
    level: 'advanced',
    nextSession: new Date('2024-04-25'),
    available: true,
    objectives: [
      'Atteindre un niveau professionnel',
      'Maîtriser l\'espagnol des affaires',
      'Communiquer avec aisance'
    ],
    prerequisites: 'Niveau B1 en espagnol ou Reflex Espagnol 2',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'management-complet',
    name: 'Management Parcours Complet',
    description: 'Formation complète en management et leadership',
    category: 'management',
    duration: '70 heures',
    price: 2100,
    level: 'intermediate',
    nextSession: new Date('2024-05-01'),
    available: true,
    objectives: [
      'Développer ses compétences de leader',
      'Maîtriser les techniques de management',
      'Gérer les équipes et les conflits',
      'Optimiser la performance collective'
    ],
    prerequisites: 'Expérience professionnelle ou poste d\'encadrement',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'vente-omnicanal',
    name: 'Techniques de Vente Omnicanal',
    description: 'Maîtrisez les techniques de vente modernes sur tous les canaux',
    category: 'business',
    duration: '35 heures',
    price: 1050,
    level: 'intermediate',
    nextSession: new Date('2024-04-30'),
    available: true,
    objectives: [
      'Maîtriser les techniques de vente omnicanal',
      'Optimiser l\'expérience client',
      'Utiliser les outils digitaux',
      'Développer son chiffre d\'affaires'
    ],
    prerequisites: 'Expérience en vente ou relation client',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: true
  },
  {
    id: 'nutrition',
    name: 'Nutrition',
    description: 'Formation en nutrition et diététique pour professionnels de santé',
    category: 'health',
    duration: '42 heures',
    price: 1260,
    level: 'intermediate',
    nextSession: new Date('2024-05-15'),
    available: true,
    objectives: [
      'Comprendre les bases de la nutrition',
      'Élaborer des plans alimentaires',
      'Conseiller en nutrition',
      'Prévenir les troubles alimentaires'
    ],
    prerequisites: 'Formation médicale ou paramédicale',
    certification: 'Attestation de formation',
    opcoEligible: true,
    cpfEligible: true
  }
];

export const categoryColors = {
  web: '#3b82f6',
  design: '#8b5cf6',
  office: '#10b981',
  languages: '#f59e0b',
  safety: '#ef4444',
  management: '#6366f1',
  business: '#ec4899',
  health: '#14b8a6'
};

export const categoryIcons = {
  web: 'Code',
  design: 'Palette',
  office: 'FileText',
  languages: 'Globe',
  safety: 'Shield',
  management: 'Users',
  business: 'Briefcase',
  health: 'Heart'
};