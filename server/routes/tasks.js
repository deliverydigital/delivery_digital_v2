import express from 'express';
import { query, transaction } from '../config/database.js';
import { authenticate, authorize, authorizeOwnerOrAdmin } from '../middleware/auth.js';
import { validateTaskCreation, validateTaskUpdate, validateUUID, validatePagination } from '../middleware/validation.js';
import { uploadTaskFiles, handleUploadError } from '../middleware/upload.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get tasks for a project
router.get('/project/:projectId', validateUUID, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assigned_to, priority } = req.query;

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

    let whereClause = 'WHERE t.project_id = $1';
    let queryParams = [projectId];
    let paramCount = 1;

    // Add filters
    if (status) {
      whereClause += ` AND t.status = $${++paramCount}`;
      queryParams.push(status);
    }

    if (assigned_to) {
      whereClause += ` AND t.assigned_to = $${++paramCount}`;
      queryParams.push(assigned_to);
    }

    if (priority) {
      whereClause += ` AND t.priority = $${++paramCount}`;
      queryParams.push(priority);
    }

    const tasksQuery = `
      SELECT 
        t.*,
        assigned_user.name as assigned_to_name,
        created_user.name as created_by_name,
        COUNT(tc.id) as comment_count,
        COUNT(ta.id) as attachment_count,
        COUNT(tcl.id) as checklist_total,
        COUNT(CASE WHEN tcl.completed = true THEN 1 END) as checklist_completed
      FROM tasks t
      LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
      LEFT JOIN users created_user ON t.created_by = created_user.id
      LEFT JOIN task_comments tc ON t.id = tc.task_id
      LEFT JOIN task_attachments ta ON t.id = ta.task_id
      LEFT JOIN task_checklist tcl ON t.id = tcl.task_id
      ${whereClause}
      GROUP BY t.id, assigned_user.name, created_user.name
      ORDER BY t.position ASC, t.created_at DESC
    `;

    const result = await query(tasksQuery, queryParams);

    res.json({
      success: true,
      data: { tasks: result.rows }
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
router.get('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const taskQuery = `
      SELECT 
        t.*,
        assigned_user.name as assigned_to_name,
        created_user.name as created_by_name,
        p.title as project_title,
        p.client_id
      FROM tasks t
      LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
      LEFT JOIN users created_user ON t.created_by = created_user.id
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `;

    const result = await query(taskQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const task = result.rows[0];

    // Check authorization
    if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get task comments
    const commentsResult = await query(
      `SELECT tc.*, u.name as author_name
       FROM task_comments tc
       JOIN users u ON tc.author_id = u.id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at ASC`,
      [id]
    );

    // Get task attachments
    const attachmentsResult = await query(
      'SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY uploaded_at DESC',
      [id]
    );

    // Get checklist items
    const checklistResult = await query(
      'SELECT * FROM task_checklist WHERE task_id = $1 ORDER BY position ASC',
      [id]
    );

    // Get time entries
    const timeEntriesResult = await query(
      `SELECT te.*, u.name as user_name
       FROM time_entries te
       JOIN users u ON te.user_id = u.id
       WHERE te.task_id = $1
       ORDER BY te.start_time DESC`,
      [id]
    );

    task.comments = commentsResult.rows;
    task.attachments = attachmentsResult.rows;
    task.checklist = checklistResult.rows;
    task.time_entries = timeEntriesResult.rows;

    res.json({
      success: true,
      data: { task }
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
});

// Create new task
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

    // Check if user has access to this project
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

    // Only admins can create tasks
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can create tasks'
      });
    }

    const result = await transaction(async (client) => {
      // Create task
      const taskResult = await client.query(
        `INSERT INTO tasks 
         (project_id, title, description, priority, assigned_to, due_date, estimated_hours, tags, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          project_id, title, description, priority, assigned_to, due_date,
          estimated_hours, tags ? tags.split(',') : [], req.user.id
        ]
      );

      const task = taskResult.rows[0];

      // Save file attachments if any
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await client.query(
            `INSERT INTO task_attachments 
             (task_id, filename, original_name, file_type, file_size, file_path, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              task.id,
              file.filename,
              file.originalname,
              file.mimetype,
              file.size,
              file.path,
              req.user.id
            ]
          );
        }
      }

      return task;
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: result }
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
});

// Update task
router.put('/:id', validateUUID, validateTaskUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if task exists and get project info
    const taskCheck = await query(
      `SELECT t.*, p.client_id 
       FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = $1`,
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const task = taskCheck.rows[0];

    // Check authorization - admins can update anything, clients can only update their own tasks
    if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'title', 'description', 'status', 'priority', 'assigned_to', 'due_date',
      'estimated_hours', 'actual_hours', 'completion_percentage', 'tags', 'position'
    ];

    // Clients can only update certain fields
    const clientAllowedFields = ['completion_percentage'];
    const fieldsToCheck = req.user.role === 'admin' ? allowedFields : clientAllowedFields;

    for (const [key, value] of Object.entries(updates)) {
      if (fieldsToCheck.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${++paramCount}`);
        if (key === 'tags' && Array.isArray(value)) {
          values.push(value);
        } else {
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: result.rows[0] }
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
});

