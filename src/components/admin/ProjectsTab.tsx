import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Eye, CreditCard as Edit, Trash2, RefreshCw, FolderOpen, Calendar, User, Building2, Clock, CheckCircle, AlertTriangle, Star, ChevronDown, ChevronUp, X, Save, FileText, ExternalLink, MessageCircle, Settings, UserCog, Link as LinkIcon, Shield, Users, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [projectTypes, setProjectTypes] = useState<any[]>([]);

  const currentUser = ApiService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const isProjectManager = currentUser?.role === 'project_manager';

  useEffect(() => {
    loadProjectManagers();
    loadProjectTypes();
  }, []);

  const loadProjectManagers = async () => {
    const managers = await ApiService.getProjectManagers();
    setProjectManagers(managers);
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
      links: project.links || [],
      taskPermissions: project.taskPermissions || {}
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
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <UserCog className="h-4 w-4 inline mr-2" />
                        Chef de Projet
                      </label>
                      <select
                        value={editData.assignedTo || ''}
                        onChange={(e) => {
                          const managerId = e.target.value;
                          setEditData({ ...editData, assignedTo: managerId || null });
                        }}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="">Non assigné</option>
                        {projectManagers.map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} ({manager.email})
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-400 mt-1">Assignez un chef de projet pour gérer ce projet</p>
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
                    <div className="border-t border-gray-700 pt-6">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Shield className="h-4 w-4 inline mr-2" />
                          Permissions des Tâches
                        </label>
                        <p className="text-sm text-gray-400">Définir les permissions pour gérer les tâches de ce projet par rôle d'utilisateur</p>
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
                    </div>
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