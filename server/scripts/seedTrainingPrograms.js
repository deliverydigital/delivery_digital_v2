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
      console.log('⚠️ Training programs already exist, skipping seeding');
      return;
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

    // Training programs data
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
          },
          {
            title: 'Guide d\'installation WordPress',
            description: 'Guide pas à pas pour installer WordPress',
            filename: 'wordpress-installation.pdf',
            original_name: 'wordpress-installation.pdf',
            file_type: 'application/pdf',
            document_type: 'guide',
            is_public: true,
            uploaded_by: adminUser._id,
            content: 'Guide d\'installation WordPress - Instructions détaillées pour l\'installation et la configuration'
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
        program_id: 'hygiene-security',
        title: 'Hygiène, Sécurité et Développement Durable',
        description: 'Formation complète en hygiène, sécurité et pratiques durables pour le secteur de la restauration',
        category: 'safety',
        duration_hours: 21,
        price: 525,
        level: 'beginner',
        max_participants: 12,
        prerequisites: 'Aucun prérequis',
        objectives: [
          'Acquérir des compétences en matière de bonnes pratiques d\'hygiène',
          'Identifier et prévenir les risques de sécurité',
          'Intégrer des pratiques durables'
        ],
        methods: [
          'AFEST (Action de Formation en Situation de Travail)',
          'Exercices pratiques et études de cas',
          'Alternance théorie et pratique',
          'Suivi personnalisé'
        ],
        evaluation_methods: [
          'Évaluation initiale et finale',
          'Plateforme d\'apprentissage DELIVERY Digital',
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
      }
    ];

    // Create programs with documents
    for (const programData of programsData) {
      console.log(`🔄 Creating program: ${programData.title}`);

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

      // Create program with documents
      const program = new TrainingProgram({
        ...programData,
        documents: documentsWithPaths
      });

      await program.save();
      console.log(`✅ Created program: ${programData.title} with ${documentsWithPaths.length} documents`);
    }

    console.log('🎉 Training programs seeded successfully!');
    console.log(`📊 Total programs created: ${programsData.length}`);

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