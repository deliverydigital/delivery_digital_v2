// API Service pour la gestion des tâches (système Trello-like)
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

// Simulation d'une base de données locale pour les tâches
class TaskStorage {
  private getItem<T>(key: string): T[] {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error(`Erreur lors de la lecture de ${key}:`, error);
      return [];
    }
  }

  private setItem<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Erreur lors de l'écriture de ${key}:`, error);
    }
  }

  // Tasks
  getTasks(): Task[] {
    const tasks = this.getItem<Task>('tasks');
    return tasks.map(task => ({
      ...task,
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt),
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      comments: (task.comments || []).map(comment => ({
        ...comment,
        timestamp: new Date(comment.timestamp),
        editedAt: comment.editedAt ? new Date(comment.editedAt) : undefined,
        attachments: comment.attachments || []
      })),
      attachments: (task.attachments || []).map(att => ({
        ...att,
        uploadedAt: new Date(att.uploadedAt)
      })),
      checklist: (task.checklist || []).map(item => ({
        ...item,
        createdAt: new Date(item.createdAt)
      })),
      timeTracking: (task.timeTracking || []).map(track => ({
        ...track,
        startTime: new Date(track.startTime),
        endTime: track.endTime ? new Date(track.endTime) : undefined
      })),
      history: (task.history || []).map(hist => ({
        ...hist,
        timestamp: new Date(hist.timestamp)
      })),
      tags: task.tags || [],
      dependencies: task.dependencies || [],
      watchers: task.watchers || [],
      labels: task.labels || []
    }));
  }

  saveTask(task: Task): void {
    const tasks = this.getTasks();
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    
    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }
    
    this.setItem('tasks', tasks);
  }

  deleteTask(taskId: string): void {
    const tasks = this.getTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    this.setItem('tasks', filteredTasks);
  }

  // Task Boards
  getTaskBoards(): TaskBoard[] {
    return this.getItem<TaskBoard>('taskBoards');
  }

  saveTaskBoard(board: TaskBoard): void {
    const boards = this.getTaskBoards();
    const existingIndex = boards.findIndex(b => b.id === board.id);
    
    if (existingIndex >= 0) {
      boards[existingIndex] = board;
    } else {
      boards.push(board);
    }
    
    this.setItem('taskBoards', boards);
  }

  // Task Templates
  getTaskTemplates(): TaskTemplate[] {
    return this.getItem<TaskTemplate>('taskTemplates');
  }

  saveTaskTemplate(template: TaskTemplate): void {
    const templates = this.getTaskTemplates();
    const existingIndex = templates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }
    
    this.setItem('taskTemplates', templates);
  }

  // Notifications
  getNotifications(): TaskNotification[] {
    const notifications = this.getItem<TaskNotification>('taskNotifications');
    return notifications.map(notif => ({
      ...notif,
      createdAt: new Date(notif.createdAt)
    }));
  }

  saveNotification(notification: TaskNotification): void {
    const notifications = this.getNotifications();
    notifications.unshift(notification); // Add to beginning
    
    // Keep only last 100 notifications
    if (notifications.length > 100) {
      notifications.splice(100);
    }
    
    this.setItem('taskNotifications', notifications);
  }

  markNotificationAsRead(notificationId: string): void {
    const notifications = this.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.setItem('taskNotifications', notifications);
    }
  }
}

const taskStorage = new TaskStorage();

// API Service pour les tâches
export class TasksApiService {
  // CRUD Operations for Tasks
  static async createTask(taskData: Partial<Task>): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const newTask: Task = {
        id: Date.now().toString(),
        title: taskData.title || '',
        description: taskData.description || '',
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        assignedTo: taskData.assignedTo,
        dueDate: taskData.dueDate,
        projectId: taskData.projectId || '',
        clientId: taskData.clientId || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: taskData.tags || [],
        estimatedHours: taskData.estimatedHours,
        actualHours: 0,
        completionPercentage: 0,
        dependencies: taskData.dependencies || [],
        attachments: [],
        comments: [],
        watchers: [taskData.assignedTo].filter(Boolean),
        labels: taskData.labels || [],
        checklist: [],
        timeTracking: [],
        history: [{
          id: Date.now().toString(),
          action: 'created',
          userId: 'current-user',
          userName: 'Current User',
          timestamp: new Date(),
          details: 'Tâche créée'
        }]
      };

