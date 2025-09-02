import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Missing Supabase environment variables. Using mock mode.');
  console.log('To connect to Supabase:');
  console.log('1. Click "Connect to Supabase" button in the top right');
  console.log('2. Or manually set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
}

// Create Supabase client with service role key for server-side operations
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Test Supabase connection
const testConnection = async () => {
  if (!supabase) {
    console.log('⚠️ Supabase not configured - running in mock mode');
    return;
  }
  
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase connected successfully');
  } catch (err) {
    console.warn('⚠️ Supabase connection failed:', err.message);
    console.log('Running in mock mode. Click "Connect to Supabase" to set up database.');
  }
};

export {
  supabase,
  testConnection
};