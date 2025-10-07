import express from 'express';
import { Task, Project, User } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize, authorizeOwnerOrAdmin } from '../middleware/auth.js';
import { validateTaskCreation, validateTaskUpdate, validateMongoId, validateMongoIdParam, validatePagination } from '../middleware/validation.js';
import { uploadTaskFiles, handleUploadError } from '../middleware/upload.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get tasks for a project
router.get('/project/:projectId', validateMongoIdParam('projectId'), async (req, res) => {
  try {
    console.log
    const { projectId } = req.params;
    const { status, assigned_to, priority } = req.query;

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

    // Build filter object
    const filters = {};
    if (status) filters.status = status;
    if (assigned_to) filters.assigned_to = assigned_to;
    if (priority) filters.priority = priority;

    console.log('Filters:', projectId, filters);

    const tasks = await Task.findByProject(projectId, filters);

    console.log('Tasks:', tasks);

    res.json({
      success: true,
      data: {
        tasks: tasks.map(task => {
          const activeTracking = task.getActiveTimeTracking(req.user.id);
          return {
            id: task._id,
            projectId: task.project_id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignedTo: task.assigned_to?._id,
            assignedToName: task.assigned_to?.name,
            createdBy: task.created_by?._id,
            createdByName: task.created_by?.name,
            dueDate: task.due_date,
            estimatedHours: task.estimated_hours,
            actualHours: task.actual_hours,
            completionPercentage: task.completion_percentage,
            tags: task.tags,
            dependencies: task.dependencies,
            watchers: task.watchers,
            position: task.position,
            attachments: task.attachments,
            comments: task.comments,
            checklist: task.checklist,
            timeTracking: task.time_tracking,
            activeTimeTracking: activeTracking ? {
              startTime: activeTracking.start_time,
              description: activeTracking.description
            } : null,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
          };
        })
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
});

// Get single task with details
router.get('/:id', validateMongoId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const task = await Task.findById(id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('project_id', 'title client_id')
      .populate('comments.author_id', 'name email role');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && task.project_id.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { 
        task: {
          id: task._id,
          projectId: task.project_id._id,
          projectTitle: task.project_id.title,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assigned_to?._id,
          assignedToName: task.assigned_to?.name,
          createdBy: task.created_by?._id,
          createdByName: task.created_by?.name,
          dueDate: task.due_date,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          completionPercentage: task.completion_percentage,
          tags: task.tags,
          dependencies: task.dependencies,
          watchers: task.watchers,
          position: task.position,
          attachments: task.attachments,
          comments: task.comments.map(comment => ({
            id: comment._id,
            authorId: comment.author_id._id,
            authorName: comment.author_id.name,
            authorRole: comment.author_id.role,
            content: comment.content,
            isEdited: comment.is_edited,
            editedAt: comment.edited_at,
            createdAt: comment.created_at
          })),
          checklist: task.checklist,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
});

// Create new task (admin only)
router.post('/', uploadTaskFiles, handleUploadError, validateTaskCreation, async (req, res) => {
  try {
    const {
      project_id,
      title,
      description,
      priority,
      assigned_to,
      due_date,
      estimated_hours,
      tags
    } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Check if project exists
    const project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Only admins can create tasks
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can create tasks'
      });
    }

    // Create task data
    const taskData = {
      project_id,
      title,
      description,
      priority: priority || 'medium',
      assigned_to: assigned_to || undefined,
      due_date: due_date ? new Date(due_date) : undefined,
      estimated_hours: estimated_hours ? parseFloat(estimated_hours) : undefined,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
      created_by: req.user.id,
      attachments: []
    };

    // Add file attachments if any
    if (req.files && req.files.length > 0) {
      taskData.attachments = req.files.map(file => ({
        filename: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_path: file.path,
        uploaded_by: req.user.id,
        uploaded_at: new Date()
      }));
    }

    const task = new Task(taskData);
    await task.save();

    // Populate the created task
    await task.populate('assigned_to', 'name email');
    await task.populate('created_by', 'name email');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { 
        task: {
          id: task._id,
          projectId: task.project_id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assigned_to?._id,
          assignedToName: task.assigned_to?.name,
          createdBy: task.created_by._id,
          createdByName: task.created_by.name,
          dueDate: task.due_date,
          estimatedHours: task.estimated_hours,
          tags: task.tags,
          attachments: task.attachments,
          createdAt: task.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Create task error:', error);
    
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
      error: 'Failed to create task'
    });
  }
});

// Update task
router.put('/:id', validateMongoId, validateTaskUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find task and check authorization
    const task = await Task.findById(id)
      .populate('project_id', 'client_id');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && task.project_id.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'status', 'priority', 'assigned_to', 'due_date',
      'estimated_hours', 'actual_hours', 'completion_percentage', 'tags', 'position'
    ];

    // Clients can only update certain fields
    const clientAllowedFields = ['completion_percentage'];
    const fieldsToCheck = req.user.role === 'admin' ? allowedFields : clientAllowedFields;

    for (const [key, value] of Object.entries(updates)) {
      if (fieldsToCheck.includes(key) && value !== undefined) {
        if (key === 'due_date') {
          task[key] = value ? new Date(value) : undefined;
        } else if (key === 'tags') {
          task[key] = Array.isArray(value) ? value : value.split(',');
        } else {
          task[key] = value;
        }
      }
    }

    await task.save();
    await task.populate('assigned_to', 'name email');
    await task.populate('created_by', 'name email');

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { 
        task: {
          id: task._id,
          projectId: task.project_id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assigned_to?._id,
          assignedToName: task.assigned_to?.name,
          dueDate: task.due_date,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          completionPercentage: task.completion_percentage,
          tags: task.tags,
          updatedAt: task.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update task error:', error);
    
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
      error: 'Failed to update task'
    });
  }
});

