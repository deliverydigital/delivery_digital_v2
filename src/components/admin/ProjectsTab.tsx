import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Eye, CreditCard as Edit, Trash2, RefreshCw, FolderOpen, Calendar, User, Building2, Clock, CheckCircle, AlertTriangle, Star, ChevronDown, ChevronUp, X, Save, FileText, ExternalLink, MessageCircle, Settings, UserCog, Link as LinkIcon, Shield, Users, ChevronLeft, ChevronRight, Euro, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useProjects, useClients } from '../../hooks/useApi';
import { ApiService } from '../../services/api';
import projectTypesApi from '../../services/projectTypesApi';

const ProjectsTab = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(1000);
  const { projects, loading, updateProject, refreshProjects, pagination } = useProjects(undefined, currentPage, itemsPerPage);
  const { clients } = useClients();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [editData, setEditData] = useState<any>({});
  const [projectManagers, setProjectManagers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [projectTypes, setProjectTypes] = useState<any[]>([]);
  const [showProjectSearch, setShowProjectSearch] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [userSearchQueries, setUserSearchQueries] = useState<{[key: number]: string}>({});
  const [showUserDropdowns, setShowUserDropdowns] = useState<{[key: number]: boolean}>({});

  const currentUser = ApiService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const isProjectManager = currentUser?.role === 'project_manager';

  useEffect(() => {
    loadProjectManagers();
    loadAllUsers();
    loadProjectTypes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-search-dropdown')) {
        setShowUserDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProjectManagers = async () => {
    const managers = await ApiService.getProjectManagers();
    setProjectManagers(managers);
  };

  const loadAllUsers = async () => {
    const users = await ApiService.getAllUsers();
    setAllUsers(users);
  };

  const loadProjectTypes = async () => {
    const response = await projectTypesApi.getAllProjectTypes();
    if (response.success && response.data) {
      console.log('Loaded project types:', response.data);
      setProjectTypes(response.data);
    } else {
      console.error('Failed to load project types:', response.error);
    }
  };

  const canEditProject = (project: any) => {
    if (isAdmin) return true;
    if (isProjectManager && project.assignedTo?.id === currentUser?.id) return true;
    return false;
  };

  const getDefaultPermission = (role: string, action: string) => {
    const defaults: any = {
      client: { view: true, add: false, update: false, delete: false, draggable: false },
      project_manager: { view: true, add: true, update: true, delete: true, draggable: true },
      developer: { view: true, add: false, update: true, delete: false, draggable: true },
      trainer: { view: true, add: false, update: false, delete: false, draggable: false }
    };
    return defaults[role]?.[action] || false;
  };

  const handleAssignManager = async (projectId: string, managerId: string) => {
    try {
      await ApiService.assignProjectToManager(projectId, managerId);
      refreshProjects();
    } catch (error) {
      console.error('Error assigning project manager:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || project.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const searchFilteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
    project.clientName.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
    project.type?.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project);
    setShowProjectSearch(false);
    setProjectSearchQuery('');
    openViewModal(project);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'reviewing': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'urgent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const openViewModal = (project: any) => {
    setSelectedProject(project);
    setModalMode('view');
    setShowModal(true);
  };

  const openEditModal = (project: any) => {
    console.log('Opening edit modal for project:', project);
    console.log('Project type:', project.type);
    setSelectedProject(project);
    const editableData = {
      ...project,
      type: project.type || '',
      assignedTo: project.assignedTo?.id || '',
      assignedUsers: project.assignedUsers || [],
      links: project.links || [],
      taskPermissions: project.taskPermissions || {},
      legalInfo: project.legalInfo || {},
      financialData: project.financialData || {
        revenue: 0,
        expenses: 0,
        profit_margin: 0,
        expense_details: [],
        payment_details: []
      }
    };
    console.log('Edit data:', editableData);
    setEditData(editableData);
    setModalMode('edit');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProject(null);
    setEditData({});
  };

  const handleSave = async () => {
    if (!selectedProject) return;

    try {
      console.log('Saving project with data:', editData);
      console.log('Assigned users:', editData.assignedUsers);
      await updateProject(selectedProject.id, editData);
      closeModal();
      refreshProjects();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const addLink = () => {
    setEditData({
      ...editData,
      links: [...(editData.links || []), { title: '', url: '', visibleTo: ['admin', 'project_manager', 'client'] }]
    });
  };

  const updateLink = (index: number, field: 'title' | 'url', value: string) => {
    const updatedLinks = [...(editData.links || [])];
    updatedLinks[index] = { ...updatedLinks[index], [field]: value };
    setEditData({ ...editData, links: updatedLinks });
  };

  const toggleLinkVisibility = (index: number, role: string) => {
    const updatedLinks = [...(editData.links || [])];
    const link = updatedLinks[index];
    const visibleTo = link.visibleTo || ['admin', 'project_manager', 'client'];

    if (visibleTo.includes(role)) {
      link.visibleTo = visibleTo.filter((r: string) => r !== role);
    } else {
      link.visibleTo = [...visibleTo, role];
    }

    setEditData({ ...editData, links: updatedLinks });
  };

  const removeLink = (index: number) => {
    const updatedLinks = (editData.links || []).filter((_: any, i: number) => i !== index);
    setEditData({ ...editData, links: updatedLinks });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestion des Projets</h2>
          <p className="text-gray-400">Gérez tous les projets clients</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setShowProjectSearch(!showProjectSearch)}
              className="btn btn-primary"
            >
              <Search className="h-4 w-4 mr-2" />
              Rechercher un projet
            </button>

            {showProjectSearch && (
              <div className="absolute right-0 mt-2 w-96 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
                <div className="p-4">
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      placeholder="Rechercher par titre, client ou type..."
                      className="w-full px-4 py-2 pl-10 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {searchFilteredProjects.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Aucun projet trouvé</p>
                      </div>
                    ) : (
                      searchFilteredProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSelect(project)}
                          className="w-full text-left p-3 rounded-lg bg-gray-900 hover:bg-gray-700 transition-colors border border-gray-700 hover:border-blue-500"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-white mb-1">{project.title}</div>
                              <div className="text-sm text-gray-400">{project.clientName}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500">{project.type}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  project.status === 'on_hold' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {project.status}
                                </span>
                              </div>
                            </div>
                            <Eye className="h-4 w-4 text-blue-400 flex-shrink-0 mt-1" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={refreshProjects}
            className="btn btn-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un projet ou client..."
            className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="submitted">Soumis</option>
          <option value="reviewing">En révision</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminé</option>
          <option value="on_hold">En pause</option>
        </select>
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="all">Toutes les priorités</option>
          <option value="low">Faible</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
          <option value="urgent">Urgente</option>
        </select>
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Chargement des projets...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun projet trouvé</h3>
          <p className="text-gray-400">
            {searchQuery || selectedStatus !== 'all' || selectedPriority !== 'all'
              ? 'Aucun projet ne correspond aux critères de recherche.'
              : 'Aucun projet n\'a été créé.'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Projet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Priorité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Progression</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Dernière MAJ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{project.title}</div>
                        <div className="text-sm text-gray-400">{project.type}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{project.clientName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                          project.priority === 'urgent' ? 'bg-red-500' :
                          project.priority === 'high' ? 'bg-orange-500' :
                          project.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <span className={`text-sm ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${project.completionPercentage || 0}%` }}
                          />
                        </div>
                        <span className="text-gray-300 text-xs">
                          {project.completionPercentage || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">
                        {new Date(project.lastUpdate).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openViewModal(project)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEditProject(project) && (
                          <button
                            onClick={() => openEditModal(project)}
                            className="text-green-400 hover:text-green-300"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        <button className="text-purple-400 hover:text-purple-300" title="Messages">
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">
                  Affichage {Math.min(((currentPage - 1) * itemsPerPage) + 1, pagination.total)} à {Math.min(currentPage * itemsPerPage, pagination.total)} sur {pagination.total} projets
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value={10}>10 par page</option>
                  <option value={25}>25 par page</option>
                  <option value={50}>50 par page</option>
                  <option value={100}>100 par page</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                  title="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center space-x-1">
                  {pagination.pages <= 7 ? (
                    // Show all pages if 7 or fewer
                    Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))
                  ) : (
                    // Smart pagination for many pages
                    <>
                      {/* First page */}
                      <button
                        onClick={() => setCurrentPage(1)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          currentPage === 1
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        1
                      </button>

                      {/* Ellipsis after first page */}
                      {currentPage > 3 && <span className="text-gray-500 px-2">...</span>}

                      {/* Pages around current */}
                      {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                        .filter(pageNum => pageNum > 1 && pageNum < pagination.pages && Math.abs(pageNum - currentPage) <= 1)
                        .map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))
                      }

                      {/* Ellipsis before last page */}
                      {currentPage < pagination.pages - 2 && <span className="text-gray-500 px-2">...</span>}

                      {/* Last page */}
                      <button
                        onClick={() => setCurrentPage(pagination.pages)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          currentPage === pagination.pages
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {pagination.pages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                  disabled={currentPage === pagination.pages}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                  title="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Modal */}
      {showModal && selectedProject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {modalMode === 'edit' ? 'Modifier le Projet' : 'Détails du Projet'}
              </h3>
              <div className="flex items-center space-x-2">
                {modalMode === 'view' && canEditProject(selectedProject) && (
                  <button
                    onClick={() => openEditModal(selectedProject)}
                    className="btn btn-secondary"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </button>
                )}
                {modalMode === 'edit' && (
                  <button
                    onClick={handleSave}
                    className="btn btn-primary"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </button>
                )}
                <button onClick={closeModal} className="text-gray-400 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {modalMode === 'view' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-4">{selectedProject.title}</h4>
                      <p className="text-gray-300 mb-4">{selectedProject.description}</p>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-blue-400 mr-2" />
                          <span className="text-gray-300">{selectedProject.clientName}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-green-400 mr-2" />
                          <span className="text-gray-300">
                            {new Date(selectedProject.submittedAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-purple-400 mr-2" />
                          <span className="text-gray-300">{selectedProject.timeline}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white font-medium">{selectedProject.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Statut:</span>
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedProject.status)}`}>
                          {selectedProject.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Priorité:</span>
                        <span className={`font-medium ${getPriorityColor(selectedProject.priority)}`}>
                          {selectedProject.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Budget:</span>
                        <span className="text-white">{selectedProject.budget}</span>
                      </div>
                      {isAdmin && selectedProject.assignedTo && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Chef de Projet:</span>
                          <span className="text-white flex items-center">
                            <UserCog className="h-4 w-4 mr-2 text-blue-400" />
                            {selectedProject.assignedTo.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedProject.figmaUrl && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Figma URL:</label>
                      <a
                        href={selectedProject.figmaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-400 hover:text-blue-300 mt-1"
                      >
                        {selectedProject.figmaUrl}
                        <ExternalLink className="h-4 w-4 inline ml-1" />
                      </a>
                    </div>
                  )}

                  {selectedProject.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Notes:</label>
                      <p className="text-gray-300 mt-1 p-3 bg-gray-800 rounded-lg">
                        {selectedProject.notes}
                      </p>
                    </div>
                  )}

                  {selectedProject.links && selectedProject.links.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        <LinkIcon className="h-4 w-4 inline mr-2" />
                        Liens:
                      </label>
                      <div className="space-y-2">
                        {selectedProject.links.map((link: any, index: number) => (
                          <div key={index} className="bg-gray-800 p-3 rounded-lg">
                            <div className="text-white font-medium mb-1">{link.title}</div>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                            >
                              {link.url}
                              <ExternalLink className="h-3 w-3 inline ml-1" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
                      <input
                        type="text"
                        value={editData.title || ''}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Type de Projet</label>
                      <select
                        value={editData.type || ''}
                        onChange={(e) => {
                          console.log('Selected type:', e.target.value);
                          setEditData({ ...editData, type: e.target.value });
                        }}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="" disabled>Sélectionner un type</option>
                        {projectTypes.map((type) => (
                          <option key={type._id || type.id} value={type.name}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
                      <select
                        value={editData.status || ''}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="submitted">Soumis</option>
                        <option value="reviewing">En révision</option>
                        <option value="in_progress">En cours</option>
                        <option value="completed">Terminé</option>
                        <option value="on_hold">En pause</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Priorité</label>
                      <select
                        value={editData.priority || ''}
                        onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="low">Faible</option>
                        <option value="medium">Moyenne</option>
                        <option value="high">Haute</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Progression (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editData.completionPercentage || 0}
                        onChange={(e) => setEditData({ ...editData, completionPercentage: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  {isAdmin && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-300">
                            <Users className="h-4 w-4 inline mr-2" />
                            Membres de l'équipe
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newUser = { userId: '', role: 'developer' };
                              setEditData({
                                ...editData,
                                assignedUsers: [...(editData.assignedUsers || []), newUser]
                              });
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Ajouter
                          </button>
                        </div>

                        {editData.assignedUsers && editData.assignedUsers.length > 0 ? (
                          <div className="space-y-2">
                            {editData.assignedUsers.map((assignment: any, index: number) => {
                              const selectedUser = allUsers.find(u => u.id === (assignment.userId || assignment.user_id?._id || assignment.user_id));
                              const searchQuery = userSearchQueries[index] || '';
                              const filteredUsers = allUsers.filter(user =>
                                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                user.role.toLowerCase().includes(searchQuery.toLowerCase())
                              );

                              return (
                              <div key={index} className="flex gap-2 items-start p-3 bg-gray-700/50 rounded-lg">
                                <div className="flex-1 relative user-search-dropdown">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={selectedUser ? `${selectedUser.name} - ${selectedUser.role}` : (userSearchQueries[index] || '')}
                                      onChange={(e) => {
                                        setUserSearchQueries({...userSearchQueries, [index]: e.target.value});
                                        setShowUserDropdowns({...showUserDropdowns, [index]: true});
                                      }}
                                      onFocus={() => setShowUserDropdowns({...showUserDropdowns, [index]: true})}
                                      placeholder="Rechercher un utilisateur..."
                                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm pr-8"
                                    />
                                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  </div>
                                  {showUserDropdowns[index] && filteredUsers.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                      {filteredUsers.map(user => (
                                        <button
                                          key={user.id}
                                          type="button"
                                          onClick={() => {
                                            const updatedUsers = [...editData.assignedUsers];
                                            updatedUsers[index] = { ...updatedUsers[index], userId: user.id };
                                            setEditData({ ...editData, assignedUsers: updatedUsers });
                                            setUserSearchQueries({...userSearchQueries, [index]: ''});
                                            setShowUserDropdowns({...showUserDropdowns, [index]: false});
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm transition-colors"
                                        >
                                          <div className="font-medium">{user.name}</div>
                                          <div className="text-xs text-gray-400">{user.role} • {user.email}</div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedUsers = editData.assignedUsers.filter((_: any, i: number) => i !== index);
                                    setEditData({ ...editData, assignedUsers: updatedUsers });
                                  }}
                                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic py-2">Aucun membre assigné</p>
                        )}
                        <p className="text-sm text-gray-400 mt-2">Assignez plusieurs utilisateurs avec différents rôles</p>
                      </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                    <textarea
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-300">
                        <LinkIcon className="h-4 w-4 inline mr-2" />
                        Liens
                      </label>
                      <button
                        type="button"
                        onClick={addLink}
                        className="btn btn-secondary btn-sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter un lien
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(editData.links || []).map((link: any, index: number) => (
                        <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-3">
                          <div className="flex gap-3 items-start">
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={link.title || ''}
                                onChange={(e) => updateLink(index, 'title', e.target.value)}
                                placeholder="Titre du lien"
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                              />
                              <input
                                type="url"
                                value={link.url || ''}
                                onChange={(e) => updateLink(index, 'url', e.target.value)}
                                placeholder="https://example.com"
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLink(index)}
                              className="text-red-400 hover:text-red-300 mt-1"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="border-t border-gray-700 pt-3">
                            <label className="text-xs font-medium text-gray-400 mb-2 flex items-center">
                              <Shield className="h-3 w-3 mr-1" />
                              Visible par:
                            </label>
                            <div className="flex flex-wrap gap-3">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(link.visibleTo || ['admin', 'project_manager', 'client']).includes('admin')}
                                  onChange={() => toggleLinkVisibility(index, 'admin')}
                                  className="mr-2 h-4 w-4 text-blue-600 border-gray-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-300 flex items-center">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Admin
                                </span>
                              </label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(link.visibleTo || ['admin', 'project_manager', 'client']).includes('project_manager')}
                                  onChange={() => toggleLinkVisibility(index, 'project_manager')}
                                  className="mr-2 h-4 w-4 text-blue-600 border-gray-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-300 flex items-center">
                                  <UserCog className="h-3 w-3 mr-1" />
                                  Chef de Projet
                                </span>
                              </label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(link.visibleTo || ['admin', 'project_manager', 'client']).includes('client')}
                                  onChange={() => toggleLinkVisibility(index, 'client')}
                                  className="mr-2 h-4 w-4 text-blue-600 border-gray-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-300 flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  Client
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!editData.links || editData.links.length === 0) && (
                        <p className="text-gray-500 text-sm italic">Aucun lien ajouté</p>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <>
                      <div className="border-t border-gray-700 pt-6">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            <FileText className="h-4 w-4 inline mr-2" />
                            Informations Légales
                          </label>
                          <p className="text-sm text-gray-400">Informations contractuelles et légales du projet</p>
                        </div>

                        <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Nom de l'entreprise</label>
                              <input
                                type="text"
                                value={editData.legalInfo?.company_name || ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  legalInfo: { ...editData.legalInfo, company_name: e.target.value }
                                })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                                placeholder="SARL Example"
                              />
                            </div>

                            <div>
                              <label className="block text-sm text-gray-400 mb-1">SIRET</label>
                              <input
                                type="text"
                                value={editData.legalInfo?.siret || ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  legalInfo: { ...editData.legalInfo, siret: e.target.value }
                                })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                                placeholder="123 456 789 00012"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm text-gray-400 mb-1">Adresse</label>
                              <input
                                type="text"
                                value={editData.legalInfo?.address || ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  legalInfo: { ...editData.legalInfo, address: e.target.value }
                                })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                                placeholder="123 Rue Example, 75001 Paris"
                              />
                            </div>

                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Contact (Nom)</label>
                              <input
                                type="text"
                                value={editData.legalInfo?.contact_name || ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  legalInfo: { ...editData.legalInfo, contact_name: e.target.value }
                                })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                                placeholder="Jean Dupont"
                              />
                            </div>

                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Email de contact</label>
                              <input
                                type="email"
                                value={editData.legalInfo?.contact_email || ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  legalInfo: { ...editData.legalInfo, contact_email: e.target.value }
                                })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                                placeholder="contact@example.com"
                              />
                            </div>

                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Téléphone</label>
                              <input
                                type="tel"
                                value={editData.legalInfo?.contact_phone || ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  legalInfo: { ...editData.legalInfo, contact_phone: e.target.value }
                                })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                                placeholder="+33 1 23 45 67 89"
                              />
                            </div>

                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Date du contrat</label>
                              <input
                                type="date"
                                value={editData.legalInfo?.contract_date ? new Date(editData.legalInfo.contract_date).toISOString().split('T')[0] : ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  legalInfo: { ...editData.legalInfo, contract_date: e.target.value }
                                })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Numéro de contrat</label>
                              <input
                                type="text"
                                value={editData.legalInfo?.contract_number || ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  legalInfo: { ...editData.legalInfo, contract_number: e.target.value }
                                })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                                placeholder="CONT-2024-001"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm text-gray-400 mb-1">Notes légales</label>
                              <textarea
                                value={editData.legalInfo?.notes || ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  legalInfo: { ...editData.legalInfo, notes: e.target.value }
                                })}
                                rows={2}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                                placeholder="Notes importantes..."
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editData.legalInfo?.show_in_dashboard || false}
                                  onChange={(e) => setEditData({
                                    ...editData,
                                    legalInfo: { ...editData.legalInfo, show_in_dashboard: e.target.checked }
                                  })}
                                  className="h-4 w-4 text-blue-600 border-gray-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-300">
                                  Afficher dans le tableau de bord (tâches prioritaires)
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-700 pt-6">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Euro className="h-4 w-4 inline mr-2" />
                            Gestion Financière
                          </label>
                          <p className="text-sm text-gray-400">Suivi des revenus, dépenses et marge bénéficiaire</p>
                        </div>

                        <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
                          {/* Summary Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-400">Revenus</p>
                                  <p className="text-2xl font-bold text-green-400">
                                    {(editData.financialData?.revenue || 0).toLocaleString('fr-FR')} €
                                  </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-400" />
                              </div>
                            </div>

                            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-400">Dépenses</p>
                                  <p className="text-2xl font-bold text-red-400">
                                    {(editData.financialData?.expenses || 0).toLocaleString('fr-FR')} €
                                  </p>
                                </div>
                                <TrendingDown className="h-8 w-8 text-red-400" />
                              </div>
                            </div>

                            <div className={`${
                              (editData.financialData?.profit_margin || 0) >= 0
                                ? 'bg-blue-900/20 border-blue-700/50'
                                : 'bg-orange-900/20 border-orange-700/50'
                            } border rounded-lg p-4`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-400">Balance</p>
                                  <p className={`text-2xl font-bold ${
                                    (editData.financialData?.profit_margin || 0) >= 0
                                      ? 'text-blue-400'
                                      : 'text-orange-400'
                                  }`}>
                                    {(editData.financialData?.profit_margin || 0).toLocaleString('fr-FR')} €
                                  </p>
                                </div>
                                <DollarSign className={`h-8 w-8 ${
                                  (editData.financialData?.profit_margin || 0) >= 0
                                    ? 'text-blue-400'
                                    : 'text-orange-400'
                                }`} />
                              </div>
                            </div>
                          </div>

                          {/* Quick Entry */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-900 rounded-lg">
                            <div>
                              <label className="block text-sm text-gray-400 mb-2">Revenu Total (€)</label>
                              <input
                                type="number"
                                value={editData.financialData?.revenue || 0}
                                onChange={(e) => {
                                  const revenue = parseFloat(e.target.value) || 0;
                                  const expenses = editData.financialData?.expenses || 0;
                                  setEditData({
                                    ...editData,
                                    financialData: {
                                      ...editData.financialData,
                                      revenue: revenue,
                                      profit_margin: revenue - expenses
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                min="0"
                                step="0.01"
                              />
                            </div>

                            <div>
                              <label className="block text-sm text-gray-400 mb-2">Dépenses Totales (€)</label>
                              <input
                                type="number"
                                value={editData.financialData?.expenses || 0}
                                onChange={(e) => {
                                  const expenses = parseFloat(e.target.value) || 0;
                                  const revenue = editData.financialData?.revenue || 0;
                                  setEditData({
                                    ...editData,
                                    financialData: {
                                      ...editData.financialData,
                                      expenses: expenses,
                                      profit_margin: revenue - expenses
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 italic">
                            La balance est calculée automatiquement : Revenus - Dépenses
                          </p>

                          {/* Payment Details */}
                          <div className="mt-6 border-t border-gray-700 pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-300">
                                <TrendingUp className="h-4 w-4 inline mr-2" />
                                Détails des Paiements
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  const newPayment = {
                                    description: '',
                                    amount: 0,
                                    date: new Date().toISOString().split('T')[0],
                                    status: 'pending'
                                  };
                                  setEditData({
                                    ...editData,
                                    financialData: {
                                      ...editData.financialData,
                                      payment_details: [...(editData.financialData?.payment_details || []), newPayment]
                                    }
                                  });
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Ajouter un paiement
                              </button>
                            </div>

                            {editData.financialData?.payment_details && editData.financialData.payment_details.length > 0 ? (
                              <div className="space-y-2">
                                {editData.financialData.payment_details.map((payment: any, index: number) => (
                                  <div key={index} className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <div>
                                        <label className="block text-xs text-gray-400 mb-1">Description</label>
                                        <input
                                          type="text"
                                          value={payment.description || ''}
                                          onChange={(e) => {
                                            const updatedPayments = [...editData.financialData.payment_details];
                                            updatedPayments[index] = { ...updatedPayments[index], description: e.target.value };
                                            setEditData({
                                              ...editData,
                                              financialData: { ...editData.financialData, payment_details: updatedPayments }
                                            });
                                          }}
                                          placeholder="Description du paiement"
                                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-400 mb-1">Montant (€)</label>
                                        <input
                                          type="number"
                                          value={payment.amount || 0}
                                          onChange={(e) => {
                                            const updatedPayments = [...editData.financialData.payment_details];
                                            updatedPayments[index] = { ...updatedPayments[index], amount: parseFloat(e.target.value) || 0 };
                                            setEditData({
                                              ...editData,
                                              financialData: { ...editData.financialData, payment_details: updatedPayments }
                                            });
                                          }}
                                          min="0"
                                          step="0.01"
                                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-400 mb-1">Date</label>
                                        <input
                                          type="date"
                                          value={payment.date ? new Date(payment.date).toISOString().split('T')[0] : ''}
                                          onChange={(e) => {
                                            const updatedPayments = [...editData.financialData.payment_details];
                                            updatedPayments[index] = { ...updatedPayments[index], date: e.target.value };
                                            setEditData({
                                              ...editData,
                                              financialData: { ...editData.financialData, payment_details: updatedPayments }
                                            });
                                          }}
                                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                        />
                                      </div>
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <label className="block text-xs text-gray-400 mb-1">Statut</label>
                                          <select
                                            value={payment.status || 'pending'}
                                            onChange={(e) => {
                                              const updatedPayments = [...editData.financialData.payment_details];
                                              updatedPayments[index] = { ...updatedPayments[index], status: e.target.value };
                                              setEditData({
                                                ...editData,
                                                financialData: { ...editData.financialData, payment_details: updatedPayments }
                                              });
                                            }}
                                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                          >
                                            <option value="pending">En attente</option>
                                            <option value="received">Reçu</option>
                                            <option value="cancelled">Annulé</option>
                                          </select>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updatedPayments = editData.financialData.payment_details.filter((_: any, i: number) => i !== index);
                                            setEditData({
                                              ...editData,
                                              financialData: { ...editData.financialData, payment_details: updatedPayments }
                                            });
                                          }}
                                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic py-2">Aucun paiement enregistré</p>
                            )}
                          </div>

                          {/* Expense Details */}
                          <div className="mt-6 border-t border-gray-700 pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-300">
                                <TrendingDown className="h-4 w-4 inline mr-2" />
                                Détails des Dépenses
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  const newExpense = {
                                    description: '',
                                    amount: 0,
                                    date: new Date().toISOString().split('T')[0],
                                    category: 'other'
                                  };
                                  setEditData({
                                    ...editData,
                                    financialData: {
                                      ...editData.financialData,
                                      expense_details: [...(editData.financialData?.expense_details || []), newExpense]
                                    }
                                  });
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Ajouter une dépense
                              </button>
                            </div>

                            {editData.financialData?.expense_details && editData.financialData.expense_details.length > 0 ? (
                              <div className="space-y-2">
                                {editData.financialData.expense_details.map((expense: any, index: number) => (
                                  <div key={index} className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <div>
                                        <label className="block text-xs text-gray-400 mb-1">Description</label>
                                        <input
                                          type="text"
                                          value={expense.description || ''}
                                          onChange={(e) => {
                                            const updatedExpenses = [...editData.financialData.expense_details];
                                            updatedExpenses[index] = { ...updatedExpenses[index], description: e.target.value };
                                            setEditData({
                                              ...editData,
                                              financialData: { ...editData.financialData, expense_details: updatedExpenses }
                                            });
                                          }}
                                          placeholder="Description de la dépense"
                                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-400 mb-1">Montant (€)</label>
                                        <input
                                          type="number"
                                          value={expense.amount || 0}
                                          onChange={(e) => {
                                            const updatedExpenses = [...editData.financialData.expense_details];
                                            updatedExpenses[index] = { ...updatedExpenses[index], amount: parseFloat(e.target.value) || 0 };
                                            setEditData({
                                              ...editData,
                                              financialData: { ...editData.financialData, expense_details: updatedExpenses }
                                            });
                                          }}
                                          min="0"
                                          step="0.01"
                                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-400 mb-1">Date</label>
                                        <input
                                          type="date"
                                          value={expense.date ? new Date(expense.date).toISOString().split('T')[0] : ''}
                                          onChange={(e) => {
                                            const updatedExpenses = [...editData.financialData.expense_details];
                                            updatedExpenses[index] = { ...updatedExpenses[index], date: e.target.value };
                                            setEditData({
                                              ...editData,
                                              financialData: { ...editData.financialData, expense_details: updatedExpenses }
                                            });
                                          }}
                                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                        />
                                      </div>
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <label className="block text-xs text-gray-400 mb-1">Catégorie</label>
                                          <select
                                            value={expense.category || 'other'}
                                            onChange={(e) => {
                                              const updatedExpenses = [...editData.financialData.expense_details];
                                              updatedExpenses[index] = { ...updatedExpenses[index], category: e.target.value };
                                              setEditData({
                                                ...editData,
                                                financialData: { ...editData.financialData, expense_details: updatedExpenses }
                                              });
                                            }}
                                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                          >
                                            <option value="personnel">Personnel</option>
                                            <option value="infrastructure">Infrastructure</option>
                                            <option value="licenses">Licences</option>
                                            <option value="marketing">Marketing</option>
                                            <option value="other">Autre</option>
                                          </select>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updatedExpenses = editData.financialData.expense_details.filter((_: any, i: number) => i !== index);
                                            setEditData({
                                              ...editData,
                                              financialData: { ...editData.financialData, expense_details: updatedExpenses }
                                            });
                                          }}
                                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic py-2">Aucune dépense enregistrée</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-700 pt-6">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Shield className="h-4 w-4 inline mr-2" />
                            Permissions des Tâches
                          </label>
                          <p className="text-sm text-gray-400">Définir les permissions pour gérer les tâches de ce projet par rôle d'utilisateur</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {['client', 'project_manager', 'developer', 'trainer'].map((role) => (
                          <div key={role} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                            <h4 className="text-white font-medium mb-3 flex items-center">
                              {role === 'client' && <User className="h-4 w-4 mr-2" />}
                              {role === 'project_manager' && <UserCog className="h-4 w-4 mr-2" />}
                              {role === 'developer' && <Users className="h-4 w-4 mr-2" />}
                              {role === 'trainer' && <Users className="h-4 w-4 mr-2" />}
                              {role === 'client' ? 'Client' : role === 'project_manager' ? 'Chef de Projet' : role === 'developer' ? 'Développeur' : 'Formateur'}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              {['view', 'add', 'update', 'delete', 'draggable'].map((action) => (
                                <label key={action} className="flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editData.taskPermissions?.[role]?.[action] ?? getDefaultPermission(role, action)}
                                    onChange={(e) => {
                                      const newPermissions = {
                                        ...editData.taskPermissions,
                                        [role]: {
                                          ...(editData.taskPermissions?.[role] || {}),
                                          [action]: e.target.checked
                                        }
                                      };
                                      setEditData({ ...editData, taskPermissions: newPermissions });
                                    }}
                                    className="mr-2 h-4 w-4 text-blue-600 border-gray-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-300 capitalize">
                                    {action === 'view' ? 'Voir' : action === 'add' ? 'Ajouter' : action === 'update' ? 'Modifier' : action === 'delete' ? 'Supprimer' : 'Déplacer'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProjectsTab;