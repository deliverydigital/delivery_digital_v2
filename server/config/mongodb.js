import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_digital';

// Log the connection URI (without credentials for security)
const logSafeURI = (uri) => {
  if (uri.includes('@')) {
    return uri.replace(/:([^:@]+)@/, ':***@');
  }
  return uri;
};

// Connection options
const mongoOptions = {
  maxPoolSize: 5, // Reduce connection pool for cloud
  serverSelectionTimeoutMS: 15000, // 15 seconds for server selection
  socketTimeoutMS: 1000*30*2, // 30 seconds socket timeout
  connectTimeoutMS: 1000*15*2, // 15 seconds connection timeout
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  w: 'majority',
  appName: 'DeliveryDigital',
  // Additional options for cloud connections
  // ssl: true,
  // authSource: 'admin',
  // bufferCommands: false
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('🔄 Attempting MongoDB connection...');
    console.log('📍 MongoDB URI:', logSafeURI(MONGO_URI));
    console.log('📍 Connection type:', MONGO_URI.includes('mongodb+srv') ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB');
    console.log('📍 Connection timeout:', mongoOptions.connectTimeoutMS + 'ms');
    console.log('📍 Server selection timeout:', mongoOptions.serverSelectionTimeoutMS + 'ms');
    
    // Test DNS resolution first for cloud connections
    if (MONGO_URI.includes('mongodb+srv')) {
      console.log('🔍 Testing DNS resolution for MongoDB Atlas...');
      const hostname = MONGO_URI.match(/mongodb\+srv:\/\/[^:]+:[^@]+@([^\/]+)/)?.[1];
      if (hostname) {
        console.log('📍 Atlas hostname:', hostname);
      }
    }
    
    // Create connection with timeout
    console.log('⏳ Establishing connection...');
    const startTime = Date.now();
    
    const conn = await mongoose.connect(MONGO_URI, mongoOptions);
    
    const connectionTime = Date.now() - startTime;
    console.log(`⚡ Connection established in ${connectionTime}ms`);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection state: ${getConnectionStateText(conn.connection.readyState)}`);
    console.log(`🔐 Authentication: ${conn.connection.user || 'default'}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed after', Date.now() - (global.mongoStartTime || Date.now()), 'ms');
    console.error('🔍 Error details:');
    console.error('   Type:', error.name);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('🔍 Server selection failed - MongoDB Atlas troubleshooting:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify your IP address is whitelisted in MongoDB Atlas');
      console.error('   3. Confirm your cluster is running (not paused)');
      console.error('   4. Check username and password are correct');
      console.error('   5. Verify the connection string format');
      
      if (error.message.includes('ENOTFOUND')) {
        console.error('   🔍 DNS resolution failed - check your internet connection');
      }
      if (error.message.includes('authentication failed')) {
        console.error('   🔍 Authentication failed - check your MongoDB Atlas credentials');
      }
      if (error.message.includes('timeout')) {
        console.error('   🔍 Connection timeout - your IP might not be whitelisted');
      }
    }
    
    if (error.name === 'MongoNetworkError') {
      console.error('🔍 Network error - possible causes:');
      console.error('   • Firewall blocking connection');
      console.error('   • VPN interfering with connection');
      console.error('   • ISP blocking MongoDB ports');
    }
    
    if (error.name === 'MongoParseError') {
      console.error('🔍 Connection string parse error');
      console.error('   • Check your MONGO_URI format in .env file');
      console.error('   • Ensure no extra characters or spaces');
    }
    
    console.error('💡 Quick fixes to try:');
    console.error('   1. Check MongoDB Atlas dashboard - is your cluster running?');
    console.error('   2. Add 0.0.0.0/0 to IP whitelist temporarily for testing');
    console.error('   3. Verify your .env file has the correct MONGO_URI');
    console.error('   4. Test connection from MongoDB Compass with same URI');
    
    // Continue without DB in development
    console.warn('⚠️ Server will continue without MongoDB');
    console.warn('⚠️ Database-dependent features will be unavailable');
    
    return null;
  }
};

// Helper function to get connection state text
const getConnectionStateText = (state) => {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
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