#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/mongodb.js';
import { Category } from '../models/index.js';

dotenv.config();

const seedCategories = async () => {
  try {
    console.log('🔄 Seeding categories...');

    // Check if MongoDB is already connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 MongoDB not connected, attempting connection...');
      await connectDB();
    }

    // Check if categories already exist
    const existingCategories = await Category.find();
    if (existingCategories.length > 0) {
      console.log('⚠️ Categories already exist, updating existing ones...');
    }

    // Categories data
    const categoriesData = [
      {
        name: 'Développement Web',
        slug: 'web',
        description: 'Formation en développement web, frameworks modernes et technologies front-end/back-end',
        color: '#3b82f6',
        icon: 'code',
        order: 1
      },
      {
        name: 'Design & Création',
        slug: 'design',
        description: 'Formation en design graphique, retouche photo et outils de création visuelle',
        color: '#8b5cf6',
        icon: 'palette',
        order: 2
      },
      {
        name: 'Bureautique',
        slug: 'office',
        description: 'Formation aux outils bureautiques et de productivité (Excel, Word, PowerPoint)',
        color: '#10b981',
        icon: 'file-text',
        order: 3
      },
      {
        name: 'Langues',
        slug: 'languages',
        description: 'Formation en langues étrangères avec méthodes interactives',
        color: '#f59e0b',
        icon: 'globe',
        order: 4
      },
      {
        name: 'Sécurité & Hygiène',
        slug: 'safety',
        description: 'Formation en sécurité au travail, hygiène alimentaire et développement durable',
        color: '#ef4444',
        icon: 'shield',
        order: 5
      },
      {
        name: 'Management',
        slug: 'management',
        description: 'Formation en management, leadership et gestion d\'équipe',
        color: '#6366f1',
        icon: 'users',
        order: 6
      },
      {
        name: 'Commerce & Vente',
        slug: 'business',
        description: 'Formation en techniques de vente, relation client et stratégies commerciales',
        color: '#ec4899',
        icon: 'briefcase',
        order: 7
      },
      {
        name: 'Santé & Nutrition',
        slug: 'health',
        description: 'Formation en nutrition, diététique et bien-être',
        color: '#14b8a6',
        icon: 'heart',
        order: 8
      }
    ];

    // Create or update categories
    for (const categoryData of categoriesData) {
      console.log(`🔄 Processing category: ${categoryData.name}`);

      // Check if category already exists
      const existingCategory = await Category.findOne({ slug: categoryData.slug });

      if (existingCategory) {
        // Update existing category
        Object.assign(existingCategory, categoryData);
        await existingCategory.save();
        console.log(`✅ Updated category: ${categoryData.name}`);
      } else {
        // Create new category
        const category = new Category(categoryData);
        await category.save();
        console.log(`✅ Created category: ${categoryData.name}`);
      }
    }

    console.log('🎉 Categories seeded successfully!');
    console.log(`📊 Total categories processed: ${categoriesData.length}`);

  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
};

// Export the function for use in other modules
export { seedCategories };

// Run directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCategories()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}