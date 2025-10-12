import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MessageCircle, FolderOpen, Settings, LogOut, Search, ChevronRight, FileText, Image as ImageIcon, ExternalLink, Clock, CheckCircle, AlertTriangle, X, Edit, Trash2, Send, Filter, Download, Eye, User, Building2, Mail, Phone, Calendar, Tag, DollarSign, Star, Archive, Bell, Plus, MoreVertical, Reply, Forward, Paperclip, Save, RefreshCw, Home, Kanban, GraduationCap, Code, BookOpen, UserCheck, FileSignature, ClipboardList, BarChart3, TrendingUp, Zap, Link, Upload, Database, Globe, Shield, Award, Target, PieChart, Activity, Workflow, UserPlus, FileCheck, QrCode, Printer, Calculator, CreditCard, Briefcase, School, AlignCenterVertical as Certificate, Users2, MessageSquare, UploadCloud as CloudUpload, HardDrive, Folder, Share2, Lock, Key, Monitor, Smartphone, Server, Cloud, Cpu, Network, ClipboardCheck, List
} from 'lucide-react';
import { useAuth, useProjects } from '../hooks/useApi';
import { useTasks } from '../hooks/useTasks';
import TaskBoard from './TaskBoard';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const { projects, loading: projectsLoading } = useProjects(user?.id);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const getTaskPermissions = () => {
    if (!selectedProject || !user) {
      return { view: true, add: false, update: false, delete: false };
    }

    if (user.role === 'admin') {
      return { view: true, add: true, update: true, delete: true };
    }

    const permissions = selectedProject.taskPermissions?.[user.role];
    if (!permissions) {
      const defaults: any = {
        client: { view: true, add: false, update: false, delete: false },
        project_manager: { view: true, add: true, update: true, delete: true },
        developer: { view: true, add: false, update: true, delete: false },
        trainer: { view: true, add: false, update: false, delete: false }
      };
      return defaults[user.role] || { view: true, add: false, update: false, delete: false };
    }

    return permissions;
  };

  const taskPermissions = getTaskPermissions();

  const handleEditTask = () => {
    setEditedTask({ ...selectedTask });
    setIsEditingTask(true);
  };

  const handleCancelEdit = () => {
    setEditedTask(null);
    setIsEditingTask(false);
  };

  const handleSaveTask = async () => {
    if (!editedTask) return;

    try {
      const TasksApi = (await import('../services/tasksApi')).default;
      const result = await TasksApi.updateTask(editedTask.id, editedTask);

      if (result.success) {
        await refreshTasks();
        setIsEditingTask(false);
        setEditedTask(null);
      } else {
        alert('Erreur lors de la mise à jour de la tâche: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Erreur lors de la mise à jour de la tâche');
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return;
    }

    try {
      const TasksApi = (await import('../services/tasksApi')).default;
      const result = await TasksApi.deleteTask(selectedTask.id);

      if (result.success) {
        setShowTaskModal(false);
        setSelectedTask(null);
        await refreshTasks();
      } else {
        alert('Erreur lors de la suppression de la tâche: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Erreur lors de la suppression de la tâche');
    }
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editedTask, setEditedTask] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignee: 'all'
  });

  // Only load tasks if we have a selected project and user is authenticated
  const { tasks, loading: tasksLoading, error: tasksError, refreshTasks } = useTasks(
    (selectedProject?.id && user) ? selectedProject.id : ''
  );

  useEffect(() => {
    if (projects.length > 0 && !selectedProject && user) {
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject, user]);

  // Keep selectedTask synchronized with tasks array
  useEffect(() => {
    if (selectedTask && tasks) {
      const updatedTask = tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    }
  }, [tasks]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'todo': return 'À faire';
      case 'in_progress': return 'En cours';
      case 'review': return 'En révision';
      case 'done': return 'Terminé';
      case 'blocked': return 'Bloqué';
      default: return status;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'low': return 'Faible';
      case 'medium': return 'Moyenne';
      case 'high': return 'Haute';
      case 'urgent': return 'Urgente';
      default: return priority;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || task.status === filters.status;
    const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
    const matchesAssignee = filters.assignee === 'all' || task.assignedTo === filters.assignee;

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  };

  // Get project progress from API (completion_percentage)
  const projectProgress = selectedProject?.completionPercentage || 0;

  const TaskDetailModal = () => {
    if (!selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <div className="flex items-center flex-1">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                selectedTask.priority === 'urgent' ? 'bg-red-500' :
                selectedTask.priority === 'high' ? 'bg-orange-500' :
                selectedTask.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <h3 className="text-xl font-bold text-white">{selectedTask.title}</h3>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditingTask && taskPermissions.update && (
                <button
                  onClick={handleEditTask}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </button>
              )}
              {!isEditingTask && taskPermissions.delete && (
                <button
                  onClick={handleDeleteTask}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </button>
              )}
              {isEditingTask && (
                <>
                  <button
                    onClick={handleSaveTask}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center transition-colors"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                  setIsEditingTask(false);
                  setEditedTask(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Task Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Statut</label>
                  {isEditingTask ? (
                    <select
                      value={editedTask.status}
                      onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value })}
                      className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="todo">À faire</option>
                      <option value="in_progress">En cours</option>
                      <option value="review">En révision</option>
                      <option value="done">Terminé</option>
                      <option value="blocked">Bloqué</option>
                    </select>
                  ) : (
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                        {getStatusText(selectedTask.status)}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Priorité</label>
                  {isEditingTask ? (
                    <select
                      value={editedTask.priority}
                      onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
                      className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="low">Faible</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Haute</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  ) : (
                    <div className={`mt-1 font-medium ${getPriorityColor(selectedTask.priority)}`}>
                      {getPriorityText(selectedTask.priority)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Assigné à</label>
                  <div className="mt-1 flex items-center">
                    {selectedTask.assignedTo ? (
                      <>
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                          {selectedTask.assignedTo.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white">{selectedTask.assignedTo}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">Non assigné</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Échéance</label>
                  {isEditingTask ? (
                    <input
                      type="date"
                      value={editedTask.dueDate ? (() => {
                        try {
                          const date = new Date(editedTask.dueDate);
                          return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : '';
                        } catch {
                          return '';
                        }
                      })() : ''}
                      onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value ? new Date(e.target.value) : null })}
                      className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  ) : (
                    <div className="mt-1 text-white">
                      {selectedTask.dueDate ? (() => {
                        try {
                          const date = new Date(selectedTask.dueDate);
                          return !isNaN(date.getTime()) ? date.toLocaleDateString('fr-FR') : 'Non définie';
                        } catch {
                          return 'Non définie';
                        }
                      })() : 'Non définie'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Temps</label>
                  <div className="mt-1 text-white text-sm">
                    {selectedTask.estimatedHours ? `${selectedTask.estimatedHours}h estimées` : 'Non estimé'}
                    {selectedTask.actualHours && ` / ${selectedTask.actualHours}h réelles`}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Créé le</label>
                  <div className="mt-1 text-white">
                    {new Date(selectedTask.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Mis à jour</label>
                  <div className="mt-1 text-white">
                    {new Date(selectedTask.updatedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                {selectedTask.tags && selectedTask.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Tags</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedTask.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-900/50 text-blue-400 border border-blue-500/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Title (editable) */}
            {isEditingTask && (
              <div>
                <label className="text-sm font-medium text-gray-400">Titre</label>
                <input
                  type="text"
                  value={editedTask.title}
                  onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-400">Description</label>
              {isEditingTask ? (
                <textarea
                  value={editedTask.description || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  rows={4}
                  className="mt-2 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              ) : selectedTask.description ? (
                <div className="mt-2 p-4 bg-gray-800 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              ) : (
                <div className="mt-2 p-4 bg-gray-800 rounded-lg">
                  <p className="text-gray-500 italic">Aucune description</p>
                </div>
              )}
            </div>

            {/* Checklist */}
            {selectedTask.checklist && selectedTask.checklist.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-400">Checklist</label>
                <div className="mt-2 space-y-2">
                  {selectedTask.checklist.map((item, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-800 rounded-lg">
                      <CheckCircle className={`h-5 w-5 mr-3 ${item.completed ? 'text-green-400' : 'text-gray-500'}`} />
                      <span className={`flex-1 ${item.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {selectedTask.comments && selectedTask.comments.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-400">Commentaires ({selectedTask.comments.length})</label>
                <div className="mt-2 space-y-3 max-h-64 overflow-y-auto">
                  {selectedTask.comments.map((comment, index) => (
                    <div key={index} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white font-medium">{comment.author}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              comment.authorRole === 'client' ? 'bg-blue-900/50 text-blue-400' :
                              comment.authorRole === 'admin' ? 'bg-purple-900/50 text-purple-400' :
                              'bg-green-900/50 text-green-400'
                            }`}>
                              {comment.authorRole === 'client' ? 'Client' :
                               comment.authorRole === 'admin' ? 'Admin' : 'Développeur'}
                            </span>
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm">
                          {new Date(comment.timestamp).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {selectedTask.attachments && selectedTask.attachments.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-400">Pièces jointes ({selectedTask.attachments.length})</label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTask.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                      <FileText className="h-5 w-5 text-blue-400 mr-3" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{attachment.name}</p>
                        <p className="text-gray-400 text-xs">
                          {attachment.uploadedBy} • {new Date(attachment.uploadedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <button className="text-blue-400 hover:text-blue-300 ml-2">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  const TaskCard = ({ task }) => (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            task.priority === 'urgent' ? 'bg-red-500' :
            task.priority === 'high' ? 'bg-orange-500' :
            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
          }`}></div>
          <h4 className="text-white font-medium text-sm line-clamp-2">{task.title}</h4>
        </div>
        <button
          onClick={() => {
            setSelectedTask(task);
            setShowTaskModal(true);
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      {task.description && (
        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mb-3">
        {task.assignedTo && (
          <div className="flex items-center">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {task.assignedTo.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        {task.dueDate && (
          <div className={`text-xs ${
            new Date(task.dueDate) < new Date() && task.status !== 'done' 
              ? 'text-red-400' 
              : 'text-gray-400'
          }`}>
            {new Date(task.dueDate).toLocaleDateString('fr-FR')}
          </div>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400">
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-gray-400 text-xs">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-gray-400">
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">{task.comments.length}</span>
            </div>
          )}
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center">
              <Paperclip className="h-4 w-4 mr-1" />
              <span className="text-xs">{task.attachments.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const KanbanBoard = () => {
    const columns = [
      { id: 'todo', name: 'À faire', color: 'border-gray-600' },
      { id: 'in_progress', name: 'En cours', color: 'border-blue-600' },
      { id: 'review', name: 'En révision', color: 'border-yellow-600' },
      { id: 'done', name: 'Terminé', color: 'border-green-600' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => {
          const columnTasks = filteredTasks.filter(task => task.status === column.id);
          
          return (
            <div key={column.id} className={`bg-gray-800 rounded-lg border-t-4 ${column.color}`}>
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">{column.name}</h3>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[400px]">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune tâche</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ListView = () => (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tâche</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Priorité</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Assigné à</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Échéance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-white">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-400 line-clamp-1">{task.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      task.priority === 'urgent' ? 'bg-red-500' :
                      task.priority === 'high' ? 'bg-orange-500' :
                      task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <span className={`text-sm ${getPriorityColor(task.priority)}`}>
                      {getPriorityText(task.priority)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {task.assignedTo ? (
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                        {task.assignedTo.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-300 text-sm">{task.assignedTo}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Non assigné</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className={`text-sm ${
                    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' 
                      ? 'text-red-400' 
                      : 'text-gray-300'
                  }`}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : 'Non définie'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setShowTaskModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300"
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-green-400 hover:text-green-300" title="Commenter">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 min-h-screen p-4">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-2">Espace Client</h2>
            <p className="text-sm text-gray-400">DELIVERY Digital Technology</p>
            {user && (
              <p className="text-xs text-gray-500 mt-2">{user.name}</p>
            )}
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'overview'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <BarChart3 className="h-5 w-5 mr-3" />
              Vue d'ensemble
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'projects'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <FolderOpen className="h-5 w-5 mr-3" />
              Mes Projets
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <ClipboardList className="h-5 w-5 mr-3" />
              Mes Tâches
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'messages'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <MessageCircle className="h-5 w-5 mr-3" />
              Messages
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Settings className="h-5 w-5 mr-3" />
              Paramètres
            </button>
          </nav>

          <div className="absolute bottom-4 space-y-2">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <Home className="h-5 w-5 mr-3" />
              Site principal
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Gestion des Tâches</h2>
                <div className="flex items-center space-x-4">
                  {/* Project Selector */}
                  <div className="relative">
                    <select
                      value={selectedProject?.id || ''}
                      onChange={(e) => {
                        const project = projects.find(p => p.id === e.target.value);
                        setSelectedProject(project);
                      }}
                      className="px-4 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm appearance-none"
                    >
                      <option value="">Tous les projets</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.hasUrgentTasks ? '🔴 ' : ''}{project.title}
                        </option>
                      ))}
                    </select>
                    {selectedProject?.hasUrgentTasks && (
                      <AlertTriangle className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500 pointer-events-none animate-pulse" />
                    )}
                    <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={refreshTasks}
                    className="btn btn-secondary"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </button>
                </div>
              </div>

              {/* Project Progress Bar */}
              {selectedProject && taskStats.total > 0 && (
                <div className="bg-gray-800 rounded-lg p-6 mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {selectedProject.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Progression du projet
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">
                        {projectProgress}%
                      </div>
                      <p className="text-sm text-gray-400">
                        {taskStats.done} / {taskStats.total} tâches
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${projectProgress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        projectProgress === 100
                          ? 'bg-green-500'
                          : projectProgress >= 75
                          ? 'bg-blue-500'
                          : projectProgress >= 50
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Project Links */}
              {selectedProject && selectedProject.links && selectedProject.links.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-6 mb-8">
                  <div className="flex items-center mb-4">
                    <Link className="h-5 w-5 text-blue-400 mr-2" />
                    <h3 className="text-lg font-semibold text-white">Liens du Projet</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedProject.links.map((link: any, index: number) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-gray-900 hover:bg-gray-700 p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition-all group"
                      >
                        <div className="text-white font-medium truncate">{link.title}</div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-400 ml-2 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{taskStats.total}</div>
                    <div className="text-gray-400 text-sm">Total</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-400">{taskStats.todo}</div>
                    <div className="text-gray-400 text-sm">À faire</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{taskStats.in_progress}</div>
                    <div className="text-gray-400 text-sm">En cours</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{taskStats.review}</div>
                    <div className="text-gray-400 text-sm">En révision</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{taskStats.done}</div>
                    <div className="text-gray-400 text-sm">Terminé</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{taskStats.blocked}</div>
                    <div className="text-gray-400 text-sm">Bloqué</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{taskStats.overdue}</div>
                    <div className="text-gray-400 text-sm">En retard</div>
                  </div>
                </div>
              </div>

              {/* View Toggle and Filters */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setActiveSubTab('kanban')}
                      className={`flex items-center px-4 py-2 rounded-md transition-all ${
                        activeSubTab === 'kanban'
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Kanban className="h-4 w-4 mr-2" />
                      Kanban
                    </button>
                    <button
                      onClick={() => setActiveSubTab('list')}
                      className={`flex items-center px-4 py-2 rounded-md transition-all ${
                        activeSubTab === 'list'
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <List className="h-4 w-4 mr-2" />
                      Liste
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher des tâches..."
                      className="w-64 px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtres
                  </button>
                </div>
              </div>

              {/* Filters Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-800 rounded-lg p-6 mb-6 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="todo">À faire</option>
                          <option value="in_progress">En cours</option>
                          <option value="review">En révision</option>
                          <option value="done">Terminé</option>
                          <option value="blocked">Bloqué</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Priorité</label>
                        <select
                          value={filters.priority}
                          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        >
                          <option value="all">Toutes les priorités</option>
                          <option value="low">Faible</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Assigné à</label>
                        <select
                          value={filters.assignee}
                          onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        >
                          <option value="all">Tous les assignés</option>
                          {[...new Set(tasks.map(t => t.assignedTo).filter(Boolean))].map((assignee) => (
                            <option key={assignee} value={assignee}>{assignee}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Task Content */}
              {tasksLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Chargement des tâches...</p>
                </div>
              ) : tasksError ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Erreur de chargement</h3>
                  <p className="text-gray-400 mb-6">{tasksError}</p>
                  <button
                    onClick={refreshTasks}
                    className="btn btn-primary"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer
                  </button>
                </div>
              ) : !selectedProject ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Aucun projet sélectionné</h3>
                  <p className="text-gray-400">Sélectionnez un projet pour voir les tâches associées.</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Aucune tâche</h3>
                  <p className="text-gray-400">
                    {searchQuery || filters.status !== 'all' || filters.priority !== 'all' || filters.assignee !== 'all'
                      ? 'Aucune tâche ne correspond aux critères de recherche.'
                      : 'Aucune tâche n\'a été créée pour ce projet.'}
                  </p>
                </div>
              ) : (
                <>
                  {activeSubTab === 'kanban' && <KanbanBoard />}
                  {activeSubTab === 'list' && <ListView />}
                </>
              )}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
                <div className="text-sm text-gray-400">
                  {new Date().toLocaleDateString('fr-FR')}
                </div>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Projets actifs</p>
                      <p className="text-2xl font-bold text-white">
                        {projects.filter(p => p.status === 'in_progress').length}
                      </p>
                    </div>
                    <FolderOpen className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Tâches en cours</p>
                      <p className="text-2xl font-bold text-white">{taskStats.in_progress}</p>
                    </div>
                    <ClipboardList className="h-8 w-8 text-purple-400" />
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Messages non lus</p>
                      <p className="text-2xl font-bold text-white">0</p>
                    </div>
                    <MessageCircle className="h-8 w-8 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Projets récents</h3>
                  <div className="space-y-4">
                    {projects.slice(0, 5).map((project) => (
                      <div key={project.id} className="flex items-center p-3 bg-gray-700 rounded-lg">
                        <FolderOpen className="h-5 w-5 text-blue-400 mr-3" />
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{project.title}</p>
                          <p className="text-gray-400 text-xs">
                            {getStatusText(project.status)} • {new Date(project.lastUpdate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Tâches prioritaires</h3>
                  <div className="space-y-4">
                    {tasks
                      .filter(t => t.priority === 'urgent' || t.priority === 'high')
                      .slice(0, 5)
                      .map((task) => (
                        <div key={task.id} className="flex items-center p-3 bg-gray-700 rounded-lg">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            task.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{task.title}</p>
                            <p className="text-gray-400 text-xs">
                              {getStatusText(task.status)} • {getPriorityText(task.priority)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Mes Projets</h2>
              </div>

              {projectsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Chargement des projets...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Aucun projet</h3>
                  <p className="text-gray-400">Vous n'avez pas encore de projet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-white">{project.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{project.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-400 text-sm">
                          {new Date(project.lastUpdate).toLocaleDateString('fr-FR')}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProject(project);
                            setActiveTab('tasks');
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          Voir les tâches
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Messages</h2>
              </div>
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Messages</h3>
                <p className="text-gray-400">Fonctionnalité de messagerie à venir.</p>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Paramètres</h2>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Informations du compte</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Nom</label>
                    <div className="mt-1 text-white">{user?.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Email</label>
                    <div className="mt-1 text-white">{user?.email}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Entreprise</label>
                    <div className="mt-1 text-white">{user?.company || 'Non renseigné'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Rôle</label>
                    <div className="mt-1 text-white capitalize">{user?.role}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {showTaskModal && selectedTask && <TaskDetailModal />}
      </AnimatePresence>
    </div>
  );
};

export default ClientDashboard;