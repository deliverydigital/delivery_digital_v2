import express from 'express';
import { query, transaction } from '../config/database.js';
import { authenticate, authorize, authorizeOwnerOrAdmin } from '../middleware/auth.js';
import { validateMessageCreation, validateUUID, validatePagination } from '../middleware/validation.js';
import { uploadMessageFiles, handleUploadError } from '../middleware/upload.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get messages for a project
router.get('/project/:projectId', validateUUID, validatePagination, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user has access to this project
    const projectCheck = await query(
      'SELECT client_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && projectCheck.rows[0].client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const messagesQuery = `
      SELECT 
        m.*,
        sender.name as sender_name,
        sender.role as sender_role,
        recipient.name as recipient_name,
        COUNT(ma.id) as attachment_count
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users recipient ON m.recipient_id = recipient.id
      LEFT JOIN message_attachments ma ON m.id = ma.message_id
      WHERE m.project_id = $1
      GROUP BY m.id, sender.name, sender.role, recipient.name
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(messagesQuery, [projectId, limit, offset]);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM messages WHERE project_id = $1',
      [projectId]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        messages: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Get single message with attachments
router.get('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const messageQuery = `
      SELECT 
        m.*,
        sender.name as sender_name,
        sender.role as sender_role,
        recipient.name as recipient_name,
        p.client_id
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users recipient ON m.recipient_id = recipient.id
      LEFT JOIN projects p ON m.project_id = p.id
      WHERE m.id = $1
    `;

    const result = await query(messageQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    const message = result.rows[0];

    // Check authorization
    if (req.user.role !== 'admin' && 
        message.sender_id !== req.user.id && 
        message.recipient_id !== req.user.id &&
        message.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get attachments
    const attachmentsResult = await query(
      'SELECT * FROM message_attachments WHERE message_id = $1',
      [id]
    );

    message.attachments = attachmentsResult.rows;

    res.json({
      success: true,
      data: { message }
    });

  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message'
    });
  }
});

// Send new message
router.post('/', uploadMessageFiles, handleUploadError, validateMessageCreation, async (req, res) => {
  try {
    const { project_id, recipient_id, subject, content, priority } = req.body;

    // Check if project exists and user has access
    if (project_id) {
      const projectCheck = await query(
        'SELECT client_id FROM projects WHERE id = $1',
        [project_id]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check authorization
      if (req.user.role !== 'admin' && projectCheck.rows[0].client_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }
    }

    const result = await transaction(async (client) => {
      // Create message
      const messageResult = await client.query(
        `INSERT INTO messages 
         (project_id, sender_id, recipient_id, subject, content, priority)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [project_id, req.user.id, recipient_id, subject, content, priority || 'normal']
      );

      const message = messageResult.rows[0];

      // Save file attachments if any
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await client.query(
            `INSERT INTO message_attachments 
             (message_id, filename, original_name, file_type, file_size, file_path)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              message.id,
              file.filename,
              file.originalname,
              file.mimetype,
              file.size,
              file.path
            ]
          );
        }
      }

      return message;
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: result }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// Mark message as read
router.put('/:id/read', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if message exists and user has access
    const messageCheck = await query(
      `SELECT m.*, p.client_id
       FROM messages m
       LEFT JOIN projects p ON m.project_id = p.id
       WHERE m.id = $1`,
      [id]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    const message = messageCheck.rows[0];

    // Check authorization
    if (req.user.role !== 'admin' && 
        message.sender_id !== req.user.id && 
        message.recipient_id !== req.user.id &&
        message.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await query(
      `UPDATE messages 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      success: true,
      message: 'Message marked as read',
      data: { message: result.rows[0] }
    });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
});

// Get unread messages count
router.get('/unread/count', async (req, res) => {
  try {
    let countQuery;
    let queryParams;

    if (req.user.role === 'admin') {
      // Admin sees all unread messages
      countQuery = `
        SELECT COUNT(*) as count
        FROM messages 
        WHERE is_read = false
      `;
      queryParams = [];
    } else {
      // Client sees only their unread messages
      countQuery = `
        SELECT COUNT(*) as count
        FROM messages m
        LEFT JOIN projects p ON m.project_id = p.id
        WHERE m.is_read = false 
        AND (m.recipient_id = $1 OR p.client_id = $1)
      `;
      queryParams = [req.user.id];
    }

    const result = await query(countQuery, queryParams);

    res.json({
      success: true,
      data: { count: parseInt(result.rows[0].count) }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread messages count'
    });
  }
});

// Delete message (admin only)
router.delete('/:id', validateUUID, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM messages WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

export default router;