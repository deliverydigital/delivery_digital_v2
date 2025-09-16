import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/mongodb.js';
import { User } from '../models/index.js';

dotenv.config();

const createDummyTrainingSessions = async () => {
  try {
    // Check if MongoDB is already connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 MongoDB not connected, attempting connection...');
      await connectDB();
    }

    console.log('🔄 Creating dummy training sessions...');

    // Find admin and trainer users
    const adminUser = await User.findOne({ role: 'admin' });
    const trainerUsers = await User.find({ role: 'trainer' });

    if (!adminUser) {
      console.log('❌ No admin user found, skipping training sessions creation');
      return;
    }

    // Create trainer users if they don't exist
    const trainers = [
      {
        email: 'alex.dev@deliverydigital.fr',
        name: 'Alexandre Développeur',
        role: 'trainer',
        specialties: ['web', 'mobile', 'javascript', 'react']
      },
      {
        email: 'sarah.ux@deliverydigital.fr',
        name: 'Sarah UX Designer',
        role: 'trainer',
        specialties: ['design', 'ux', 'ui', 'photoshop']
      },
      {
        email: 'michel.devops@deliverydigital.fr',
        name: 'Michel DevOps',
        role: 'trainer',
        specialties: ['devops', 'cloud', 'security', 'infrastructure']
      },
      {
        email: 'marie.formation@deliverydigital.fr',
        name: 'Marie Formatrice',
        role: 'trainer',
        specialties: ['hygiene', 'security', 'management', 'languages']
      }
    ];

    const createdTrainers = [];
    for (const trainerData of trainers) {
      let trainer = await User.findOne({ email: trainerData.email });
      if (!trainer) {
        trainer = new User({
          email: trainerData.email,
          password_hash: await User.hashPassword('trainer123'),
          name: trainerData.name,
          company: 'DELIVERY Digital Technology',
          role: 'trainer',
          status: 'active',
          email_verified: true
        });
        await trainer.save();
        console.log(`✅ Created trainer: ${trainerData.name}`);
      }
      createdTrainers.push({ ...trainer.toObject(), specialties: trainerData.specialties });
    }

    // Create dummy training sessions
    const dummySessions = [
      {
        id: 'session-wordpress-1',
        title: 'WordPress - Création de Sites Web',
        description: 'Apprenez à créer et gérer des sites web professionnels avec WordPress',
        type: 'web',
        category: 'CMS',
        level: 'beginner',
        duration_hours: 35,
        max_participants: 12,
        price: 1200,
        location: 'Nice - 470 Promenade des Anglais',
        is_remote: false,
        start_date: new Date('2024-03-15'),
        end_date: new Date('2024-03-29'),
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('web'))?._id,
        status: 'planned',
        objectives: [
          'Maîtriser l\'installation et la configuration de WordPress',
          'Créer et personnaliser des thèmes WordPress',
          'Gérer le contenu et les médias',
          'Optimiser le référencement SEO',
          'Sécuriser un site WordPress'
        ],
        prerequisites: 'Connaissances de base en informatique',
        materials: {
          included: ['Accès plateforme', 'Support de cours', 'Exercices pratiques'],
          required: ['Ordinateur portable', 'Connexion internet']
        },
        certification_provided: true,
        certification_name: 'Certificat WordPress DELIVERY Digital'
      },
      {
        id: 'session-photoshop-1',
        title: 'Photoshop - Retouche Photo Professionnelle',
        description: 'Maîtrisez les outils de retouche photo et de création graphique avec Photoshop',
        type: 'design',
        category: 'Design Graphique',
        level: 'beginner',
        duration_hours: 28,
        max_participants: 10,
        price: 800,
        location: 'Nice - 470 Promenade des Anglais',
        is_remote: false,
        start_date: new Date('2024-04-01'),
        end_date: new Date('2024-04-12'),
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('design'))?._id,
        status: 'planned',
        objectives: [
          'Maîtriser l\'interface et les outils de Photoshop',
          'Réaliser des retouches photo professionnelles',
          'Créer des compositions graphiques',
          'Optimiser les images pour le web',
          'Gérer les calques et les masques'
        ],
        prerequisites: 'Aucun prérequis',
        materials: {
          included: ['Licence Photoshop temporaire', 'Banque d\'images', 'Projets pratiques'],
          required: ['Ordinateur avec Photoshop installé']
        },
        certification_provided: true,
        certification_name: 'Certificat Photoshop DELIVERY Digital'
      },
      {
        id: 'session-dev-web-1',
        title: 'Développeur Web et Web Mobile',
        description: 'Formation complète pour devenir développeur web et mobile (400h)',
        type: 'web',
        category: 'Développement',
        level: 'intermediate',
        duration_hours: 400,
        max_participants: 8,
        price: 6000,
        location: 'Nice - 470 Promenade des Anglais',
        is_remote: true,
        start_date: new Date('2024-05-01'),
        end_date: new Date('2024-08-30'),
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('react'))?._id,
        status: 'ongoing',
        objectives: [
          'Maîtriser HTML5, CSS3 et JavaScript moderne',
          'Développer avec React.js et Node.js',
          'Créer des applications mobiles avec React Native',
          'Gérer les bases de données et APIs',
          'Déployer des applications en production'
        ],
        prerequisites: 'Connaissances de base en informatique et logique',
        materials: {
          included: ['Plateforme de développement', 'Serveurs de test', 'Outils de développement'],
          required: ['Ordinateur portable performant', 'Connexion internet stable']
        },
        certification_provided: true,
        certification_name: 'Titre Professionnel Développeur Web et Web Mobile'
      },
      {
        id: 'session-hygiene-1',
        title: 'Hygiène, Sécurité et Développement Durable',
        description: 'Formation complète en hygiène, sécurité et pratiques durables pour la restauration',
        type: 'hygiene',
        category: 'Sécurité Alimentaire',
        level: 'beginner',
        duration_hours: 21,
        max_participants: 15,
        price: 525,
        location: 'Nice - 470 Promenade des Anglais',
        is_remote: false,
        start_date: new Date('2024-03-20'),
        end_date: new Date('2024-03-22'),
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['Mercredi', 'Jeudi', 'Vendredi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('hygiene'))?._id,
        status: 'completed',
        objectives: [
          'Acquérir les bonnes pratiques d\'hygiène alimentaire',
          'Identifier et prévenir les risques de sécurité',
          'Intégrer des pratiques de développement durable',
          'Appliquer la méthode HACCP',
          'Gérer les situations d\'urgence'
        ],
        prerequisites: 'Aucun prérequis',
        materials: {
          included: ['Manuel HACCP', 'Guide des bonnes pratiques', 'Certificat de formation'],
          required: ['Tenue de travail appropriée']
        },
        certification_provided: true,
        certification_name: 'Attestation Hygiène Alimentaire'
      },
      {
        id: 'session-excel-1',
        title: 'Excel - Analyse de Données Avancée',
        description: 'Maîtrisez Excel pour l\'analyse de données et la bureautique avancée',
        type: 'office',
        category: 'Bureautique',
        level: 'intermediate',
        duration_hours: 28,
        max_participants: 12,
        price: 700,
        location: 'Formation à distance',
        is_remote: true,
        start_date: new Date('2024-04-15'),
        end_date: new Date('2024-04-26'),
        schedule: {
          startTime: '14:00',
          endTime: '18:00',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
        },
        trainer_id: createdTrainers[0]?._id,
        status: 'planned',
        objectives: [
          'Maîtriser les fonctions avancées d\'Excel',
          'Créer des tableaux croisés dynamiques',
          'Automatiser avec les macros VBA',
          'Analyser des données complexes',
          'Créer des tableaux de bord interactifs'
        ],
        prerequisites: 'Connaissances de base d\'Excel',
        materials: {
          included: ['Licence Office temporaire', 'Jeux de données', 'Templates Excel'],
          required: ['Ordinateur avec Excel installé']
        },
        certification_provided: true,
        certification_name: 'Certificat Excel Avancé'
      },
      {
        id: 'session-english-1',
        title: 'Reflex English - Niveau Intermédiaire',
        description: 'Perfectionnez votre anglais professionnel avec notre méthode interactive',
        type: 'languages',
        category: 'Langues',
        level: 'intermediate',
        duration_hours: 30,
        max_participants: 8,
        price: 900,
        location: 'Formation mixte (présentiel + distanciel)',
        is_remote: true,
        start_date: new Date('2024-05-15'),
        end_date: new Date('2024-06-15'),
        schedule: {
          startTime: '18:00',
          endTime: '20:00',
          days: ['Mardi', 'Jeudi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('languages'))?._id,
        status: 'planned',
        objectives: [
          'Améliorer la compréhension orale et écrite',
          'Développer l\'expression orale en contexte professionnel',
          'Maîtriser le vocabulaire technique et commercial',
          'Préparer aux certifications TOEIC/TOEFL',
          'Gagner en confiance lors des échanges en anglais'
        ],
        prerequisites: 'Niveau A2 minimum en anglais',
        materials: {
          included: ['Plateforme Reflex English', 'Supports audio/vidéo', 'Tests blancs'],
          required: ['Casque audio', 'Webcam pour les sessions orales']
        },
        certification_provided: true,
        certification_name: 'Certificat Reflex English B1/B2'
      },
      {
        id: 'session-canva-1',
        title: 'Canva - Design Graphique Accessible',
        description: 'Créez des visuels professionnels facilement avec Canva',
        type: 'design',
        category: 'Design Graphique',
        level: 'beginner',
        duration_hours: 21,
        max_participants: 15,
        price: 600,
        location: 'Formation à distance',
        is_remote: true,
        start_date: new Date('2024-04-08'),
        end_date: new Date('2024-04-19'),
        schedule: {
          startTime: '10:00',
          endTime: '13:00',
          days: ['Lundi', 'Mercredi', 'Vendredi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('design'))?._id,
        status: 'ongoing',
        objectives: [
          'Maîtriser l\'interface et les outils Canva',
          'Créer des supports de communication visuels',
          'Développer une identité graphique cohérente',
          'Optimiser les visuels pour différents supports',
          'Collaborer efficacement sur des projets design'
        ],
        prerequisites: 'Aucun prérequis',
        materials: {
          included: ['Compte Canva Pro', 'Banque d\'images premium', 'Templates exclusifs'],
          required: ['Ordinateur ou tablette', 'Connexion internet']
        },
        certification_provided: true,
        certification_name: 'Certificat Canva Design'
      },
      {
        id: 'session-autocad-1',
        title: 'AutoCAD, SketchUp et Revit - BIM Complet',
        description: 'Maîtrise complète des outils de conception 3D et BIM',
        type: 'design',
        category: 'CAO/DAO',
        level: 'intermediate',
        duration_hours: 100,
        max_participants: 6,
        price: 3500,
        location: 'Nice - 470 Promenade des Anglais',
        is_remote: false,
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-07-15'),
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi']
        },
        trainer_id: createdTrainers[0]?._id,
        status: 'planned',
        objectives: [
          'Créer des plans 2D et 3D avec AutoCAD',
          'Modéliser en 3D avec SketchUp',
          'Concevoir en BIM avec Revit',
          'Gérer un projet architectural complet',
          'Collaborer sur des maquettes numériques'
        ],
        prerequisites: 'Notions de dessin technique recommandées',
        materials: {
          included: ['Licences logiciels temporaires', 'Projets d\'étude', 'Bibliothèques 3D'],
          required: ['Ordinateur performant', 'Souris 3D recommandée']
        },
        certification_provided: true,
        certification_name: 'Certificat CAO/BIM Professionnel'
      },
      {
        id: 'session-management-1',
        title: 'Management - Parcours Complet Leadership',
        description: 'Formation complète en management et leadership d\'équipe',
        type: 'management',
        category: 'Management',
        level: 'intermediate',
        duration_hours: 70,
        max_participants: 10,
        price: 2500,
        location: 'Nice - 470 Promenade des Anglais',
        is_remote: false,
        start_date: new Date('2024-05-20'),
        end_date: new Date('2024-07-10'),
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['Mardi', 'Jeudi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('management'))?._id,
        status: 'planned',
        objectives: [
          'Développer son style de leadership',
          'Gérer et motiver une équipe',
          'Conduire le changement organisationnel',
          'Résoudre les conflits efficacement',
          'Optimiser la performance collective'
        ],
        prerequisites: 'Expérience en encadrement d\'équipe souhaitée',
        materials: {
          included: ['Tests de personnalité', 'Outils d\'évaluation', 'Cas d\'étude'],
          required: ['Expérience professionnelle']
        },
        certification_provided: true,
        certification_name: 'Certificat Management et Leadership'
      },
      {
        id: 'session-nutrition-1',
        title: 'Nutrition et Diététique Professionnelle',
        description: 'Formation complète en nutrition pour les professionnels de santé',
        type: 'health',
        category: 'Santé',
        level: 'intermediate',
        duration_hours: 28,
        max_participants: 12,
        price: 1200,
        location: 'Nice - 470 Promenade des Anglais',
        is_remote: false,
        start_date: new Date('2024-06-10'),
        end_date: new Date('2024-06-21'),
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['Lundi', 'Mercredi', 'Vendredi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('management'))?._id,
        status: 'planned',
        objectives: [
          'Comprendre les bases de la nutrition humaine',
          'Élaborer des plans alimentaires personnalisés',
          'Conseiller en nutrition sportive',
          'Gérer les pathologies nutritionnelles',
          'Promouvoir une alimentation équilibrée'
        ],
        prerequisites: 'Formation médicale ou paramédicale recommandée',
        materials: {
          included: ['Manuel de nutrition', 'Logiciel de calcul nutritionnel', 'Études de cas'],
          required: ['Connaissances de base en biologie']
        },
        certification_provided: true,
        certification_name: 'Certificat Nutrition Professionnelle'
      },
      {
        id: 'session-vente-1',
        title: 'Techniques de Vente Omnicanal',
        description: 'Maîtrisez les techniques de vente modernes sur tous les canaux',
        type: 'business',
        category: 'Commercial',
        level: 'intermediate',
        duration_hours: 35,
        max_participants: 12,
        price: 1800,
        location: 'Nice - 470 Promenade des Anglais',
        is_remote: false,
        start_date: new Date('2024-07-01'),
        end_date: new Date('2024-07-15'),
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('management'))?._id,
        status: 'planned',
        objectives: [
          'Maîtriser les techniques de vente consultative',
          'Développer une approche omnicanal',
          'Utiliser les outils CRM efficacement',
          'Gérer les objections et négocier',
          'Fidéliser la clientèle'
        ],
        prerequisites: 'Expérience commerciale souhaitée',
        materials: {
          included: ['Outils CRM', 'Simulateurs de vente', 'Études de marché'],
          required: ['Expérience client recommandée']
        },
        certification_provided: true,
        certification_name: 'Certificat Vente Omnicanal'
      },
      {
        id: 'session-conduite-1',
        title: 'Conduite Sécuritaire et Prévention Routière',
        description: 'Formation complète pour améliorer les compétences en conduite sécuritaire',
        type: 'safety',
        category: 'Sécurité Routière',
        level: 'beginner',
        duration_hours: 100,
        max_participants: 8,
        price: 3500,
        location: 'Nice - Centre de formation + Terrain',
        is_remote: false,
        start_date: new Date('2024-08-01'),
        end_date: new Date('2024-09-30'),
        schedule: {
          startTime: '08:00',
          endTime: '16:00',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi']
        },
        trainer_id: createdTrainers.find(t => t.specialties.includes('security'))?._id,
        status: 'planned',
        objectives: [
          'Maîtriser les techniques de conduite défensive',
          'Gérer les situations d\'urgence sur route',
          'Adapter la conduite aux conditions climatiques',
          'Appliquer les règles de sécurité routière',
          'Réduire les risques d\'accidents'
        ],
        prerequisites: 'Permis de conduire valide obligatoire',
        materials: {
          included: ['Véhicule école', 'Simulateur de conduite', 'Manuel sécurité routière'],
          required: ['Permis de conduire valide', 'Aptitude médicale']
        },
        certification_provided: true,
        certification_name: 'Certificat Conduite Sécuritaire'
      }
    ];

    // Save to localStorage for demo
    localStorage.setItem('trainingSessions', JSON.stringify(dummySessions));
    console.log('✅ Training sessions saved to localStorage');

    console.log('\n🎉 Dummy training sessions created successfully!');
    console.log(`📊 Total sessions created: ${dummySessions.length}`);
    console.log('\n📋 Training sessions:');
    dummySessions.forEach(session => {
      console.log(`• ${session.title} (${session.duration_hours}h) - ${session.status}`);
    });

    return true;

  } catch (error) {
    console.error('❌ Error creating dummy training sessions:', error);
    throw error;
  }
};

// Export the function for use in other modules
export { createDummyTrainingSessions };

// Run directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  createDummyTrainingSessions()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}