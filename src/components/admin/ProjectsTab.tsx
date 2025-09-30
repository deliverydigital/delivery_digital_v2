import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Filter, Plus, Eye, Edit, Trash2, RefreshCw,
  FolderOpen, Calendar, User, Building2, Clock, CheckCircle,
  AlertTriangle, Star, ChevronDown, ChevronUp, X, Save,
  FileText, ExternalLink, MessageCircle, Settings
} from 'lucide-react';
import { useProjects, useClients } from '../../hooks/useApi';

const ProjectsTab = () => {
  const { projects, loading, updateProject, refreshProjects } = useProjects();
  const { clients } = useClients();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [editData, setEditData] = useState<any>({});

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
    setSelectedProject(project);
    setEditData(project);
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

  const ProjectModal = () => {
    if (!selectedProject) return null;

    return (
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
              {modalMode === 'view' && (
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
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
                        <button
                          onClick={() => openEditModal(project)}
                          className="text-green-400 hover:text-green-300"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
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
        </div>
      )}

      {/* Project Modal */}
      {showModal && <ProjectModal />}
    </div>
  );
};

export default ProjectsTab;