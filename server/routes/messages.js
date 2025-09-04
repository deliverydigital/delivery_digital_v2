import express from 'express';
import { Message, Project, User } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
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
    const skip = (page - 1) * limit;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && project.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const messages = await Message.findByProject(projectId)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ project_id: projectId });

    res.json({
      success: true,
      data: {
        messages: messages.map(message => ({
          id: message._id,
          projectId: message.project_id,
          senderId: message.sender_id._id,
          senderName: message.sender_id.name,
          senderRole: message.sender_id.role,
          recipientId: message.recipient_id?._id,
          recipientName: message.recipient_id?.name,
          subject: message.subject,
          content: message.content,
          messageType: message.message_type,
          priority: message.priority,
          isRead: message.is_read,
          readAt: message.read_at,
          attachments: message.attachments,
          createdAt: message.createdAt
        })),
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const message = await Message.findById(id)
      .populate('sender_id', 'name email role')
      .populate('recipient_id', 'name email role')
      .populate('project_id', 'client_id title');

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        message.sender_id._id.toString() !== req.user.id && 
        message.recipient_id?._id.toString() !== req.user.id &&
        message.project_id?.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { 
        message: {
          id: message._id,
          projectId: message.project_id?._id,
          senderId: message.sender_id._id,
          senderName: message.sender_id.name,
          senderRole: message.sender_id.role,
          recipientId: message.recipient_id?._id,
          recipientName: message.recipient_id?.name,
          subject: message.subject,
          content: message.content,
          messageType: message.message_type,
          priority: message.priority,
          isRead: message.is_read,
          readAt: message.read_at,
          attachments: message.attachments,
          createdAt: message.createdAt
        }
      }
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Check if project exists and user has access
    if (project_id) {
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check authorization
      if (req.user.role !== 'admin' && project.client_id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }
    }

    // Create message data
    const messageData = {
      project_id: project_id || undefined,
      sender_id: req.user.id,
      recipient_id: recipient_id || undefined,
      subject,
      content,
      priority: priority || 'normal',
      attachments: []
    };

    // Add file attachments if any
    if (req.files && req.files.length > 0) {
      messageData.attachments = req.files.map(file => ({
        filename: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_path: file.path,
        uploaded_at: new Date()
      }));
    }

    const message = new Message(messageData);
    await message.save();

    // Populate the created message
    await message.populate('sender_id', 'name email role');
    if (message.recipient_id) {
      await message.populate('recipient_id', 'name email role');
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { 
        message: {
          id: message._id,
          projectId: message.project_id,
          senderId: message.sender_id._id,
          senderName: message.sender_id.name,
          recipientId: message.recipient_id?._id,
          recipientName: message.recipient_id?.name,
          subject: message.subject,
          content: message.content,
          messageType: message.message_type,
          priority: message.priority,
          attachments: message.attachments,
          createdAt: message.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const message = await Message.findById(id)
      .populate('project_id', 'client_id');

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        message.sender_id.toString() !== req.user.id && 
        message.recipient_id?.toString() !== req.user.id &&
        message.project_id?.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Mark as read
    await message.markAsRead();

    res.json({
      success: true,
      message: 'Message marked as read',
      data: { 
        message: {
          id: message._id,
          isRead: message.is_read,
          readAt: message.read_at
        }
      }
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
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    let count = 0;

    if (req.user.role === 'admin') {
      // Admin sees all unread messages
      count = await Message.countDocuments({ is_read: false });
    } else {
      // Client sees only their unread messages
      const unreadMessages = await Message.findUnreadByUser(req.user.id);
      count = unreadMessages.length;
    }

    res.json({
      success: true,
      data: { count }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread messages count'
    });
  }
});

// Get all messages (admin only)
router.get('/', authorize('admin'), validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_read } = req.query;
    const skip = (page - 1) * limit;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    let query = {};

    // Add filters
    if (type) {
      query.message_type = type;
    }
    if (is_read !== undefined) {
      query.is_read = is_read === 'true';
    }

    const messages = await Message.find(query)
      .populate('sender_id', 'name email role')
      .populate('recipient_id', 'name email role')
      .populate('project_id', 'title client_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: {
        messages: messages.map(message => ({
          id: message._id,
          projectId: message.project_id?._id,
          projectTitle: message.project_id?.title,
          senderId: message.sender_id._id,
          senderName: message.sender_id.name,
          senderRole: message.sender_id.role,
          recipientId: message.recipient_id?._id,
          recipientName: message.recipient_id?.name,
          subject: message.subject,
          content: message.content,
          messageType: message.message_type,
          priority: message.priority,
          isRead: message.is_read,
          readAt: message.read_at,
          createdAt: message.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Delete message (admin only)
router.delete('/:id', validateUUID, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const message = await Message.findByIdAndDelete(id);

    if (!message) {
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