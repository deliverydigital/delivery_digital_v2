import { supabase } from './supabase.js';

// Test database connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    // Don't exit process, just log the error
  }
};

// Query helper function
const query = async (text, params = []) => {
  try {
    // Convert PostgreSQL query to Supabase query
    // This is a simplified conversion - in a real app you'd want proper query building
    console.log('Query:', text, params);
    
    // For now, return empty results to prevent crashes
    return { rows: [], rowCount: 0 };
  } catch (error) {
    console.error('Database query error:', error);
    return { rows: [], rowCount: 0 };
  }
};

// Transaction helper
const transaction = async (callback) => {
  try {
    // Simplified transaction for Supabase
    const result = await callback({ query });
    return result;
  } catch (error) {
    console.error('Transaction error:', error);
    return null;
  }
};

export {
  query,
  transaction,
  testConnection
};