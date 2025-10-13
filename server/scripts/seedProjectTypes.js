import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ProjectType from '../models/ProjectType.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const projectTypesData = [
  {
    name: 'Site Web / Application Web',
    description: 'Développement de sites web et applications web',
    defaultTasks: [
      { title: 'Analyse des besoins', description: 'Recueillir et analyser les besoins du client', priority: 'high', estimatedHours: 8, orderIndex: 1 },
      { title: 'Conception UX/UI', description: 'Créer les maquettes et le design de l\'interface', priority: 'high', estimatedHours: 16, orderIndex: 2 },
      { title: 'Configuration de l\'environnement', description: 'Mettre en place l\'environnement de développement', priority: 'medium', estimatedHours: 4, orderIndex: 3 },
      { title: 'Développement Frontend', description: 'Développer l\'interface utilisateur', priority: 'high', estimatedHours: 40, orderIndex: 4 },
      { title: 'Développement Backend', description: 'Développer la logique métier et les APIs', priority: 'high', estimatedHours: 40, orderIndex: 5 },
      { title: 'Intégration Base de données', description: 'Créer et intégrer la base de données', priority: 'high', estimatedHours: 16, orderIndex: 6 },
      { title: 'Tests et débogage', description: 'Tester l\'application et corriger les bugs', priority: 'high', estimatedHours: 16, orderIndex: 7 },
      { title: 'Déploiement', description: 'Déployer l\'application en production', priority: 'medium', estimatedHours: 8, orderIndex: 8 },
      { title: 'Documentation', description: 'Rédiger la documentation technique et utilisateur', priority: 'low', estimatedHours: 8, orderIndex: 9 },
      { title: 'Formation client', description: 'Former le client à l\'utilisation de l\'application', priority: 'medium', estimatedHours: 4, orderIndex: 10 }
    ]
  },
  {
    name: 'Application Mobile',
    description: 'Développement d\'applications mobiles iOS et Android',
    defaultTasks: [
      { title: 'Analyse des besoins mobiles', description: 'Définir les fonctionnalités et plateformes cibles', priority: 'high', estimatedHours: 8, orderIndex: 1 },
      { title: 'Design mobile UX/UI', description: 'Créer les interfaces adaptées mobile', priority: 'high', estimatedHours: 16, orderIndex: 2 },
      { title: 'Configuration projet mobile', description: 'Initialiser le projet iOS/Android', priority: 'medium', estimatedHours: 4, orderIndex: 3 },
      { title: 'Développement des écrans', description: 'Développer les interfaces de l\'app', priority: 'high', estimatedHours: 40, orderIndex: 4 },
      { title: 'Intégration des APIs', description: 'Connecter l\'app aux services backend', priority: 'high', estimatedHours: 24, orderIndex: 5 },
      { title: 'Gestion des notifications', description: 'Implémenter les notifications push', priority: 'medium', estimatedHours: 8, orderIndex: 6 },
      { title: 'Tests multi-plateformes', description: 'Tester sur iOS et Android', priority: 'high', estimatedHours: 16, orderIndex: 7 },
      { title: 'Optimisation des performances', description: 'Optimiser la vitesse et la consommation', priority: 'medium', estimatedHours: 8, orderIndex: 8 },
      { title: 'Publication sur les stores', description: 'Publier sur App Store et Play Store', priority: 'high', estimatedHours: 8, orderIndex: 9 },
      { title: 'Support post-lancement', description: 'Assurer le support initial', priority: 'low', estimatedHours: 8, orderIndex: 10 }
    ]
  },
  {
    name: 'E-commerce',
    description: 'Boutiques en ligne et plateformes de vente',
    defaultTasks: [
      { title: 'Analyse du catalogue produits', description: 'Définir la structure du catalogue', priority: 'high', estimatedHours: 8, orderIndex: 1 },
      { title: 'Design de la boutique', description: 'Créer le design de l\'e-commerce', priority: 'high', estimatedHours: 16, orderIndex: 2 },
      { title: 'Configuration plateforme', description: 'Installer et configurer la plateforme e-commerce', priority: 'high', estimatedHours: 8, orderIndex: 3 },
      { title: 'Gestion des produits', description: 'Développer le système de gestion produits', priority: 'high', estimatedHours: 24, orderIndex: 4 },
      { title: 'Panier et checkout', description: 'Implémenter le panier et le tunnel d\'achat', priority: 'urgent', estimatedHours: 24, orderIndex: 5 },
      { title: 'Intégration paiement', description: 'Intégrer les solutions de paiement', priority: 'urgent', estimatedHours: 16, orderIndex: 6 },
      { title: 'Gestion des commandes', description: 'Développer le système de gestion des commandes', priority: 'high', estimatedHours: 16, orderIndex: 7 },
      { title: 'Module de livraison', description: 'Intégrer les options de livraison', priority: 'high', estimatedHours: 12, orderIndex: 8 },
      { title: 'Tests de transaction', description: 'Tester tous les processus de vente', priority: 'urgent', estimatedHours: 16, orderIndex: 9 },
      { title: 'Configuration SEO', description: 'Optimiser le référencement', priority: 'medium', estimatedHours: 8, orderIndex: 10 }
    ]
  },
  {
    name: 'Application Desktop',
    description: 'Applications de bureau multi-plateformes',
    defaultTasks: [
      { title: 'Analyse des besoins desktop', description: 'Définir les fonctionnalités de l\'application', priority: 'high', estimatedHours: 8, orderIndex: 1 },
      { title: 'Design de l\'interface desktop', description: 'Créer l\'interface utilisateur desktop', priority: 'high', estimatedHours: 16, orderIndex: 2 },
      { title: 'Configuration de l\'environnement', description: 'Mettre en place l\'environnement Electron/autre', priority: 'medium', estimatedHours: 4, orderIndex: 3 },
      { title: 'Développement des fonctionnalités', description: 'Développer les fonctionnalités principales', priority: 'high', estimatedHours: 48, orderIndex: 4 },
      { title: 'Gestion des fichiers locaux', description: 'Implémenter la gestion des fichiers', priority: 'high', estimatedHours: 16, orderIndex: 5 },
      { title: 'Tests multi-plateformes', description: 'Tester sur Windows, Mac, Linux', priority: 'high', estimatedHours: 16, orderIndex: 6 },
      { title: 'Création des installeurs', description: 'Créer les packages d\'installation', priority: 'medium', estimatedHours: 8, orderIndex: 7 },
      { title: 'Système de mise à jour', description: 'Implémenter les mises à jour automatiques', priority: 'medium', estimatedHours: 12, orderIndex: 8 },
      { title: 'Documentation utilisateur', description: 'Créer la documentation et l\'aide', priority: 'low', estimatedHours: 8, orderIndex: 9 },
      { title: 'Distribution', description: 'Préparer la distribution de l\'application', priority: 'medium', estimatedHours: 4, orderIndex: 10 }
    ]
  },
  {
    name: 'API / Backend',
    description: 'Services backend et APIs REST/GraphQL',
    defaultTasks: [
      { title: 'Analyse des besoins API', description: 'Définir les endpoints et la structure', priority: 'high', estimatedHours: 8, orderIndex: 1 },
      { title: 'Design de l\'architecture', description: 'Concevoir l\'architecture backend', priority: 'high', estimatedHours: 12, orderIndex: 2 },
      { title: 'Configuration du serveur', description: 'Mettre en place le serveur et l\'environnement', priority: 'high', estimatedHours: 8, orderIndex: 3 },
      { title: 'Modélisation de la base de données', description: 'Créer le schéma de la base de données', priority: 'high', estimatedHours: 12, orderIndex: 4 },
      { title: 'Développement des endpoints', description: 'Développer les routes API', priority: 'high', estimatedHours: 40, orderIndex: 5 },
      { title: 'Authentification et sécurité', description: 'Implémenter JWT et sécurisation', priority: 'urgent', estimatedHours: 16, orderIndex: 6 },
      { title: 'Tests unitaires et d\'intégration', description: 'Créer les tests automatisés', priority: 'high', estimatedHours: 16, orderIndex: 7 },
      { title: 'Documentation API', description: 'Générer la documentation Swagger/OpenAPI', priority: 'medium', estimatedHours: 8, orderIndex: 8 },
      { title: 'Optimisation des performances', description: 'Optimiser les requêtes et le cache', priority: 'medium', estimatedHours: 12, orderIndex: 9 },
      { title: 'Déploiement et monitoring', description: 'Déployer et mettre en place le monitoring', priority: 'high', estimatedHours: 8, orderIndex: 10 }
    ]
  },
  {
    name: 'Formation',
    description: 'Programmes de formation et cours',
    defaultTasks: [
      { title: 'Analyse des besoins de formation', description: 'Identifier les objectifs pédagogiques', priority: 'high', estimatedHours: 4, orderIndex: 1 },
      { title: 'Création du plan de formation', description: 'Structurer le contenu pédagogique', priority: 'high', estimatedHours: 8, orderIndex: 2 },
      { title: 'Développement du contenu', description: 'Créer les supports de cours', priority: 'high', estimatedHours: 24, orderIndex: 3 },
      { title: 'Préparation des exercices', description: 'Créer les exercices pratiques', priority: 'high', estimatedHours: 16, orderIndex: 4 },
      { title: 'Configuration de l\'environnement', description: 'Préparer l\'environnement de formation', priority: 'medium', estimatedHours: 4, orderIndex: 5 },
      { title: 'Sessions de formation', description: 'Animer les sessions de formation', priority: 'high', estimatedHours: 24, orderIndex: 6 },
      { title: 'Support et accompagnement', description: 'Assurer le support des apprenants', priority: 'medium', estimatedHours: 8, orderIndex: 7 },
      { title: 'Évaluations', description: 'Créer et corriger les évaluations', priority: 'medium', estimatedHours: 8, orderIndex: 8 },
      { title: 'Documentation finale', description: 'Remettre la documentation complète', priority: 'low', estimatedHours: 4, orderIndex: 9 },
      { title: 'Suivi post-formation', description: 'Assurer le suivi après la formation', priority: 'low', estimatedHours: 4, orderIndex: 10 }
    ]
  },
  {
    name: 'Consulting',
    description: 'Services de conseil et expertise technique',
    defaultTasks: [
      { title: 'Audit initial', description: 'Réaliser l\'audit de l\'existant', priority: 'high', estimatedHours: 8, orderIndex: 1 },
      { title: 'Analyse des besoins', description: 'Analyser les besoins et objectifs', priority: 'high', estimatedHours: 8, orderIndex: 2 },
      { title: 'Étude de faisabilité', description: 'Évaluer la faisabilité technique', priority: 'high', estimatedHours: 8, orderIndex: 3 },
      { title: 'Recommandations stratégiques', description: 'Proposer des recommandations', priority: 'high', estimatedHours: 12, orderIndex: 4 },
      { title: 'Plan d\'action', description: 'Créer le plan d\'action détaillé', priority: 'high', estimatedHours: 8, orderIndex: 5 },
      { title: 'Accompagnement', description: 'Accompagner la mise en œuvre', priority: 'medium', estimatedHours: 16, orderIndex: 6 },
      { title: 'Optimisation des processus', description: 'Optimiser les processus existants', priority: 'medium', estimatedHours: 12, orderIndex: 7 },
      { title: 'Formation des équipes', description: 'Former les équipes internes', priority: 'medium', estimatedHours: 8, orderIndex: 8 },
      { title: 'Rapport final', description: 'Rédiger le rapport de mission', priority: 'high', estimatedHours: 8, orderIndex: 9 },
      { title: 'Suivi post-mission', description: 'Assurer le suivi après la mission', priority: 'low', estimatedHours: 4, orderIndex: 10 }
    ]
  }
];

async function seedProjectTypes() {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_digital';
    console.log('Connecting to MongoDB...');
    console.log('Using URI:', MONGO_URI.replace(/:[^:@]+@/, ':***@'));
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Clearing existing project types...');
    await ProjectType.deleteMany({});

    console.log('Seeding project types with default tasks...');
    for (const projectTypeData of projectTypesData) {
      const projectType = new ProjectType(projectTypeData);
      await projectType.save();
      console.log(`✓ Created: ${projectType.name} with ${projectType.defaultTasks.length} default tasks`);
    }

    console.log('\n✓ Successfully seeded all project types!');
    console.log(`Total: ${projectTypesData.length} project types created`);

  } catch (error) {
    console.error('Error seeding project types:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedProjectTypes();
