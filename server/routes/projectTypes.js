import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Get all project types with their default tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { data: projectTypes, error: typesError } = await supabase
      .from('project_types')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        default_tasks (
          id,
          title,
          description,
          priority,
          estimated_hours,
          order_index,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: true });

    if (typesError) {
      console.error('Error fetching project types:', typesError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch project types'
      });
    }

    // Sort default tasks by order_index
    const sortedProjectTypes = projectTypes.map(type => ({
      ...type,
      default_tasks: (type.default_tasks || []).sort((a, b) => a.order_index - b.order_index)
    }));

    res.json({
      success: true,
      data: sortedProjectTypes
    });
  } catch (error) {
    console.error('Error in GET /project-types:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get a single project type by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: projectType, error } = await supabase
      .from('project_types')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        default_tasks (
          id,
          title,
          description,
          priority,
          estimated_hours,
          order_index,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching project type:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch project type'
      });
    }

    if (!projectType) {
      return res.status(404).json({
        success: false,
        error: 'Project type not found'
      });
    }

    // Sort default tasks by order_index
    projectType.default_tasks = (projectType.default_tasks || []).sort((a, b) => a.order_index - b.order_index);

    res.json({
      success: true,
      data: projectType
    });
  } catch (error) {
    console.error('Error in GET /project-types/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a new project type
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Project type name is required'
      });
    }

    const { data: projectType, error } = await supabase
      .from('project_types')
      .insert([{
        name: name.trim(),
        description: description?.trim() || ''
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating project type:', error);
      return res.status(500).json({
        success: false,
        error: error.code === '23505' ? 'Project type name already exists' : 'Failed to create project type'
      });
    }

    res.status(201).json({
      success: true,
      data: projectType
    });
  } catch (error) {
    console.error('Error in POST /project-types:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update a project type
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Project type name is required'
      });
    }

    const { data: projectType, error } = await supabase
      .from('project_types')
      .update({
        name: name.trim(),
        description: description?.trim() || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project type:', error);
      return res.status(500).json({
        success: false,
        error: error.code === '23505' ? 'Project type name already exists' : 'Failed to update project type'
      });
    }

    if (!projectType) {
      return res.status(404).json({
        success: false,
        error: 'Project type not found'
      });
    }

    res.json({
      success: true,
      data: projectType
    });
  } catch (error) {
    console.error('Error in PUT /project-types/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a project type
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('project_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project type:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete project type'
      });
    }

    res.json({
      success: true,
      message: 'Project type deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /project-types/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a default task for a project type
router.post('/:id/tasks', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, estimatedHours, orderIndex } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    // Verify project type exists
    const { data: projectType, error: typeError } = await supabase
      .from('project_types')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (typeError || !projectType) {
      return res.status(404).json({
        success: false,
        error: 'Project type not found'
      });
    }

    const { data: task, error } = await supabase
      .from('default_tasks')
      .insert([{
        project_type_id: id,
        title: title.trim(),
        description: description?.trim() || '',
        priority: priority || 'medium',
        estimated_hours: estimatedHours || 0,
        order_index: orderIndex || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating default task:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create default task'
      });
    }

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error in POST /project-types/:id/tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update a default task
router.put('/:id/tasks/:taskId', authenticate, async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const { title, description, priority, estimatedHours, orderIndex } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    const { data: task, error } = await supabase
      .from('default_tasks')
      .update({
        title: title.trim(),
        description: description?.trim() || '',
        priority: priority || 'medium',
        estimated_hours: estimatedHours || 0,
        order_index: orderIndex !== undefined ? orderIndex : 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('project_type_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating default task:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update default task'
      });
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Default task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error in PUT /project-types/:id/tasks/:taskId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a default task
router.delete('/:id/tasks/:taskId', authenticate, async (req, res) => {
  try {
    const { id, taskId } = req.params;

    const { error } = await supabase
      .from('default_tasks')
      .delete()
      .eq('id', taskId)
      .eq('project_type_id', id);

    if (error) {
      console.error('Error deleting default task:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete default task'
      });
    }

    res.json({
      success: true,
      message: 'Default task deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /project-types/:id/tasks/:taskId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
