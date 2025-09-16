import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/mongodb.js';
import { TrainingDocument, User } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createDummyTrainingDocuments = async () => {
  try {
    console.log('🔄 Creating dummy training documents...');

    // Check if MongoDB is already connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 MongoDB not connected, attempting connection...');
      await connectDB();
    }

    // Find admin user to use as uploader
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found, creating documents without uploader reference');
      return;
    }

    console.log('✅ Found admin user:', adminUser.email);

    // Ensure training uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads/training');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Created training uploads directory');
    }

    // Create dummy PDF files (placeholder content)
    const createDummyPDF = (filename, content) => {
      const filePath = path.join(uploadsDir, filename);
      if (!fs.existsSync(filePath)) {
        // Create a simple text file as placeholder (in production, these would be real PDFs)
        fs.writeFileSync(filePath, content);
        console.log(`📄 Created dummy file: ${filename}`);
      }
      return filePath;
    };

    // Define dummy documents
    const dummyDocuments = [
      // WordPress Documents
      {
        program_id: 'wordpress',
        program_name: 'WordPress',
        title: 'Programme détaillé WordPress',
        description: 'Programme complet de la formation WordPress avec objectifs et contenu détaillé',
        filename: 'wordpress-program-detailed.pdf',
        category: 'program',
        tags: ['wordpress', 'cms', 'web', 'programme'],
        content: 'Programme détaillé de formation WordPress - Contenu de démonstration'
      },
      {
        program_id: 'wordpress',
        program_name: 'WordPress',
        title: 'Guide d\'installation WordPress',
        description: 'Guide pas à pas pour installer WordPress en local et en production',
        filename: 'wordpress-installation-guide.pdf',
        category: 'guide',
        tags: ['wordpress', 'installation', 'guide', 'setup'],
        content: 'Guide d\'installation WordPress - Contenu de démonstration'
      },
      {
        program_id: 'wordpress',
        program_name: 'WordPress',
        title: 'Ressources et plugins recommandés',
        description: 'Liste des plugins et thèmes recommandés pour WordPress',
        filename: 'wordpress-resources.pdf',
        category: 'guide',
        tags: ['wordpress', 'plugins', 'thèmes', 'ressources'],
        content: 'Ressources WordPress - Contenu de démonstration'
      },

      // Photoshop Documents
      {
        program_id: 'photoshop',
        program_name: 'Photoshop',
        title: 'Programme Photoshop',
        description: 'Programme détaillé de la formation Photoshop',
        filename: 'photoshop-program.pdf',
        category: 'program',
        tags: ['photoshop', 'design', 'retouche', 'programme'],
        content: 'Programme Photoshop - Contenu de démonstration'
      },
      {
        program_id: 'photoshop',
        program_name: 'Photoshop',
        title: 'Raccourcis clavier Photoshop',
        description: 'Liste complète des raccourcis clavier essentiels pour Photoshop',
        filename: 'photoshop-shortcuts.pdf',
        category: 'guide',
        tags: ['photoshop', 'raccourcis', 'productivité'],
        content: 'Raccourcis Photoshop - Contenu de démonstration'
      },
      {
        program_id: 'photoshop',
        program_name: 'Photoshop',
        title: 'Exercices pratiques Photoshop',
        description: 'Série d\'exercices pour pratiquer les techniques de retouche photo',
        filename: 'photoshop-exercises.pdf',
        category: 'guide',
        tags: ['photoshop', 'exercices', 'pratique'],
        content: 'Exercices Photoshop - Contenu de démonstration'
      },

      // Canva Documents
      {
        program_id: 'canva',
        program_name: 'Canva',
        title: 'Guide Canva complet',
        description: 'Guide complet pour maîtriser Canva de A à Z',
        filename: 'canva-complete-guide.pdf',
        category: 'guide',
        tags: ['canva', 'design', 'guide', 'création'],
        content: 'Guide Canva - Contenu de démonstration'
      },
      {
        program_id: 'canva',
        program_name: 'Canva',
        title: 'Templates Canva professionnels',
        description: 'Collection de templates professionnels pour Canva',
        filename: 'canva-templates.pdf',
        category: 'guide',
        tags: ['canva', 'templates', 'professionnel'],
        content: 'Templates Canva - Contenu de démonstration'
      },

      // Excel Documents
      {
        program_id: 'excel',
        program_name: 'Excel',
        title: 'Formules Excel avancées',
        description: 'Guide des formules et fonctions avancées d\'Excel',
        filename: 'excel-advanced-formulas.pdf',
        category: 'guide',
        tags: ['excel', 'formules', 'fonctions', 'avancé'],
        content: 'Formules Excel - Contenu de démonstration'
      },
      {
        program_id: 'excel',
        program_name: 'Excel',
        title: 'Tableaux croisés dynamiques',
        description: 'Maîtriser les tableaux croisés dynamiques dans Excel',
        filename: 'excel-pivot-tables.pdf',
        category: 'guide',
        tags: ['excel', 'tableaux croisés', 'analyse'],
        content: 'Tableaux croisés Excel - Contenu de démonstration'
      },

      // Développeur Web Documents
      {
        program_id: 'dev-web-mobile',
        program_name: 'Développeur Web et Web Mobile',
        title: 'Curriculum complet Développeur Web',
        description: 'Programme détaillé de la formation développeur web et mobile (400h)',
        filename: 'dev-web-curriculum.pdf',
        category: 'program',
        tags: ['développement', 'web', 'mobile', 'curriculum'],
        content: 'Curriculum Développeur Web - Contenu de démonstration'
      },
      {
        program_id: 'dev-web-mobile',
        program_name: 'Développeur Web et Web Mobile',
        title: 'Guide React.js',
        description: 'Guide complet pour apprendre React.js',
        filename: 'react-guide.pdf',
        category: 'guide',
        tags: ['react', 'javascript', 'frontend'],
        content: 'Guide React.js - Contenu de démonstration'
      },
      {
        program_id: 'dev-web-mobile',
        program_name: 'Développeur Web et Web Mobile',
        title: 'API REST avec Node.js',
        description: 'Guide pour créer des APIs REST avec Node.js',
        filename: 'nodejs-api-guide.pdf',
        category: 'guide',
        tags: ['nodejs', 'api', 'backend'],
        content: 'Guide Node.js API - Contenu de démonstration'
      },

      // Hygiène et Sécurité Documents
      {
        program_id: 'hygiene-security',
        program_name: 'Hygiène, Sécurité et Développement Durable',
        title: 'Manuel HACCP',
        description: 'Manuel complet des bonnes pratiques HACCP',
        filename: 'haccp-manual.pdf',
        category: 'guide',
        tags: ['haccp', 'hygiène', 'sécurité', 'restauration'],
        content: 'Manuel HACCP - Contenu de démonstration'
      },
      {
        program_id: 'hygiene-security',
        program_name: 'Hygiène, Sécurité et Développement Durable',
        title: 'Guide développement durable',
        description: 'Pratiques éco-responsables en restauration',
        filename: 'sustainable-practices.pdf',
        category: 'guide',
        tags: ['développement durable', 'éco-responsable', 'environnement'],
        content: 'Guide développement durable - Contenu de démonstration'
      },

      // AutoCAD Documents
      {
        program_id: 'autocad-sketchup-revit',
        program_name: 'AutoCAD, SketchUp, et Revit',
        title: 'Manuel AutoCAD 2024',
        description: 'Manuel complet pour AutoCAD 2024',
        filename: 'autocad-2024-manual.pdf',
        category: 'guide',
        tags: ['autocad', 'cao', 'dessin', '2024'],
        content: 'Manuel AutoCAD - Contenu de démonstration'
      },
      {
        program_id: 'autocad-sketchup-revit',
        program_name: 'AutoCAD, SketchUp, et Revit',
        title: 'Guide SketchUp Pro',
        description: 'Guide pour maîtriser SketchUp Pro',
        filename: 'sketchup-pro-guide.pdf',
        category: 'guide',
        tags: ['sketchup', '3d', 'modélisation'],
        content: 'Guide SketchUp - Contenu de démonstration'
      },
      {
        program_id: 'autocad-sketchup-revit',
        program_name: 'AutoCAD, SketchUp, et Revit',
        title: 'Introduction au BIM avec Revit',
        description: 'Guide d\'introduction au Building Information Modeling avec Revit',
        filename: 'revit-bim-intro.pdf',
        category: 'guide',
        tags: ['revit', 'bim', 'architecture', 'construction'],
        content: 'Guide BIM Revit - Contenu de démonstration'
      }
    ];

    // Check if documents already exist
    const existingDocuments = await TrainingDocument.find();
    if (existingDocuments.length > 0) {
      console.log('⚠️ Training documents already exist, skipping creation');
      return;
    }

    // Create documents
    for (const docData of dummyDocuments) {
      const filePath = createDummyPDF(docData.filename, docData.content);
      const fileStats = fs.statSync(filePath);

      const documentData = {
        program_id: docData.program_id,
        program_name: docData.program_name,
        title: docData.title,
        description: docData.description,
        filename: docData.filename,
        original_name: docData.filename,
        file_type: 'application/pdf',
        file_size: fileStats.size,
        file_path: filePath,
        uploaded_by: adminUser._id,
        category: docData.category,
        tags: docData.tags,
        version: '1.0',
        is_public: true,
        download_count: Math.floor(Math.random() * 50) // Random download count for demo
      };

      const document = new TrainingDocument(documentData);
      await document.save();
      console.log(`✅ Created document: ${docData.title}`);
    }

    console.log('🎉 Dummy training documents created successfully!');
    console.log(`📊 Total documents created: ${dummyDocuments.length}`);

  } catch (error) {
    console.error('❌ Error creating dummy training documents:', error);
    throw error;
  }
};

// Export the function for use in other modules
export { createDummyTrainingDocuments };

// Run directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  createDummyTrainingDocuments()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}