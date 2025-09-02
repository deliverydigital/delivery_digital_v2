import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'delivery_digital',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Function to seed the database
const seedDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seeding...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if users table already has data
    const { rows: userCount } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount[0].count) > 0) {
      console.log('Database already has users. Skipping seeding to prevent duplicates.');
      await client.query('ROLLBACK');
      return;
    }
    
    // Hash passwords
    const saltRounds = 12;
    const adminPasswordHash = await bcrypt.hash('password123', saltRounds);
    const clientPasswordHash = await bcrypt.hash('password123', saltRounds);
    const trainerPasswordHash = await bcrypt.hash('password123', saltRounds);
    const developerPasswordHash = await bcrypt.hash('password123', saltRounds);
    
    // Create admin user
    const adminId = uuidv4();
    await client.query(
      `INSERT INTO users 
       (id, email, password_hash, name, company, role, status, email_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        adminId,
        'admin@deliverydigital.fr',
        adminPasswordHash,
        'Admin DELIVERY',
        'DELIVERY Digital Technology',
        'admin',
        'active',
        true,
        new Date()
      ]
    );
    console.log('✅ Admin user created');
    
    // Create client user
    const clientId = uuidv4();
    await client.query(
      `INSERT INTO users 
       (id, email, password_hash, name, company, phone, role, status, email_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        clientId,
        'marie.dupont@techcorp.fr',
        clientPasswordHash,
        'Marie Dupont',
        'TechCorp',
        '0612345678',
        'client',
        'active',
        true,
        new Date()
      ]
    );
    
    // Create client profile
    await client.query(
      `INSERT INTO clients 
       (id, company_size, industry, website, address, city, postal_code, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        clientId,
        'medium',
        'technology',
        'https://techcorp.fr',
        '123 Tech Street',
        'Paris',
        '75001',
        'France'
      ]
    );
    console.log('✅ Client user created');
    
    // Create trainer user
    const trainerId = uuidv4();
    await client.query(
      `INSERT INTO users 
       (id, email, password_hash, name, company, phone, role, status, email_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        trainerId,
        'trainer@deliverydigital.fr',
        trainerPasswordHash,
        'Jean Formateur',
        'DELIVERY Digital Technology',
        '0687654321',
        'trainer',
        'active',
        true,
        new Date()
      ]
    );
    console.log('✅ Trainer user created');
    
    // Create developer user
    const developerId = uuidv4();
    await client.query(
      `INSERT INTO users 
       (id, email, password_hash, name, company, phone, role, status, email_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        developerId,
        'developer@deliverydigital.fr',
        developerPasswordHash,
        'Alex Développeur',
        'DELIVERY Digital Technology',
        '0698765432',
        'developer',
        'active',
        true,
        new Date()
      ]
    );
    console.log('✅ Developer user created');
    
    // Create a sample project
    const projectId = uuidv4();
    await client.query(
      `INSERT INTO projects 
       (id, client_id, title, description, type, status, priority, budget_range, 
        estimated_budget, timeline, start_date, end_date, assigned_to, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        projectId,
        clientId,
        'Application E-commerce',
        'Plateforme de vente en ligne avec système de paiement intégré',
        'web',
        'in_progress',
        'high',
        'medium',
        15000,
        'normal',
        new Date(),
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        developerId,
        'Client très réactif, deadline importante pour le lancement',
        new Date()
      ]
    );
    console.log('✅ Sample project created');
    
    // Create sample tasks
    const taskIds = [uuidv4(), uuidv4(), uuidv4()];
    
    await client.query(
      `INSERT INTO tasks 
       (id, project_id, title, description, status, priority, assigned_to, created_by, 
        due_date, estimated_hours, tags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        taskIds[0],
        projectId,
        'Conception de la base de données',
        'Créer le schéma de base de données pour le système e-commerce avec toutes les tables nécessaires',
        'done',
        'high',
        developerId,
        adminId,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        16,
        ['backend', 'database', 'architecture'],
        new Date()
      ]
    );
    
    await client.query(
      `INSERT INTO tasks 
       (id, project_id, title, description, status, priority, assigned_to, created_by, 
        due_date, estimated_hours, tags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        taskIds[1],
        projectId,
        'Interface utilisateur - Page produits',
        'Développer l\'interface pour l\'affichage des produits avec filtres, recherche et pagination',
        'in_progress',
        'high',
        developerId,
        adminId,
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        24,
        ['frontend', 'ui', 'react', 'responsive'],
        new Date()
      ]
    );
    
    await client.query(
      `INSERT INTO tasks 
       (id, project_id, title, description, status, priority, assigned_to, created_by, 
        due_date, estimated_hours, tags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        taskIds[2],
        projectId,
        'API de paiement Stripe',
        'Intégrer l\'API Stripe pour les paiements sécurisés avec gestion des webhooks',
        'todo',
        'urgent',
        developerId,
        adminId,
        new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        20,
        ['backend', 'payment', 'api', 'security'],
        new Date()
      ]
    );
    console.log('✅ Sample tasks created');
    
    // Create sample messages
    const messageId1 = uuidv4();
    await client.query(
      `INSERT INTO messages 
       (id, project_id, sender_id, recipient_id, content, message_type, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        messageId1,
        projectId,
        clientId,
        adminId,
        'Bonjour, j\'aimerais ajouter une fonctionnalité de chat en temps réel',
        'project',
        false,
        new Date(Date.now() - 3600000) // 1 hour ago
      ]
    );
    
    const messageId2 = uuidv4();
    await client.query(
      `INSERT INTO messages 
       (id, project_id, sender_id, recipient_id, content, message_type, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        messageId2,
        projectId,
        adminId,
        clientId,
        'Bonjour Marie, c\'est tout à fait possible. Cela représenterait environ 20h de développement supplémentaire.',
        'project',
        true,
        new Date(Date.now() - 1800000) // 30 minutes ago
      ]
    );
    console.log('✅ Sample messages created');
    
    // Create sample training session
    const trainingId = uuidv4();
    await client.query(
      `INSERT INTO training_sessions 
       (id, title, description, type, category, level, duration_hours, max_participants, 
        price, location, is_remote, start_date, end_date, trainer_id, status, objectives, 
        prerequisites, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        trainingId,
        'Développement Web Full-Stack',
        'Formation complète en développement web moderne avec React, Node.js et les meilleures pratiques.',
        'web',
        'development',
        'intermediate',
        280,
        12,
        6000,
        'Nice - 470 Promenade des Anglais',
        false,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        trainerId,
        'planned',
        ['Maîtriser React et ses concepts avancés', 'Développer des APIs avec Node.js', 'Comprendre les architectures modernes'],
        'Connaissances de base en HTML, CSS et JavaScript',
        new Date()
      ]
    );
    
    // Register client for training
    await client.query(
      `INSERT INTO training_participants 
       (id, session_id, participant_id, status, payment_status, payment_amount, registration_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        trainingId,
        clientId,
        'confirmed',
        'paid',
        6000,
        new Date()
      ]
    );
    console.log('✅ Sample training session created');
    
    // Create sample notifications
    await client.query(
      `INSERT INTO notifications 
       (id, user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        clientId,
        'Bienvenue chez DELIVERY Digital',
        'Merci de vous être inscrit sur notre plateforme. Découvrez nos services et commencez à créer des projets.',
        'welcome',
        false,
        new Date()
      ]
    );
    
    await client.query(
      `INSERT INTO notifications 
       (id, user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        clientId,
        'Nouveau message',
        'Vous avez reçu un nouveau message concernant votre projet.',
        'message',
        false,
        new Date(Date.now() - 1800000) // 30 minutes ago
      ]
    );
    console.log('✅ Sample notifications created');
    
    // Create system settings
    await client.query(
      `INSERT INTO system_settings 
       (id, key, value, description, category, is_public)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        'company_info',
        JSON.stringify({
          name: 'DELIVERY Digital Technology',
          address: '470 promenade des anglais, 06200 Nice',
          phone: '0749707773',
          email: 'contact@deliverydigital.fr',
          website: 'https://deliverydigital.fr'
        }),
        'Company information',
        'general',
        true
      ]
    );
    
    await client.query(
      `INSERT INTO system_settings 
       (id, key, value, description, category, is_public)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        'email_templates',
        JSON.stringify({
          welcome: {
            subject: 'Bienvenue chez DELIVERY Digital',
            body: 'Bonjour {{name}}, Bienvenue chez DELIVERY Digital Technology...'
          },
          password_reset: {
            subject: 'Réinitialisation de votre mot de passe',
            body: 'Bonjour {{name}}, Vous avez demandé une réinitialisation de votre mot de passe...'
          }
        }),
        'Email templates',
        'email',
        false
      ]
    );
    console.log('✅ System settings created');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Database seeding completed successfully');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

// Run seeding
seedDatabase();