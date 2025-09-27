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
      console.log('⚠️ Training programs already exist, updating...');
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
        modules: [
          {
            title: 'Installation et Configuration',
            duration_hours: 7,
            topics: ['Installation WordPress', 'Configuration de base', 'Thèmes et plugins', 'Sécurité'],
            order: 1
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
        modules: [
          {
            title: 'Interface et Outils de Base',
            duration_hours: 7,
            topics: ['Interface Photoshop', 'Outils de sélection', 'Calques', 'Masques'],
            order: 1
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
        duration_hours: 14,
        price: 400,
        level: 'beginner',
        max_participants: 15,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Maîtriser l\'interface Canva',
          'Créer des designs pour les réseaux sociaux',
          'Réaliser des présentations professionnelles',
          'Optimiser ses créations'
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
        modules: [],
        documents: []
      },
      {
        program_id: 'excel',
        title: 'Excel',
        description: 'Maîtrisez Excel pour l\'analyse de données et la gestion',
        category: 'office',
        duration_hours: 21,
        price: 600,
        level: 'intermediate',
        max_participants: 12,
        prerequisites: 'Connaissances de base d\'Excel',
        objectives: [
          'Maîtriser les formules avancées',
          'Créer des tableaux croisés dynamiques',
          'Automatiser avec les macros',
          'Analyser des données'
        ],
        methods: [
          'Formation pratique',
          'Cas d\'usage réels',
          'Exercices progressifs'
        ],
        evaluation_methods: [
          'Tests pratiques',
          'Projet final'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'dev-web-mobile',
        title: 'Développeur Web et Web Mobile',
        description: 'Formation intensive pour devenir développeur full-stack',
        category: 'web',
        duration_hours: 400,
        price: 8000,
        level: 'intermediate',
        max_participants: 16,
        prerequisites: 'Bac+2 ou expérience équivalente. Logique et motivation indispensables.',
        objectives: [
          'Maîtriser HTML5, CSS3 et JavaScript moderne',
          'Développer avec React.js et Node.js',
          'Créer des applications mobiles avec React Native',
          'Gérer les bases de données (MongoDB, PostgreSQL)',
          'Déployer et maintenir des applications en production',
          'Travailler en équipe avec Git et méthodes agiles'
        ],
        methods: [
          'Pédagogie par projet et apprentissage actif',
          'Pair programming et code review',
          'Méthodes agiles (Scrum)',
          'Mentorat individuel',
          'Plateforme d\'apprentissage 24h/24'
        ],
        evaluation_methods: [
          'Projets pratiques tout au long de la formation',
          'Portfolio professionnel GitHub',
          'Évaluations techniques régulières',
          'Soutenance finale devant jury professionnel',
          'Certification des compétences acquises'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap. Matériel adapté disponible.',
        access_delay: '2 semaines (selon financement)',
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
        title: 'Reflex English 1',
        description: 'Anglais niveau débutant avec méthode Reflex',
        category: 'languages',
        duration_hours: 20,
        price: 500,
        level: 'beginner',
        max_participants: 15,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Acquérir les bases de l\'anglais',
          'Comprendre des phrases simples',
          'Communiquer de façon simple',
          'Se présenter et présenter autrui'
        ],
        methods: [
          'Méthode Reflex interactive',
          'Exercices audio et visuels',
          'Mise en situation'
        ],
        evaluation_methods: [
          'Tests de progression',
          'Évaluation orale',
          'Préparation TOEIC'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'reflex-english-2',
        title: 'Reflex English 2',
        description: 'Anglais niveau intermédiaire avec méthode Reflex',
        category: 'languages',
        duration_hours: 20,
        price: 500,
        level: 'intermediate',
        max_participants: 15,
        prerequisites: 'Niveau A1 en anglais',
        objectives: [
          'Améliorer la compréhension orale',
          'Enrichir le vocabulaire',
          'Maîtriser les temps verbaux',
          'Communiquer avec plus d\'aisance'
        ],
        methods: [
          'Méthode Reflex interactive',
          'Exercices audio et visuels',
          'Conversations guidées'
        ],
        evaluation_methods: [
          'Tests de progression',
          'Évaluation orale',
          'Préparation TOEIC'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'reflex-english-3',
        title: 'Reflex English 3',
        description: 'Anglais niveau avancé avec méthode Reflex',
        category: 'languages',
        duration_hours: 20,
        price: 500,
        level: 'advanced',
        max_participants: 15,
        prerequisites: 'Niveau B1 en anglais',
        objectives: [
          'Perfectionner l\'expression orale',
          'Maîtriser l\'anglais professionnel',
          'Comprendre des textes complexes',
          'Rédiger des documents professionnels'
        ],
        methods: [
          'Méthode Reflex interactive',
          'Études de cas professionnels',
          'Débats et présentations'
        ],
        evaluation_methods: [
          'Tests de progression',
          'Évaluation orale avancée',
          'Certification TOEIC'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'hygiene-security',
        title: 'Hygiène, Sécurité et Développement Durable',
        description: 'Formation obligatoire pour le secteur de la restauration',
        category: 'safety',
        duration_hours: 21,
        price: 525,
        level: 'beginner',
        max_participants: 15,
        prerequisites: 'Aucun prérequis spécifique',
        objectives: [
          'Acquérir les bonnes pratiques d\'hygiène alimentaire',
          'Identifier et prévenir les risques de sécurité',
          'Intégrer des pratiques de développement durable',
          'Respecter la réglementation en vigueur'
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
          'Mise en situation pratique',
          'Suivi des acquis personnalisé'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [
          {
            title: 'Hygiène en Restauration',
            duration_hours: 7,
            topics: ['Bonnes pratiques d\'hygiène', 'Normes HACCP', 'Gestion des contaminations', 'Stockage des aliments'],
            order: 1
          },
          {
            title: 'Sécurité au Travail',
            duration_hours: 7,
            topics: ['Prévention des risques', 'Équipements de protection', 'Gestes et postures', 'Premiers secours'],
            order: 2
          },
          {
            title: 'Développement Durable',
            duration_hours: 7,
            topics: ['Gestion des déchets', 'Économie d\'énergie', 'Produits éco-responsables', 'Réduction du gaspillage'],
            order: 3
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
        description: 'Formation AFEST en hygiène, sécurité et développement durable',
        category: 'safety',
        duration_hours: 14,
        price: 350,
        level: 'beginner',
        max_participants: 8,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Appliquer les bonnes pratiques d\'hygiène en situation de travail',
          'Identifier les risques sur le terrain',
          'Mettre en œuvre des pratiques durables'
        ],
        methods: [
          'AFEST (Action de Formation en Situation de Travail)',
          'Accompagnement en visioconférence',
          'Mise en pratique directe'
        ],
        evaluation_methods: [
          'Évaluation en situation de travail',
          'Suivi personnalisé des acquis'
        ],
        accessibility_info: 'Formation adaptée aux contraintes du secteur',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'conduite-securitaire',
        title: 'Conduite Sécuritaire',
        description: 'Formation à la conduite préventive et sécuritaire',
        category: 'safety',
        duration_hours: 7,
        price: 200,
        level: 'beginner',
        max_participants: 12,
        prerequisites: 'Permis de conduire valide',
        objectives: [
          'Adopter une conduite préventive',
          'Réduire les risques d\'accidents',
          'Économiser le carburant',
          'Respecter le code de la route'
        ],
        methods: [
          'Formation théorique et pratique',
          'Simulateur de conduite',
          'Mise en situation réelle'
        ],
        evaluation_methods: [
          'Test théorique',
          'Évaluation pratique',
          'Suivi post-formation'
        ],
        accessibility_info: 'Formation accessible selon les capacités de conduite',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'autocad-sketchup-revit',
        title: 'AutoCAD, SketchUp, et Revit',
        description: 'Maîtrisez les logiciels de CAO et BIM pour l\'architecture',
        category: 'design',
        duration_hours: 100,
        price: 2500,
        level: 'intermediate',
        max_participants: 10,
        prerequisites: 'Connaissances en dessin technique',
        objectives: [
          'Maîtriser AutoCAD pour le dessin 2D',
          'Créer des modèles 3D avec SketchUp',
          'Comprendre le BIM avec Revit',
          'Optimiser les workflows de conception'
        ],
        methods: [
          'Formation pratique sur projets',
          'Exercices progressifs',
          'Accompagnement personnalisé'
        ],
        evaluation_methods: [
          'Projets de conception',
          'Évaluation technique',
          'Portfolio professionnel'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '2 semaines',
        modules: [],
        documents: []
      },
      {
        program_id: 'reflex-espagnol-1',
        title: 'Reflex Espagnol Niveau 1',
        description: 'Espagnol niveau débutant avec méthode Reflex',
        category: 'languages',
        duration_hours: 20,
        price: 500,
        level: 'beginner',
        max_participants: 15,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Acquérir les bases de l\'espagnol',
          'Comprendre des phrases simples',
          'Communiquer de façon élémentaire',
          'Se présenter et échanger'
        ],
        methods: [
          'Méthode Reflex interactive',
          'Exercices audio et visuels',
          'Mise en situation'
        ],
        evaluation_methods: [
          'Tests de progression',
          'Évaluation orale',
          'Préparation DELE'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'reflex-espagnol-2',
        title: 'Reflex Espagnol Niveau 2',
        description: 'Espagnol niveau intermédiaire avec méthode Reflex',
        category: 'languages',
        duration_hours: 20,
        price: 500,
        level: 'intermediate',
        max_participants: 15,
        prerequisites: 'Niveau A1 en espagnol',
        objectives: [
          'Améliorer la compréhension orale',
          'Enrichir le vocabulaire',
          'Maîtriser les temps verbaux',
          'Communiquer avec plus d\'aisance'
        ],
        methods: [
          'Méthode Reflex interactive',
          'Exercices audio et visuels',
          'Conversations guidées'
        ],
        evaluation_methods: [
          'Tests de progression',
          'Évaluation orale',
          'Préparation DELE'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'reflex-espagnol-3',
        title: 'Reflex Espagnol Niveau 3',
        description: 'Espagnol niveau avancé avec méthode Reflex',
        category: 'languages',
        duration_hours: 20,
        price: 500,
        level: 'advanced',
        max_participants: 15,
        prerequisites: 'Niveau B1 en espagnol',
        objectives: [
          'Perfectionner l\'expression orale',
          'Maîtriser l\'espagnol professionnel',
          'Comprendre des textes complexes',
          'Rédiger des documents professionnels'
        ],
        methods: [
          'Méthode Reflex interactive',
          'Études de cas professionnels',
          'Débats et présentations'
        ],
        evaluation_methods: [
          'Tests de progression',
          'Évaluation orale avancée',
          'Certification DELE'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'management-complet',
        title: 'Management Parcours Complet',
        description: 'Formation complète en management et leadership',
        category: 'business',
        duration_hours: 35,
        price: 1200,
        level: 'intermediate',
        max_participants: 12,
        prerequisites: 'Expérience professionnelle souhaitée',
        objectives: [
          'Développer ses compétences de leader',
          'Gérer une équipe efficacement',
          'Communiquer avec impact',
          'Prendre des décisions stratégiques'
        ],
        methods: [
          'Études de cas réels',
          'Jeux de rôle',
          'Coaching individuel',
          'Ateliers collaboratifs'
        ],
        evaluation_methods: [
          'Mise en situation managériale',
          'Évaluation 360°',
          'Plan d\'action personnel'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '2 semaines',
        modules: [],
        documents: []
      },
      {
        program_id: 'vente-omnicanal',
        title: 'Techniques de Vente Omnicanal',
        description: 'Maîtrisez les techniques de vente multicanales',
        category: 'business',
        duration_hours: 21,
        price: 800,
        level: 'intermediate',
        max_participants: 12,
        prerequisites: 'Expérience en vente souhaitée',
        objectives: [
          'Maîtriser les techniques de vente modernes',
          'Optimiser l\'expérience client omnicanal',
          'Utiliser les outils digitaux de vente',
          'Fidéliser la clientèle'
        ],
        methods: [
          'Simulations de vente',
          'Analyse de cas clients',
          'Outils digitaux',
          'Coaching commercial'
        ],
        evaluation_methods: [
          'Jeux de rôle évalués',
          'Présentation commerciale',
          'Plan d\'action commercial'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      },
      {
        program_id: 'nutrition',
        title: 'Nutrition',
        description: 'Formation en nutrition et diététique',
        category: 'health',
        duration_hours: 14,
        price: 400,
        level: 'beginner',
        max_participants: 15,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Comprendre les bases de la nutrition',
          'Équilibrer les repas',
          'Adapter l\'alimentation aux besoins',
          'Prévenir les troubles alimentaires'
        ],
        methods: [
          'Cours théoriques',
          'Ateliers pratiques',
          'Études de cas',
          'Conseils personnalisés'
        ],
        evaluation_methods: [
          'QCM de connaissances',
          'Élaboration de menus',
          'Évaluation pratique'
        ],
        accessibility_info: 'Formation accessible aux personnes en situation de handicap',
        access_delay: '1 semaine',
        modules: [],
        documents: []
      }
    ];

    // Create or update programs
    for (const programData of programsData) {
      console.log(`🔄 Processing program: ${programData.title}`);

      // Check if program exists
      const existingProgram = await TrainingProgram.findOne({ program_id: programData.program_id });

      if (existingProgram) {
        // Update existing program
        Object.assign(existingProgram, programData);
        await existingProgram.save();
        console.log(`✅ Updated program: ${programData.title}`);
      } else {
        // Create documents with file paths if they exist
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

        // Create new program
        const program = new TrainingProgram({
          ...programData,
          documents: documentsWithPaths
        });

        await program.save();
        console.log(`✅ Created program: ${programData.title}`);
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