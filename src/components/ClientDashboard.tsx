import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderOpen, MessageCircle, Settings, LogOut, User, 
  Plus, Clock, CheckCircle, AlertTriangle, Eye, 
  FileText, Calendar, TrendingUp, BarChart3,
  ChevronRight, Download, Upload, Edit, Trash2,
  Search, Filter, RefreshCw, Bell, Home
} from 'lucide-react';
import { useAuth, useProjects, useMessages } from '../hooks/useApi';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'tasks' | 'messages' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  
  const { projects, loading: projectsLoading, refreshProjects } = useProjects(user?.id);
  const { messages, loading: messagesLoading, refreshMessages } = useMessages(selectedProject || undefined, user?.role);

  // Load tasks for client
  const loadTasks = async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const allTasks = [];
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3008';
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      if (selectedProject) {
        // Load tasks for specific project
        console.log('Loading tasks for project:', selectedProject);
        const response = await fetch(`${baseUrl}/api/tasks/project/${selectedProject}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'bypass-tunnel-reminder': 'true'
          }
        });
        
        console.log('Tasks API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Tasks API response data:', data);
          if (data.success && data.data.tasks) {
            allTasks.push(...data.data.tasks.map(transformTaskFromAPI));
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Network error' }));
          console.error('Tasks API error:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
      } else {
        // Load tasks for all client projects
        console.log('Loading tasks for all projects:', projects.length);
        for (const project of projects) {
          try {
            console.log('Loading tasks for project:', project.id, project.title);
            const response = await fetch(`${baseUrl}/api/tasks/project/${project.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'bypass-tunnel-reminder': 'true'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`Tasks for project ${project.id}:`, data);
              if (data.success && data.data.tasks) {
                allTasks.push(...data.data.tasks.map(transformTaskFromAPI));
              }
            } else {
              console.error(`Failed to load tasks for project ${project.id}:`, response.status);
            }
          } catch (error) {
            console.error(`Error loading tasks for project ${project.id}:`, error);
          }
        }
      }
      
      console.log('Total tasks loaded:', allTasks.length);
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasksError(error.message || 'Failed to load tasks');
      setTasks([]);
    }
    setTasksLoading(false);
  };

  // Transform API task data to match expected format
  const transformTaskFromAPI = (apiTask: any) => {
    return {
      id: apiTask.id,
      title: apiTask.title,
      description: apiTask.description || '',
      status: apiTask.status,
      priority: apiTask.priority,
      assignedTo: apiTask.assignedToName,
      dueDate: apiTask.dueDate ? new Date(apiTask.dueDate) : undefined,
      projectId: apiTask.projectId,
      clientId: apiTask.clientId || user?.id,
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
  };

  useEffect(() => {
    // Refresh data when component mounts
    refreshProjects();
    refreshMessages();
    loadTasks();
  }, []);

  useEffect(() => {
    // Reload tasks when projects change or selected project changes
    if (projects.length > 0) {
      loadTasks();
    } else if (!projectsLoading && projects.length === 0) {
      // If no projects and not loading, clear tasks
      setTasks([]);
      setTasksLoading(false);
    }

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-blue-400 bg-blue-900/20';
      case 'reviewing': return 'text-yellow-400 bg-yellow-900/20';
      case 'in_progress': return 'text-purple-400 bg-purple-900/20';
      case 'completed': return 'text-green-400 bg-green-900/20';
      case 'on_hold': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Soumis';
      case 'reviewing': return 'En révision';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      case 'on_hold': return 'En pause';
      default: return status;
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'text-gray-400 bg-gray-900/20';
      case 'in_progress': return 'text-blue-400 bg-blue-900/20';
      case 'review': return 'text-yellow-400 bg-yellow-900/20';
      case 'done': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getTaskStatusText = (status: string) => {
    switch (status) {
      case 'todo': return 'À faire';
      case 'in_progress': return 'En cours';
      case 'review': return 'En révision';
      case 'done': return 'Terminé';
      default: return status;
    }
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentTasks = tasks.slice(0, 5);
  const recentMessages = messages.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 min-h-screen p-4">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-2">Espace Client</h2>
            <p className="text-sm text-gray-400">DELIVERY Digital</p>
            {user && (
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="text-white text-sm font-medium">{user.name}</p>
                    <p className="text-gray-400 text-xs">{user.email}</p>
                  </div>
                </div>
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
              {projects.length > 0 && (
                <span className="ml-auto bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                  {projects.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <CheckCircle className="h-5 w-5 mr-3" />
              Mes Tâches
              {tasks.length > 0 && (
                <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {tasks.filter(t => t.status !== 'done').length}
                </span>
              )}
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
              {messages.filter(m => !m.read).length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {messages.filter(m => !m.read).length}
                </span>
              )}
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
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-white">Bienvenue, {user?.name}</h1>
                  <p className="text-gray-400 mt-2">Voici un aperçu de vos projets et activités</p>
                </div>
                <button
                  onClick={() => {
                    refreshProjects();
                    refreshMessages();
                    if (selectedProject) refreshTasks();
                  }}
                  className="btn btn-secondary"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                      <p className="text-gray-400 text-sm">Projets terminés</p>
                      <p className="text-2xl font-bold text-white">
                        {projects.filter(p => p.status === 'completed').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
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
                    <Clock className="h-8 w-8 text-purple-400" />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Messages non lus</p>
                      <p className="text-2xl font-bold text-white">
                        {messages.filter(m => !m.read).length}
                      </p>
                    </div>
                    <MessageCircle className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Projets récents</h3>
                    <button
                      onClick={() => setActiveTab('projects')}
                      className="text-primary-400 hover:text-primary-300 text-sm"
                    >
                      Voir tout
                    </button>
                  </div>
                  <div className="space-y-4">
                    {projects.slice(0, 3).map((project) => (
                      <div key={project.id} className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                        <FolderOpen className="h-5 w-5 text-blue-400 mr-3" />
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{project.title}</p>
                          <p className="text-gray-400 text-xs">{project.type} • {getStatusText(project.status)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun projet pour le moment</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Tâches récentes</h3>
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="text-primary-400 hover:text-primary-300 text-sm"
                    >
                      Voir tout
                    </button>
                  </div>
                  <div className="space-y-4">
                    {recentTasks.map((task) => (
                      <div key={task.id} className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{task.title}</p>
                          <p className="text-gray-400 text-xs">{task.assignedTo} • {getTaskStatusText(task.status)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getTaskStatusColor(task.status)}`}>
                          {getTaskStatusText(task.status)}
                        </span>
                      </div>
                    ))}
                    {recentTasks.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune tâche pour le moment</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Mes Projets</h2>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un projet..."
                      className="w-64 px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  <button
                    onClick={() => {
                      const event = new CustomEvent('openDigitalClientSpace');
                      window.dispatchEvent(event);
                    }}
                    className="btn btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau Projet
                  </button>
                </div>
              </div>

              {projectsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Chargement des projets...</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredProjects.map((project) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                          <p className="text-gray-400 mb-4">{project.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <span className="text-gray-500 text-sm">Type:</span>
                              <span className="text-white ml-2 text-sm capitalize">{project.type}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 text-sm">Budget:</span>
                              <span className="text-white ml-2 text-sm capitalize">{project.budget}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 text-sm">Délai:</span>
                              <span className="text-white ml-2 text-sm">{project.timeline}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 text-sm">Progression:</span>
                              <span className="text-white ml-2 text-sm">{project.completion_percentage || 0}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {getStatusText(project.status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                          Créé le {new Date(project.submittedAt || project.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedProject(project.id)}
                            className="text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-blue-400 hover:text-blue-300 transition-colors">
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {project.attachments && project.attachments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <h4 className="text-sm font-medium text-white mb-2">Pièces jointes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {project.attachments.map((attachment, index) => (
                              <div key={index} className="flex items-center bg-gray-700 rounded-lg px-3 py-1">
                                <FileText className="h-4 w-4 text-primary-400 mr-2" />
                                <span className="text-sm text-gray-300">{attachment.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {filteredProjects.length === 0 && !projectsLoading && (
                    <div className="text-center py-12 bg-gray-800 rounded-lg">
                      <FolderOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">
                        {searchQuery ? 'Aucun projet trouvé' : 'Aucun projet'}
                      </h3>
                      <p className="text-gray-400 mb-6">
                        {searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Vous n\'avez pas encore de projet.'}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => {
                            const event = new CustomEvent('openDigitalClientSpace');
                            window.dispatchEvent(event);
                          }}
                          className="btn btn-primary"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Créer mon premier projet
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Mes Tâches</h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={loadTasks}
                    className="btn btn-secondary"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </button>
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
                </div>
              </div>

              {tasksError && (
                <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center text-red-400">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <span>Erreur: {tasksError}</span>
                  </div>
                </div>
              )}

              {tasksLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Chargement des tâches...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-gray-800 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2">{task.title}</h3>
                          <p className="text-gray-400 mb-2">{task.description}</p>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-500">Assigné à:</span>
                            <span className="text-white">{task.assignedTo || 'Non assigné'}</span>
                            {task.dueDate && (
                              <>
                                <span className="text-gray-500">Échéance:</span>
                                <span className="text-white">{new Date(task.dueDate).toLocaleDateString('fr-FR')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                          {getTaskStatusText(task.status)}
                        </span>
                      </div>

                      {task.checklist && task.checklist.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-white mb-2">Checklist:</h4>
                          <div className="space-y-1">
                            {task.checklist.slice(0, 3).map((item) => (
                              <div key={item.id} className="flex items-center text-sm">
                                <CheckCircle className={`h-4 w-4 mr-2 ${item.completed ? 'text-green-400' : 'text-gray-500'}`} />
                                <span className={item.completed ? 'text-gray-400 line-through' : 'text-gray-300'}>
                                  {item.title}
                                </span>
                              </div>
                            ))}
                            {task.checklist.length > 3 && (
                              <p className="text-xs text-gray-500 ml-6">
                                +{task.checklist.length - 3} autres éléments
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                          Progression: {task.completionPercentage}%
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Messages de la tâche"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-green-400 hover:text-green-300 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {tasks.length === 0 && !tasksLoading && (
                    <div className="text-center py-12 bg-gray-800 rounded-lg">
                      <CheckCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">Aucune tâche</h3>
                      <p className="text-gray-400">
                        {selectedProject ? 'Aucune tâche pour ce projet' : 'Aucune tâche assignée'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Messages</h2>
                <button
                  onClick={refreshMessages}
                  className="btn btn-secondary"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </button>
              </div>

              {messagesLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Chargement des messages...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="bg-gray-800 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="text-lg font-medium text-white">{message.subject || 'Sans sujet'}</h3>
                            {!message.read && (
                              <span className="ml-2 w-2 h-2 bg-blue-400 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-gray-400 mb-2">{message.content}</p>
                          <div className="text-sm text-gray-500">
                            De: {message.sender} • {new Date(message.timestamp).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {messages.length === 0 && !messagesLoading && (
                    <div className="text-center py-12 bg-gray-800 rounded-lg">
                      <MessageCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">Aucun message</h3>
                      <p className="text-gray-400">Vous n'avez pas encore de messages.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Paramètres du Compte</h2>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Informations Personnelles</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                    <input
                      type="text"
                      value={user?.name || ''}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Entreprise</label>
                    <input
                      type="text"
                      value={user?.company || ''}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Rôle</label>
                    <input
                      type="text"
                      value="Client"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      readOnly
                    />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700">
                  <button className="btn btn-primary">
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier mes informations
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Préférences</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Notifications par email</p>
                      <p className="text-gray-400 text-sm">Recevoir des notifications pour les mises à jour de projets</p>
                    </div>
                    <input type="checkbox" defaultChecked className="toggle" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Notifications de tâches</p>
                      <p className="text-gray-400 text-sm">Recevoir des notifications pour les nouvelles tâches</p>
                    </div>
                    <input type="checkbox" defaultChecked className="toggle" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;