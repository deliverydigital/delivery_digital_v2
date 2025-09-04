import express from 'express';
import { User } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateUUID, validatePagination } from '../middleware/validation.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Notification Schema (using localStorage for demo)
const getNotifications = () => {
  try {
    const notifications = localStorage.getItem('notifications');
    return notifications ? JSON.parse(notifications) : [];
  } catch (error) {
    console.error('Error reading notifications:', error);
    return [];
  }
};

const saveNotifications = (notifications) => {
  try {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving notifications:', error);
  }
};

// Get user notifications
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_read } = req.query;
    const skip = (page - 1) * limit;

    let notifications = getNotifications();

    // Filter by user
    notifications = notifications.filter(n => n.user_id === req.user.id);

    // Add type filter
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    // Add read status filter
    if (is_read !== undefined) {
      notifications = notifications.filter(n => n.is_read === (is_read === 'true'));
    }

    // Filter out expired notifications
    const now = new Date();
    notifications = notifications.filter(n => 
      !n.expires_at || new Date(n.expires_at) > now
    );

    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pagination
    const total = notifications.length;
    const paginatedNotifications = notifications.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// Get unread notifications count
router.get('/unread/count', async (req, res) => {
  try {
    const notifications = getNotifications();
    const now = new Date();
    
    const count = notifications.filter(n => 
      n.user_id === req.user.id && 
      !n.is_read && 
      (!n.expires_at || new Date(n.expires_at) > now)
    ).length;

    res.json({
      success: true,
      data: { count }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread notifications count'
    });
  }
});

// Mark notification as read
router.put('/:id/read', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const notifications = getNotifications();
    const notificationIndex = notifications.findIndex(n => 
      n.id === id && n.user_id === req.user.id
    );

    if (notificationIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    notifications[notificationIndex].is_read = true;
    notifications[notificationIndex].read_at = new Date();
    saveNotifications(notifications);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification: notifications[notificationIndex] }
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const notifications = getNotifications();
    let updatedCount = 0;

    notifications.forEach(notification => {
      if (notification.user_id === req.user.id && !notification.is_read) {
        notification.is_read = true;
        notification.read_at = new Date();
        updatedCount++;
      }
    });

    saveNotifications(notifications);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { updated_count: updatedCount }
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

// Create notification (admin only)
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { user_id, title, message, type, priority, action_url, metadata, expires_at } = req.body;

    if (!user_id || !title || !message || !type) {
      return res.status(400).json({
        success: false,
        error: 'user_id, title, message, and type are required'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Verify user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const notification = {
      id: `notification-${Date.now()}`,
      user_id,
      title,
      message,
      type,
      priority: priority || 'normal',
      action_url,
      metadata: metadata || null,
      expires_at: expires_at ? new Date(expires_at) : null,
      is_read: false,
      created_at: new Date()
    };

    const notifications = getNotifications();
    notifications.push(notification);
    saveNotifications(notifications);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: { notification }
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
});

// Broadcast notification to all users (admin only)
router.post('/broadcast', authorize('admin'), async (req, res) => {
  try {
    const { title, message, type, priority, action_url, metadata, expires_at, user_roles } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({
        success: false,
        error: 'title, message, and type are required'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Get users to notify
    let query = { status: 'active' };
    if (user_roles && user_roles.length > 0) {
      query.role = { $in: user_roles };
    }

    const users = await User.find(query).select('_id');

    // Create notifications for all users
    const notifications = getNotifications();
    const newNotifications = [];

    users.forEach(user => {
      const notification = {
        id: `notification-${Date.now()}-${user._id}`,
        user_id: user._id.toString(),
        title,
        message,
        type,
        priority: priority || 'normal',
        action_url,
        metadata: metadata || null,
        expires_at: expires_at ? new Date(expires_at) : null,
        is_read: false,
        created_at: new Date()
      };
      
      notifications.push(notification);
      newNotifications.push(notification);
    });

    saveNotifications(notifications);

    res.status(201).json({
      success: true,
      message: `Notification sent to ${newNotifications.length} users`,
      data: { 
        notifications_sent: newNotifications.length,
        sample_notification: newNotifications[0] || null
      }
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast notification'
    });
  }
});

// Delete notification
router.delete('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const notifications = getNotifications();
    const filteredNotifications = notifications.filter(n => 
      !(n.id === id && n.user_id === req.user.id)
    );

    if (notifications.length === filteredNotifications.length) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    saveNotifications(filteredNotifications);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

// Delete all read notifications
router.delete('/read/all', async (req, res) => {
  try {
    const notifications = getNotifications();
    const filteredNotifications = notifications.filter(n => 
      !(n.user_id === req.user.id && n.is_read)
    );

    const deletedCount = notifications.length - filteredNotifications.length;
    saveNotifications(filteredNotifications);

    res.json({
      success: true,
      message: 'All read notifications deleted',
      data: { deleted_count: deletedCount }
    });

  } catch (error) {
    console.error('Delete all read notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete read notifications'
    });
  }
});

export default router;