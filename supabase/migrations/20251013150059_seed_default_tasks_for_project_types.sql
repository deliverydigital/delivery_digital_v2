/*
  # Seed Default Tasks for Project Types

  1. New Data
    - Add comprehensive default tasks for each project type
    - Tasks include common phases and activities for each type
    - Tasks are ordered logically by workflow

  2. Project Types Covered
    - Site Web / Application Web
    - Application Mobile
    - E-commerce
    - Application Desktop
    - API / Backend
    - Formation
    - Consulting
*/

-- Helper function to get project type ID by name
DO $$
DECLARE
  v_web_app_id uuid;
  v_mobile_app_id uuid;
  v_ecommerce_id uuid;
  v_desktop_app_id uuid;
  v_api_backend_id uuid;
  v_formation_id uuid;
  v_consulting_id uuid;
BEGIN
  -- Get project type IDs
  SELECT id INTO v_web_app_id FROM project_types WHERE name = 'Site Web / Application Web';
  SELECT id INTO v_mobile_app_id FROM project_types WHERE name = 'Application Mobile';
  SELECT id INTO v_ecommerce_id FROM project_types WHERE name = 'E-commerce';
  SELECT id INTO v_desktop_app_id FROM project_types WHERE name = 'Application Desktop';
  SELECT id INTO v_api_backend_id FROM project_types WHERE name = 'API / Backend';
  SELECT id INTO v_formation_id FROM project_types WHERE name = 'Formation';
  SELECT id INTO v_consulting_id FROM project_types WHERE name = 'Consulting';

  -- Site Web / Application Web default tasks
  IF v_web_app_id IS NOT NULL THEN
    INSERT INTO default_tasks (project_type_id, title, description, priority, estimated_hours, order_index) VALUES
      (v_web_app_id, 'Analyse des besoins', 'Recueillir et analyser les besoins du client', 'high', 8, 1),
      (v_web_app_id, 'Conception UX/UI', 'Créer les maquettes et le design de l''interface', 'high', 16, 2),
      (v_web_app_id, 'Configuration de l''environnement', 'Mettre en place l''environnement de développement', 'medium', 4, 3),
      (v_web_app_id, 'Développement Frontend', 'Développer l''interface utilisateur', 'high', 40, 4),
      (v_web_app_id, 'Développement Backend', 'Développer la logique métier et les APIs', 'high', 40, 5),
      (v_web_app_id, 'Intégration Base de données', 'Créer et intégrer la base de données', 'high', 16, 6),
      (v_web_app_id, 'Tests et débogage', 'Tester l''application et corriger les bugs', 'high', 16, 7),
      (v_web_app_id, 'Déploiement', 'Déployer l''application en production', 'medium', 8, 8),
      (v_web_app_id, 'Documentation', 'Rédiger la documentation technique et utilisateur', 'low', 8, 9),
      (v_web_app_id, 'Formation client', 'Former le client à l''utilisation de l''application', 'medium', 4, 10)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Application Mobile default tasks
  IF v_mobile_app_id IS NOT NULL THEN
    INSERT INTO default_tasks (project_type_id, title, description, priority, estimated_hours, order_index) VALUES
      (v_mobile_app_id, 'Analyse des besoins mobiles', 'Définir les fonctionnalités et plateformes cibles', 'high', 8, 1),
      (v_mobile_app_id, 'Design mobile UX/UI', 'Créer les interfaces adaptées mobile', 'high', 16, 2),
      (v_mobile_app_id, 'Configuration projet mobile', 'Initialiser le projet iOS/Android', 'medium', 4, 3),
      (v_mobile_app_id, 'Développement des écrans', 'Développer les interfaces de l''app', 'high', 40, 4),
      (v_mobile_app_id, 'Intégration des APIs', 'Connecter l''app aux services backend', 'high', 24, 5),
      (v_mobile_app_id, 'Gestion des notifications', 'Implémenter les notifications push', 'medium', 8, 6),
      (v_mobile_app_id, 'Tests multi-plateformes', 'Tester sur iOS et Android', 'high', 16, 7),
      (v_mobile_app_id, 'Optimisation des performances', 'Optimiser la vitesse et la consommation', 'medium', 8, 8),
      (v_mobile_app_id, 'Publication sur les stores', 'Publier sur App Store et Play Store', 'high', 8, 9),
      (v_mobile_app_id, 'Support post-lancement', 'Assurer le support initial', 'low', 8, 10)
    ON CONFLICT DO NOTHING;
  END IF;

  -- E-commerce default tasks
  IF v_ecommerce_id IS NOT NULL THEN
    INSERT INTO default_tasks (project_type_id, title, description, priority, estimated_hours, order_index) VALUES
      (v_ecommerce_id, 'Analyse du catalogue produits', 'Définir la structure du catalogue', 'high', 8, 1),
      (v_ecommerce_id, 'Design de la boutique', 'Créer le design de l''e-commerce', 'high', 16, 2),
      (v_ecommerce_id, 'Configuration plateforme', 'Installer et configurer la plateforme e-commerce', 'high', 8, 3),
      (v_ecommerce_id, 'Gestion des produits', 'Développer le système de gestion produits', 'high', 24, 4),
      (v_ecommerce_id, 'Panier et checkout', 'Implémenter le panier et le tunnel d''achat', 'urgent', 24, 5),
      (v_ecommerce_id, 'Intégration paiement', 'Intégrer les solutions de paiement', 'urgent', 16, 6),
      (v_ecommerce_id, 'Gestion des commandes', 'Développer le système de gestion des commandes', 'high', 16, 7),
      (v_ecommerce_id, 'Module de livraison', 'Intégrer les options de livraison', 'high', 12, 8),
      (v_ecommerce_id, 'Tests de transaction', 'Tester tous les processus de vente', 'urgent', 16, 9),
      (v_ecommerce_id, 'Configuration SEO', 'Optimiser le référencement', 'medium', 8, 10)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Application Desktop default tasks
  IF v_desktop_app_id IS NOT NULL THEN
    INSERT INTO default_tasks (project_type_id, title, description, priority, estimated_hours, order_index) VALUES
      (v_desktop_app_id, 'Analyse des besoins desktop', 'Définir les fonctionnalités de l''application', 'high', 8, 1),
      (v_desktop_app_id, 'Design de l''interface desktop', 'Créer l''interface utilisateur desktop', 'high', 16, 2),
      (v_desktop_app_id, 'Configuration de l''environnement', 'Mettre en place l''environnement Electron/autre', 'medium', 4, 3),
      (v_desktop_app_id, 'Développement des fonctionnalités', 'Développer les fonctionnalités principales', 'high', 48, 4),
      (v_desktop_app_id, 'Gestion des fichiers locaux', 'Implémenter la gestion des fichiers', 'high', 16, 5),
      (v_desktop_app_id, 'Tests multi-plateformes', 'Tester sur Windows, Mac, Linux', 'high', 16, 6),
      (v_desktop_app_id, 'Création des installeurs', 'Créer les packages d''installation', 'medium', 8, 7),
      (v_desktop_app_id, 'Système de mise à jour', 'Implémenter les mises à jour automatiques', 'medium', 12, 8),
      (v_desktop_app_id, 'Documentation utilisateur', 'Créer la documentation et l''aide', 'low', 8, 9),
      (v_desktop_app_id, 'Distribution', 'Préparer la distribution de l''application', 'medium', 4, 10)
    ON CONFLICT DO NOTHING;
  END IF;

  -- API / Backend default tasks
  IF v_api_backend_id IS NOT NULL THEN
    INSERT INTO default_tasks (project_type_id, title, description, priority, estimated_hours, order_index) VALUES
      (v_api_backend_id, 'Analyse des besoins API', 'Définir les endpoints et la structure', 'high', 8, 1),
      (v_api_backend_id, 'Design de l''architecture', 'Concevoir l''architecture backend', 'high', 12, 2),
      (v_api_backend_id, 'Configuration du serveur', 'Mettre en place le serveur et l''environnement', 'high', 8, 3),
      (v_api_backend_id, 'Modélisation de la base de données', 'Créer le schéma de la base de données', 'high', 12, 4),
      (v_api_backend_id, 'Développement des endpoints', 'Développer les routes API', 'high', 40, 5),
      (v_api_backend_id, 'Authentification et sécurité', 'Implémenter JWT et sécurisation', 'urgent', 16, 6),
      (v_api_backend_id, 'Tests unitaires et d''intégration', 'Créer les tests automatisés', 'high', 16, 7),
      (v_api_backend_id, 'Documentation API', 'Générer la documentation Swagger/OpenAPI', 'medium', 8, 8),
      (v_api_backend_id, 'Optimisation des performances', 'Optimiser les requêtes et le cache', 'medium', 12, 9),
      (v_api_backend_id, 'Déploiement et monitoring', 'Déployer et mettre en place le monitoring', 'high', 8, 10)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Formation default tasks
  IF v_formation_id IS NOT NULL THEN
    INSERT INTO default_tasks (project_type_id, title, description, priority, estimated_hours, order_index) VALUES
      (v_formation_id, 'Analyse des besoins de formation', 'Identifier les objectifs pédagogiques', 'high', 4, 1),
      (v_formation_id, 'Création du plan de formation', 'Structurer le contenu pédagogique', 'high', 8, 2),
      (v_formation_id, 'Développement du contenu', 'Créer les supports de cours', 'high', 24, 3),
      (v_formation_id, 'Préparation des exercices', 'Créer les exercices pratiques', 'high', 16, 4),
      (v_formation_id, 'Configuration de l''environnement', 'Préparer l''environnement de formation', 'medium', 4, 5),
      (v_formation_id, 'Sessions de formation', 'Animer les sessions de formation', 'high', 24, 6),
      (v_formation_id, 'Support et accompagnement', 'Assurer le support des apprenants', 'medium', 8, 7),
      (v_formation_id, 'Évaluations', 'Créer et corriger les évaluations', 'medium', 8, 8),
      (v_formation_id, 'Documentation finale', 'Remettre la documentation complète', 'low', 4, 9),
      (v_formation_id, 'Suivi post-formation', 'Assurer le suivi après la formation', 'low', 4, 10)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Consulting default tasks
  IF v_consulting_id IS NOT NULL THEN
    INSERT INTO default_tasks (project_type_id, title, description, priority, estimated_hours, order_index) VALUES
      (v_consulting_id, 'Audit initial', 'Réaliser l''audit de l''existant', 'high', 8, 1),
      (v_consulting_id, 'Analyse des besoins', 'Analyser les besoins et objectifs', 'high', 8, 2),
      (v_consulting_id, 'Étude de faisabilité', 'Évaluer la faisabilité technique', 'high', 8, 3),
      (v_consulting_id, 'Recommandations stratégiques', 'Proposer des recommandations', 'high', 12, 4),
      (v_consulting_id, 'Plan d''action', 'Créer le plan d''action détaillé', 'high', 8, 5),
      (v_consulting_id, 'Accompagnement', 'Accompagner la mise en œuvre', 'medium', 16, 6),
      (v_consulting_id, 'Optimisation des processus', 'Optimiser les processus existants', 'medium', 12, 7),
      (v_consulting_id, 'Formation des équipes', 'Former les équipes internes', 'medium', 8, 8),
      (v_consulting_id, 'Rapport final', 'Rédiger le rapport de mission', 'high', 8, 9),
      (v_consulting_id, 'Suivi post-mission', 'Assurer le suivi après la mission', 'low', 4, 10)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
