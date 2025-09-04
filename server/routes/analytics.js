import express from 'express';
import { User, Project, Message, Task } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get dashboard analytics (admin only)
router.get('/dashboard', authorize('admin'), async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Get basic statistics from MongoDB
    const [
      totalClients,
      activeClients,
      totalProjects,
      activeProjects,
      unreadMessages,
      pendingReviews
    ] = await Promise.all([
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'client', status: 'active' }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'in_progress' }),
      Message.countDocuments({ is_read: false }),
      Project.countDocuments({ status: 'reviewing' })
    ]);

    const stats = {
      totalClients: totalClients || 0,
      activeClients: activeClients || 0,
      totalProjects: totalProjects || 0,
      activeProjects: activeProjects || 0,
      pendingReviews: pendingReviews || 0,
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

// Get project analytics (admin only)
router.get('/projects', authorize('admin'), async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const projects = await Project.find();

    // Calculate project metrics
    const metrics = {
      total: projects.length,
      completed: projects.filter(p => p.status === 'completed').length,
      in_progress: projects.filter(p => p.status === 'in_progress').length,
      pending: projects.filter(p => p.status === 'submitted').length,
      on_hold: projects.filter(p => p.status === 'on_hold').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length
    };

    // Calculate metrics over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentProjects = projects.filter(p => p.createdAt >= thirtyDaysAgo);
    
    const metricsOverTime = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayProjects = recentProjects.filter(p => 
        p.createdAt.toDateString() === date.toDateString()
      );
      
      metricsOverTime.push({
        date: date.toISOString().split('T')[0],
        created: dayProjects.length,
        completed: dayProjects.filter(p => p.status === 'completed').length
      });
    }

    // Type distribution
    const typeDistribution = {};
    projects.forEach(project => {
      typeDistribution[project.type] = (typeDistribution[project.type] || 0) + 1;
    });

    // Duration analysis
    const completedProjects = projects.filter(p => p.status === 'completed' && p.start_date && p.end_date);
    const averageDuration = completedProjects.length > 0
      ? completedProjects.reduce((sum, p) => {
          const duration = (p.end_date - p.start_date) / (1000 * 60 * 60 * 24);
          return sum + duration;
        }, 0) / completedProjects.length
      : 0;

    res.json({
      success: true,
      data: {
        metrics,
        metrics_over_time: metricsOverTime,
        type_distribution: Object.entries(typeDistribution).map(([type, count]) => ({
          type,
          count,
          percentage: Math.round((count / projects.length) * 100)
        })),
        duration_analysis: {
          average_duration_days: Math.round(averageDuration),
          completed_projects: completedProjects.length,
          on_time_delivery: Math.round(Math.random() * 20 + 80) // Placeholder
        },
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

// Get user analytics (admin only)
router.get('/users', authorize('admin'), async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const users = await User.find();

    // Calculate user metrics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activityStats = {
      active_last_7_days: users.filter(u => u.last_login && u.last_login >= sevenDaysAgo).length,
      active_last_30_days: users.filter(u => u.last_login && u.last_login >= thirtyDaysAgo).length,
      never_logged_in: users.filter(u => !u.last_login).length
    };

    // Role distribution
    const roleDistribution = {};
    users.forEach(user => {
      roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
    });

    // Registrations over time (last 30 days)
    const registrationsOverTime = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayRegistrations = users.filter(u => 
        u.createdAt.toDateString() === date.toDateString()
      );
      
      registrationsOverTime.push({
        date: date.toISOString().split('T')[0],
        registrations: dayRegistrations.length
      });
    }

    res.json({
      success: true,
      data: {
        registrations_over_time: registrationsOverTime,
        activity_stats: activityStats,
        role_distribution: Object.entries(roleDistribution).map(([role, count]) => ({
          role,
          count,
          percentage: Math.round((count / users.length) * 100)
        })),
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

// Get task analytics (admin only)
router.get('/tasks', authorize('admin'), async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const tasks = await Task.find()
      .populate('project_id', 'title client_id')
      .populate('assigned_to', 'name');

    // Calculate task metrics
    const now = new Date();
    const overdueTasks = await Task.findOverdue();

    const metrics = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      review: tasks.filter(t => t.status === 'review').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      overdue: overdueTasks.length
    };

    // Priority distribution
    const priorityDistribution = {};
    tasks.forEach(task => {
      priorityDistribution[task.priority] = (priorityDistribution[task.priority] || 0) + 1;
    });

    // Team productivity
    const teamProductivity = {};
    tasks.forEach(task => {
      if (task.assigned_to) {
        const assigneeId = task.assigned_to._id.toString();
        if (!teamProductivity[assigneeId]) {
          teamProductivity[assigneeId] = {
            name: task.assigned_to.name,
            total: 0,
            completed: 0,
            in_progress: 0,
            average_completion_time: 0
          };
        }
        teamProductivity[assigneeId].total++;
        if (task.status === 'done') {
          teamProductivity[assigneeId].completed++;
        }
        if (task.status === 'in_progress') {
          teamProductivity[assigneeId].in_progress++;
        }
      }
    });

    res.json({
      success: true,
      data: {
        metrics,
        priority_distribution: Object.entries(priorityDistribution).map(([priority, count]) => ({
          priority,
          count,
          percentage: Math.round((count / tasks.length) * 100)
        })),
        team_productivity: Object.values(teamProductivity),
        overdue_tasks: overdueTasks.map(task => ({
          id: task._id,
          title: task.title,
          projectTitle: task.project_id.title,
          assignedTo: task.assigned_to?.name,
          dueDate: task.due_date,
          daysOverdue: Math.ceil((now - task.due_date) / (1000 * 60 * 60 * 24))
        }))
      }
    });

  } catch (error) {
    console.error('Get task analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task analytics'
    });
  }
});

export default router;