import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize, authorizeOwnerOrAdmin } from '../middleware/auth.js';
import { validateProjectCreation, validateProjectUpdate, validateUUID, validatePagination } from '../middleware/validation.js';
import { uploadProjectFiles, handleUploadError } from '../middleware/upload.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all projects (admin only) or user's projects
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('projects')
      .select(`
        *,
        users:client_id (name, email, company),
        assigned_user:assigned_to (name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // If not admin, only show user's projects
    if (req.user.role !== 'admin') {
      query = query.eq('client_id', req.user.id);
    }

    // Add filters
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: projects, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: {
        projects: projects || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
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
router.get('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        users:client_id (name, email, company),
        assigned_user:assigned_to (name),
        project_attachments (*)
      `)
      .eq('id', id)
      .single();

    if (error || !project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check authorization for non-admin users
    if (req.user.role !== 'admin' && project.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { project }
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

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert([{
        client_id: req.user.id,
        title,
        description,
        type,
        budget_range,
        estimated_budget: estimated_budget ? parseFloat(estimated_budget) : null,
        timeline,
        start_date,
        end_date,
        figma_url,
        gitlab_url,
        notes,
        requirements: requirements ? JSON.parse(requirements) : null,
        technical_specs: technical_specs ? JSON.parse(technical_specs) : null
      }])
      .select()
      .single();

    if (error) throw error;

    // Save file attachments if any
    if (req.files && req.files.length > 0) {
      const attachments = req.files.map(file => ({
        project_id: project.id,
        filename: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_path: file.path,
        uploaded_by: req.user.id
      }));

      const { error: attachmentError } = await supabase
        .from('project_attachments')
        .insert(attachments);

      if (attachmentError) {
        console.error('Error saving attachments:', attachmentError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
});

// Update project
router.put('/:id', validateUUID, validateProjectUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if project exists and user has permission
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('client_id')
      .eq('id', id)
      .single();

    if (checkError || !existingProject) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && existingProject.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update project
    const { data: project, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Project updated successfully',
      project
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
});

export default router;