// Add comment to task
router.post('/:id/comments', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    // Check if task exists and user has access
    const taskCheck = await query(
      `SELECT t.*, p.client_id 
       FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = $1`,
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const task = taskCheck.rows[0];

    // Check authorization
    if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await query(
      `INSERT INTO task_comments (task_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, req.user.id, content.trim()]
    );

    const comment = result.rows[0];

    // Get author name
    const authorResult = await query(
      'SELECT name FROM users WHERE id = $1',
      [req.user.id]
    );

    comment.author_name = authorResult.rows[0].name;

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment }
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
});

// Add checklist item
router.post('/:id/checklist', validateUUID, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Checklist item title is required'
      });
    }

    const result = await query(
      `INSERT INTO task_checklist (task_id, title, position)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, title.trim(), position || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Checklist item added successfully',
      data: { item: result.rows[0] }
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
router.put('/checklist/:itemId', validateUUID, async (req, res) => {
  try {
    const { itemId } = req.params;

    // Check if user has access to this checklist item
    const itemCheck = await query(
      `SELECT tcl.*, t.id as task_id, p.client_id
       FROM task_checklist tcl
       JOIN tasks t ON tcl.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE tcl.id = $1`,
      [itemId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Checklist item not found'
      });
    }

    const item = itemCheck.rows[0];

    // Check authorization
    if (req.user.role !== 'admin' && item.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await query(
      `UPDATE task_checklist 
       SET completed = NOT completed
       WHERE id = $1
       RETURNING *`,
      [itemId]
    );

    res.json({
      success: true,
      message: 'Checklist item updated successfully',
      data: { item: result.rows[0] }
    });

  } catch (error) {
    console.error('Toggle checklist item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update checklist item'
    });
  }
});

// Start time tracking
router.post('/:id/time/start', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    // Check if task exists and user has access
    const taskCheck = await query(
      `SELECT t.*, p.client_id 
       FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = $1`,
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const task = taskCheck.rows[0];

    // Check authorization
    if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if user already has active time tracking for this task
    const activeEntry = await query(
      'SELECT id FROM time_entries WHERE task_id = $1 AND user_id = $2 AND end_time IS NULL',
      [id, req.user.id]
    );

    if (activeEntry.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Time tracking already active for this task'
      });
    }

    const result = await query(
      `INSERT INTO time_entries (task_id, project_id, user_id, description, start_time)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, task.project_id, req.user.id, description || '']
    );

    res.status(201).json({
      success: true,
      message: 'Time tracking started',
      data: { entry: result.rows[0] }
    });

  } catch (error) {
    console.error('Start time tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start time tracking'
    });
  }
});

// Stop time tracking
router.post('/:id/time/stop', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    // Find active time entry
    const activeEntry = await query(
      `SELECT te.*, t.project_id, p.client_id
       FROM time_entries te
       JOIN tasks t ON te.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE te.task_id = $1 AND te.user_id = $2 AND te.end_time IS NULL`,
      [id, req.user.id]
    );

    if (activeEntry.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active time tracking found for this task'
      });
    }

    const entry = activeEntry.rows[0];

    // Check authorization
    if (req.user.role !== 'admin' && entry.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await query(
      `UPDATE time_entries 
       SET end_time = CURRENT_TIMESTAMP,
           duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) / 60
       WHERE id = $1
       RETURNING *`,
      [entry.id]
    );

    res.json({
      success: true,
      message: 'Time tracking stopped',
      data: { entry: result.rows[0] }
    });

  } catch (error) {
    console.error('Stop time tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop time tracking'
    });
  }
});

// Delete task (admin only)
router.delete('/:id', validateUUID, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
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

export default router;