// API Service pour la gestion des tâches (système Trello-like)

// Get API base URL from environment
const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || '';
};

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: Date;
  projectId: string;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage: number;
  dependencies: string[]; // IDs des tâches dont celle-ci dépend
  attachments: {
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: Date;
    uploadedBy: string;
  }[];
  comments: {
    id: string;
    author: string;
    authorRole: 'client' | 'admin' | 'developer';
    content: string;
    timestamp: Date;
    edited?: boolean;
    editedAt?: Date;
    attachments?: {
      name: string;
      type: string;
      url: string;
    }[];
  }[];
  watchers: string[]; // IDs des utilisateurs qui suivent cette tâche
  labels: {
    id: string;
    name: string;
    color: string;
  }[];
  checklist: {
    id: string;
    title: string;
    completed: boolean;
    createdAt: Date;
  }[];
  timeTracking: {
    id: string;
    userId: string;
    startTime: Date;
    endTime?: Date;
    duration: number; // en minutes
    description: string;
  }[];
  history: {
    id: string;
    action: 'created' | 'updated' | 'moved' | 'assigned' | 'commented' | 'completed';
    userId: string;
    userName: string;
    timestamp: Date;
    details: string;
    oldValue?: any;
    newValue?: any;
  }[];
}

export interface TaskBoard {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  columns: {
    id: string;
    name: string;
    position: number;
    color: string;
    wipLimit?: number; // Work In Progress limit
  }[];
  settings: {
    allowClientComments: boolean;
    allowClientStatusChange: boolean;
    showTimeTracking: boolean;
    showEstimates: boolean;
    emailNotifications: boolean;
  };
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  defaultTasks: Partial<Task>[];
  category: string;
}

export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksInProgress: number;
  averageCompletionTime: number; // en heures
  burndownData: {
    date: Date;
    remainingTasks: number;
    completedTasks: number;
  }[];
  velocityData: {
    sprint: string;
    completedStoryPoints: number;
    plannedStoryPoints: number;
  }[];
  teamProductivity: {
    userId: string;
    userName: string;
    tasksCompleted: number;
    averageTaskTime: number;
    efficiency: number;
  }[];
}