// Add comment to task
router.post('/:id/comments', validateMongoId, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find task and check authorization
    const task = await Task.findById(id)
      .populate('project_id', 'client_id');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && task.project_id.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Add comment using the model method
    await task.addComment(req.user.id, content.trim());

    // Get the newly added comment
    const newComment = task.comments[task.comments.length - 1];

    // Populate author info
    await task.populate('comments.author_id', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { 
        comment: {
          id: newComment._id,
          authorId: newComment.author_id,
          content: newComment.content,
          createdAt: newComment.created_at
        }
      }
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
});

// Add checklist item (admin only)
router.post('/:id/checklist', validateMongoId, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Checklist item title is required'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Add checklist item using the model method
    await task.addChecklistItem(title.trim(), position || 0);

    // Get the newly added item
    const newItem = task.checklist[task.checklist.length - 1];

    res.status(201).json({
      success: true,
      message: 'Checklist item added successfully',
      data: { 
        item: {
          id: newItem._id,
          title: newItem.title,
          completed: newItem.completed,
          position: newItem.position,
          createdAt: newItem.created_at
        }
      }
    });

  } catch (error) {
    console.error('Add checklist item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add checklist item'
    });
  }
});

// Toggle checklist item
router.put('/checklist/:taskId/:itemId', validateMongoIdParam('taskId'), async (req, res) => {
  try {
    const { taskId, itemId } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find task and check authorization
    const task = await Task.findById(taskId)
      .populate('project_id', 'client_id');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && task.project_id.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Toggle checklist item using the model method
    await task.toggleChecklistItem(itemId);
    await task.updateProgress();

    // Find the updated item
    const updatedItem = task.checklist.id(itemId);

    res.json({
      success: true,
      message: 'Checklist item updated successfully',
      data: { 
        item: {
          id: updatedItem._id,
          title: updatedItem.title,
          completed: updatedItem.completed,
          position: updatedItem.position
        },
        taskProgress: task.completion_percentage
      }
    });

  } catch (error) {
    console.error('Toggle checklist item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update checklist item'
    });
  }
});

// Delete task (admin only)
router.delete('/:id', validateMongoId, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
});

// Get tasks assigned to user
router.get('/assigned/me', async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const tasks = await Task.findByAssignee(req.user.id);

    res.json({
      success: true,
      data: { 
        tasks: tasks.map(task => ({
          id: task._id,
          projectId: task.project_id._id,
          projectTitle: task.project_id.title,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.due_date,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          completionPercentage: task.completion_percentage,
          tags: task.tags,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }))
      }
    });

  } catch (error) {
    console.error('Get assigned tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assigned tasks'
    });
  }
});

// Get overdue tasks (admin only)
router.get('/overdue', authorize('admin'), async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const overdueTasks = await Task.findOverdue();

    res.json({
      success: true,
      data: {
        tasks: overdueTasks.map(task => ({
          id: task._id,
          projectId: task.project_id._id,
          projectTitle: task.project_id.title,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assigned_to?._id,
          assignedToName: task.assigned_to?.name,
          dueDate: task.due_date,
          daysOverdue: Math.ceil((new Date() - task.due_date) / (1000 * 60 * 60 * 24)),
          createdAt: task.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue tasks'
    });
  }
});

// Start time tracking
router.post('/:id/time-tracking/start', validateMongoId, async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find task and check authorization
    const task = await Task.findById(id)
      .populate('project_id', 'client_id');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && task.project_id.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Start time tracking
    await task.startTimeTracking(req.user.id, description || '');

    res.json({
      success: true,
      message: 'Time tracking started successfully',
      data: {
        startTime: new Date()
      }
    });

  } catch (error) {
    console.error('Start time tracking error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start time tracking'
    });
  }
});

// Stop time tracking
router.post('/:id/time-tracking/stop', validateMongoId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find task and check authorization
    const task = await Task.findById(id)
      .populate('project_id', 'client_id');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && task.project_id.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Stop time tracking
    await task.stopTimeTracking(req.user.id);

    // Get the completed entry
    const completedEntry = task.time_tracking[task.time_tracking.length - 1];

    res.json({
      success: true,
      message: 'Time tracking stopped successfully',
      data: {
        duration: completedEntry.duration,
        actualHours: task.actual_hours
      }
    });

  } catch (error) {
    console.error('Stop time tracking error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop time tracking'
    });
  }
});

// Get active time tracking for a task
router.get('/:id/time-tracking/active', validateMongoId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find task
    const task = await Task.findById(id)
      .populate('project_id', 'client_id');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && task.project_id.client_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get active time tracking
    const activeTracking = task.getActiveTimeTracking(req.user.id);

    res.json({
      success: true,
      data: {
        isTracking: !!activeTracking,
        startTime: activeTracking?.start_time || null,
        description: activeTracking?.description || null
      }
    });

  } catch (error) {
    console.error('Get active time tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active time tracking'
    });
  }
});

export default router;