#!/usr/bin/env node

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from '../config/mongodb.js';
import { TrainingProgram, User } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const seedTrainingPrograms = async () => {
  try {
    console.log('🔄 Seeding training programs...');

    // Check if MongoDB is already connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 MongoDB not connected, attempting connection...');
      await connectDB();
    }

    // Check if programs already exist
    const existingPrograms = await TrainingProgram.find();
    if (existingPrograms.length > 0) {
      console.log('⚠️ Training programs already exist, updating existing ones...');
    }

    // Find admin user for document uploads
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found, cannot seed programs');
      return;
    }

    // Ensure training uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads/training');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Created training uploads directory');
    }

    // Create dummy PDF content
    const createDummyPDF = (filename, content) => {
      const filePath = path.join(uploadsDir, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
        console.log(`📄 Created dummy file: ${filename}`);
      }
      return filePath;
    };

    // Complete training programs data
    const programsData = [
      {
        program_id: 'wordpress',
        title: 'WordPress',
        description: 'Créez et gérez des sites web professionnels avec WordPress',
        category: 'web',
        duration_hours: 35,
        price: 1200,
        level: 'beginner',
        max_participants: 12,
        prerequisites: 'Connaissances de base en informatique',
        objectives: [
          'Installer et configurer WordPress',
          'Créer et gérer du contenu',
          'Personnaliser l\'apparence',
          'Gérer les plugins et thèmes'
        ],
        methods: [
          'Formation pratique avec exercices',
          'Projets concrets',
          'Support pédagogique personnalisé'
        ],
        evaluation_methods: [
          'QCM d\'évaluation',
          'Projet final',
          'Évaluation continue'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: true,
        opco_eligible: true,
        cpf_eligible: false,
        modules: [
          {
            title: 'Installation et Configuration',
            duration_hours: 7,
            topics: ['Installation WordPress', 'Configuration de base', 'Thèmes et plugins', 'Sécurité'],
            order: 1
          },
          {
            title: 'Création de Contenu',
            duration_hours: 14,
            topics: ['Pages et articles', 'Médias', 'Menus', 'Widgets'],
            order: 2
          },
          {
            title: 'Personnalisation Avancée',
            duration_hours: 14,
            topics: ['Customizer', 'CSS personnalisé', 'Fonctions avancées', 'E-commerce'],
            order: 3
          }
        ],
        documents: [
          {
            title: 'Programme détaillé WordPress',
            description: 'Programme complet de la formation WordPress',
            filename: 'wordpress-program.pdf',
            original_name: 'wordpress-program.pdf',
            file_type: 'application/pdf',
            document_type: 'program',
            is_public: true,
            uploaded_by: adminUser._id,
            content: 'Programme détaillé WordPress - Formation complète pour créer et gérer des sites web professionnels'
          }
        ]
      },
      {
        program_id: 'photoshop',
        title: 'Photoshop',
        description: 'Maîtrisez les outils de retouche photo et de création graphique',
        category: 'design',
        duration_hours: 28,
        price: 800,
        level: 'beginner',
        max_participants: 12,
        prerequisites: 'Connaissances de base en informatique',
        objectives: [
          'Maîtriser l\'interface Photoshop',
          'Réaliser des retouches photo',
          'Créer des compositions graphiques',
          'Optimiser les images pour le web'
        ],
        methods: [
          'Formation pratique avec exercices',
          'Projets créatifs',
          'Support pédagogique personnalisé'
        ],
        evaluation_methods: [
          'Projets pratiques',
          'Portfolio final',
          'Évaluation continue'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: true,
        opco_eligible: true,
        cpf_eligible: false,
        modules: [
          {
            title: 'Interface et Outils de Base',
            duration_hours: 7,
            topics: ['Interface Photoshop', 'Outils de sélection', 'Calques', 'Masques'],
            order: 1
          },
          {
            title: 'Retouche Photo',
            duration_hours: 14,
            topics: ['Correction colorimétrique', 'Retouche beauté', 'Montage photo', 'Effets'],
            order: 2
          },
          {
            title: 'Création Graphique',
            duration_hours: 7,
            topics: ['Design graphique', 'Typographie', 'Composition', 'Export'],
            order: 3
          }
        ],
        documents: [
          {
            title: 'Programme Photoshop',
            description: 'Programme détaillé de la formation Photoshop',
            filename: 'photoshop-program.pdf',
            original_name: 'photoshop-program.pdf',
            file_type: 'application/pdf',
            document_type: 'program',
            is_public: true,
            uploaded_by: adminUser._id,
            content: 'Programme Photoshop - Formation complète en retouche photo et création graphique'
          }
        ]
      },
      {
        program_id: 'canva',
        title: 'Canva',
        description: 'Créez des designs professionnels facilement avec Canva',
        category: 'design',
        duration_hours: 21,
        price: 600,
        level: 'beginner',
        max_participants: 15,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Maîtriser l\'interface Canva',
          'Créer des designs pour les réseaux sociaux',
          'Réaliser des présentations professionnelles',
          'Optimiser ses créations pour différents supports'
        ],
        methods: [
          'Formation pratique',
          'Exercices créatifs',
          'Projets personnalisés'
        ],
        evaluation_methods: [
          'Portfolio de créations',
          'Évaluation pratique'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        opco_eligible: true,
        cpf_eligible: false,
        modules: [
          {
            title: 'Prise en main de Canva',
            duration_hours: 7,
            topics: ['Interface', 'Templates', 'Éléments de base'],
            order: 1
          },
          {
            title: 'Création de contenus',
            duration_hours: 14,
            topics: ['Réseaux sociaux', 'Présentations', 'Documents'],
            order: 2
          }
        ],
        documents: []
      },
      {
        program_id: 'excel',
        title: 'Excel',
        description: 'Maîtrisez Excel pour l\'analyse de données et la gestion',
        category: 'office',
        duration_hours: 35,
        price: 900,
        level: 'intermediate',
        max_participants: 10,
        prerequisites: 'Connaissances de base d\'Excel',
        objectives: [
          'Maîtriser les formules avancées',
          'Créer des tableaux croisés dynamiques',
          'Automatiser avec les macros',
          'Analyser et visualiser les données'
        ],
        methods: [
          'Formation pratique',
          'Cas d\'usage réels',
          'Exercices progressifs'
        ],
        evaluation_methods: [
          'Tests pratiques',
          'Projet d\'analyse de données'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        opco_eligible: true,
        cpf_eligible: true,
        modules: [
          {
            title: 'Formules et Fonctions Avancées',
            duration_hours: 14,
            topics: ['Fonctions logiques', 'Fonctions de recherche', 'Fonctions de date'],
            order: 1
          },
          {
            title: 'Tableaux Croisés Dynamiques',
            duration_hours: 14,
            topics: ['Création TCD', 'Analyse de données', 'Graphiques'],
            order: 2
          },
          {
            title: 'Automatisation et Macros',
            duration_hours: 7,
            topics: ['VBA de base', 'Automatisation', 'Optimisation'],
            order: 3
          }
        ],
        documents: []
      },
      {
        program_id: 'dev-web-mobile',
        title: 'Développeur Web et Web Mobile',
        description: 'Formation complète pour devenir développeur web et mobile avec les technologies modernes',
        category: 'web',
        duration_hours: 400,
        price: 8000,
        level: 'intermediate',
        max_participants: 12,
        prerequisites: 'Connaissances de base en informatique et logique',
        objectives: [
          'Maîtriser HTML, CSS et JavaScript',
          'Développer avec React et Node.js',
          'Créer des applications mobiles avec React Native',
          'Comprendre les bases de données et APIs',
          'Déployer des applications en production'
        ],
        methods: [
          'Formation pratique avec projets réels',
          'Accompagnement personnalisé',
          'Méthodes agiles et collaboratives'
        ],
        evaluation_methods: [
          'Projets pratiques',
          'Portfolio professionnel',
          'Évaluation continue',
          'Soutenance finale'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '2 semaines',
        is_featured: true,
        certification_type: 'Titre professionnel',
        certification_provider: 'Ministère du Travail',
        opco_eligible: true,
        cpf_eligible: true,
        modules: [
          {
            title: 'Fondamentaux Web',
            duration_hours: 80,
            topics: ['HTML5', 'CSS3', 'JavaScript ES6+', 'Git/GitHub'],
            order: 1
          },
          {
            title: 'Frontend Moderne',
            duration_hours: 120,
            topics: ['React.js', 'Redux', 'TypeScript', 'Responsive Design'],
            order: 2
          },
          {
            title: 'Backend et APIs',
            duration_hours: 100,
            topics: ['Node.js', 'Express', 'MongoDB', 'APIs REST'],
            order: 3
          },
          {
            title: 'Mobile et Déploiement',
            duration_hours: 100,
            topics: ['React Native', 'Déploiement', 'DevOps', 'Tests'],
            order: 4
          }
        ],
        documents: []
      },
      {
        program_id: 'reflex-english-1',
        title: 'Reflex English Niveau 1',
        description: 'Apprentissage de l\'anglais niveau débutant avec méthode interactive',
        category: 'languages',
        duration_hours: 60,
        price: 1500,
        level: 'beginner',
        max_participants: 15,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Acquérir les bases de l\'anglais',
          'Comprendre des conversations simples',
          'S\'exprimer dans des situations courantes',
          'Préparer le niveau A2'
        ],
        methods: [
          'Méthode interactive Reflex',
          'Exercices audio et vidéo',
          'Suivi personnalisé'
        ],
        evaluation_methods: [
          'Tests de progression',
          'Évaluation orale',
          'Préparation TOEIC'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        certification_type: 'TOEIC',
        opco_eligible: true,
        cpf_eligible: true,
        modules: [
          {
            title: 'Bases de l\'anglais',
            duration_hours: 20,
            topics: ['Alphabet', 'Nombres', 'Salutations', 'Présentations'],
            order: 1
          },
          {
            title: 'Vocabulaire essentiel',
            duration_hours: 20,
            topics: ['Famille', 'Travail', 'Loisirs', 'Voyages'],
            order: 2
          },
          {
            title: 'Grammaire de base',
            duration_hours: 20,
            topics: ['Temps présent', 'Temps passé', 'Questions', 'Négations'],
            order: 3
          }
        ],
        documents: []
      },
      {
        program_id: 'reflex-english-2',
        title: 'Reflex English Niveau 2',
        description: 'Perfectionnement en anglais niveau intermédiaire',
        category: 'languages',
        duration_hours: 60,
        price: 1500,
        level: 'intermediate',
        max_participants: 15,
        prerequisites: 'Niveau A2 en anglais ou Reflex English 1',
        objectives: [
          'Améliorer la compréhension orale',
          'Développer l\'expression écrite',
          'Maîtriser la grammaire intermédiaire',
          'Préparer le niveau B1'
        ],
        methods: [
          'Méthode interactive Reflex',
          'Conversations guidées',
          'Exercices pratiques'
        ],
        evaluation_methods: [
          'Tests de niveau',
          'Évaluation orale et écrite',
          'Préparation TOEIC'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        certification_type: 'TOEIC',
        opco_eligible: true,
        cpf_eligible: true,
        modules: [],
        documents: []
      },
      {
        program_id: 'reflex-english-3',
        title: 'Reflex English Niveau 3',
        description: 'Anglais avancé pour un niveau professionnel',
        category: 'languages',
        duration_hours: 60,
        price: 1500,
        level: 'advanced',
        max_participants: 15,
        prerequisites: 'Niveau B1 en anglais ou Reflex English 2',
        objectives: [
          'Atteindre un niveau professionnel',
          'Maîtriser l\'anglais des affaires',
          'Préparer les certifications',
          'Communiquer avec aisance'
        ],
        methods: [
          'Méthode interactive Reflex',
          'Simulations professionnelles',
          'Préparation aux certifications'
        ],
        evaluation_methods: [
          'Tests TOEIC blancs',
          'Présentations orales',
          'Rédaction professionnelle'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        certification_type: 'TOEIC',
        opco_eligible: true,
        cpf_eligible: true,
        modules: [],
        documents: []
      },
      {
        program_id: 'hygiene-security',
        title: 'Hygiène, Sécurité et Développement Durable',
        description: 'Formation complète en hygiène, sécurité et pratiques durables pour le secteur de la restauration',
        category: 'safety',
        duration_hours: 14,
        price: 350,
        level: 'beginner',
        max_participants: 12,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Acquérir des compétences en matière de bonnes pratiques d\'hygiène',
          'Identifier et prévenir les risques de sécurité',
          'Intégrer des pratiques durables'
        ],
        methods: [
          'Formation théorique et pratique',
          'Exercices pratiques et études de cas',
          'Alternance théorie et pratique',
          'Suivi personnalisé'
        ],
        evaluation_methods: [
          'Évaluation initiale et finale',
          'QCM de validation',
          'Mise en situation pratique'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: true,
        certification_type: 'Attestation HACCP',
        opco_eligible: true,
        cpf_eligible: false,
        modules: [
          {
            title: 'Hygiène en Restauration',
            duration_hours: 7,
            topics: ['Bonnes pratiques d\'hygiène', 'Normes HACCP', 'Gestion des contaminations', 'Stockage des aliments'],
            order: 1
          },
          {
            title: 'Développement Durable',
            duration_hours: 7,
            topics: ['Gestion des déchets', 'Économie d\'énergie', 'Produits éco-responsables', 'Réduction du gaspillage'],
            order: 2
          }
        ],
        documents: [
          {
            title: 'Manuel HACCP',
            description: 'Manuel complet des bonnes pratiques HACCP',
            filename: 'haccp-manual.pdf',
            original_name: 'haccp-manual.pdf',
            file_type: 'application/pdf',
            document_type: 'guide',
            is_public: true,
            uploaded_by: adminUser._id,
            content: 'Manuel HACCP - Guide complet des bonnes pratiques d\'hygiène en restauration'
          }
        ]
      },
      {
        program_id: 'hygiene-security-afest',
        title: 'Hygiène, Sécurité et Développement Durable - AFEST',
        description: 'Formation en situation de travail (AFEST) pour l\'hygiène et la sécurité en restauration',
        category: 'safety',
        duration_hours: 21,
        price: 525,
        level: 'beginner',
        max_participants: 8,
        prerequisites: 'Être en poste dans un établissement de restauration',
        objectives: [
          'Appliquer les bonnes pratiques d\'hygiène en situation réelle',
          'Identifier et corriger les non-conformités',
          'Mettre en place des actions correctives'
        ],
        methods: [
          'AFEST (Action de Formation en Situation de Travail)',
          'Accompagnement sur le terrain',
          'Analyse des pratiques'
        ],
        evaluation_methods: [
          'Observation en situation',
          'Grille d\'évaluation AFEST',
          'Plan d\'amélioration'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        certification_type: 'Attestation HACCP',
        opco_eligible: true,
        cpf_eligible: false,
        modules: [],
        documents: []
      },
      {
        program_id: 'conduite-securitaire',
        title: 'Conduite Sécuritaire',
        description: 'Formation à la conduite préventive et sécuritaire',
        category: 'safety',
        duration_hours: 14,
        price: 400,
        level: 'beginner',
        max_participants: 12,
        prerequisites: 'Permis de conduire valide',
        objectives: [
          'Adopter une conduite préventive',
          'Réduire les risques d\'accidents',
          'Maîtriser les techniques d\'éco-conduite',
          'Connaître la réglementation'
        ],
        methods: [
          'Formation théorique et pratique',
          'Simulations de conduite',
          'Analyse des comportements'
        ],
        evaluation_methods: [
          'Test théorique',
          'Évaluation pratique',
          'Mise en situation'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        opco_eligible: true,
        cpf_eligible: false,
        modules: [],
        documents: []
      },
      {
        program_id: 'autocad-sketchup-revit',
        title: 'AutoCAD, SketchUp, et Revit',
        description: 'Maîtrisez les logiciels de CAO et BIM pour l\'architecture et l\'ingénierie',
        category: 'design',
        duration_hours: 100,
        price: 2500,
        level: 'intermediate',
        max_participants: 10,
        prerequisites: 'Connaissances en dessin technique ou architecture',
        objectives: [
          'Maîtriser AutoCAD pour le dessin 2D',
          'Créer des modèles 3D avec SketchUp',
          'Utiliser Revit pour le BIM',
          'Optimiser les workflows de conception'
        ],
        methods: [
          'Formation pratique intensive',
          'Projets d\'architecture réels',
          'Accompagnement personnalisé'
        ],
        evaluation_methods: [
          'Projets de conception',
          'Portfolio technique',
          'Évaluation pratique'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '2 semaines',
        is_featured: true,
        opco_eligible: true,
        cpf_eligible: true,
        modules: [
          {
            title: 'AutoCAD 2D',
            duration_hours: 35,
            topics: ['Interface AutoCAD', 'Dessin 2D', 'Cotation', 'Mise en page'],
            order: 1
          },
          {
            title: 'SketchUp 3D',
            duration_hours: 35,
            topics: ['Modélisation 3D', 'Textures', 'Rendu', 'Animation'],
            order: 2
          },
          {
            title: 'Revit BIM',
            duration_hours: 30,
            topics: ['Modélisation BIM', 'Familles', 'Coordination', 'Documentation'],
            order: 3
          }
        ],
        documents: []
      },
      {
        program_id: 'reflex-espagnol-1',
        title: 'Reflex Espagnol Niveau 1',
        description: 'Apprentissage de l\'espagnol niveau débutant',
        category: 'languages',
        duration_hours: 60,
        price: 1500,
        level: 'beginner',
        max_participants: 15,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Acquérir les bases de l\'espagnol',
          'Comprendre des conversations simples',
          'S\'exprimer dans des situations courantes'
        ],
        methods: [
          'Méthode interactive Reflex',
          'Exercices audio et vidéo',
          'Suivi personnalisé'
        ],
        evaluation_methods: [
          'Tests de progression',
          'Évaluation orale'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        opco_eligible: true,
        cpf_eligible: true,
        modules: [],
        documents: []
      },
      {
        program_id: 'reflex-espagnol-2',
        title: 'Reflex Espagnol Niveau 2',
        description: 'Perfectionnement en espagnol niveau intermédiaire',
        category: 'languages',
        duration_hours: 60,
        price: 1500,
        level: 'intermediate',
        max_participants: 15,
        prerequisites: 'Niveau A2 en espagnol ou Reflex Espagnol 1',
        objectives: [
          'Améliorer la compréhension',
          'Développer l\'expression',
          'Maîtriser la grammaire intermédiaire'
        ],
        methods: [
          'Méthode interactive Reflex',
          'Conversations guidées',
          'Exercices pratiques'
        ],
        evaluation_methods: [
          'Tests de niveau',
          'Évaluation orale et écrite'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        opco_eligible: true,
        cpf_eligible: true,
        modules: [],
        documents: []
      },
      {
        program_id: 'reflex-espagnol-3',
        title: 'Reflex Espagnol Niveau 3',
        description: 'Espagnol avancé pour un niveau professionnel',
        category: 'languages',
        duration_hours: 60,
        price: 1500,
        level: 'advanced',
        max_participants: 15,
        prerequisites: 'Niveau B1 en espagnol ou Reflex Espagnol 2',
        objectives: [
          'Atteindre un niveau professionnel',
          'Maîtriser l\'espagnol des affaires',
          'Communiquer avec aisance'
        ],
        methods: [
          'Méthode interactive Reflex',
          'Simulations professionnelles',
          'Préparation aux certifications'
        ],
        evaluation_methods: [
          'Tests avancés',
          'Présentations orales',
          'Rédaction professionnelle'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        opco_eligible: true,
        cpf_eligible: true,
        modules: [],
        documents: []
      },
      {
        program_id: 'management-complet',
        title: 'Management Parcours Complet',
        description: 'Formation complète en management et leadership',
        category: 'management',
        duration_hours: 70,
        price: 2100,
        level: 'intermediate',
        max_participants: 12,
        prerequisites: 'Expérience professionnelle ou poste d\'encadrement',
        objectives: [
          'Développer ses compétences de leader',
          'Maîtriser les techniques de management',
          'Gérer les équipes et les conflits',
          'Optimiser la performance collective'
        ],
        methods: [
          'Ateliers pratiques',
          'Études de cas',
          'Jeux de rôle',
          'Coaching personnalisé'
        ],
        evaluation_methods: [
          'Mise en situation',
          'Plan d\'action personnel',
          'Évaluation 360°'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '2 semaines',
        is_featured: true,
        opco_eligible: true,
        cpf_eligible: true,
        modules: [],
        documents: []
      },
      {
        program_id: 'vente-omnicanal',
        title: 'Techniques de Vente Omnicanal',
        description: 'Maîtrisez les techniques de vente modernes sur tous les canaux',
        category: 'business',
        duration_hours: 35,
        price: 1050,
        level: 'intermediate',
        max_participants: 12,
        prerequisites: 'Expérience en vente ou relation client',
        objectives: [
          'Maîtriser les techniques de vente omnicanal',
          'Optimiser l\'expérience client',
          'Utiliser les outils digitaux',
          'Développer son chiffre d\'affaires'
        ],
        methods: [
          'Ateliers pratiques',
          'Simulations de vente',
          'Analyse de cas clients'
        ],
        evaluation_methods: [
          'Jeux de rôle',
          'Plan d\'action commercial',
          'Évaluation des techniques'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        is_featured: false,
        opco_eligible: true,
        cpf_eligible: true,
        modules: [],
        documents: []
      },
      {
        program_id: 'nutrition',
        title: 'Nutrition',
        description: 'Formation en nutrition et diététique pour professionnels de santé',
        category: 'health',
        duration_hours: 42,
        price: 1260,
        level: 'intermediate',
        max_participants: 15,
        prerequisites: 'Formation médicale ou paramédicale',
        objectives: [
          'Comprendre les bases de la nutrition',
          'Élaborer des plans alimentaires',
          'Conseiller en nutrition',
          'Prévenir les troubles alimentaires'
        ],
        methods: [
          'Cours théoriques',
          'Études de cas cliniques',
          'Ateliers pratiques'
        ],
        evaluation_methods: [
          'Examens théoriques',
          'Études de cas',
          'Projet professionnel'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '2 semaines',
        is_featured: false,
        opco_eligible: true,
        cpf_eligible: true,
        modules: [],
        documents: []
      }
    ];

    // Create or update programs with documents
    for (const programData of programsData) {
      console.log(`🔄 Processing program: ${programData.title}`);

      // Check if program already exists
      const existingProgram = await TrainingProgram.findOne({ program_id: programData.program_id });

      if (existingProgram) {
        // Update existing program
        Object.assign(existingProgram, programData);
        await existingProgram.save();
        console.log(`✅ Updated program: ${programData.title}`);
      } else {
        // Create PDF files for documents
        const documentsWithPaths = programData.documents.map(doc => {
          const filePath = createDummyPDF(doc.filename, doc.content);
          const fileStats = fs.statSync(filePath);
          
          return {
            ...doc,
            file_path: filePath,
            file_size: fileStats.size,
            uploaded_at: new Date()
          };
        });

        // Create new program with documents
        const program = new TrainingProgram({
          ...programData,
          documents: documentsWithPaths
        });

        await program.save();
        console.log(`✅ Created program: ${programData.title} with ${documentsWithPaths.length} documents`);
      }
    }

    console.log('🎉 Training programs seeded successfully!');
    console.log(`📊 Total programs processed: ${programsData.length}`);

  } catch (error) {
    console.error('❌ Error seeding training programs:', error);
    throw error;
  }
};

// Export the function for use in other modules
export { seedTrainingPrograms };

// Run directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTrainingPrograms()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}