export interface TaskNotification {
  id: string;
  userId: string;
  taskId: string;
  type: 'assignment' | 'comment' | 'status_change' | 'due_date' | 'mention';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

// Helper function to make API requests
const makeRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem('authToken');
  const baseUrl = getApiBaseUrl();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
    'bypass-tunnel-reminder': 'true'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/api${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// API Service pour les tâches
export class TasksApiService {
  // CRUD Operations for Tasks
  static async createTask(taskData: Partial<Task>): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const response = await makeRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          project_id: taskData.projectId,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority || 'medium',
          assigned_to: taskData.assignedTo,
          due_date: taskData.dueDate?.toISOString(),
          estimated_hours: taskData.estimatedHours,
          tags: taskData.tags?.join(',')
        }),
      });

      if (response.success) {
        return { success: true, task: this.transformTaskFromAPI(response.data.task) };
      }
      
      return { success: false, error: 'Failed to create task' };
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error);
      return { success: false, error: error.message || 'Erreur lors de la création de la tâche' };
    }
  }

  static async updateTask(taskId: string, updates: Partial<Task>): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const response = await makeRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: updates.title,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          assigned_to: updates.assignedTo,
          due_date: updates.dueDate?.toISOString(),
          estimated_hours: updates.estimatedHours,
          actual_hours: updates.actualHours,
          completion_percentage: updates.completionPercentage,
          tags: updates.tags?.join(','),
          position: updates.position
        }),
      });

      if (response.success) {
        return { success: true, task: this.transformTaskFromAPI(response.data.task) };
      }
      
      return { success: false, error: 'Failed to update task' };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error);
      return { success: false, error: error.message || 'Erreur lors de la mise à jour de la tâche' };
    }
  }

  static async deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await makeRequest(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error);
      return { success: false, error: error.message || 'Erreur lors de la suppression de la tâche' };
    }
  }

  static async getProjectTasks(projectId: string): Promise<Task[]> {
    try {
      const response = await makeRequest(`/tasks/project/${projectId}`);
      
      if (response.success && response.data.tasks) {
        return response.data.tasks.map((task: any) => this.transformTaskFromAPI(task));
      }
      
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
      // Fallback to localStorage for demo
      return this.getFallbackTasks(projectId);
    }
  }

  static async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const response = await makeRequest(`/tasks/${taskId}`);
      
      if (response.success && response.data.task) {
        return this.transformTaskFromAPI(response.data.task);
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors du chargement de la tâche:', error);
      return null;
    }
  }

  // Comments Management
  static async addComment(taskId: string, commentData: {
    author: string;
    authorRole: 'client' | 'admin' | 'developer';
    content: string;
    attachments?: { name: string; type: string; url: string; }[];
  }): Promise<{ success: boolean; comment?: any; error?: string }> {
    try {
      const response = await makeRequest(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: commentData.content
        }),
      });

      if (response.success) {
        return { success: true, comment: response.data.comment };
      }
      
      return { success: false, error: 'Failed to add comment' };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'ajout du commentaire' };
    }
  }

  static async editComment(taskId: string, commentId: string, newContent: string): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      const commentIndex = task.comments.findIndex(c => c.id === commentId);
      if (commentIndex === -1) {
        return { success: false, error: 'Commentaire non trouvé' };
      }

      const updatedComments = [...task.comments];
      updatedComments[commentIndex] = {
        ...updatedComments[commentIndex],
        content: newContent,
        edited: true,
        editedAt: new Date()
      };

      const updatedTask = {
        ...task,
        comments: updatedComments,
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la modification du commentaire:', error);
      return { success: false, error: 'Erreur lors de la modification du commentaire' };
    }
  }

  // Time Tracking
  static async startTimeTracking(taskId: string, userId: string, description: string = ''): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await makeRequest(`/tasks/${taskId}/time-tracking/start`, {
        method: 'POST',
        body: JSON.stringify({ description }),
      });

      if (response.success) {
        return { success: true };
      }

      return { success: false, error: 'Failed to start time tracking' };
    } catch (error) {
      console.error('Erreur lors du démarrage du suivi du temps:', error);
      return { success: false, error: error.message || 'Erreur lors du démarrage du suivi du temps' };
    }
  }

  static async stopTimeTracking(taskId: string, userId: string): Promise<{ success: boolean; duration?: number; error?: string }> {
    try {
      const response = await makeRequest(`/tasks/${taskId}/time-tracking/stop`, {
        method: 'POST',
      });

      if (response.success) {
        return { success: true, duration: response.data.duration };
      }

      return { success: false, error: 'Failed to stop time tracking' };
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du suivi du temps:', error);
      return { success: false, error: 'Erreur lors de l\'arrêt du suivi du temps' };
    }
  }

  // Checklist Management
  static async addChecklistItem(taskId: string, title: string): Promise<{ success: boolean; item?: any; error?: string }> {
    try {
      const response = await makeRequest(`/tasks/${taskId}/checklist`, {
        method: 'POST',
        body: JSON.stringify({
          title: title
        }),
      });

      if (response.success) {
        return { success: true, item: response.data.item };
      }
      
      return { success: false, error: 'Failed to add checklist item' };
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'élément de checklist:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'ajout de l\'élément de checklist' };
    }
  }

  static async toggleChecklistItem(taskId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await makeRequest(`/tasks/checklist/${taskId}/${itemId}`, {
        method: 'PUT',
      });

      if (response.success) {
        return { success: true };
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la modification de l\'élément de checklist:', error);
      return { success: false, error: error.message || 'Erreur lors de la modification de l\'élément de checklist' };
    }
  }

  static async updateChecklistItem(taskId: string, itemId: string, title: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await makeRequest(`/tasks/${taskId}/checklist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      });

      if (response.success) {
        return { success: true };
      }

      return { success: false, error: 'Failed to update checklist item' };
    } catch (error) {
      console.error('Erreur lors de la modification de l\'élément de checklist:', error);
      return { success: false, error: error.message || 'Erreur lors de la modification de l\'élément de checklist' };
    }
  }

  static async deleteChecklistItem(taskId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await makeRequest(`/tasks/${taskId}/checklist/${itemId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        return { success: true };
      }

      return { success: false, error: 'Failed to delete checklist item' };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'élément de checklist:', error);
      return { success: false, error: error.message || 'Erreur lors de la suppression de l\'élément de checklist' };
    }
  }

  // Task Board Management
  static async createTaskBoard(projectId: string, boardData: Partial<TaskBoard>): Promise<{ success: boolean; board?: TaskBoard; error?: string }> {
    try {
      // For now, use localStorage fallback for boards
      return this.createTaskBoardFallback(projectId, boardData);
    } catch (error) {
      console.error('Erreur lors de la création du tableau:', error);
      return { success: false, error: 'Erreur lors de la création du tableau' };
    }
  }

  static async getProjectBoard(projectId: string): Promise<TaskBoard | null> {
    const boards = this.getTaskBoardsFallback();
    return boards.find(board => board.projectId === projectId) || null;
  }

  static async updateTaskBoard(boardId: string, updates: Partial<TaskBoard>): Promise<{ success: boolean; board?: TaskBoard; error?: string }> {
    try {
      const boards = taskStorage.getTaskBoards();
      const boardIndex = boards.findIndex(b => b.id === boardId);
      
      if (boardIndex === -1) {
        return { success: false, error: 'Tableau non trouvé' };
      }
      
      const updatedBoard = {
        ...boards[boardIndex],
        ...updates
      };
      
      taskStorage.saveTaskBoard(updatedBoard);
      return { success: true, board: updatedBoard };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du tableau:', error);
      return { success: false, error: 'Erreur lors de la mise à jour du tableau' };
    }
  }

  // Statistics and Analytics
  static async getTaskStatistics(projectId: string): Promise<TaskStatistics> {
    try {
      const tasks = await this.getProjectTasks(projectId);
      return this.calculateStatistics(tasks);
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return this.getDefaultStatistics();
    }
  }

  // Helper methods for API transformation
  private static transformTaskFromAPI(apiTask: any): Task {
    return {
      id: apiTask.id,
      title: apiTask.title,
      description: apiTask.description || '',
      status: apiTask.status,
      priority: apiTask.priority,
      assignedTo: apiTask.assignedToName,
      dueDate: apiTask.dueDate ? new Date(apiTask.dueDate) : undefined,
      projectId: apiTask.projectId,
      clientId: apiTask.clientId || '',
      createdAt: new Date(apiTask.createdAt),
      updatedAt: new Date(apiTask.updatedAt),
      tags: apiTask.tags || [],
      estimatedHours: apiTask.estimatedHours,
      actualHours: apiTask.actualHours || 0,
      completionPercentage: apiTask.completionPercentage || 0,
      dependencies: apiTask.dependencies || [],
      attachments: (apiTask.attachments || []).map((att: any) => ({
        id: att._id || att.id,
        name: att.original_name || att.name,
        type: att.file_type || att.type,
        url: att.file_path || att.url,
        uploadedAt: new Date(att.uploaded_at || att.uploadedAt),
        uploadedBy: att.uploaded_by || att.uploadedBy
      })),
      comments: (apiTask.comments || []).map((comment: any) => ({
        id: comment._id || comment.id,
        author: comment.authorName || comment.author,
        authorRole: comment.authorRole || 'admin',
        content: comment.content,
        timestamp: new Date(comment.createdAt || comment.timestamp),
        attachments: comment.attachments || []
      })),
      watchers: apiTask.watchers || [],
      labels: apiTask.labels || [],
      checklist: (apiTask.checklist || []).map((item: any) => ({
        id: item._id || item.id,
        title: item.title,
        completed: item.completed,
        createdAt: new Date(item.created_at || item.createdAt)
      })),
      timeTracking: apiTask.timeTracking || [],
      history: apiTask.history || []
    };
  }

  // Fallback methods for localStorage (demo data)
  private static getFallbackTasks(projectId: string): Task[] {
    try {
      const tasks = localStorage.getItem('tasks');
      if (!tasks) return [];
      
      const allTasks = JSON.parse(tasks);
      return allTasks
        .filter((task: any) => task.projectId === projectId)
        .map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          comments: (task.comments || []).map((comment: any) => ({
            ...comment,
            timestamp: new Date(comment.timestamp)
          })),
          attachments: (task.attachments || []).map((att: any) => ({
            ...att,
            uploadedAt: new Date(att.uploadedAt)
          })),
          checklist: (task.checklist || []).map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
          }))
        }));
    } catch (error) {
      console.error('Erreur lors du chargement des tâches de démonstration:', error);
      return [];
    }
  }

  // Public method to get demo tasks
  static getDemoTasks(projectId: string): Task[] {
    return this.getFallbackTasks(projectId);
  }

  private static calculateStatistics(tasks: Task[]): TaskStatistics {
    const now = new Date();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const overdueTasks = tasks.filter(t => 
      t.dueDate && t.dueDate < now && t.status !== 'done'
    ).length;
    const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length;

    // Calculate average completion time
    const completedTasksWithTime = tasks.filter(t => 
      t.status === 'done' && t.actualHours
    );
    const averageCompletionTime = completedTasksWithTime.length > 0
      ? completedTasksWithTime.reduce((sum, task) => sum + (task.actualHours || 0), 0) / completedTasksWithTime.length
      : 0;

    // Generate burndown data (last 30 days)
    const burndownData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const remainingTasks = tasks.filter(t => 
        t.createdAt <= date && (t.status !== 'done' || 
        (t.updatedAt > date && t.status === 'done'))
      ).length;
      const completedTasksAtDate = tasks.filter(t => 
        t.status === 'done' && t.updatedAt <= date
      ).length;
      
      burndownData.push({
        date,
        remainingTasks,
        completedTasks: completedTasksAtDate
      });
    }

    // Calculate team productivity
    const teamMembers = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))];
    const teamProductivity = teamMembers.map(member => {
      const memberTasks = tasks.filter(t => t.assignedTo === member);
      const completedMemberTasks = memberTasks.filter(t => t.status === 'done');
      const totalTime = completedMemberTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
      const averageTaskTime = completedMemberTasks.length > 0 ? totalTime / completedMemberTasks.length : 0;
      const efficiency = memberTasks.length > 0 ? (completedMemberTasks.length / memberTasks.length) * 100 : 0;

      return {
        userId: member,
        userName: member,
        tasksCompleted: completedMemberTasks.length,
        averageTaskTime,
        efficiency
      };
    });

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      tasksInProgress,
      averageCompletionTime,
      burndownData,
      velocityData: [], // Would be calculated based on sprints
      teamProductivity
    };
  }

  private static getDefaultStatistics(): TaskStatistics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      tasksInProgress: 0,
      averageCompletionTime: 0,
      burndownData: [],
      velocityData: [],
      teamProductivity: []
    };
  }

  private static createTaskBoardFallback(projectId: string, boardData: Partial<TaskBoard>): { success: boolean; board?: TaskBoard; error?: string } {
    try {
      const newBoard: TaskBoard = {
        id: Date.now().toString(),
        projectId,
        name: boardData.name || 'Nouveau Tableau',
        description: boardData.description,
        columns: boardData.columns || [
          { id: 'todo', name: 'À faire', position: 0, color: '#6b7280' },
          { id: 'in_progress', name: 'En cours', position: 1, color: '#3b82f6' },
          { id: 'review', name: 'En révision', position: 2, color: '#f59e0b' },
          { id: 'done', name: 'Terminé', position: 3, color: '#10b981' }
        ],
        settings: {
          allowClientComments: true,
          allowClientStatusChange: false,
          showTimeTracking: true,
          showEstimates: true,
          emailNotifications: true,
          ...boardData.settings
        }
      };

      const boards = this.getTaskBoardsFallback();
      boards.push(newBoard);
      localStorage.setItem('taskBoards', JSON.stringify(boards));
      
      return { success: true, board: newBoard };
    } catch (error) {
      return { success: false, error: 'Erreur lors de la création du tableau' };
    }
  }

  private static getTaskBoardsFallback(): TaskBoard[] {
    try {
      const boards = localStorage.getItem('taskBoards');
      return boards ? JSON.parse(boards) : [];
    } catch (error) {
      return [];
    }
  }

  // Notifications
  static async createNotification(notificationData: {
    userId: string;
    taskId: string;
    type: 'assignment' | 'comment' | 'status_change' | 'due_date' | 'mention';
    title: string;
    message: string;
  }): Promise<void> {
    try {
      await makeRequest('/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: notificationData.userId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          action_url: `/tasks/${notificationData.taskId}`
        }),
      });
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
    }
  }

  static async getUserNotifications(userId: string): Promise<TaskNotification[]> {
    try {
      const response = await makeRequest('/notifications');
      
      if (response.success && response.data.notifications) {
        return response.data.notifications.map((notif: any) => ({
          id: notif.id,
          userId: notif.user_id,
          taskId: notif.metadata?.taskId || '',
          type: notif.type,
          title: notif.title,
          message: notif.message,
          read: notif.is_read,
          createdAt: new Date(notif.created_at),
          actionUrl: notif.action_url
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      return [];
    }
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await makeRequest(`/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
    }
  }

  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      await makeRequest('/notifications/read-all', {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  }

  // Template Management
  static async createTaskTemplate(templateData: Partial<TaskTemplate>): Promise<{ success: boolean; template?: TaskTemplate; error?: string }> {
    try {
      // For now, use localStorage fallback for templates
      const newTemplate: TaskTemplate = {
        id: Date.now().toString(),
        name: templateData.name || 'Nouveau Template',
        description: templateData.description || '',
        defaultTasks: templateData.defaultTasks || [],
        category: templateData.category || 'general'
      };

      const templates = this.getTaskTemplatesFallback();
      templates.push(newTemplate);
      localStorage.setItem('taskTemplates', JSON.stringify(templates));
      
      return { success: true, template: newTemplate };
    } catch (error) {
      console.error('Erreur lors de la création du template:', error);
      return { success: false, error: 'Erreur lors de la création du template' };
    }
  }

  static async getTaskTemplates(): Promise<TaskTemplate[]> {
    return this.getTaskTemplatesFallback();
  }

  private static getTaskTemplatesFallback(): TaskTemplate[] {
    try {
      const templates = localStorage.getItem('taskTemplates');
      return templates ? JSON.parse(templates) : [];
    } catch (error) {
      return [];
    }
  }

  static async applyTemplate(projectId: string, templateId: string): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    try {
      const templates = this.getTaskTemplatesFallback();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        return { success: false, error: 'Template non trouvé' };
      }

      const createdTasks: Task[] = [];
      
      for (const taskTemplate of template.defaultTasks) {
        const result = await this.createTask({
          ...taskTemplate,
          projectId,
          title: taskTemplate.title || 'Tâche sans titre'
        });
        
        if (result.success && result.task) {
          createdTasks.push(result.task);
        }
      }

      return { success: true, tasks: createdTasks };
    } catch (error) {
      console.error('Erreur lors de l\'application du template:', error);
      return { success: false, error: 'Erreur lors de l\'application du template' };
    }
  }

  // Bulk Operations
  static async bulkUpdateTasks(taskIds: string[], updates: Partial<Task>): Promise<{ success: boolean; updatedTasks?: Task[]; error?: string }> {
    try {
      const updatedTasks: Task[] = [];
      
      for (const taskId of taskIds) {
        const result = await this.updateTask(taskId, updates);
        if (result.success && result.task) {
          updatedTasks.push(result.task);
        }
      }

      return { success: true, updatedTasks };
    } catch (error) {
      console.error('Erreur lors de la mise à jour en lot:', error);
      return { success: false, error: 'Erreur lors de la mise à jour en lot' };
    }
  }

  static async duplicateTask(taskId: string): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const originalTask = await this.getTaskById(taskId);
      if (!originalTask) {
        return { success: false, error: 'Tâche originale non trouvée' };
      }

      const duplicatedTask = {
        ...originalTask,
        id: undefined, // Will be generated
        title: `${originalTask.title} (Copie)`,
        status: 'todo' as const,
        completionPercentage: 0,
        actualHours: 0,
        comments: [],
        timeTracking: [],
        history: []
      };

      return await this.createTask(duplicatedTask);
    } catch (error) {
      console.error('Erreur lors de la duplication de la tâche:', error);
      return { success: false, error: 'Erreur lors de la duplication de la tâche' };
    }
  }

  // Advanced Features
  static async addTaskDependency(taskId: string, dependencyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      if (task.dependencies.includes(dependencyId)) {
        return { success: false, error: 'Dépendance déjà existante' };
      }

      const updatedTask = {
        ...task,
        dependencies: [...task.dependencies, dependencyId],
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la dépendance:', error);
      return { success: false, error: 'Erreur lors de l\'ajout de la dépendance' };
    }
  }

  static async removeTaskDependency(taskId: string, dependencyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      const updatedTask = {
        ...task,
        dependencies: task.dependencies.filter(dep => dep !== dependencyId),
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de la dépendance:', error);
      return { success: false, error: 'Erreur lors de la suppression de la dépendance' };
    }
  }

  static async addTaskWatcher(taskId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      if (task.watchers.includes(userId)) {
        return { success: false, error: 'Utilisateur déjà en surveillance' };
      }

      const updatedTask = {
        ...task,
        watchers: [...task.watchers, userId],
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du surveillant:', error);
      return { success: false, error: 'Erreur lors de l\'ajout du surveillant' };
    }
  }

  static async removeTaskWatcher(taskId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      const updatedTask = {
        ...task,
        watchers: task.watchers.filter(watcher => watcher !== userId),
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression du surveillant:', error);
      return { success: false, error: 'Erreur lors de la suppression du surveillant' };
    }
  }

  static async addTaskLabel(taskId: string, label: { name: string; color: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      const newLabel = {
        id: Date.now().toString(),
        name: label.name,
        color: label.color
      };

      const updatedTask = {
        ...task,
        labels: [...task.labels, newLabel],
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du label:', error);
      return { success: false, error: 'Erreur lors de l\'ajout du label' };
    }
  }

  static async removeTaskLabel(taskId: string, labelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      const updatedTask = {
        ...task,
        labels: task.labels.filter(label => label.id !== labelId),
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression du label:', error);
      return { success: false, error: 'Erreur lors de la suppression du label' };
    }
  }

  // Search and Filter
  static async searchTasks(projectId: string, query: string, filters?: {
    status?: string[];
    priority?: string[];
    assignedTo?: string[];
    tags?: string[];
    dateRange?: { start: Date; end: Date };
  }): Promise<Task[]> {
    const tasks = await this.getProjectTasks(projectId);
    
    return tasks.filter(task => {
      // Text search
      const matchesQuery = !query || 
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        task.description.toLowerCase().includes(query.toLowerCase()) ||
        task.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

      // Filters
      const matchesStatus = !filters?.status || filters.status.includes(task.status);
      const matchesPriority = !filters?.priority || filters.priority.includes(task.priority);
      const matchesAssignee = !filters?.assignedTo || (task.assignedTo && filters.assignedTo.includes(task.assignedTo));
      const matchesTags = !filters?.tags || filters.tags.some(tag => task.tags.includes(tag));
      
      const matchesDateRange = !filters?.dateRange || (
        task.createdAt >= filters.dateRange.start && 
        task.createdAt <= filters.dateRange.end
      );

      return matchesQuery && matchesStatus && matchesPriority && matchesAssignee && matchesTags && matchesDateRange;
    });
  }

  // Date Filter API
  static async getTasksByDateRange(
    projectId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    success: boolean;
    tasks?: Task[];
    statistics?: any;
    error?: string
  }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const queryString = params.toString();
      const url = `/tasks/project/${projectId}/date-filter${queryString ? `?${queryString}` : ''}`;

      const response = await makeRequest(url);

      if (response.success && response.data) {
        return {
          success: true,
          tasks: response.data.tasks.map((task: any) => this.transformTaskFromAPI(task)),
          statistics: response.data.statistics
        };
      }

      return { success: false, error: 'Failed to fetch filtered tasks' };
    } catch (error) {
      console.error('Error fetching tasks by date range:', error);
      return { success: false, error: error.message || 'Error fetching tasks by date range' };
    }
  }

  // Generate Task Report API
  static async generateTaskReport(
    projectId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      format?: 'json' | 'text' | 'pdf';
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);
      if (options?.format) params.append('format', options.format);

      const queryString = params.toString();
      const url = `/tasks/project/${projectId}/report${queryString ? `?${queryString}` : ''}`;

      const token = localStorage.getItem('authToken');
      const baseUrl = getApiBaseUrl();
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
        'bypass-tunnel-reminder': 'true'
      };

      // If format is text or pdf, handle as file download
      if (options?.format === 'text' || options?.format === 'pdf') {
        const response = await fetch(`${baseUrl}/api${url}`, { headers });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;

        // Extract filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename="')[1]?.split('"')[0]
          : `rapport-taches-${new Date().toISOString().split('T')[0]}.pdf`;

        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        return { success: true };
      }

      // JSON format
      const response = await makeRequest(url);

      if (response.success && response.data) {
        return { success: true, data: response.data };
      }

      return { success: false, error: 'Failed to generate report' };
    } catch (error) {
      console.error('Error generating task report:', error);
      return { success: false, error: error.message || 'Error generating task report' };
    }
  }

  // Export/Import
  static async exportTasks(projectId: string, format: 'json' | 'csv'): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const tasks = await this.getProjectTasks(projectId);

      if (format === 'json') {
        return { success: true, data: JSON.stringify(tasks, null, 2) };
      } else if (format === 'csv') {
        const headers = ['ID', 'Titre', 'Description', 'Statut', 'Priorité', 'Assigné à', 'Date d\'échéance', 'Heures estimées', 'Heures réelles'];
        const rows = tasks.map(task => [
          task.id,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.assignedTo || '',
          task.dueDate ? task.dueDate.toISOString() : '',
          task.estimatedHours?.toString() || '',
          task.actualHours?.toString() || ''
        ]);

        const csvContent = [headers, ...rows].map(row =>
          row.map(field => `"${field}"`).join(',')
        ).join('\n');

        return { success: true, data: csvContent };
      }

      return { success: false, error: 'Format non supporté' };
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      return { success: false, error: 'Erreur lors de l\'export' };
    }
  }

  // Helper Methods
  private static generateUpdateDetails(oldTask: Task, updates: Partial<Task>): string {
    const changes = [];
    
    if (updates.status && updates.status !== oldTask.status) {
      changes.push(`Statut changé de "${oldTask.status}" à "${updates.status}"`);
    }
    if (updates.assignedTo && updates.assignedTo !== oldTask.assignedTo) {
      changes.push(`Assigné à ${updates.assignedTo}`);
    }
    if (updates.priority && updates.priority !== oldTask.priority) {
      changes.push(`Priorité changée de "${oldTask.priority}" à "${updates.priority}"`);
    }
    if (updates.dueDate && updates.dueDate !== oldTask.dueDate) {
      changes.push(`Date d'échéance modifiée`);
    }
    
    return changes.join(', ') || 'Tâche mise à jour';
  }

  private static extractChangedFields(obj1: any, obj2: any): any {
    const changes: any = {};
    Object.keys(obj2).forEach(key => {
      if (obj1[key] !== obj2[key]) {
        changes[key] = obj1[key];
      }
    });
    return changes;
  }

  private static async notifyStatusChange(task: Task, oldStatus: string, newStatus: string): Promise<void> {
    // Notify assigned user
    if (task.assignedTo) {
      await this.createNotification({
        userId: task.assignedTo,
        taskId: task.id,
        type: 'status_change',
        title: 'Statut de tâche modifié',
        message: `La tâche "${task.title}" est passée de "${oldStatus}" à "${newStatus}"`
      });
    }

    // Notify watchers
    await this.notifyWatchers(task, 'status_change', `Statut changé: ${newStatus}`);
  }

  private static async notifyWatchers(task: Task, type: string, message: string): Promise<void> {
    for (const watcherId of task.watchers) {
      await this.createNotification({
        userId: watcherId,
        taskId: task.id,
        type: type as any,
        title: `Mise à jour de tâche`,
        message: `${task.title}: ${message}`
      });
    }
  }
}

// Export default instance
export default TasksApiService;