import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_digital';

// Connection options
const mongoOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
  socketTimeoutMS: 45000 , // Close sockets after 45 seconds of inactivity
  retryWrites: true,
  w: 'majority',
  appName: 'DeliveryDigital'
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('📍 MongoDB URI pattern:', MONGO_URI.includes('mongodb+srv') ? 'Cloud Atlas' : 'Local MongoDB');
    console.log('📍 Connection timeout:', mongoOptions.serverSelectionTimeoutMS + 'ms');
    
    const conn = await mongoose.connect(MONGO_URI, mongoOptions);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection state: ${conn.connection.readyState}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed');
    console.error('🔍 Error type:', error.name);
    console.error('🔍 Error message:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('🔍 Server selection failed - possible causes:');
      console.error('   • Network connectivity issues');
      console.error('   • Incorrect connection string');
      console.error('   • Database server not accessible');
      console.error('   • Firewall blocking connection');
    }
    
    if (error.name === 'MongoParseError') {
      console.error('🔍 Connection string parse error - check your MONGO_URI format');
    }
    
    if (error.code === 'ENOTFOUND') {
      console.error('🔍 DNS resolution failed - check your internet connection and MongoDB host');
    }
    
    console.error('🔍 Error details:', {
      name: error.name,
      code: error.code,
      codeName: error.codeName,
      reason: error.reason
    });
    
    console.error('💡 Troubleshooting tips:');
    console.error('   1. Check your .env file has the correct MONGO_URI');
    console.error('   2. Verify your MongoDB Atlas cluster is running');
    console.error('   3. Check your IP is whitelisted in MongoDB Atlas');
    console.error('   4. Verify your database user credentials');
    
    // Continue without DB in development
    console.warn('⚠️ Running without MongoDB connection');
    console.warn('⚠️ API endpoints requiring database will return 503 errors');
    
    return null;
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🔄 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during MongoDB disconnection:', error);
    process.exit(1);
  }
});

// Test connection function
const testConnection = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB connection is active');
      return true;
    } else {
      console.log('⚠️ MongoDB connection is not active');
      return false;
    }
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    return false;
  }
};

// Helper function to check if MongoDB is available
const isMongoAvailable = () => {
  const state = mongoose.connection.readyState;
  console.log('🔍 MongoDB connection state:', {
    state,
    meaning: state === 0 ? 'disconnected' : 
             state === 1 ? 'connected' : 
             state === 2 ? 'connecting' : 
             state === 3 ? 'disconnecting' : 'unknown'
  });
  return state === 1;
};

export {
  connectDB,
  testConnection,
  isMongoAvailable,
  mongoose
};