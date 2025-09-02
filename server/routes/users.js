import express from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateUserUpdate, validateUUID, validatePagination } from '../middleware/validation.js';
import { uploadProfileImage, handleUploadError } from '../middleware/upload.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, email, name, company, phone, role, status,
        email_verified, last_login, created_at,
        clients (
          company_size, industry, website, address, city,
          postal_code, country, preferred_language, communication_preferences
        )
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// Get all clients (admin only)
router.get('/clients', authorize('admin'), async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('users')
      .select(`
        id, email, name, company, phone, status, created_at, last_login,
        clients (*)
      `)
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      clients: clients || []
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients'
    });
  }
});

// Update current user profile
router.put('/profile', uploadProfileImage, handleUploadError, validateUserUpdate, async (req, res) => {
  try {
    const updates = req.body;
    const userId = req.user.id;

    // Update user table
    const userUpdates = {};
    const userAllowedFields = ['name', 'company', 'phone'];
    
    for (const [key, value] of Object.entries(updates)) {
      if (userAllowedFields.includes(key) && value !== undefined) {
        userUpdates[key] = value;
      }
    }

    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString();
      
      const { error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', userId);

      if (userError) throw userError;
    }

    // Update client table if user is a client
    if (req.user.role === 'client') {
      const clientUpdates = {};
      const clientAllowedFields = [
        'company_size', 'industry', 'website', 'address', 'city',
        'postal_code', 'country', 'preferred_language', 'communication_preferences'
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (clientAllowedFields.includes(key) && value !== undefined) {
          if (key === 'communication_preferences') {
            clientUpdates[key] = value;
          } else {
            clientUpdates[key] = value;
          }
        }
      }

      if (Object.keys(clientUpdates).length > 0) {
        clientUpdates.updated_at = new Date().toISOString();
        
        const { error: clientError } = await supabase
          .from('clients')
          .update(clientUpdates)
          .eq('id', userId);

        if (clientError) throw clientError;
      }
    }

    // Get updated user data
    const { data: updatedUser, error: fetchError } = await supabase
      .from('users')
      .select(`
        id, email, name, company, phone, role, status,
        email_verified, last_login, created_at,
        clients (
          company_size, industry, website, address, city,
          postal_code, country, preferred_language, communication_preferences
        )
      `)
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Change password
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    // Get current password hash
    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

export default router;