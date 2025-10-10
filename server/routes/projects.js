import express from 'express';
import { Project, User } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize, authorizeOwnerOrAdmin } from '../middleware/auth.js';
import { validateProjectCreation, validateProjectUpdate, validateMongoId, validateMongoIdParam, validatePagination } from '../middleware/validation.js';
import { uploadProjectFiles, handleUploadError } from '../middleware/upload.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all projects (admin only) or user's projects
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority } = req.query;
    const skip = (page - 1) * limit;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    let query = {};

    // Role-based filtering
    if (req.user.role === 'admin') {
      // Admins see all projects
    } else if (req.user.role === 'project_manager') {
      // Project managers see only assigned projects
      query.assigned_to = req.user.id;
    } else {
      // Clients see only their own projects
      query.client_id = req.user.id;
    }

    // Add filters
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }

    console.log('Query',req.user.role ,query);

    const projects = await Project.find(query)
      .populate('client_id', 'name email company')
      .populate('assigned_to', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: {
        projects: projects.map(project => ({
          id: project._id,
          clientId: project.client_id._id,
          clientName: project.client_id.name,
          title: project.title,
          description: project.description,
          type: project.type,
          status: project.status,
          priority: project.priority,
          budget_range: project.budget_range,
          estimated_budget: project.estimated_budget,
          timeline: project.timeline,
          start_date: project.start_date,
          end_date: project.end_date,
          completion_percentage: project.completion_percentage,
          assignedTo: project.assigned_to ? {
            id: project.assigned_to._id,
            name: project.assigned_to.name,
            email: project.assigned_to.email
          } : null,
          figma_url: project.figma_url,
          gitlab_url: project.gitlab_url,
          notes: project.notes,
          attachments: project.attachments,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
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
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

// Get single project
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

    const project = await Project.findById(id)
      .populate('client_id', 'name email company')
      .populate('assigned_to', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check authorization for non-admin users
    if (req.user.role !== 'admin' && project.client_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        project: {
          id: project._id,
          clientId: project.client_id._id,
          clientName: project.client_id.name,
          title: project.title,
          description: project.description,
          type: project.type,
          status: project.status,
          priority: project.priority,
          budget_range: project.budget_range,
          estimated_budget: project.estimated_budget,
          timeline: project.timeline,
          start_date: project.start_date,
          end_date: project.end_date,
          completion_percentage: project.completion_percentage,
          assignedTo: project.assigned_to ? {
            id: project.assigned_to._id,
            name: project.assigned_to.name,
            email: project.assigned_to.email
          } : null,
          figma_url: project.figma_url,
          gitlab_url: project.gitlab_url,
          notes: project.notes,
          attachments: project.attachments,
          milestones: project.milestones,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
  }
});

// Create new project
router.post('/', uploadProjectFiles, handleUploadError, validateProjectCreation, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      budget_range,
      estimated_budget,
      timeline,
      start_date,
      end_date,
      figma_url,
      gitlab_url,
      notes,
      requirements,
      technical_specs
    } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Create project data
    const projectData = {
      client_id: req.user.id,
      title,
      description,
      type,
      budget_range,
      estimated_budget: estimated_budget ? parseFloat(estimated_budget) : undefined,
      timeline,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      figma_url,
      gitlab_url,
      notes,
      requirements: requirements ? JSON.parse(requirements) : undefined,
      technical_specs: technical_specs ? JSON.parse(technical_specs) : undefined,
      attachments: []
    };

    // Add file attachments if any
    if (req.files && req.files.length > 0) {
      projectData.attachments = req.files.map(file => ({
        filename: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_path: file.path,
        uploaded_by: req.user.id,
        uploaded_at: new Date()
      }));
    }

    const project = new Project(projectData);
    await project.save();

    // Populate the created project
    await project.populate('client_id', 'name email company');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: {
        id: project._id,
        clientId: project.client_id._id,
        clientName: project.client_id.name,
        title: project.title,
        description: project.description,
        type: project.type,
        status: project.status,
        priority: project.priority,
        budget_range: project.budget_range,
        estimated_budget: project.estimated_budget,
        timeline: project.timeline,
        attachments: project.attachments,
        createdAt: project.createdAt
      }
    });

  } catch (error) {
    console.error('Create project error:', error);
    
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
      error: 'Failed to create project'
    });
  }
});

