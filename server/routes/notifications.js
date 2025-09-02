import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateUUID, validatePagination } from '../middleware/validation.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get user notifications
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_read } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [req.user.id];
    let paramCount = 1;

    // Add type filter
    if (type) {
      whereClause += ` AND type = $${++paramCount}`;
      queryParams.push(type);
    }

    // Add read status filter
    if (is_read !== undefined) {
      whereClause += ` AND is_read = $${++paramCount}`;
      queryParams.push(is_read === 'true');
    }

    // Add expiration filter
    whereClause += ` AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`;

    const notificationsQuery = `
      SELECT *
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(limit, offset);

    const result = await query(notificationsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        notifications: result.rows,
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
    const result = await query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE user_id = $1 AND is_read = false 
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { count: parseInt(result.rows[0].count) }
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

    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification: result.rows[0] }
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
    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false
       RETURNING COUNT(*) as updated_count`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { updated_count: result.rowCount }
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

    const result = await query(
      `INSERT INTO notifications 
       (user_id, title, message, type, priority, action_url, metadata, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        user_id, title, message, type, priority || 'normal',
        action_url, metadata ? JSON.stringify(metadata) : null, expires_at
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: { notification: result.rows[0] }
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

    // Get users to notify
    let usersQuery = 'SELECT id FROM users WHERE status = $1';
    let queryParams = ['active'];

    if (user_roles && user_roles.length > 0) {
      usersQuery += ` AND role = ANY($2)`;
      queryParams.push(user_roles);
    }

    const usersResult = await query(usersQuery, queryParams);

    // Create notifications for all users
    const notifications = [];
    for (const user of usersResult.rows) {
      const result = await query(
        `INSERT INTO notifications 
         (user_id, title, message, type, priority, action_url, metadata, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          user.id, title, message, type, priority || 'normal',
          action_url, metadata ? JSON.stringify(metadata) : null, expires_at
        ]
      );
      notifications.push(result.rows[0]);
    }

    res.status(201).json({
      success: true,
      message: `Notification sent to ${notifications.length} users`,
      data: { 
        notifications_sent: notifications.length,
        sample_notification: notifications[0] || null
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

    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

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
    const result = await query(
      'DELETE FROM notifications WHERE user_id = $1 AND is_read = true RETURNING COUNT(*) as deleted_count',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'All read notifications deleted',
      data: { deleted_count: result.rowCount }
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