      taskStorage.saveTask(newTask);
      
      // Create notification for assigned user
      if (newTask.assignedTo) {
        await this.createNotification({
          userId: newTask.assignedTo,
          taskId: newTask.id,
          type: 'assignment',
          title: 'Nouvelle tâche assignée',
          message: `Vous avez été assigné à la tâche "${newTask.title}"`
        });
      }
      
      return { success: true, task: newTask };
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error);
      return { success: false, error: 'Erreur lors de la création de la tâche' };
    }
  }

  static async updateTask(taskId: string, updates: Partial<Task>): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const tasks = taskStorage.getTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return { success: false, error: 'Tâche non trouvée' };
      }
      
      const oldTask = tasks[taskIndex];
      const updatedTask = {
        ...oldTask,
        ...updates,
        updatedAt: new Date(),
        history: [
          ...oldTask.history,
          {
            id: Date.now().toString(),
            action: 'updated',
            userId: 'current-user',
            userName: 'Current User',
            timestamp: new Date(),
            details: this.generateUpdateDetails(oldTask, updates),
            oldValue: this.extractChangedFields(oldTask, updates),
            newValue: this.extractChangedFields(updates, oldTask)
          }
        ]
      };
      
      taskStorage.saveTask(updatedTask);
      
      // Create notifications for status changes
      if (updates.status && updates.status !== oldTask.status) {
        await this.notifyStatusChange(updatedTask, oldTask.status, updates.status);
      }
      
      return { success: true, task: updatedTask };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error);
      return { success: false, error: 'Erreur lors de la mise à jour de la tâche' };
    }
  }

  static async deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
      taskStorage.deleteTask(taskId);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error);
      return { success: false, error: 'Erreur lors de la suppression de la tâche' };
    }
  }

  static async getProjectTasks(projectId: string): Promise<Task[]> {
    const allTasks = taskStorage.getTasks();
    return allTasks.filter(task => task.projectId === projectId);
  }

  static async getTaskById(taskId: string): Promise<Task | null> {
    const tasks = taskStorage.getTasks();
    return tasks.find(task => task.id === taskId) || null;
  }

  // Comments Management
  static async addComment(taskId: string, commentData: {
    author: string;
    authorRole: 'client' | 'admin' | 'developer';
    content: string;
    attachments?: { name: string; type: string; url: string; }[];
  }): Promise<{ success: boolean; comment?: any; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      const newComment = {
        id: Date.now().toString(),
        author: commentData.author,
        authorRole: commentData.authorRole,
        content: commentData.content,
        timestamp: new Date(),
        attachments: commentData.attachments || []
      };

      const updatedTask = {
        ...task,
        comments: [...task.comments, newComment],
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);

      // Notify watchers
      await this.notifyWatchers(task, 'comment', `Nouveau commentaire de ${commentData.author}`);

      return { success: true, comment: newComment };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      return { success: false, error: 'Erreur lors de l\'ajout du commentaire' };
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
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      // Stop any existing tracking for this user
      await this.stopTimeTracking(taskId, userId);

      const newTimeEntry = {
        id: Date.now().toString(),
        userId,
        startTime: new Date(),
        duration: 0,
        description
      };

      const updatedTask = {
        ...task,
        timeTracking: [...task.timeTracking, newTimeEntry],
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors du démarrage du suivi du temps:', error);
      return { success: false, error: 'Erreur lors du démarrage du suivi du temps' };
    }
  }

  static async stopTimeTracking(taskId: string, userId: string): Promise<{ success: boolean; duration?: number; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      const activeEntryIndex = task.timeTracking.findIndex(
        entry => entry.userId === userId && !entry.endTime
      );

      if (activeEntryIndex === -1) {
        return { success: false, error: 'Aucun suivi de temps actif trouvé' };
      }

      const updatedTimeTracking = [...task.timeTracking];
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - updatedTimeTracking[activeEntryIndex].startTime.getTime()) / 60000); // en minutes

      updatedTimeTracking[activeEntryIndex] = {
        ...updatedTimeTracking[activeEntryIndex],
        endTime,
        duration
      };

      const updatedTask = {
        ...task,
        timeTracking: updatedTimeTracking,
        actualHours: (task.actualHours || 0) + (duration / 60),
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true, duration };
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du suivi du temps:', error);
      return { success: false, error: 'Erreur lors de l\'arrêt du suivi du temps' };
    }
  }

  // Checklist Management
  static async addChecklistItem(taskId: string, title: string): Promise<{ success: boolean; item?: any; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      const newItem = {
        id: Date.now().toString(),
        title,
        completed: false,
        createdAt: new Date()
      };

      const updatedTask = {
        ...task,
        checklist: [...task.checklist, newItem],
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true, item: newItem };
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'élément de checklist:', error);
      return { success: false, error: 'Erreur lors de l\'ajout de l\'élément de checklist' };
    }
  }

  static async toggleChecklistItem(taskId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        return { success: false, error: 'Tâche non trouvée' };
      }

      const itemIndex = task.checklist.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        return { success: false, error: 'Élément de checklist non trouvé' };
      }

      const updatedChecklist = [...task.checklist];
      updatedChecklist[itemIndex] = {
        ...updatedChecklist[itemIndex],
        completed: !updatedChecklist[itemIndex].completed
      };

      // Calculate completion percentage
      const completedItems = updatedChecklist.filter(item => item.completed).length;
      const completionPercentage = updatedChecklist.length > 0 
        ? Math.round((completedItems / updatedChecklist.length) * 100) 
        : 0;

      const updatedTask = {
        ...task,
        checklist: updatedChecklist,
        completionPercentage,
        updatedAt: new Date()
      };

      taskStorage.saveTask(updatedTask);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la modification de l\'élément de checklist:', error);
      return { success: false, error: 'Erreur lors de la modification de l\'élément de checklist' };
    }
  }

  // Task Board Management
  static async createTaskBoard(projectId: string, boardData: Partial<TaskBoard>): Promise<{ success: boolean; board?: TaskBoard; error?: string }> {
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

      taskStorage.saveTaskBoard(newBoard);
      return { success: true, board: newBoard };
    } catch (error) {
      console.error('Erreur lors de la création du tableau:', error);
      return { success: false, error: 'Erreur lors de la création du tableau' };
    }
  }

  static async getProjectBoard(projectId: string): Promise<TaskBoard | null> {
    const boards = taskStorage.getTaskBoards();
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
    const tasks = await this.getProjectTasks(projectId);
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

  // Notifications
  static async createNotification(notificationData: {
    userId: string;
    taskId: string;
    type: 'assignment' | 'comment' | 'status_change' | 'due_date' | 'mention';
    title: string;
    message: string;
  }): Promise<void> {
    const notification: TaskNotification = {
      id: Date.now().toString(),
      userId: notificationData.userId,
      taskId: notificationData.taskId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      read: false,
      createdAt: new Date(),
      actionUrl: `/tasks/${notificationData.taskId}`
    };

    taskStorage.saveNotification(notification);
  }

  static async getUserNotifications(userId: string): Promise<TaskNotification[]> {
    const notifications = taskStorage.getNotifications();
    return notifications.filter(notif => notif.userId === userId);
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    taskStorage.markNotificationAsRead(notificationId);
  }

  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    const notifications = taskStorage.getNotifications();
    notifications.forEach(notif => {
      if (notif.userId === userId) {
        notif.read = true;
      }
    });
    taskStorage.setItem('taskNotifications', notifications);
  }

  // Template Management
  static async createTaskTemplate(templateData: Partial<TaskTemplate>): Promise<{ success: boolean; template?: TaskTemplate; error?: string }> {
    try {
      const newTemplate: TaskTemplate = {
        id: Date.now().toString(),
        name: templateData.name || 'Nouveau Template',
        description: templateData.description || '',
        defaultTasks: templateData.defaultTasks || [],
        category: templateData.category || 'general'
      };

      taskStorage.saveTaskTemplate(newTemplate);
      return { success: true, template: newTemplate };
    } catch (error) {
      console.error('Erreur lors de la création du template:', error);
      return { success: false, error: 'Erreur lors de la création du template' };
    }
  }

  static async getTaskTemplates(): Promise<TaskTemplate[]> {
    return taskStorage.getTaskTemplates();
  }

  static async applyTemplate(projectId: string, templateId: string): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    try {
      const templates = taskStorage.getTaskTemplates();
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