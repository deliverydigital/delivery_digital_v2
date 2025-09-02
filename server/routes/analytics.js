import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get dashboard analytics (admin only)
router.get('/dashboard', authorize('admin'), async (req, res) => {
  try {
    // Get basic statistics from Supabase
    const [
      { count: totalClients },
      { count: activeClients },
      { count: totalProjects },
      { count: activeProjects },
      { count: unreadMessages }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client').eq('status', 'active'),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('is_read', false)
    ]);

    const stats = {
      totalClients: totalClients || 0,
      activeClients: activeClients || 0,
      totalProjects: totalProjects || 0,
      activeProjects: activeProjects || 0,
      pendingReviews: 0, // Would need to be calculated based on project status
      unreadMessages: unreadMessages || 0
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics'
    });
  }
});

// Get project analytics
router.get('/projects', authorize('admin'), async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*');

    if (error) throw error;

    // Calculate basic project metrics
    const metrics = {
      total: projects?.length || 0,
      completed: projects?.filter(p => p.status === 'completed').length || 0,
      in_progress: projects?.filter(p => p.status === 'in_progress').length || 0,
      pending: projects?.filter(p => p.status === 'submitted').length || 0
    };

    res.json({
      success: true,
      data: {
        metrics_over_time: [],
        type_distribution: [],
        duration_analysis: {},
        period: 30
      }
    });

  } catch (error) {
    console.error('Get project analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project analytics'
    });
  }
});

// Get user analytics
router.get('/users', authorize('admin'), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    res.json({
      success: true,
      data: {
        registrations_over_time: [],
        activity_stats: {
          active_last_7_days: 0,
          active_last_30_days: 0,
          never_logged_in: 0
        },
        role_distribution: [],
        period: 30
      }
    });

  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics'
    });
  }
});

export default router;