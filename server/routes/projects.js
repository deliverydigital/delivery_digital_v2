import express from 'express';
import { Project, User, Task } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize, authorizeOwnerOrAdmin } from '../middleware/auth.js';
import { validateProjectCreation, validateProjectUpdate, validateMongoId, validateMongoIdParam, validatePagination } from '../middleware/validation.js';
import { uploadProjectFiles, handleUploadError } from '../middleware/upload.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Helper function to filter links based on user role
function filterLinksByRole(links, userRole) {
  if (!links || links.length === 0) return [];

  return links.filter(link => {
    if (!link.visibleTo || link.visibleTo.length === 0) {
      // If no visibility set, show to everyone
      return true;
    }
    return link.visibleTo.includes(userRole);
  });
}

// Search projects
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: {
          projects: [],
          pagination: { page: 1, limit, total: 0, pages: 0 }
        }
      });
    }

    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Build base query for role-based filtering
    let baseQuery = {};

    if (req.user.role === 'admin') {
      // Admins search all projects
    } else if (req.user.role === 'project_manager') {
      baseQuery.$or = [
        { assigned_to: req.user.id },
        { 'assigned_users.user_id': req.user.id }
      ];
    } else if (req.user.role === 'developer' || req.user.role === 'trainer') {
      baseQuery['assigned_users.user_id'] = req.user.id;
    } else if (req.user.role === 'client') {
      baseQuery.client_id = req.user.id;
    } else {
      baseQuery._id = null;
    }

    // Add search criteria
    const searchRegex = new RegExp(q.trim(), 'i');
    const searchConditions = [
      { title: searchRegex },
      { description: searchRegex },
      { type: searchRegex },
      { client_name: searchRegex }
    ];

    // Combine role filtering with search criteria
    let query = {};
    if (Object.keys(baseQuery).length > 0) {
      query.$and = [
        baseQuery,
        { $or: searchConditions }
      ];
    } else {
      query.$or = searchConditions;
    }

    const totalProjects = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('client_id', 'name email company')
      .populate('assigned_to', 'name email')
      .populate('assigned_users.user_id', 'name email role')
      .lean();

    const formattedProjects = projects.map(project => ({
      id: project._id.toString(),
      clientId: project.client_id?._id?.toString() || project.client_id,
      clientName: project.client_id?.name || project.client_name || 'Unknown',
      title: project.title,
      description: project.description,
      type: project.type,
      budget: project.budget,
      timeline: project.timeline,
      status: project.status,
      priority: project.priority,
      submittedAt: project.created_at,
      lastUpdate: project.updated_at,
      attachments: project.attachments || [],
      figmaUrl: project.figma_url,
      gitlabUrl: project.gitlab_url,
      notes: project.notes || '',
      estimatedHours: project.estimated_hours,
      assignedTo: project.assigned_to ? {
        id: project.assigned_to._id.toString(),
        name: project.assigned_to.name,
        email: project.assigned_to.email
      } : undefined,
      links: filterLinksByRole(project.links || [], req.user.role)
    }));

    res.json({
      success: true,
      data: {
        projects: formattedProjects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalProjects,
          pages: Math.ceil(totalProjects / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error searching projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search projects'
    });
  }
});

