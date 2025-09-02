import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Edit, Trash2, Clock, User, Tag, Calendar,
  CheckCircle2, AlertTriangle, RefreshCw, Eye, MessageCircle,
  GripVertical, Save, MoreVertical, Archive, Play, Pause,
  Timer, FileText, Paperclip, Copy, Users, Flag, Target,
  TrendingUp, BarChart3, Activity, Zap, Bell, Filter,
  Search, SortAsc, Download, Upload, Settings, Star,
  ChevronDown, ChevronUp, Hash, Link, Image as ImageIcon,
  Send
} from 'lucide-react';
import { useTasks, useTaskBoard, useTaskStatistics, useTimeTracking, Task } from '../hooks/useTasks';

interface TaskBoardProps {
  projectId: string;
  isAdmin?: boolean;
  clientView?: boolean;
}

const TaskBoard = ({ projectId, isAdmin = false, clientView = false }: TaskBoardProps) => {
  const { tasks, createTask, updateTask, deleteTask, addComment, addChecklistItem, toggleChecklistItem, duplicateTask, loading } = useTasks(projectId);
  const { board } = useTaskBoard(projectId);
  const { statistics } = useTaskStatistics(projectId);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'created' | 'updated'>('created');
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [newTaskComment, setNewTaskComment] = useState('');
  const [newTaskChecklistItem, setNewTaskChecklistItem] = useState('');
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    tags: ''
  });

  const columns = board?.columns || [
    { id: 'todo', name: 'À faire', position: 0, color: '#6b7280' },
    { id: 'in_progress', name: 'En cours', position: 1, color: '#3b82f6' },
    { id: 'review', name: 'En révision', position: 2, color: '#f59e0b' },
    { id: 'done', name: 'Terminé', position: 3, color: '#10b981' }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-3 w-3" />;
      case 'high': return <Flag className="h-3 w-3" />;
      case 'medium': return <Target className="h-3 w-3" />;
      case 'low': return <CheckCircle2 className="h-3 w-3" />;
      default: return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4" />;
      case 'review': return <Eye className="h-4 w-4" />;
      case 'done': return <CheckCircle2 className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleDragStart = (task: Task) => {
    if (!isAdmin && clientView) return; // Clients ne peuvent pas déplacer les tâches
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus && (isAdmin || !clientView)) {
      await updateTask(draggedTask.id, { 
        status: newStatus as any,
        updatedAt: new Date()
      });
    }
    setDraggedTask(null);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const tagsArray = newTaskData.tags
        ? newTaskData.tags.split(',').map(tag => tag.trim())
        : [];
      
      await createTask({
        title: newTaskData.title,
        description: newTaskData.description,
        priority: newTaskData.priority as any,
        dueDate: newTaskData.dueDate ? new Date(newTaskData.dueDate) : undefined,
        assignedTo: newTaskData.assignedTo || undefined,
        tags: tagsArray,
        status: 'todo'
      });
      
      // Reset form and close modal
      setNewTaskData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        tags: ''
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesAssignee = filterAssignee === 'all' || task.assignedTo === filterAssignee;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesAssignee && matchesPriority;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'created':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const getTasksByColumn = (columnId: string) => {
    return sortedTasks.filter(task => task.status === columnId);
  };

  const uniqueAssignees = [...new Set(tasks.map(task => task.assignedTo).filter(Boolean))];

  const handleAddComment = async (taskId: string, commentData: any) => {
    try {
      await addComment(taskId, commentData);
      setNewTaskComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddChecklistItem = async (taskId: string, title: string) => {
    try {
      await addChecklistItem(taskId, title);
      setNewTaskChecklistItem('');
    } catch (error) {
      console.error('Error adding checklist item:', error);
    }
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const { isTracking, currentDuration, startTracking, stopTracking } = useTimeTracking(task.id, 'current-user');
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    const completedChecklist = task.checklist.filter(item => item.completed).length;
    const totalChecklist = task.checklist.length;

    const handleTaskAddComment = async (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!newComment.trim()) return;

      await handleAddComment(task.id, {
        author: clientView ? 'Client' : 'Admin',
        authorRole: clientView ? 'client' : 'admin',
        content: newComment
      });
      setNewComment('');
    };

    const handleTaskAddChecklistItem = async (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!newTaskChecklistItem.trim()) return;

      await handleAddChecklistItem(task.id, newTaskChecklistItem);
    };

    const handleStartTracking = (e: React.MouseEvent) => {
      e.stopPropagation();
      startTracking();
    };

    const handleStopTracking = (e: React.MouseEvent) => {
      e.stopPropagation();
      stopTracking();
    };

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        draggable={isAdmin && !clientView}
        onDragStart={() => handleDragStart(task)}
        className={`bg-gray-800 rounded-lg p-4 mb-3 cursor-pointer hover:bg-gray-750 transition-all duration-200 border-l-4 group relative ${
          task.priority === 'urgent' ? 'border-red-500' :
          task.priority === 'high' ? 'border-orange-500' :
          task.priority === 'medium' ? 'border-yellow-500' : 'border-green-500'
        } ${draggedTask?.id === task.id ? 'opacity-50 rotate-2' : ''} ${
          isOverdue ? 'ring-2 ring-red-500/50' : ''
        }`}
        onClick={() => {
          setSelectedTask(task);
          setShowTaskDetails(true);
        }}
        onMouseEnter={() => setShowQuickActions(true)}
        onMouseLeave={() => setShowQuickActions(false)}
      >
        {/* Header avec titre et actions */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium text-sm truncate">{task.title}</h4>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`flex items-center px-2 py-1 rounded text-xs ${getPriorityColor(task.priority)} text-white`}>
                {getPriorityIcon(task.priority)}
                <span className="ml-1 capitalize">{task.priority}</span>
              </div>
              {isOverdue && (
                <div className="flex items-center px-2 py-1 rounded text-xs bg-red-500 text-white">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  En retard
                </div>
              )}
            </div>
          </div>
          
          {(isAdmin || showQuickActions) && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isAdmin && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTask(task);
                    }}
                    className="text-gray-400 hover:text-white p-1 rounded"
                    title="Modifier"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateTask(task.id);
                    }}
                    className="text-gray-400 hover:text-white p-1 rounded"
                    title="Dupliquer"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                    }}
                    className="text-gray-400 hover:text-red-400 p-1 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-gray-400 text-xs mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Progress bar pour checklist */}
        {totalChecklist > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Checklist</span>
              <span>{completedChecklist}/{totalChecklist}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1.5">
              <div 
                className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="bg-primary-900/50 text-primary-300 text-xs px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-gray-400 text-xs">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer avec informations */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            {task.assignedTo && (
              <div className="flex items-center">
                <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">{task.assignedTo.charAt(0)}</span>
                </div>
              </div>
            )}
            
            {task.comments.length > 0 && (
              <span className="flex items-center text-gray-400">
                <MessageCircle className="h-3 w-3 mr-1" />
                {task.comments.length}
              </span>
            )}
            
            {task.attachments.length > 0 && (
              <span className="flex items-center text-gray-400">
                <Paperclip className="h-3 w-3 mr-1" />
                {task.attachments.length}
              </span>
            )}

            {task.estimatedHours && (
              <span className="flex items-center text-gray-400">
                <Timer className="h-3 w-3 mr-1" />
                {task.estimatedHours}h
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {task.dueDate && (
              <span className={`flex items-center ${
                isOverdue ? 'text-red-400' : 'text-gray-400'
              }`}>
                <Clock className="h-3 w-3 mr-1" />
                {new Date(task.dueDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
              </span>
            )}
            
            {isTracking && (
              <span className="flex items-center text-green-400">
                <Play className="h-3 w-3 mr-1" />
                {Math.floor(currentDuration / 60)}:{(currentDuration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        {/* Section commentaires rapides (pour clients) */}
        {clientView && board?.settings.allowClientComments && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(!showComments);
              }}
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              {showComments ? 'Masquer' : 'Voir'} commentaires
            </button>
            
            {showComments && (
              <div className="mt-2 space-y-2">
                {task.comments.slice(-2).map((comment) => (
                  <div key={comment.id} className="bg-gray-700 p-2 rounded text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-primary-400 font-medium">{comment.author}</span>
                      <span className="text-gray-500">{comment.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-300">{comment.content}</p>
                  </div>
                ))}
                
                <form onSubmit={handleTaskAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white placeholder-gray-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="submit"
                    className="text-primary-400 hover:text-primary-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Time tracking controls (admin only) */}
        {isAdmin && (
          <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {isTracking ? (
                <button
                  onClick={handleStopTracking}
                  className="flex items-center text-red-400 hover:text-red-300 text-xs"
                >
                  <Pause className="h-3 w-3 mr-1" />
                  Arrêter ({Math.floor(currentDuration / 60)}:{(currentDuration % 60).toString().padStart(2, '0')})
                </button>
              ) : (
                <button
                  onClick={handleStartTracking}
                  className="flex items-center text-green-400 hover:text-green-300 text-xs"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Démarrer
                </button>
              )}
            </div>
            
            {task.actualHours > 0 && (
              <span className="text-xs text-gray-400">
                {task.actualHours.toFixed(1)}h passées
              </span>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-400 mx-auto mb-2" />
          <p className="text-gray-400">Chargement des tâches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header avec contrôles */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-bold text-white">
            {clientView ? 'Suivi des tâches' : 'Tableau des tâches'}
          </h3>
          
          {statistics && (
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-400">
                {statistics.completedTasks}/{statistics.totalTasks} terminées
              </span>
              <span className="text-yellow-400">
                {statistics.overdueTasks} en retard
              </span>
              <span className="text-blue-400">
                {statistics.tasksInProgress} en cours
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-48 px-3 py-2 pl-8 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {/* Filters */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="todo">À faire</option>
            <option value="in_progress">En cours</option>
            <option value="review">En révision</option>
            <option value="done">Terminé</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="all">Toutes priorités</option>
            <option value="urgent">Urgent</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>

          {uniqueAssignees.length > 0 && (
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="all">Tous les assignés</option>
              {uniqueAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          )}

          {/* View mode toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'text-gray-400'}`}
              title="Vue Kanban"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-400'}`}
              title="Vue Liste"
            >
              <FileText className="h-4 w-4" />
            </button>
          </div>

          {/* Statistics toggle */}
          <button
            onClick={() => setShowStatistics(!showStatistics)}
            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white"
            title="Statistiques"
          >
            <TrendingUp className="h-4 w-4" />
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle tâche
            </button>
          )}
        </div>
      </div>

      {/* Statistics Panel */}
      {showStatistics && statistics && (
        <div className="mb-6 bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-bold text-white mb-4">Statistiques du projet</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-400">{statistics.totalTasks}</div>
              <div className="text-sm text-gray-400">Total tâches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{statistics.completedTasks}</div>
              <div className="text-sm text-gray-400">Terminées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{statistics.overdueTasks}</div>
              <div className="text-sm text-gray-400">En retard</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{statistics.averageCompletionTime.toFixed(1)}h</div>
              <div className="text-sm text-gray-400">Temps moyen</div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-300px)]">
          {columns.map((column) => {
            const columnTasks = getTasksByColumn(column.id);
            const wipLimit = column.wipLimit;
            const isOverLimit = wipLimit && columnTasks.length > wipLimit;
            
            return (
              <div
                key={column.id}
                className="bg-gray-900 rounded-lg p-4 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div 
                  className={`flex items-center justify-between mb-4 p-3 rounded-lg ${
                    isOverLimit ? 'bg-red-900/20 border border-red-500/20' : ''
                  }`}
                  style={{ backgroundColor: isOverLimit ? undefined : `${column.color}20` }}
                >
                  <div className="flex items-center space-x-2">
                    <h4 className="text-white font-medium">{column.name}</h4>
                    {getStatusIcon(column.id)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isOverLimit ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
                    }`}>
                      {columnTasks.length}
                      {wipLimit && `/${wipLimit}`}
                    </span>
                    {isOverLimit && (
                      <AlertTriangle className="h-4 w-4 text-red-400" title="Limite WIP dépassée" />
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 flex-1 overflow-y-auto">
                  <AnimatePresence>
                    {columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </div>
                
                {isAdmin && column.id === 'todo' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full mt-3 p-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une tâche
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tâche
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Priorité
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Assigné
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Progression
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedTasks.map((task) => {
                  const completedChecklist = task.checklist.filter(item => item.completed).length;
                  const totalChecklist = task.checklist.length;
                  const progress = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : task.completionPercentage;
                  
                  return (
                    <tr key={task.id} className="hover:bg-gray-700/50 cursor-pointer" onClick={() => {
                      setSelectedTask(task);
                      setShowTaskDetails(true);
                    }}>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className={`w-1 h-8 rounded-full mr-3 ${getPriorityColor(task.priority)}`} />
                          <div>
                            <div className="text-sm font-medium text-white">{task.title}</div>
                            <div className="text-sm text-gray-400 truncate max-w-xs">{task.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'todo' ? 'bg-gray-100 text-gray-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {getStatusIcon(task.status)}
                          <span className="ml-1">
                            {task.status === 'todo' ? 'À faire' :
                             task.status === 'in_progress' ? 'En cours' :
                             task.status === 'review' ? 'En révision' : 'Terminé'}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs text-white ${getPriorityColor(task.priority)}`}>
                          {getPriorityIcon(task.priority)}
                          <span className="ml-1 capitalize">{task.priority}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {task.assignedTo ? (
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center mr-2">
                              <span className="text-xs text-white">{task.assignedTo.charAt(0)}</span>
                            </div>
                            <span className="text-sm text-gray-300">{task.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Non assigné</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {task.dueDate ? (
                          <span className={`text-sm ${
                            new Date(task.dueDate) < new Date() && task.status !== 'done' 
                              ? 'text-red-400' : 'text-gray-300'
                          }`}>
                            {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Aucune</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-600 rounded-full h-2 mr-2">
                            <div 
                              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {task.comments.length > 0 && (
                            <span className="flex items-center text-gray-400 text-xs">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              {task.comments.length}
                            </span>
                          )}
                          {task.attachments.length > 0 && (
                            <span className="flex items-center text-gray-400 text-xs">
                              <Paperclip className="h-3 w-3 mr-1" />
                              {task.attachments.length}
                            </span>
                          )}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskDetails && selectedTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div className="flex items-center">
                <div className={`w-2 h-8 rounded-full mr-3 ${getPriorityColor(selectedTask.priority)}`} />
                <h3 className="text-xl font-bold text-white">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setShowTaskDetails(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2">
                  <h4 className="text-lg font-medium text-white mb-4">Description</h4>
                  <p className="text-gray-300 bg-gray-800 p-4 rounded-lg">
                    {selectedTask.description || "Aucune description fournie."}
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-4">Informations</h4>
                  <div className="space-y-3 bg-gray-800 p-4 rounded-lg">
                    <div>
                      <span className="text-gray-400 text-sm">Statut:</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedTask.status === 'todo' ? 'bg-gray-100 text-gray-800' :
                          selectedTask.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          selectedTask.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {getStatusIcon(selectedTask.status)}
                          <span className="ml-1">
                            {selectedTask.status === 'todo' ? 'À faire' :
                             selectedTask.status === 'in_progress' ? 'En cours' :
                             selectedTask.status === 'review' ? 'En révision' : 'Terminé'}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Priorité:</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedTask.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          selectedTask.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {getPriorityIcon(selectedTask.priority)}
                          <span className="ml-1 capitalize">{selectedTask.priority}</span>
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Assigné à:</span>
                      <div className="mt-1">
                        {selectedTask.assignedTo ? (
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center mr-2">
                              <span className="text-xs text-white">{selectedTask.assignedTo.charAt(0)}</span>
                            </div>
                            <span className="text-sm text-gray-300">{selectedTask.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Non assigné</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Échéance:</span>
                      <div className="mt-1">
                        {selectedTask.dueDate ? (
                          <span className={`text-sm ${
                            new Date(selectedTask.dueDate) < new Date() && selectedTask.status !== 'done' 
                              ? 'text-red-400' : 'text-gray-300'
                          }`}>
                            {new Date(selectedTask.dueDate).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Aucune</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Temps:</span>
                      <div className="mt-1 flex items-center space-x-4">
                        <span className="text-sm text-gray-300">
                          Estimé: {selectedTask.estimatedHours || 0}h
                        </span>
                        <span className="text-sm text-gray-300">
                          Passé: {selectedTask.actualHours?.toFixed(1) || 0}h
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Tags:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedTask.tags.length > 0 ? (
                          selectedTask.tags.map((tag, index) => (
                            <span key={index} className="bg-primary-900/50 text-primary-300 text-xs px-2 py-1 rounded">
                              #{tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Aucun tag</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-white">Checklist</h4>
                  {isAdmin && (
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={newTaskChecklistItem}
                        onChange={(e) => setNewTaskChecklistItem(e.target.value)}
                        placeholder="Nouvel élément..."
                        className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm mr-2"
                      />
                      <button
                        onClick={() => handleAddChecklistItem(selectedTask.id, newTaskChecklistItem)}
                        className="bg-primary-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-primary-700 transition-colors"
                        disabled={!newTaskChecklistItem.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {selectedTask.checklist.length === 0 ? (
                  <div className="text-center py-6 bg-gray-800 rounded-lg">
                    <p className="text-gray-400">Aucun élément dans la checklist</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedTask.checklist.map((item) => (
                      <div key={item.id} className="flex items-center bg-gray-800 p-3 rounded-lg">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleChecklistItem(selectedTask.id, item.id)}
                          className="mr-3"
                        />
                        <span className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <h4 className="text-lg font-medium text-white mb-4">Commentaires</h4>
                
                <div className="space-y-4 mb-4">
                  {selectedTask.comments.length === 0 ? (
                    <div className="text-center py-6 bg-gray-800 rounded-lg">
                      <p className="text-gray-400">Aucun commentaire</p>
                    </div>
                  ) : (
                    selectedTask.comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                              comment.authorRole === 'client' ? 'bg-blue-600' :
                              comment.authorRole === 'admin' ? 'bg-purple-600' : 'bg-green-600'
                            }`}>
                              <span className="text-white text-sm">{comment.author.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-white">{comment.author}</p>
                              <p className="text-xs text-gray-400">
                                {comment.timestamp.toLocaleString('fr-FR')}
                                {comment.edited && ' (modifié)'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTaskComment.trim()) return;
                  
                  handleAddComment(selectedTask.id, {
                    author: clientView ? 'Client' : 'Admin',
                    authorRole: clientView ? 'client' : 'admin',
                    content: newTaskComment
                  });
                }}>
                  <div className="flex space-x-2">
                    <textarea
                      value={newTaskComment}
                      onChange={(e) => setNewTaskComment(e.target.value)}
                      placeholder="Ajouter un commentaire..."
                      rows={3}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                      disabled={!newTaskComment.trim()}
                    >
                      <Send className="h-4 w-4 mr-2 inline" />
                      Envoyer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                Créer une nouvelle tâche
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  id="title"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData({...newTaskData, title: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData({...newTaskData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
                    Priorité
                  </label>
                  <select
                    id="priority"
                    value={newTaskData.priority}
                    onChange={(e) => setNewTaskData({...newTaskData, priority: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-2">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    value={newTaskData.dueDate}
                    onChange={(e) => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-300 mb-2">
                    Assigné à
                  </label>
                  <input
                    type="text"
                    id="assignedTo"
                    value={newTaskData.assignedTo}
                    onChange={(e) => setNewTaskData({...newTaskData, assignedTo: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Nom de la personne"
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={newTaskData.tags}
                    onChange={(e) => setNewTaskData({...newTaskData, tags: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="frontend, design, urgent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  disabled={!newTaskData.title.trim()}
                >
                  <Save className="h-4 w-4 mr-2 inline" />
                  Créer la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;