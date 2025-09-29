import express from 'express';
import { Category } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Get all categories (public)
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, active_only = 'true' } = req.query;
    const skip = (page - 1) * limit;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      // Return fallback categories when MongoDB is not available
      const fallbackCategories = [
        { id: 'web', name: 'Développement Web', slug: 'web', color: '#3b82f6', icon: 'code', order: 1 },
        { id: 'design', name: 'Design & Création', slug: 'design', color: '#8b5cf6', icon: 'palette', order: 2 },
        { id: 'office', name: 'Bureautique', slug: 'office', color: '#10b981', icon: 'file-text', order: 3 },
        { id: 'languages', name: 'Langues', slug: 'languages', color: '#f59e0b', icon: 'globe', order: 4 },
        { id: 'safety', name: 'Sécurité & Hygiène', slug: 'safety', color: '#ef4444', icon: 'shield', order: 5 },
        { id: 'management', name: 'Management', slug: 'management', color: '#6366f1', icon: 'users', order: 6 },
        { id: 'business', name: 'Commerce & Vente', slug: 'business', color: '#ec4899', icon: 'briefcase', order: 7 },
        { id: 'health', name: 'Santé & Nutrition', slug: 'health', color: '#14b8a6', icon: 'heart', order: 8 }
      ];
      
      return res.json({
        success: true,
        data: {
          categories: fallbackCategories,
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_items: fallbackCategories.length,
            items_per_page: fallbackCategories.length
          }
        }
      });
    }

    // Build query
    const query = {};
    
    if (active_only === 'true') {
      query.is_active = true;
    }

    const categories = await Category.find(query)
      .sort({ order: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Category.countDocuments(query);

    res.json({
      success: true,
      data: {
        categories: categories.map(category => ({
          id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          color: category.color,
          icon: category.icon,
          is_active: category.is_active,
          order: category.order,
          created_at: category.createdAt,
          updated_at: category.updatedAt
        })),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// Create new category (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, color, icon, order } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }

    const categoryData = {
      name,
      description,
      color: color || '#3b82f6',
      icon: icon || 'folder',
      order: order || 0,
      is_active: true
    };

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { 
        category: {
          id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          color: category.color,
          icon: category.icon,
          is_active: category.is_active,
          order: category.order,
          created_at: category.createdAt,
          updated_at: category.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Create category error:', error);
    
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
      error: 'Failed to create category'
    });
  }
});

// Update category (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
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

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Update allowed fields
    const allowedFields = ['name', 'description', 'color', 'icon', 'order', 'is_active'];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        category[key] = value;
      }
    }

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { 
        category: {
          id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          color: category.color,
          icon: category.icon,
          is_active: category.is_active,
          order: category.order,
          created_at: category.createdAt,
          updated_at: category.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
});

export default router;