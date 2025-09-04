#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 MongoDB Installation and Setup Script');
console.log('=====================================\n');

// Detect operating system
const platform = process.platform;
console.log(`🔍 Detected platform: ${platform}`);

const runCommand = (command, description) => {
  try {
    console.log(`🔄 ${description}...`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return null;
  }
};

const installMongoDB = () => {
  console.log('\n📦 Installing MongoDB...\n');

  switch (platform) {
    case 'darwin': // macOS
      console.log('🍎 Installing MongoDB on macOS using Homebrew...');
      
      // Check if Homebrew is installed
      try {
        execSync('which brew', { stdio: 'pipe' });
        console.log('✅ Homebrew found');
      } catch (error) {
        console.log('❌ Homebrew not found. Please install Homebrew first:');
        console.log('   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
        return false;
      }

      // Install MongoDB
      runCommand('brew tap mongodb/brew', 'Adding MongoDB tap');
      runCommand('brew install mongodb-community', 'Installing MongoDB Community');
      runCommand('brew services start mongodb/brew/mongodb-community', 'Starting MongoDB service');
      break;

    case 'linux':
      console.log('🐧 Installing MongoDB on Linux...');
      
      // Detect Linux distribution
      let distro = 'unknown';
      try {
        const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
        if (osRelease.includes('Ubuntu')) distro = 'ubuntu';
        else if (osRelease.includes('Debian')) distro = 'debian';
        else if (osRelease.includes('CentOS') || osRelease.includes('Red Hat')) distro = 'rhel';
      } catch (error) {
        console.log('⚠️ Could not detect Linux distribution');
      }

      if (distro === 'ubuntu' || distro === 'debian') {
        console.log('📦 Installing on Ubuntu/Debian...');
        runCommand('sudo apt-get update', 'Updating package list');
        runCommand('sudo apt-get install -y mongodb', 'Installing MongoDB');
        runCommand('sudo systemctl start mongodb', 'Starting MongoDB service');
        runCommand('sudo systemctl enable mongodb', 'Enabling MongoDB service');
      } else {
        console.log('⚠️ Automatic installation not supported for this Linux distribution');
        console.log('Please install MongoDB manually following the official documentation:');
        console.log('https://docs.mongodb.com/manual/installation/');
        return false;
      }
      break;

    case 'win32': // Windows
      console.log('🪟 Windows detected');
      console.log('Please install MongoDB manually:');
      console.log('1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community');
      console.log('2. Run the installer and follow the setup wizard');
      console.log('3. Make sure to install MongoDB as a service');
      console.log('4. MongoDB should start automatically after installation');
      return false;

    default:
      console.log(`❌ Unsupported platform: ${platform}`);
      console.log('Please install MongoDB manually following the official documentation:');
      console.log('https://docs.mongodb.com/manual/installation/');
      return false;
  }

  return true;
};

const checkMongoDBConnection = () => {
  console.log('\n🔍 Checking MongoDB connection...\n');
  
  try {
    // Try to connect to MongoDB
    const output = runCommand('mongosh --eval "db.runCommand({ping: 1})" --quiet', 'Testing MongoDB connection');
    
    if (output && output.includes('"ok" : 1')) {
      console.log('✅ MongoDB is running and accessible');
      return true;
    } else {
      console.log('❌ MongoDB connection test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Could not test MongoDB connection');
    console.log('💡 This might be because mongosh is not installed or MongoDB is not running');
    return false;
  }
};

const createDatabaseAndUser = () => {
  console.log('\n👤 Setting up database and user...\n');

  const dbName = 'delivery_digital';
  const username = 'delivery_user';
  const password = 'delivery_password_123';

  try {
    // Create database and user
    const mongoScript = `
      use ${dbName};
      db.createUser({
        user: "${username}",
        pwd: "${password}",
        roles: [
          { role: "readWrite", db: "${dbName}" },
          { role: "dbAdmin", db: "${dbName}" }
        ]
      });
      db.runCommand({ping: 1});
    `;

    // Write script to temporary file
    const scriptPath = path.join(__dirname, 'temp-mongo-setup.js');
    fs.writeFileSync(scriptPath, mongoScript);

    // Execute the script
    const output = runCommand(`mongosh < ${scriptPath}`, 'Creating database and user');
    
    // Clean up temporary file
    fs.unlinkSync(scriptPath);

    if (output) {
      console.log('✅ Database and user created successfully');
      console.log(`📊 Database: ${dbName}`);
      console.log(`👤 Username: ${username}`);
      console.log(`🔑 Password: ${password}`);
      return { dbName, username, password };
    }
  } catch (error) {
    console.log('⚠️ Could not create database user (might already exist)');
    return { dbName, username, password };
  }

  return null;
};

const updateEnvFile = (dbConfig) => {
  console.log('\n📝 Updating .env file...\n');

  const envPath = path.join(__dirname, '../../.env');
  const envExamplePath = path.join(__dirname, '../../.env.example');

  try {
    // Read existing .env or create from example
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log('📄 Found existing .env file');
    } else if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
      console.log('📄 Creating .env from .env.example');
    } else {
      console.log('📄 Creating new .env file');
    }

    // Update MongoDB URI
    const localMongoUri = `mongodb://${dbConfig.username}:${dbConfig.password}@localhost:27017/${dbConfig.dbName}`;
    
    if (envContent.includes('MONGO_URI=')) {
      // Replace existing MONGO_URI
      envContent = envContent.replace(
        /MONGO_URI=.*/,
        `MONGO_URI=${localMongoUri}`
      );
    } else {
      // Add MONGO_URI
      envContent += `\n# Local MongoDB Configuration\nMONGO_URI=${localMongoUri}\n`;
    }

    // Write updated .env file
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated with local MongoDB configuration');
    console.log(`🔗 MongoDB URI: ${localMongoUri}`);

  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    console.log('\n📝 Please manually add this to your .env file:');
    console.log(`MONGO_URI=mongodb://${dbConfig.username}:${dbConfig.password}@localhost:27017/${dbConfig.dbName}`);
  }
};

const showNextSteps = () => {
  console.log('\n🎉 Setup Complete!\n');
  console.log('📋 Next steps:');
  console.log('1. Restart your server: npm run server');
  console.log('2. The server should now connect to MongoDB successfully');
  console.log('3. Demo users will be created automatically');
  console.log('\n👤 Demo login credentials:');
  console.log('   Client: marie.dupont@techcorp.fr / password123');
  console.log('   Admin: admin@deliverydigital.fr / password123');
  console.log('\n🔧 If you still have issues:');
  console.log('   • Check that MongoDB service is running');
  console.log('   • Verify the .env file has the correct MONGO_URI');
  console.log('   • Check the server logs for detailed error messages');
};

// Main execution
const main = async () => {
  try {
    console.log('🔍 Checking if MongoDB is already running...');
    
    if (checkMongoDBConnection()) {
      console.log('✅ MongoDB is already running!');
    } else {
      console.log('❌ MongoDB not running, attempting installation...');
      
      if (!installMongoDB()) {
        console.log('\n❌ Automatic installation failed or not supported');
        console.log('Please install MongoDB manually and run this script again');
        process.exit(1);
      }

      // Wait a moment for MongoDB to start
      console.log('⏳ Waiting for MongoDB to start...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      if (!checkMongoDBConnection()) {
        console.log('❌ MongoDB installation completed but connection still fails');
        console.log('Please check MongoDB service status and try again');
        process.exit(1);
      }
    }

    // Create database and user
    const dbConfig = createDatabaseAndUser();
    if (dbConfig) {
      updateEnvFile(dbConfig);
      showNextSteps();
    } else {
      console.log('❌ Failed to create database configuration');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

// Run the script
main();