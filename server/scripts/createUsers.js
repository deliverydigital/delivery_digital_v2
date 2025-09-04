import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB } from '../config/mongodb.js';
import { User } from '../models/index.js';

dotenv.config();

const createDummyUsers = async () => {
  try {
    // Check if MongoDB is already connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 MongoDB not connected, attempting connection...');
      await connectDB();
    }

    console.log('🔄 Creating dummy users...');

    // Hash passwords
    const clientPasswordHash = await bcrypt.hash('password123', 12);
    const adminPasswordHash = await bcrypt.hash('password123', 12);

    // Create client user
    const clientUser = {
      email: 'marie.dupont@techcorp.fr',
      password_hash: clientPasswordHash,
      name: 'Marie Dupont',
      company: 'TechCorp',
      phone: '06 12 34 56 78',
      role: 'client',
      status: 'active',
      email_verified: true,
      last_login: new Date(),
      client_info: {
        company_size: 'medium',
        industry: 'Technology',
        website: 'https://techcorp.fr',
        address: '123 Rue de la Tech',
        city: 'Paris',
        postal_code: '75001',
        country: 'France',
        preferred_language: 'fr',
        communication_preferences: {
          email: true,
          sms: false,
          phone: true
        },
        notes: 'Client de démonstration pour les tests'
      }
    };

    // Create admin user
    const adminUser = {
      email: 'admin@deliverydigital.fr',
      password_hash: adminPasswordHash,
      name: 'Administrateur DELIVERY',
      company: 'DELIVERY Digital Technology',
      phone: '07 49 70 77 73',
      role: 'admin',
      status: 'active',
      email_verified: true,
      last_login: new Date()
    };

    // Check if users already exist
    const existingClient = await User.findByEmail(clientUser.email);
    const existingAdmin = await User.findByEmail(adminUser.email);

    if (existingClient) {
      console.log('⚠️ Client user already exists, updating...');
      await User.findByIdAndUpdate(existingClient._id, clientUser);
      console.log('✅ Client user updated');
    } else {
      const newClient = new User(clientUser);
      await newClient.save();
      console.log('✅ Client user created:', clientUser.email);
    }

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists, updating...');
      await User.findByIdAndUpdate(existingAdmin._id, adminUser);
      console.log('✅ Admin user updated');
    } else {
      const newAdmin = new User(adminUser);
      await newAdmin.save();
      console.log('✅ Admin user created:', adminUser.email);
    }

    console.log('\n🎉 Dummy users created successfully!');
    console.log('\n📋 Login credentials:');
    console.log('👤 Client: marie.dupont@techcorp.fr / password123');
    console.log('🔧 Admin: admin@deliverydigital.fr / password123');
    
    // Don't exit the process when called from server startup
    return true;

  } catch (error) {
    console.error('❌ Error creating dummy users:', error);
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', Object.values(error.errors).map(err => err.message));
    }
    
    // Don't exit the process when called from server startup
    throw error;
  }
};

// Export the function for use in other modules
export { createDummyUsers };