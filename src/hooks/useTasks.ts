import { useState, useEffect } from 'react';
import { TasksApiService, Task, TaskBoard, TaskStatistics, TaskNotification, TaskTemplate } from '../services/tasksApi';
import { ApiService } from '../services/api';

// Hook principal pour la gestion des tâches
export const useTasks = (projectId: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    // Check authentication first
    const token = ApiService.getAuthToken();
    const currentUser = ApiService.getCurrentUser();

    if (!token || !currentUser || !projectId) {
      console.log('🔒 No authentication or project ID, using demo tasks');
      setTasks(TasksApiService.getDemoTasks(projectId));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const projectTasks = await TasksApiService.getProjectTasks(projectId);
      console.log('📋 Loaded tasks with time tracking:', projectTasks.map(t => ({
        id: t.id,
        title: t.title,
        timeTracking: t.timeTracking
      })));
      setTasks(projectTasks);
    } catch (err) {
      console.error('Erreur lors du chargement des tâches:', err);
      // Fallback to demo data on error
      console.log('📊 API failed, falling back to demo tasks');
      setTasks(TasksApiService.getDemoTasks(projectId));
      setError(null); // Don't show error, just use demo data
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const createTask = async (taskData: Partial<Task>) => {
    const token = ApiService.getAuthToken();
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    const result = await TasksApiService.createTask({
      ...taskData,
      projectId
    });
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const token = ApiService.getAuthToken();
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    const result = await TasksApiService.updateTask(taskId, updates);
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  const deleteTask = async (taskId: string) => {
    const result = await TasksApiService.deleteTask(taskId);
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  const addComment = async (taskId: string, commentData: {
    author: string;
    authorRole: 'client' | 'admin' | 'developer';
    content: string;
    attachments?: { name: string; type: string; url: string; }[];
  }) => {
    const result = await TasksApiService.addComment(taskId, commentData);
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  const startTimeTracking = async (taskId: string, userId: string, description?: string) => {
    const result = await TasksApiService.startTimeTracking(taskId, userId, description);
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  const stopTimeTracking = async (taskId: string, userId: string) => {
    const result = await TasksApiService.stopTimeTracking(taskId, userId);
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  const addChecklistItem = async (taskId: string, title: string) => {
    const result = await TasksApiService.addChecklistItem(taskId, title);
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  const toggleChecklistItem = async (taskId: string, itemId: string) => {
    const result = await TasksApiService.toggleChecklistItem(taskId, itemId);
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  const duplicateTask = async (taskId: string) => {
    const result = await TasksApiService.duplicateTask(taskId);
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  const bulkUpdateTasks = async (taskIds: string[], updates: Partial<Task>) => {
    const result = await TasksApiService.bulkUpdateTasks(taskIds, updates);
    if (result.success) {
      await loadTasks();
    }
    return result;
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    startTimeTracking,
    stopTimeTracking,
    addChecklistItem,
    toggleChecklistItem,
    duplicateTask,
    bulkUpdateTasks,
    refreshTasks: loadTasks
  };
};

// Hook pour la gestion des tableaux de tâches
export const useTaskBoard = (projectId: string) => {
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBoard = async () => {
    setLoading(true);
    try {
      const projectBoard = await TasksApiService.getProjectBoard(projectId);
      if (!projectBoard) {
        // Create default board if none exists
        const result = await TasksApiService.createTaskBoard(projectId, {});
        if (result.success) {
          setBoard(result.board!);
        }
      } else {
        setBoard(projectBoard);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du tableau:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      loadBoard();
    }
  }, [projectId]);

  const updateBoard = async (boardData: Partial<TaskBoard>) => {
    if (!board) return { success: false, error: 'Aucun tableau trouvé' };
    
    const updatedBoard = { ...board, ...boardData };
    // In a real app, this would call an API
    setBoard(updatedBoard);
    return { success: true, board: updatedBoard };
  };

  return {
    board,
    loading,
    updateBoard,
    refreshBoard: loadBoard
  };
};

// Hook pour les statistiques des tâches
export const useTaskStatistics = (projectId: string) => {
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const stats = await TasksApiService.getTaskStatistics(projectId);
      setStatistics(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      loadStatistics();
    }
  }, [projectId]);

  return {
    statistics,
    loading,
    refreshStatistics: loadStatistics
  };
};

// Hook pour les notifications
export const useTaskNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const userNotifications = await TasksApiService.getUserNotifications(userId);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    await TasksApiService.markNotificationAsRead(notificationId);
    await loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    refreshNotifications: loadNotifications
  };
};

// Hook pour les templates de tâches
export const useTaskTemplates = () => {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await TasksApiService.getTaskTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const createTemplate = async (templateData: Partial<TaskTemplate>) => {
    const result = await TasksApiService.createTaskTemplate(templateData);
    if (result.success) {
      await loadTemplates();
    }
    return result;
  };

  const applyTemplate = async (projectId: string, templateId: string) => {
    const result = await TasksApiService.applyTemplate(projectId, templateId);
    return result;
  };

  return {
    templates,
    loading,
    createTemplate,
    applyTemplate,
    refreshTemplates: loadTemplates
  };
};

// Hook pour le suivi du temps en temps réel
export const useTimeTracking = (taskId: string, userId: string, task?: Task) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Initialize from task data if active tracking exists
  useEffect(() => {
    if (task && task.timeTracking && Array.isArray(task.timeTracking)) {
      const activeEntry = task.timeTracking.find(
        (entry: any) => String(entry.userId) === String(userId) && !entry.endTime
      );

      if (activeEntry) {
        console.log('🔄 Restoring active time tracking:', {
          taskId: task.id,
          userId,
          entryUserId: activeEntry.userId,
          startTime: activeEntry.startTime,
          elapsed: Math.round((new Date().getTime() - new Date(activeEntry.startTime).getTime()) / 1000)
        });
        setIsTracking(true);
        setStartTime(new Date(activeEntry.startTime));
        const elapsed = Math.round((new Date().getTime() - new Date(activeEntry.startTime).getTime()) / 1000);
        setCurrentDuration(elapsed);
      } else {
        // No active tracking found, reset state
        console.log('❌ No active tracking found. Time tracking data:', task.timeTracking);
        setIsTracking(false);
        setStartTime(null);
        setCurrentDuration(0);
      }
    } else {
      // No time tracking data, reset state
      setIsTracking(false);
      setStartTime(null);
      setCurrentDuration(0);
    }
  }, [task, userId, task?.timeTracking]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTracking && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.round((now.getTime() - startTime.getTime()) / 1000); // en secondes
        setCurrentDuration(duration);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTracking, startTime]);

  const startTracking = async (description?: string) => {
    console.log('▶️ Starting time tracking:', { taskId, userId, description });
    const result = await TasksApiService.startTimeTracking(taskId, userId, description);
    if (result.success) {
      console.log('✅ Time tracking started successfully');
      setIsTracking(true);
      setStartTime(new Date());
      setCurrentDuration(0);
    } else {
      console.error('❌ Failed to start time tracking:', result.error);
    }
    return result;
  };

  const stopTracking = async () => {
    console.log('⏸️ Stopping time tracking:', { taskId, userId });
    const result = await TasksApiService.stopTimeTracking(taskId, userId);
    if (result.success) {
      console.log('✅ Time tracking stopped successfully. Duration:', result.duration);
      setIsTracking(false);
      setStartTime(null);
      setCurrentDuration(0);
    } else {
      console.error('❌ Failed to stop time tracking:', result.error);
    }
    return result;
  };

  return {
    isTracking,
    currentDuration,
    startTracking,
    stopTracking
  };
};

// Initialisation des données de démonstration pour les tâches
export const initializeDemoTasks = () => {
  const existingTasks = localStorage.getItem('tasks');
  if (!existingTasks || JSON.parse(existingTasks).length === 0) {
    const demoTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Conception de la base de données',
        description: 'Créer le schéma de base de données pour le système e-commerce avec toutes les tables nécessaires',
        status: 'done',
        priority: 'high',
        assignedTo: 'Alex Dev',
        dueDate: new Date('2024-01-25'),
        projectId: 'project-1',
        clientId: 'client-1',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-24'),
        tags: ['backend', 'database', 'architecture'],
        estimatedHours: 16,
        actualHours: 14,
        completionPercentage: 100,
        dependencies: [],
        attachments: [
          {
            id: 'att-1',
            name: 'schema-database.sql',
            type: 'application/sql',
            url: '#',
            uploadedAt: new Date('2024-01-22'),
            uploadedBy: 'Alex Dev'
          }
        ],
        comments: [
          {
            id: 'comment-1',
            author: 'Alex Dev',
            authorRole: 'developer',
            content: 'Schéma de base terminé, en attente de validation du client',
            timestamp: new Date('2024-01-24'),
            attachments: []
          },
          {
            id: 'comment-2',
            author: 'Marie Dupont',
            authorRole: 'client',
            content: 'Parfait ! Le schéma correspond exactement à nos besoins.',
            timestamp: new Date('2024-01-24'),
            attachments: []
          }
        ],
        watchers: ['Alex Dev', 'client-1'],
        labels: [
          { id: 'label-1', name: 'Backend', color: '#3b82f6' },
          { id: 'label-2', name: 'Critique', color: '#ef4444' }
        ],
        checklist: [
          { id: 'check-1', title: 'Créer les tables utilisateurs', completed: true, createdAt: new Date('2024-01-20') },
          { id: 'check-2', title: 'Créer les tables produits', completed: true, createdAt: new Date('2024-01-20') },
          { id: 'check-3', title: 'Créer les tables commandes', completed: true, createdAt: new Date('2024-01-20') },
          { id: 'check-4', title: 'Définir les relations', completed: true, createdAt: new Date('2024-01-20') }
        ],
        timeTracking: [
          {
            id: 'time-1',
            userId: 'Alex Dev',
            startTime: new Date('2024-01-20T09:00:00'),
            endTime: new Date('2024-01-20T17:00:00'),
            duration: 480,
            description: 'Conception initiale du schéma'
          },
          {
            id: 'time-2',
            userId: 'Alex Dev',
            startTime: new Date('2024-01-22T09:00:00'),
            endTime: new Date('2024-01-22T15:00:00'),
            duration: 360,
            description: 'Optimisation et finalisation'
          }
        ],
        history: [
          {
            id: 'hist-1',
            action: 'created',
            userId: 'admin',
            userName: 'Admin',
            timestamp: new Date('2024-01-20'),
            details: 'Tâche créée'
          },
          {
            id: 'hist-2',
            action: 'moved',
            userId: 'Alex Dev',
            userName: 'Alex Dev',
            timestamp: new Date('2024-01-22'),
            details: 'Statut changé de "todo" à "in_progress"'
          },
          {
            id: 'hist-3',
            action: 'completed',
            userId: 'Alex Dev',
            userName: 'Alex Dev',
            timestamp: new Date('2024-01-24'),
            details: 'Tâche marquée comme terminée'
          }
        ]
      },
      {
        id: 'task-2',
        title: 'Interface utilisateur - Page produits',
        description: 'Développer l\'interface pour l\'affichage des produits avec filtres, recherche et pagination',
        status: 'in_progress',
        priority: 'high',
        assignedTo: 'Sarah UI',
        dueDate: new Date('2024-02-05'),
        projectId: 'project-1',
        clientId: 'client-1',
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date(),
        tags: ['frontend', 'ui', 'react', 'responsive'],
        estimatedHours: 24,
        actualHours: 18,
        completionPercentage: 75,
        dependencies: ['task-1'],
        attachments: [
          {
            id: 'att-2',
            name: 'maquette-produits.figma',
            type: 'application/figma',
            url: '#',
            uploadedAt: new Date('2024-01-26'),
            uploadedBy: 'Sarah UI'
          }
        ],
        comments: [
          {
            id: 'comment-3',
            author: 'Sarah UI',
            authorRole: 'developer',
            content: 'Maquettes validées, développement en cours. Les filtres sont presque terminés.',
            timestamp: new Date('2024-01-28'),
            attachments: []
          },
          {
            id: 'comment-4',
            author: 'Marie Dupont',
            authorRole: 'client',
            content: 'Excellent travail ! Pouvez-vous ajouter un filtre par prix ?',
            timestamp: new Date(),
            attachments: []
          },
          {
            id: 'comment-5',
            author: 'Sarah UI',
            authorRole: 'developer',
            content: 'Bien sûr ! Je l\'ajoute à la checklist.',
            timestamp: new Date(),
            attachments: []
          }
        ],
        watchers: ['Sarah UI', 'client-1', 'Alex Dev'],
        labels: [
          { id: 'label-3', name: 'Frontend', color: '#10b981' },
          { id: 'label-4', name: 'UI/UX', color: '#8b5cf6' }
        ],
        checklist: [
          { id: 'check-5', title: 'Créer la grille de produits', completed: true, createdAt: new Date('2024-01-25') },
          { id: 'check-6', title: 'Implémenter la recherche', completed: true, createdAt: new Date('2024-01-25') },
          { id: 'check-7', title: 'Ajouter les filtres par catégorie', completed: true, createdAt: new Date('2024-01-25') },
          { id: 'check-8', title: 'Ajouter le filtre par prix', completed: false, createdAt: new Date() },
          { id: 'check-9', title: 'Implémenter la pagination', completed: false, createdAt: new Date('2024-01-25') },
          { id: 'check-10', title: 'Tests responsive', completed: false, createdAt: new Date('2024-01-25') }
        ],
        timeTracking: [
          {
            id: 'time-3',
            userId: 'Sarah UI',
            startTime: new Date('2024-01-26T09:00:00'),
            endTime: new Date('2024-01-26T17:00:00'),
            duration: 480,
            description: 'Développement de la grille de produits'
          },
          {
            id: 'time-4',
            userId: 'Sarah UI',
            startTime: new Date('2024-01-29T09:00:00'),
            endTime: new Date('2024-01-29T15:00:00'),
            duration: 360,
            description: 'Implémentation des filtres'
          }
        ],
        history: [
          {
            id: 'hist-4',
            action: 'created',
            userId: 'admin',
            userName: 'Admin',
            timestamp: new Date('2024-01-25'),
            details: 'Tâche créée'
          },
          {
            id: 'hist-5',
            action: 'assigned',
            userId: 'admin',
            userName: 'Admin',
            timestamp: new Date('2024-01-25'),
            details: 'Tâche assignée à Sarah UI'
          },
          {
            id: 'hist-6',
            action: 'moved',
            userId: 'Sarah UI',
            userName: 'Sarah UI',
            timestamp: new Date('2024-01-26'),
            details: 'Statut changé de "todo" à "in_progress"'
          }
        ]
      },
      {
        id: 'task-3',
        title: 'API de paiement Stripe',
        description: 'Intégrer l\'API Stripe pour les paiements sécurisés avec gestion des webhooks',
        status: 'review',
        priority: 'urgent',
        assignedTo: 'Mike Backend',
        dueDate: new Date('2024-02-01'),
        projectId: 'project-1',
        clientId: 'client-1',
        createdAt: new Date('2024-01-28'),
        updatedAt: new Date(),
        tags: ['backend', 'payment', 'api', 'security'],
        estimatedHours: 20,
        actualHours: 22,
        completionPercentage: 90,
        dependencies: ['task-1'],
        attachments: [
          {
            id: 'att-3',
            name: 'stripe-integration-doc.pdf',
            type: 'application/pdf',
            url: '#',
            uploadedAt: new Date('2024-01-30'),
            uploadedBy: 'Mike Backend'
          }
        ],
        comments: [
          {
            id: 'comment-6',
            author: 'Mike Backend',
            authorRole: 'developer',
            content: 'Intégration terminée, tests en cours. Tous les webhooks fonctionnent correctement.',
            timestamp: new Date(),
            attachments: []
          },
          {
            id: 'comment-7',
            author: 'Alex Dev',
            authorRole: 'developer',
            content: 'Excellent travail ! J\'ai testé les paiements, tout fonctionne parfaitement.',
            timestamp: new Date(),
            attachments: []
          }
        ],
        watchers: ['Mike Backend', 'client-1', 'Alex Dev'],
        labels: [
          { id: 'label-5', name: 'Payment', color: '#f59e0b' },
          { id: 'label-6', name: 'Security', color: '#ef4444' }
        ],
        checklist: [
          { id: 'check-11', title: 'Configurer Stripe API', completed: true, createdAt: new Date('2024-01-28') },
          { id: 'check-12', title: 'Créer les endpoints de paiement', completed: true, createdAt: new Date('2024-01-28') },
          { id: 'check-13', title: 'Implémenter les webhooks', completed: true, createdAt: new Date('2024-01-28') },
          { id: 'check-14', title: 'Tests de sécurité', completed: true, createdAt: new Date('2024-01-28') },
          { id: 'check-15', title: 'Documentation API', completed: false, createdAt: new Date('2024-01-28') }
        ],
        timeTracking: [
          {
            id: 'time-5',
            userId: 'Mike Backend',
            startTime: new Date('2024-01-29T09:00:00'),
            endTime: new Date('2024-01-29T18:00:00'),
            duration: 540,
            description: 'Intégration Stripe et tests'
          },
          {
            id: 'time-6',
            userId: 'Mike Backend',
            startTime: new Date('2024-01-30T09:00:00'),
            endTime: new Date('2024-01-30T17:00:00'),
            duration: 480,
            description: 'Webhooks et sécurisation'
          }
        ],
        history: [
          {
            id: 'hist-7',
            action: 'created',
            userId: 'admin',
            userName: 'Admin',
            timestamp: new Date('2024-01-28'),
            details: 'Tâche créée avec priorité urgente'
          },
          {
            id: 'hist-8',
            action: 'moved',
            userId: 'Mike Backend',
            userName: 'Mike Backend',
            timestamp: new Date('2024-01-29'),
            details: 'Statut changé de "todo" à "in_progress"'
          },
          {
            id: 'hist-9',
            action: 'moved',
            userId: 'Mike Backend',
            userName: 'Mike Backend',
            timestamp: new Date(),
            details: 'Statut changé de "in_progress" à "review"'
          }
        ]
      },
      {
        id: 'task-4',
        title: 'Tests automatisés',
        description: 'Mettre en place les tests unitaires et d\'intégration pour l\'ensemble de l\'application',
        status: 'todo',
        priority: 'medium',
        assignedTo: 'Tom QA',
        dueDate: new Date('2024-02-10'),
        projectId: 'project-1',
        clientId: 'client-1',
        createdAt: new Date('2024-01-30'),
        updatedAt: new Date(),
        tags: ['testing', 'qa', 'automation'],
        estimatedHours: 32,
        actualHours: 0,
        completionPercentage: 0,
        dependencies: ['task-2', 'task-3'],
        attachments: [],
        comments: [
          {
            id: 'comment-8',
            author: 'Tom QA',
            authorRole: 'developer',
            content: 'En attente de la finalisation des autres tâches pour commencer les tests.',
            timestamp: new Date(),
            attachments: []
          }
        ],
        watchers: ['Tom QA', 'Alex Dev'],
        labels: [
          { id: 'label-7', name: 'Testing', color: '#6b7280' },
          { id: 'label-8', name: 'QA', color: '#8b5cf6' }
        ],
        checklist: [
          { id: 'check-16', title: 'Configurer Jest et Testing Library', completed: false, createdAt: new Date('2024-01-30') },
          { id: 'check-17', title: 'Tests unitaires composants', completed: false, createdAt: new Date('2024-01-30') },
          { id: 'check-18', title: 'Tests d\'intégration API', completed: false, createdAt: new Date('2024-01-30') },
          { id: 'check-19', title: 'Tests end-to-end', completed: false, createdAt: new Date('2024-01-30') },
          { id: 'check-20', title: 'Rapport de couverture', completed: false, createdAt: new Date('2024-01-30') }
        ],
        timeTracking: [],
        history: [
          {
            id: 'hist-10',
            action: 'created',
            userId: 'admin',
            userName: 'Admin',
            timestamp: new Date('2024-01-30'),
            details: 'Tâche créée'
          },
          {
            id: 'hist-11',
            action: 'assigned',
            userId: 'admin',
            userName: 'Admin',
            timestamp: new Date('2024-01-30'),
            details: 'Tâche assignée à Tom QA'
          }
        ]
      },
      {
        id: 'task-5',
        title: 'Optimisation SEO',
        description: 'Optimiser le référencement naturel du site avec meta tags, sitemap et structured data',
        status: 'todo',
        priority: 'low',
        dueDate: new Date('2024-02-15'),
        projectId: 'project-1',
        clientId: 'client-1',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date(),
        tags: ['seo', 'frontend', 'marketing'],
        estimatedHours: 12,
        actualHours: 0,
        completionPercentage: 0,
        dependencies: ['task-2'],
        attachments: [],
        comments: [],
        watchers: ['client-1'],
        labels: [
          { id: 'label-9', name: 'SEO', color: '#10b981' },
          { id: 'label-10', name: 'Marketing', color: '#f59e0b' }
        ],
        checklist: [
          { id: 'check-21', title: 'Audit SEO initial', completed: false, createdAt: new Date('2024-02-01') },
          { id: 'check-22', title: 'Optimiser les meta tags', completed: false, createdAt: new Date('2024-02-01') },
          { id: 'check-23', title: 'Créer le sitemap', completed: false, createdAt: new Date('2024-02-01') },
          { id: 'check-24', title: 'Structured data', completed: false, createdAt: new Date('2024-02-01') },
          { id: 'check-25', title: 'Optimiser les images', completed: false, createdAt: new Date('2024-02-01') }
        ],
        timeTracking: [],
        history: [
          {
            id: 'hist-12',
            action: 'created',
            userId: 'admin',
            userName: 'Admin',
            timestamp: new Date('2024-02-01'),
            details: 'Tâche créée'
          }
        ]
      }
    ];

    localStorage.setItem('tasks', JSON.stringify(demoTasks));

    // Créer des templates de démonstration
    const demoTemplates: TaskTemplate[] = [
      {
        id: 'template-1',
        name: 'Projet E-commerce',
        description: 'Template complet pour un projet e-commerce',
        category: 'web',
        defaultTasks: [
          {
            title: 'Analyse des besoins',
            description: 'Analyser les besoins fonctionnels et techniques',
            priority: 'high',
            estimatedHours: 8,
            tags: ['analysis', 'planning']
          },
          {
            title: 'Conception de la base de données',
            description: 'Créer le schéma de base de données',
            priority: 'high',
            estimatedHours: 16,
            tags: ['backend', 'database']
          },
          {
            title: 'Interface utilisateur',
            description: 'Développer l\'interface utilisateur',
            priority: 'medium',
            estimatedHours: 24,
            tags: ['frontend', 'ui']
          },
          {
            title: 'API Backend',
            description: 'Développer les API backend',
            priority: 'high',
            estimatedHours: 20,
            tags: ['backend', 'api']
          },
          {
            title: 'Intégration paiement',
            description: 'Intégrer le système de paiement',
            priority: 'urgent',
            estimatedHours: 16,
            tags: ['payment', 'security']
          },
          {
            title: 'Tests et déploiement',
            description: 'Tests complets et déploiement',
            priority: 'medium',
            estimatedHours: 12,
            tags: ['testing', 'deployment']
          }
        ]
      },
      {
        id: 'template-2',
        name: 'Application Mobile',
        description: 'Template pour une application mobile',
        category: 'mobile',
        defaultTasks: [
          {
            title: 'Wireframes et maquettes',
            description: 'Créer les wireframes et maquettes UI',
            priority: 'high',
            estimatedHours: 12,
            tags: ['design', 'ui']
          },
          {
            title: 'Configuration du projet',
            description: 'Configurer React Native et les dépendances',
            priority: 'high',
            estimatedHours: 4,
            tags: ['setup', 'react-native']
          },
          {
            title: 'Navigation',
            description: 'Implémenter la navigation entre écrans',
            priority: 'medium',
            estimatedHours: 8,
            tags: ['navigation', 'frontend']
          },
          {
            title: 'API Integration',
            description: 'Intégrer les API backend',
            priority: 'high',
            estimatedHours: 16,
            tags: ['api', 'integration']
          },
          {
            title: 'Tests sur appareils',
            description: 'Tests sur iOS et Android',
            priority: 'medium',
            estimatedHours: 8,
            tags: ['testing', 'mobile']
          }
        ]
      }
    ];

    localStorage.setItem('taskTemplates', JSON.stringify(demoTemplates));

    // Créer des tableaux de démonstration
    const demoBoards: TaskBoard[] = [
      {
        id: 'board-1',
        projectId: 'project-1',
        name: 'Tableau E-commerce',
        description: 'Suivi du projet e-commerce',
        columns: [
          { id: 'todo', name: 'À faire', position: 0, color: '#6b7280', wipLimit: 5 },
          { id: 'in_progress', name: 'En cours', position: 1, color: '#3b82f6', wipLimit: 3 },
          { id: 'review', name: 'En révision', position: 2, color: '#f59e0b', wipLimit: 2 },
          { id: 'done', name: 'Terminé', position: 3, color: '#10b981' }
        ],
        settings: {
          allowClientComments: true,
          allowClientStatusChange: false,
          showTimeTracking: true,
          showEstimates: true,
          emailNotifications: true
        }
      }
    ];

    localStorage.setItem('taskBoards', JSON.stringify(demoBoards));
  }
};

// Export des interfaces pour utilisation dans d'autres composants
export type { Task, TaskBoard, TaskStatistics, TaskNotification, TaskTemplate };