// Update project
router.put('/:id', validateMongoId, validateProjectUpdate, async (req, res) => {
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

    // Find project
    const project = await Project.findById(id);
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

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'status', 'priority', 'budget_range', 'estimated_budget',
      'timeline', 'start_date', 'end_date', 'completion_percentage', 'assigned_to',
      'figma_url', 'gitlab_url', 'notes', 'requirements', 'technical_specs'
    ];

    // Clients can only update certain fields
    const clientAllowedFields = ['description', 'figma_url', 'gitlab_url', 'notes'];
    const fieldsToCheck = req.user.role === 'admin' ? allowedFields : clientAllowedFields;

    for (const [key, value] of Object.entries(updates)) {
      if (fieldsToCheck.includes(key) && value !== undefined) {
        if (key === 'start_date' || key === 'end_date') {
          project[key] = value ? new Date(value) : undefined;
        } else if (key === 'requirements' || key === 'technical_specs') {
          project[key] = typeof value === 'string' ? JSON.parse(value) : value;
        } else {
          project[key] = value;
        }
      }
    }

    await project.save();
    await project.populate('client_id', 'name email company');
    await project.populate('assigned_to', 'name email');

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: {
        id: project._id,
        clientId: project.client_id._id,
        clientName: project.client_id.name,
        title: project.title,
        description: project.description,
        type: project.type,
        status: project.status,
        priority: project.priority,
        budget_range: project.budget_range,
        estimated_budget: project.estimated_budget,
        timeline: project.timeline,
        completion_percentage: project.completion_percentage,
        assignedTo: project.assigned_to ? {
          id: project.assigned_to._id,
          name: project.assigned_to.name,
          email: project.assigned_to.email
        } : null,
        figma_url: project.figma_url,
        gitlab_url: project.gitlab_url,
        notes: project.notes,
        attachments: project.attachments,
        updatedAt: project.updatedAt
      }
    });

  } catch (error) {
    console.error('Update project error:', error);
    
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
      error: 'Failed to update project'
    });
  }
});

// Delete project (admin only)
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

    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
});

// Get projects by client (admin only)
router.get('/client/:clientId', validateMongoIdParam('clientId'), authorize('admin', 'client'), async (req, res) => {
  try {
    const { clientId } = req.params;

    console.log('ClientId',clientId);

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const projects = await Project.findByClient(clientId);

    res.json({
      success: true,
      data: { 
        projects: projects.map(project => ({
          id: project._id,
          clientId: project.client_id._id,
          clientName: project.client_id.name,
          title: project.title,
          description: project.description,
          type: project.type,
          status: project.status,
          priority: project.priority,
          budget_range: project.budget_range,
          timeline: project.timeline,
          completion_percentage: project.completion_percentage,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }))
      }
    });

  } catch (error) {
    console.error('Get client projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client projects'
    });
  }
});

// Assign project to project manager (admin only)
router.post('/:id/assign', authorize('admin'), validateMongoIdParam('id'), async (req, res) => {
  try {
    console.log('Assigning project. User role:', req.user?.role);
    const { managerId } = req.body;

    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Validate managerId is provided
    if (!managerId) {
      return res.status(400).json({
        success: false,
        error: 'Manager ID is required'
      });
    }

    // Verify the manager exists and has the correct role
    const manager = await User.findById(managerId);
    if (!manager) {
      return res.status(404).json({
        success: false,
        error: 'Project manager not found'
      });
    }

    if (manager.role !== 'project_manager') {
      return res.status(400).json({
        success: false,
        error: 'User is not a project manager'
      });
    }

    // Update project
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { assigned_to: managerId },
      { new: true }
    )
    .populate('client_id', 'name email company')
    .populate('assigned_to', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project assigned successfully',
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        status: project.status,
        priority: project.priority,
        budget: project.budget,
        timeline: project.timeline,
        clientId: project.client_id?._id,
        clientName: project.client_id?.name,
        assignedTo: project.assigned_to ? {
          id: project.assigned_to._id,
          name: project.assigned_to.name,
          email: project.assigned_to.email
        } : null,
        attachments: project.attachments,
        figma_url: project.figma_url,
        gitlab_url: project.gitlab_url,
        notes: project.notes,
        completion_percentage: project.completion_percentage,
        submittedAt: project.createdAt,
        lastUpdate: project.updatedAt
      }
    });

  } catch (error) {
    console.error('Assign project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign project'
    });
  }
});

export default router;