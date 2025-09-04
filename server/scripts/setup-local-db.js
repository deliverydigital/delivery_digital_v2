#!/usr/bin/env node

import { connectDB, testConnection } from '../config/mongodb.js';
import { createDummyUsers } from './createUsers.js';
import dotenv from 'dotenv';

dotenv.config();

const setupLocalDatabase = async () => {
  console.log('🚀 Setting up local database...');
  console.log('================================\n');

  try {
    // Test current MongoDB connection
    console.log('🔄 Testing MongoDB connection...');
    
    const connection = await connectDB();
    
    if (!connection) {
      console.log('❌ MongoDB connection failed');
      console.log('\n💡 Troubleshooting steps:');
      console.log('1. Make sure MongoDB is installed and running');
      console.log('2. Check your MONGO_URI in .env file');
      console.log('3. For MongoDB Atlas:');
      console.log('   • Verify your IP is whitelisted');
      console.log('   • Check username/password are correct');
      console.log('   • Ensure cluster is running');
      return;
    }

    console.log('✅ MongoDB connection successful');

    // Test the connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.log('❌ MongoDB connection test failed');
      return;
    }

    console.log('✅ MongoDB connection test passed');

    // Create demo users
    console.log('\n👤 Creating demo users...');
    await createDummyUsers();

    console.log('\n🎉 Database setup complete!');
    console.log('\n📋 Demo login credentials:');
    console.log('👤 Client: marie.dupont@techcorp.fr / password123');
    console.log('🔧 Admin: admin@deliverydigital.fr / password123');
    
    console.log('\n✅ You can now start your server with: npm run server');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 DNS resolution failed - check your internet connection');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n💡 Authentication failed - check your MongoDB credentials');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Connection timeout - check your network and MongoDB Atlas settings');
    }
    
    process.exit(1);
  }
};

// Run the setup
setupLocalDatabase();