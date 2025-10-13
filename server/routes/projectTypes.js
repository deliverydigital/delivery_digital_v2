import express from 'express';
import { authenticate } from '../middleware/auth.js';
import ProjectType from '../models/ProjectType.js';

const router = express.Router();

// Get all project types with their default tasks (public - read-only)
router.get('/', async (req, res) => {
  try {
    const projectTypes = await ProjectType.find()
      .sort({ createdAt: 1 })
      .lean();

    // Sort default tasks by orderIndex
    const sortedProjectTypes = projectTypes.map(type => ({
      ...type,
      defaultTasks: (type.defaultTasks || []).sort((a, b) => a.orderIndex - b.orderIndex)
    }));

    res.json({
      success: true,
      data: sortedProjectTypes
    });
  } catch (error) {
    console.error('Error in GET /project-types:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project types'
    });
  }
});

// Get a single project type by ID (public - read-only)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const projectType = await ProjectType.findById(id).lean();

    if (!projectType) {
      return res.status(404).json({
        success: false,
        error: 'Project type not found'
      });
    }

    // Sort default tasks by orderIndex
    projectType.defaultTasks = (projectType.defaultTasks || []).sort((a, b) => a.orderIndex - b.orderIndex);

    res.json({
      success: true,
      data: projectType
    });
  } catch (error) {
    console.error('Error in GET /project-types/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project type'
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

    // Check if project type already exists
    const existingType = await ProjectType.findOne({ name: name.trim() });
    if (existingType) {
      return res.status(400).json({
        success: false,
        error: 'Project type name already exists'
      });
    }

    const projectType = new ProjectType({
      name: name.trim(),
      description: description?.trim() || ''
    });

    await projectType.save();

    res.status(201).json({
      success: true,
      data: projectType
    });
  } catch (error) {
    console.error('Error in POST /project-types:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create project type'
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

    // Check if another project type has this name
    const existingType = await ProjectType.findOne({
      name: name.trim(),
      _id: { $ne: id }
    });

    if (existingType) {
      return res.status(400).json({
        success: false,
        error: 'Project type name already exists'
      });
    }

    const projectType = await ProjectType.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim() || ''
      },
      { new: true, runValidators: true }
    );

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
      error: error.message || 'Failed to update project type'
    });
  }
});

// Delete a project type
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const projectType = await ProjectType.findByIdAndDelete(id);

    if (!projectType) {
      return res.status(404).json({
        success: false,
        error: 'Project type not found'
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
      error: error.message || 'Failed to delete project type'
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

    const projectType = await ProjectType.findById(id);

    if (!projectType) {
      return res.status(404).json({
        success: false,
        error: 'Project type not found'
      });
    }

    const newTask = {
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      estimatedHours: estimatedHours || 0,
      orderIndex: orderIndex !== undefined ? orderIndex : (projectType.defaultTasks?.length || 0)
    };

    projectType.defaultTasks.push(newTask);
    await projectType.save();

    // Get the newly created task
    const createdTask = projectType.defaultTasks[projectType.defaultTasks.length - 1];

    res.status(201).json({
      success: true,
      data: createdTask
    });
  } catch (error) {
    console.error('Error in POST /project-types/:id/tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create default task'
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

    const projectType = await ProjectType.findById(id);

    if (!projectType) {
      return res.status(404).json({
        success: false,
        error: 'Project type not found'
      });
    }

    const task = projectType.defaultTasks.id(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Default task not found'
      });
    }

    task.title = title.trim();
    task.description = description?.trim() || '';
    task.priority = priority || 'medium';
    task.estimatedHours = estimatedHours || 0;
    if (orderIndex !== undefined) {
      task.orderIndex = orderIndex;
    }

    await projectType.save();

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error in PUT /project-types/:id/tasks/:taskId:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update default task'
    });
  }
});

// Delete a default task
router.delete('/:id/tasks/:taskId', authenticate, async (req, res) => {
  try {
    const { id, taskId } = req.params;

    const projectType = await ProjectType.findById(id);

    if (!projectType) {
      return res.status(404).json({
        success: false,
        error: 'Project type not found'
      });
    }

    const task = projectType.defaultTasks.id(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Default task not found'
      });
    }

    task.deleteOne();
    await projectType.save();

    res.json({
      success: true,
      message: 'Default task deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /project-types/:id/tasks/:taskId:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete default task'
    });
  }
});

export default router;
