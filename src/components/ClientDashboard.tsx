import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, Building2, Calendar, Clock, 
  MapPin, Users, Euro, CheckCircle, AlertCircle, 
  FileText, Download, Star, Send, Briefcase, 
  CreditCard, Shield, Award, BookOpen, Target, ExternalLink,
  Plus, MessageCircle, FolderOpen, Settings, LogOut, Search, 
  ChevronRight, Image as ImageIcon, Edit, Trash2, Eye, 
  Filter, MoreVertical, Reply, Forward, Paperclip, Save, 
  RefreshCw, Home, Kanban, GraduationCap, Code, UserCheck, 
  FileSignature, ClipboardList, BarChart3, TrendingUp, Zap, 
  Link, Upload, Database, Globe, Bell, X, ArrowRight, ArrowLeft,
  Hash, Clock3, User2, Calendar as CalendarIcon, Flag, 
  CheckSquare, MessageSquare, Paperclip as AttachIcon,
  ChevronDown, ChevronUp, Copy, Archive, Pin, Tag,
  Timer, PlayCircle, PauseCircle, StopCircle, RotateCcw
} from 'lucide-react';
import { useAuth, useProjects } from '../hooks/useApi';
import { useTasks } from '../hooks/useTasks';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const { projects, loading: projectsLoading } = useProjects(user?.id);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'tasks' | 'messages' | 'settings'>('overview');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [taskView, setTaskView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Use tasks hook for the selected project
  const { 
    tasks, 
    loading: tasksLoading, 
    error: tasksError,
    addComment,
    updateTask,
    refreshTasks 
  } = useTasks(selectedProject || '');

  // Set first project as selected by default
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'todo': return 'À faire';
      case 'in_progress': return 'En cours';
      case 'review': return 'En révision';
      case 'done': return 'Terminé';
      case 'blocked': return 'Bloqué';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
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
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    done: filteredTasks.filter(t => t.status === 'done'),
    blocked: filteredTasks.filter(t => t.status === 'blocked')
  };

  const TaskCard = ({ task }: { task: any }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={() => {
        setSelectedTask(task);
        setShowTaskDetail(true);
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">{task.title}</h4>
        <div className="flex items-center space-x-1 ml-2">
          <Flag className={`h-4 w-4 ${getPriorityColor(task.priority)}`} />
        </div>
      </div>
      
      {task.description && (
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {task.assignedTo && (
            <div className="flex items-center">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {task.assignedTo.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div className="flex space-x-1">
              {task.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {tag}
                </span>
              ))}
              {task.tags.length > 2 && (
                <span className="text-xs text-gray-400">+{task.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {task.dueDate && (
        <div className="flex items-center text-xs text-gray-500 mb-2">
          <CalendarIcon className="h-3 w-3 mr-1" />
          <span>{new Date(task.dueDate).toLocaleDateString('fr-FR')}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center">
              <MessageSquare className="h-3 w-3 mr-1" />
              <span>{task.comments.length}</span>
            </div>
          )}
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center">
              <AttachIcon className="h-3 w-3 mr-1" />
              <span>{task.attachments.length}</span>
            </div>
          )}
          {task.checklist && task.checklist.length > 0 && (
            <div className="flex items-center">
              <CheckSquare className="h-3 w-3 mr-1" />
              <span>{task.checklist.filter(item => item.completed).length}/{task.checklist.length}</span>
            </div>
          )}
        </div>
        
        {task.completionPercentage > 0 && (
          <div className="w-16">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all"
                style={{ width: `${task.completionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  const KanbanColumn = ({ title, status, tasks, color }: { title: string; status: string; tasks: any[]; color: string }) => (
    <div className="bg-gray-50 rounded-lg p-4 min-h-[600px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: color }}></div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          <span className="ml-2 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  const TaskDetailModal = () => {
    if (!selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(selectedTask.status).split(' ')[0]}`}></div>
              <h3 className="text-xl font-bold text-gray-900">{selectedTask.title}</h3>
            </div>
            <button
              onClick={() => setShowTaskDetail(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                {selectedTask.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  </div>
                )}

                {/* Checklist */}
                {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Liste de contrôle</h4>
                    <div className="space-y-2">
                      {selectedTask.checklist.map((item: any) => (
                        <div key={item.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <CheckSquare className={`h-4 w-4 mr-3 ${item.completed ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className={`flex-1 ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {item.title}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      {selectedTask.checklist.filter((item: any) => item.completed).length} / {selectedTask.checklist.length} terminé(s)
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Commentaires ({selectedTask.comments?.length || 0})</h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {selectedTask.comments && selectedTask.comments.length > 0 ? (
                      selectedTask.comments.map((comment: any) => (
                        <div key={comment.id} className="flex space-x-3 p-4 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900">{comment.author}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                comment.authorRole === 'admin' ? 'bg-purple-100 text-purple-800' :
                                comment.authorRole === 'developer' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {comment.authorRole === 'admin' ? 'Admin' :
                                 comment.authorRole === 'developer' ? 'Développeur' : 'Client'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.timestamp).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm">{comment.content}</p>
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {comment.attachments.map((attachment: any, index: number) => (
                                  <div key={index} className="flex items-center text-xs text-blue-600">
                                    <AttachIcon className="h-3 w-3 mr-1" />
                                    <span>{attachment.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">Aucun commentaire pour le moment</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Task Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Informations</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">Statut</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedTask.status)}`}>
                          {getStatusText(selectedTask.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500">Priorité</span>
                      <div className="mt-1 flex items-center">
                        <Flag className={`h-4 w-4 mr-2 ${getPriorityColor(selectedTask.priority)}`} />
                        <span className="text-sm text-gray-900">{getPriorityText(selectedTask.priority)}</span>
                      </div>
                    </div>

                    {selectedTask.assignedTo && (
                      <div>
                        <span className="text-sm text-gray-500">Assigné à</span>
                        <div className="mt-1 flex items-center">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium mr-2">
                            {selectedTask.assignedTo.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-900">{selectedTask.assignedTo}</span>
                        </div>
                      </div>
                    )}

                    {selectedTask.dueDate && (
                      <div>
                        <span className="text-sm text-gray-500">Échéance</span>
                        <div className="mt-1 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {new Date(selectedTask.dueDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-sm text-gray-500">Progression</span>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">{selectedTask.completionPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${selectedTask.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {(selectedTask.estimatedHours || selectedTask.actualHours) && (
                      <div>
                        <span className="text-sm text-gray-500">Temps</span>
                        <div className="mt-1 space-y-1">
                          {selectedTask.estimatedHours && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Clock3 className="h-3 w-3 mr-1" />
                              <span>Estimé: {selectedTask.estimatedHours}h</span>
                            </div>
                          )}
                          {selectedTask.actualHours && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Timer className="h-3 w-3 mr-1" />
                              <span>Réel: {selectedTask.actualHours}h</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {selectedTask.tags && selectedTask.tags.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.tags.map((tag: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Pièces jointes</h4>
                    <div className="space-y-2">
                      {selectedTask.attachments.map((attachment: any) => (
                        <div key={attachment.id} className="flex items-center p-2 bg-white rounded border">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="flex-1 text-sm text-gray-900 truncate">{attachment.name}</span>
                          <button className="text-blue-600 hover:text-blue-800 ml-2">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Activité</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <span>Créé le {new Date(selectedTask.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span>Mis à jour le {new Date(selectedTask.updatedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 min-h-screen p-4">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-2">Espace Client</h2>
            <p className="text-sm text-gray-400">DELIVERY Digital Technology</p>
            {user && (
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <p className="text-white text-sm font-medium">{user.name}</p>
                <p className="text-gray-400 text-xs">{user.email}</p>
                <p className="text-gray-400 text-xs">{user.company}</p>
              </div>
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
                <div className="text-sm text-gray-400">
                  {new Date().toLocaleDateString('fr-FR')}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                      <p className="text-2xl font-bold text-white">
                        {tasks.filter(t => t.status === 'in_progress').length}
                      </p>
                    </div>
                    <ClipboardList className="h-8 w-8 text-green-400" />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Tâches terminées</p>
                      <p className="text-2xl font-bold text-white">
                        {tasks.filter(t => t.status === 'done').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-purple-400" />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Messages non lus</p>
                      <p className="text-2xl font-bold text-white">3</p>
                    </div>
                    <MessageCircle className="h-8 w-8 text-yellow-400" />
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
                          <p className="text-gray-400 text-xs">{project.type} - {getStatusText(project.status)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Tâches prioritaires</h3>
                  <div className="space-y-4">
                    {tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center p-3 bg-gray-700 rounded-lg">
                        <Flag className={`h-5 w-5 mr-3 ${getPriorityColor(task.priority)}`} />
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{task.title}</p>
                          <p className="text-gray-400 text-xs">{getPriorityText(task.priority)} - {getStatusText(task.status)}</p>
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
                <button className="btn btn-primary">
                  <Plus className="h-5 w-5 mr-2" />
                  Nouveau Projet
                </button>
              </div>

              {projectsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Chargement des projets...</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                          <p className="text-gray-400">{project.description}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-gray-500 text-sm">Type:</span>
                          <span className="text-gray-300 ml-2 text-sm capitalize">{project.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Budget:</span>
                          <span className="text-gray-300 ml-2 text-sm capitalize">{project.budget}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Délai:</span>
                          <span className="text-gray-300 ml-2 text-sm">{project.timeline}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Soumis le:</span>
                          <span className="text-gray-300 ml-2 text-sm">
                            {new Date(project.submittedAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button 
                            onClick={() => setSelectedProject(project.id)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button className="text-green-400 hover:text-green-300 transition-colors">
                            <MessageCircle className="h-5 w-5" />
                          </button>
                        </div>
                        <span className="text-sm text-gray-400">
                          Dernière mise à jour : {new Date(project.lastUpdate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Gestion des Tâches</h2>
                <div className="flex items-center space-x-4">
                  <select
                    value={selectedProject || ''}
                    onChange={(e) => setSelectedProject(e.target.value || null)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Tous les projets</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setTaskView('kanban')}
                      className={`p-2 rounded-lg transition-colors ${
                        taskView === 'kanban' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Kanban className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setTaskView('list')}
                      className={`p-2 rounded-lg transition-colors ${
                        taskView === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <ClipboardList className="h-5 w-5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="btn btn-secondary"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtres
                  </button>

                  <button
                    onClick={refreshTasks}
                    className="btn btn-secondary"
                    disabled={tasksLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${tasksLoading ? 'animate-spin' : ''}`} />
                    Actualiser
                  </button>
                </div>
              </div>

              {/* Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 bg-gray-800 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Recherche</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher des tâches..."
                            className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                          />
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
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
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        >
                          <option value="all">Toutes les priorités</option>
                          <option value="low">Faible</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Task Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs">Total</p>
                      <p className="text-xl font-bold text-white">{filteredTasks.length}</p>
                    </div>
                    <ClipboardList className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs">À faire</p>
                      <p className="text-xl font-bold text-white">{tasksByStatus.todo.length}</p>
                    </div>
                    <Clock className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs">En cours</p>
                      <p className="text-xl font-bold text-white">{tasksByStatus.in_progress.length}</p>
                    </div>
                    <PlayCircle className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs">En révision</p>
                      <p className="text-xl font-bold text-white">{tasksByStatus.review.length}</p>
                    </div>
                    <Eye className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs">Terminé</p>
                      <p className="text-xl font-bold text-white">{tasksByStatus.done.length}</p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Task Content */}
              {tasksLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Chargement des tâches...</p>
                </div>
              ) : tasksError ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Erreur de chargement</h3>
                  <p className="text-gray-400 mb-4">{tasksError}</p>
                  <button onClick={refreshTasks} className="btn btn-primary">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer
                  </button>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Aucune tâche</h3>
                  <p className="text-gray-400">
                    {selectedProject ? 'Aucune tâche pour ce projet.' : 'Aucune tâche trouvée.'}
                  </p>
                </div>
              ) : (
                <>
                  {taskView === 'kanban' ? (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      <KanbanColumn 
                        title="À faire" 
                        status="todo" 
                        tasks={tasksByStatus.todo} 
                        color="#6b7280" 
                      />
                      <KanbanColumn 
                        title="En cours" 
                        status="in_progress" 
                        tasks={tasksByStatus.in_progress} 
                        color="#3b82f6" 
                      />
                      <KanbanColumn 
                        title="En révision" 
                        status="review" 
                        tasks={tasksByStatus.review} 
                        color="#f59e0b" 
                      />
                      <KanbanColumn 
                        title="Terminé" 
                        status="done" 
                        tasks={tasksByStatus.done} 
                        color="#10b981" 
                      />
                      <KanbanColumn 
                        title="Bloqué" 
                        status="blocked" 
                        tasks={tasksByStatus.blocked} 
                        color="#ef4444" 
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tâche</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Statut</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Priorité</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Assigné</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Échéance</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Progression</th>
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
                                      <div className="text-sm text-gray-400 truncate max-w-xs">
                                        {task.description}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                    {getStatusText(task.status)}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center">
                                    <Flag className={`h-4 w-4 mr-2 ${getPriorityColor(task.priority)}`} />
                                    <span className="text-sm text-gray-300">{getPriorityText(task.priority)}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {task.assignedTo ? (
                                    <div className="flex items-center">
                                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium mr-2">
                                        {task.assignedTo.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-sm text-gray-300">{task.assignedTo}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-500">Non assigné</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {task.dueDate ? (
                                    <div className="text-sm text-gray-300">
                                      {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-500">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center">
                                    <div className="w-16 bg-gray-600 rounded-full h-2 mr-2">
                                      <div 
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{ width: `${task.completionPercentage}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-300">{task.completionPercentage}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setShowTaskDetail(true);
                                      }}
                                      className="text-blue-400 hover:text-blue-300 transition-colors"
                                      title="Voir les détails"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      className="text-green-400 hover:text-green-300 transition-colors"
                                      title="Commenter"
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-8">Messages</h2>
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-gray-400">Fonctionnalité de messagerie en cours de développement...</p>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-8">Paramètres</h2>
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-gray-400">Paramètres du compte en cours de développement...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {showTaskDetail && <TaskDetailModal />}
      </AnimatePresence>
    </div>
  );
};

export default ClientDashboard;