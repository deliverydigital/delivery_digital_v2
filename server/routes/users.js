import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateUserUpdate, validateUUID, validatePagination } from '../middleware/validation.js';
import { uploadProfileImage, handleUploadError } from '../middleware/upload.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const user = await User.findById(req.user.id)
      .select('-password_hash -password_reset_token -email_verification_token');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { 
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          company: user.company,
          phone: user.phone,
          role: user.role,
          status: user.status,
          email_verified: user.email_verified,
          last_login: user.last_login,
          created_at: user.createdAt,
          client_info: user.client_info
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// Get all users (admin only) - renamed from clients to get all users
router.get('/clients', authorize('admin'), async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Get all users, not just clients
    const users = await User.find({})
      .select('-password_hash -password_reset_token -email_verification_token')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      clients: users.map(user => ({
        id: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        phone: user.phone,
        role: user.role,
        status: user.status,
        joinDate: user.createdAt,
        lastActivity: user.last_login,
        projectsCount: 0,
        taskPermissions: user.task_permissions || { can_create: false, can_update: false, can_delete: false }
      }))
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update allowed fields
    const userAllowedFields = ['name', 'company', 'phone'];
    const clientAllowedFields = [
      'company_size', 'industry', 'website', 'address', 'city',
      'postal_code', 'country', 'preferred_language', 'communication_preferences'
    ];

    // Update user fields
    for (const [key, value] of Object.entries(updates)) {
      if (userAllowedFields.includes(key) && value !== undefined) {
        user[key] = value;
      }
      // Update client_info for client-specific fields
      if (clientAllowedFields.includes(key) && value !== undefined) {
        if (!user.client_info) {
          user.client_info = {};
        }
        user.client_info[key] = value;
      }
    }

    // Save updated user
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { 
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          company: user.company,
          phone: user.phone,
          role: user.role,
          status: user.status,
          email_verified: user.email_verified,
          last_login: user.last_login,
          created_at: user.createdAt,
          client_info: user.client_info
        }
      }
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Get user with password hash
    const user = await User.findById(req.user.id).select('+password_hash');
    if (!user) {
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
    const newPasswordHash = await User.hashPassword(newPassword);

    // Update user password
    user.password_hash = newPasswordHash;
    await user.save();

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

// Get all project managers (admin only)
router.get('/project-managers', authorize('admin'), async (req, res) => {
  try {
    console.log('Getting project managers. User role:', req.user?.role);

    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const projectManagers = await User.find({
      role: 'project_manager',
      status: 'active'
    })
    .select('name email role')
    .sort({ name: 1 });

    res.json({
      success: true,
      projectManagers: projectManagers.map(pm => ({
        id: pm._id.toString(),
        name: pm.name,
        email: pm.email,
        role: pm.role
      }))
    });

  } catch (error) {
    console.error('Get project managers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project managers'
    });
  }
});

// Update client task permissions (admin only)
router.put('/clients/:clientId/task-permissions', authorize('admin'), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { can_create, can_update, can_delete } = req.body;

    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const user = await User.findById(clientId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.task_permissions) {
      user.task_permissions = {};
    }

    if (can_create !== undefined) user.task_permissions.can_create = can_create;
    if (can_update !== undefined) user.task_permissions.can_update = can_update;
    if (can_delete !== undefined) user.task_permissions.can_delete = can_delete;

    await user.save();

    res.json({
      success: true,
      message: 'Task permissions updated successfully',
      data: {
        taskPermissions: user.task_permissions
      }
    });

  } catch (error) {
    console.error('Update task permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task permissions'
    });
  }
});

export default router;