// Get all projects (admin only) or user's projects
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 1000, status, priority } = req.query;
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
      // Project managers see projects assigned to them OR where they're in assigned_users
      query.$or = [
        { assigned_to: req.user.id },
        { 'assigned_users.user_id': req.user.id }
      ];
    } else if (req.user.role === 'developer' || req.user.role === 'trainer') {
      // Developers and trainers see only projects where they're in assigned_users
      query['assigned_users.user_id'] = req.user.id;
    } else if (req.user.role === 'client') {
      // Clients see only their own projects
      query.client_id = req.user.id;
    } else {
      // Default: no projects visible
      query._id = null;
    }

    // Add filters
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }

    console.log('Query for role', req.user.role, ':', JSON.stringify(query));

    const projects = await Project.find(query)
      .populate('client_id', 'name email company')
      .populate('assigned_to', 'name email')
      .populate('assigned_users.user_id', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    // Check for urgent tasks in each project
    const projectsWithUrgentFlags = await Promise.all(
      projects.map(async (project) => {
        const urgentTaskCount = await Task.countDocuments({
          project_id: project._id,
          priority: 'urgent',
          status: { $ne: 'done' }
        });

        return {
          id: project._id,
          clientId: project.client_id._id,
          clientName: project.client_id.name,
          title: project.title,
          description: project.description,
          type: project.type,
          status: project.status,
          priority: project.priority,
          budgetRange: project.budget_range,
          estimatedBudget: project.estimated_budget,
          timeline: project.timeline,
          startDate: project.start_date,
          endDate: project.end_date,
          completionPercentage: project.completion_percentage,
          assignedTo: project.assigned_to ? {
            id: project.assigned_to._id,
            name: project.assigned_to.name,
            email: project.assigned_to.email
          } : null,
          assignedUsers: project.assigned_users?.map(au => ({
            userId: au.user_id?._id?.toString() || au.user_id,
            userName: au.user_id?.name,
            userEmail: au.user_id?.email,
            userRole: au.user_id?.role,
            role: au.role,
            assignedAt: au.assigned_at
          })) || [],
          figmaUrl: project.figma_url,
          gitlabUrl: project.gitlab_url,
          notes: project.notes,
          links: filterLinksByRole(project.links, req.user.role),
          attachments: project.attachments,
          taskPermissions: project.task_permissions,
          hasUrgentTasks: urgentTaskCount > 0,
          urgentTaskCount: urgentTaskCount,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          lastUpdate: project.updatedAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        projects: projectsWithUrgentFlags,
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
      .populate('assigned_to', 'name email')
      .populate('assigned_users.user_id', 'name email role');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check authorization for non-admin users
    const isAdmin = req.user.role === 'admin';
    const isClient = project.client_id._id.toString() === req.user.id;
    const isAssignedManager = req.user.role === 'project_manager' &&
                              project.assigned_to &&
                              project.assigned_to._id.toString() === req.user.id;
    const isAssignedUser = project.assigned_users?.some(
      au => au.user_id._id.toString() === req.user.id
    );

    if (!isAdmin && !isClient && !isAssignedManager && !isAssignedUser) {
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
          budgetRange: project.budget_range,
          estimatedBudget: project.estimated_budget,
          timeline: project.timeline,
          startDate: project.start_date,
          endDate: project.end_date,
          completionPercentage: project.completion_percentage,
          assignedTo: project.assigned_to ? {
            id: project.assigned_to._id,
            name: project.assigned_to.name,
            email: project.assigned_to.email
          } : null,
          assignedUsers: project.assigned_users?.map(au => ({
            userId: au.user_id?._id?.toString() || au.user_id,
            userName: au.user_id?.name,
            userEmail: au.user_id?.email,
            userRole: au.user_id?.role,
            role: au.role,
            assignedAt: au.assigned_at
          })) || [],
          figmaUrl: project.figma_url,
          gitlabUrl: project.gitlab_url,
          notes: project.notes,
          links: filterLinksByRole(project.links, req.user.role),
          attachments: project.attachments,
          milestones: project.milestones,
          taskPermissions: project.task_permissions,
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

    console.log('Updating project with ID:', id);
    console.log('Updates received:', JSON.stringify(updates, null, 2));
    console.log('Assigned users:', updates.assignedUsers);

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
    const isAdmin = req.user.role === 'admin';
    const isClient = project.client_id.toString() === req.user.id;
    const isAssignedManager = req.user.role === 'project_manager' &&
                              project.assigned_to &&
                              project.assigned_to.toString() === req.user.id;
    const isAssignedUser = project.assigned_users?.some(
      au => au.user_id.toString() === req.user.id
    );

    // Only admin, assigned manager, and clients can update
    // Assigned users (developers/trainers) cannot update project details
    if (!isAdmin && !isClient && !isAssignedManager) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Map camelCase to snake_case for field names
    const fieldMapping = {
      'completionPercentage': 'completion_percentage',
      'budgetRange': 'budget_range',
      'estimatedBudget': 'estimated_budget',
      'startDate': 'start_date',
      'endDate': 'end_date',
      'assignedTo': 'assigned_to',
      'figmaUrl': 'figma_url',
      'gitlabUrl': 'gitlab_url',
      'technicalSpecs': 'technical_specs',
      'taskPermissions': 'task_permissions',
      'assignedUsers' : 'assigned_users'

    };

    // Update allowed fields (snake_case)
    const allowedFields = [
      'title', 'description', 'type', 'status', 'priority', 'budget_range', 'estimated_budget',
      'timeline', 'start_date', 'end_date', 'completion_percentage', 'assigned_to', 'assigned_users',
      'figma_url', 'gitlab_url', 'notes', 'requirements', 'technical_specs', 'links', 'task_permissions',
        'assigned_users'
    ];

    // Role-based field permissions
    const clientAllowedFields = ['description', 'figma_url', 'gitlab_url', 'notes', 'links'];
    const managerAllowedFields = [
      'title', 'description', 'type', 'status', 'priority', 'budget_range', 'estimated_budget',
      'timeline', 'start_date', 'end_date', 'completion_percentage',
      'figma_url', 'gitlab_url', 'notes', 'links', 'requirements', 'technical_specs'
    ];

    let fieldsToCheck;
    if (req.user.role === 'admin') {
      fieldsToCheck = allowedFields;
    } else if (req.user.role === 'project_manager') {
      fieldsToCheck = managerAllowedFields;
    } else {
      fieldsToCheck = clientAllowedFields;
    }

    for (const [key, value] of Object.entries(updates)) {
      // Convert camelCase to snake_case if mapping exists
      const fieldName = fieldMapping[key] || key;

      if (fieldsToCheck.includes(fieldName) && value !== undefined) {
        if (fieldName === 'start_date' || fieldName === 'end_date') {
          project[fieldName] = value ? new Date(value) : undefined;
        } else if (fieldName === 'requirements' || fieldName === 'technical_specs') {
          project[fieldName] = typeof value === 'string' ? JSON.parse(value) : value;
        } else if (fieldName === 'assigned_to') {
          // Handle empty string or null for assigned_to - should unassign
          project[fieldName] = (value === '' || value === null) ? null : value;
        } else if (fieldName === 'assigned_users') {
          // Handle assigned users array
          if (Array.isArray(value)) {
            console.log('Processing assigned_users array:', value);
            const mappedUsers = value.map(user => ({
              user_id: user.userId || user.user_id,
              role: user.role || 'developer',
              assigned_at: user.assigned_at || new Date()
            })).filter(user => user.user_id);
            console.log('Mapped users:', mappedUsers);
            project[fieldName] = mappedUsers;
          }
        } else {
          project[fieldName] = value;
        }
      }
    }

    await project.save();
    await project.populate('client_id', 'name email company');
    await project.populate('assigned_to', 'name email');
    await project.populate('assigned_users.user_id', 'name email role');

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
        budgetRange: project.budget_range,
        estimatedBudget: project.estimated_budget,
        timeline: project.timeline,
        completionPercentage: project.completion_percentage,
        assignedTo: project.assigned_to ? {
          id: project.assigned_to._id,
          name: project.assigned_to.name,
          email: project.assigned_to.email
        } : null,
        assignedUsers: project.assigned_users?.map(au => ({
          userId: au.user_id?._id?.toString() || au.user_id,
          userName: au.user_id?.name,
          userEmail: au.user_id?.email,
          userRole: au.user_id?.role,
          role: au.role,
          assignedAt: au.assigned_at
        })) || [],
        figmaUrl: project.figma_url,
        gitlabUrl: project.gitlab_url,
        notes: project.notes,
        links: filterLinksByRole(project.links, req.user.role),
        attachments: project.attachments,
        taskPermissions: project.task_permissions,
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
        figmaUrl: project.figma_url,
        gitlabUrl: project.gitlab_url,
        notes: project.notes,
        links: filterLinksByRole(project.links, req.user.role),
        completionPercentage: project.completion_percentage,
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

router.patch('/:id/task-permissions', validateMongoId, authorize('admin', 'project_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { task_permissions } = req.body;

    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (req.user.role === 'project_manager' && project.assigned_to?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update permissions for projects assigned to you'
      });
    }

    if (task_permissions) {
      project.task_permissions = {
        ...project.task_permissions,
        ...task_permissions
      };
    }

    await project.save();

    res.json({
      success: true,
      message: 'Task permissions updated successfully',
      data: {
        task_permissions: project.task_permissions
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