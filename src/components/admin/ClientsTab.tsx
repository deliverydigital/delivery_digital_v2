import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Eye, CreditCard as Edit, Trash2, RefreshCw, Users, Calendar, Building2, Mail, Phone, MapPin, CheckCircle, AlertTriangle, Star, X, Save, User, UserCog, ListTodo, Clock, Flag, Target } from 'lucide-react';
import { useClients, useProjects } from '../../hooks/useApi';
import { useTasks } from '../../hooks/useTasks';
import { ApiService } from '../../services/api';

const ClientsTab = () => {
  const { clients, loading, updateClient, refreshClients } = useClients();
  const { projects: clientProjects } = useProjects(tasksClientId || undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [editData, setEditData] = useState<any>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    phone: '',
    role: 'client'
  });
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [tasksClientId, setTasksClientId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    status: 'todo'
  });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Get tasks for selected project
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    loading: tasksLoading
  } = useTasks(selectedProject || '');

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (client.company && client.company.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === 'all' || client.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openViewModal = (client: any) => {
    setSelectedClient(client);
    setModalMode('view');
    setShowModal(true);
  };

  const openEditModal = (client: any) => {
    setSelectedClient(client);
    setEditData(client);
    setModalMode('edit');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedClient(null);
    setEditData({});
  };

  const handleSave = async () => {
    if (!selectedClient) return;

    try {
      await updateClient(selectedClient.id, editData);
      closeModal();
      refreshClients();
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const openCreateModal = () => {
    setCreateData({
      name: '',
      email: '',
      password: '',
      company: '',
      phone: '',
      role: 'client'
    });
    setCreateError('');
    setCreateSuccess(false);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateData({
      name: '',
      email: '',
      password: '',
      company: '',
      phone: '',
      role: 'client'
    });
    setCreateError('');
    setCreateSuccess(false);
  };

  const handleCreateUser = async () => {
    setCreateError('');

    if (!createData.name || !createData.email || !createData.password) {
      setCreateError('Nom, email et mot de passe sont requis');
      return;
    }

    if (createData.password.length < 8) {
      setCreateError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      const response = await ApiService.register({
        name: createData.name,
        email: createData.email,
        password: createData.password,
        company: createData.company,
        phone: createData.phone,
        role: createData.role
      });

      if (response.success) {
        setCreateSuccess(true);
        setTimeout(() => {
          closeCreateModal();
          refreshClients();
        }, 2000);
      } else {
        setCreateError(response.error || 'Erreur lors de la création');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      setCreateError(error.message || 'Erreur lors de la création');
    }
  };

  const openTasksModal = (clientId: string) => {
    setTasksClientId(clientId);
    setShowTasksModal(true);
    setSelectedProject('');
    setShowTaskForm(false);
  };

  const closeTasksModal = () => {
    setShowTasksModal(false);
    setTasksClientId(null);
    setSelectedProject('');
    setShowTaskForm(false);
    setEditingTaskId(null);
  };

  const openTaskForm = (task?: any) => {
    if (task) {
      setEditingTaskId(task.id);
      setTaskFormData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        assignedTo: task.assignedTo || '',
        status: task.status
      });
    } else {
      setEditingTaskId(null);
      setTaskFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        status: 'todo'
      });
    }
    setShowTaskForm(true);
  };

  const closeTaskForm = () => {
    setShowTaskForm(false);
    setEditingTaskId(null);
    setTaskFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      assignedTo: '',
      status: 'todo'
    });
  };

  const handleSaveTask = async () => {
    if (!taskFormData.title.trim() || !selectedProject) return;

    try {
      if (editingTaskId) {
        await updateTask(editingTaskId, {
          title: taskFormData.title,
          description: taskFormData.description,
          priority: taskFormData.priority as any,
          dueDate: taskFormData.dueDate ? new Date(taskFormData.dueDate) : undefined,
          assignedTo: taskFormData.assignedTo,
          status: taskFormData.status as any
        });
      } else {
        await createTask({
          title: taskFormData.title,
          description: taskFormData.description,
          priority: taskFormData.priority as any,
          dueDate: taskFormData.dueDate ? new Date(taskFormData.dueDate) : undefined,
          assignedTo: taskFormData.assignedTo,
          status: taskFormData.status as any,
          tags: []
        });
      }
      closeTaskForm();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-700 text-gray-300';
      case 'in_progress': return 'bg-blue-600 text-white';
      case 'review': return 'bg-yellow-600 text-white';
      case 'done': return 'bg-green-600 text-white';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const ClientModal = () => {
    if (!selectedClient) return null;

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
              {modalMode === 'edit' ? 'Modifier le Client' : 'Détails du Client'}
            </h3>
            <div className="flex items-center space-x-2">
              {modalMode === 'view' && (
                <button
                  onClick={() => openEditModal(selectedClient)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Nom</label>
                    <div className="text-white font-medium">{selectedClient.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Email</label>
                    <div className="text-white">{selectedClient.email}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Entreprise</label>
                    <div className="text-white">{selectedClient.company || 'Non renseigné'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Téléphone</label>
                    <div className="text-white">{selectedClient.phone || 'Non renseigné'}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Statut</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedClient.status)}`}>
                      {selectedClient.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Date d'inscription</label>
                    <div className="text-white">
                      {new Date(selectedClient.joinDate).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Dernière connexion</label>
                    <div className="text-white">
                      {selectedClient.lastActivity ? new Date(selectedClient.lastActivity).toLocaleDateString('fr-FR') : 'Jamais'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Nombre de projets</label>
                    <div className="text-white">{selectedClient.projectsCount}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Entreprise</label>
                    <input
                      type="text"
                      value={editData.company || ''}
                      onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
                  <select
                    value={editData.status || ''}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="pending">En attente</option>
                  </select>
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
          <h2 className="text-2xl font-bold text-white">Gestion des Utilisateurs</h2>
          <p className="text-gray-400">Gérez tous vos clients et chefs de projet</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={openCreateModal}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer Utilisateur
          </button>
          <button
            onClick={refreshClients}
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
            placeholder="Rechercher un client..."
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
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
          <option value="pending">En attente</option>
        </select>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Chargement des clients...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun client trouvé</h3>
          <p className="text-gray-400">
            {searchQuery || selectedStatus !== 'all'
              ? 'Aucun client ne correspond aux critères de recherche.'
              : 'Aucun client n\'a été créé.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold mr-3">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{client.name}</h3>
                    <p className="text-gray-400 text-sm">{client.company}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                  {client.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-gray-300 text-sm">
                  <Mail className="h-4 w-4 mr-2 text-blue-400" />
                  {client.email}
                </div>
                {client.phone && (
                  <div className="flex items-center text-gray-300 text-sm">
                    <Phone className="h-4 w-4 mr-2 text-green-400" />
                    {client.phone}
                  </div>
                )}
                <div className="flex items-center text-gray-300 text-sm">
                  <UserCog className="h-4 w-4 mr-2 text-orange-400" />
                  {client.role === 'admin' && 'Administrateur'}
                  {client.role === 'client' && 'Client'}
                  {client.role === 'project_manager' && 'Chef de Projet'}
                  {client.role === 'trainer' && 'Formateur'}
                  {client.role === 'developer' && 'Développeur'}
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-purple-400" />
                  Inscrit le {new Date(client.joinDate).toLocaleDateString('fr-FR')}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {client.projectsCount} projet{client.projectsCount > 1 ? 's' : ''}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openTasksModal(client.id)}
                    className="text-purple-400 hover:text-purple-300"
                    title="Gérer les tâches"
                  >
                    <ListTodo className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openViewModal(client)}
                    className="text-blue-400 hover:text-blue-300"
                    title="Voir les détails"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(client)}
                    className="text-green-400 hover:text-green-300"
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Modal */}
      {showModal && selectedClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {modalMode === 'edit' ? 'Modifier le Client' : 'Détails du Client'}
              </h3>
              <div className="flex items-center space-x-2">
                {modalMode === 'view' && (
                  <button
                    onClick={() => openEditModal(selectedClient)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Nom</label>
                      <div className="text-white font-medium">{selectedClient.name}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Email</label>
                      <div className="text-white">{selectedClient.email}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Type d'utilisateur</label>
                      <div className="text-white">
                        {selectedClient.role === 'admin' && 'Administrateur'}
                        {selectedClient.role === 'client' && 'Client'}
                        {selectedClient.role === 'project_manager' && 'Chef de Projet'}
                        {selectedClient.role === 'trainer' && 'Formateur'}
                        {selectedClient.role === 'developer' && 'Développeur'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Entreprise</label>
                      <div className="text-white">{selectedClient.company || 'Non renseigné'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Téléphone</label>
                      <div className="text-white">{selectedClient.phone || 'Non renseigné'}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Statut</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedClient.status)}`}>
                        {selectedClient.status}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Date d'inscription</label>
                      <div className="text-white">
                        {new Date(selectedClient.joinDate).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Dernière activité</label>
                      <div className="text-white">
                        {selectedClient.lastActivity ? new Date(selectedClient.lastActivity).toLocaleDateString('fr-FR') : 'Jamais'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Nombre de projets</label>
                      <div className="text-white">{selectedClient.projectsCount}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                      <input
                        type="text"
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={editData.email || ''}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Entreprise</label>
                      <input
                        type="text"
                        value={editData.company || ''}
                        onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={editData.phone || ''}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
                    <select
                      value={editData.status || ''}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="pending">En attente</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl"
          >
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Créer un Utilisateur</h3>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {createSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Utilisateur créé avec succès!</h3>
                  <p className="text-gray-400">L'utilisateur a été créé et peut maintenant se connecter.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <UserCog className="h-4 w-4 inline mr-2" />
                      Type d'utilisateur
                    </label>
                    <select
                      value={createData.role}
                      onChange={(e) => setCreateData({ ...createData, role: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="client">Client</option>
                      <option value="project_manager">Chef de Projet</option>
                      <option value="developer">Développeur</option>
                      <option value="trainer">Formateur</option>
                    </select>
                    <p className="text-sm text-gray-400 mt-1">
                      {createData.role === 'project_manager' && 'Les chefs de projet peuvent gérer des projets qui leur sont assignés.'}
                      {createData.role === 'client' && 'Les clients peuvent soumettre des projets et suivre leur progression.'}
                      {createData.role === 'developer' && 'Les développeurs travaillent sur les projets.'}
                      {createData.role === 'trainer' && 'Les formateurs gèrent les programmes de formation.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Nom*</label>
                      <input
                        type="text"
                        value={createData.name}
                        onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        placeholder="Nom complet"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email*</label>
                      <input
                        type="email"
                        value={createData.email}
                        onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        placeholder="email@exemple.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Mot de passe*</label>
                    <input
                      type="password"
                      value={createData.password}
                      onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      placeholder="Minimum 8 caractères"
                      minLength={8}
                      required
                    />
                    <p className="text-sm text-gray-400 mt-1">Le mot de passe doit contenir au moins 8 caractères.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Entreprise</label>
                      <input
                        type="text"
                        value={createData.company}
                        onChange={(e) => setCreateData({ ...createData, company: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        placeholder="Nom de l'entreprise"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={createData.phone}
                        onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        placeholder="+33 6 12 34 56 78"
                      />
                    </div>
                  </div>

                  {createError && (
                    <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-start">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <p className="text-red-200 text-sm">{createError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-4 pt-4 border-t border-gray-800">
                    <button
                      onClick={closeCreateModal}
                      className="btn btn-secondary"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleCreateUser}
                      className="btn btn-primary"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Créer l'utilisateur
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Tasks Management Modal */}
      {showTasksModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-gray-900 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Gestion des Tâches</h3>
              <button onClick={closeTasksModal} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Project Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sélectionner un projet
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    setShowTaskForm(false);
                  }}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">-- Sélectionner un projet --</option>
                  {clientProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProject && (
                <>
                  {/* Add Task Button */}
                  {!showTaskForm && (
                    <div className="mb-4">
                      <button
                        onClick={() => openTaskForm()}
                        className="btn btn-primary"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Créer une tâche
                      </button>
                    </div>
                  )}

                  {/* Task Form */}
                  {showTaskForm && (
                    <div className="mb-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <h4 className="text-lg font-medium text-white mb-4">
                        {editingTaskId ? 'Modifier la tâche' : 'Nouvelle tâche'}
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Titre*
                          </label>
                          <input
                            type="text"
                            value={taskFormData.title}
                            onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            placeholder="Titre de la tâche"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description
                          </label>
                          <textarea
                            value={taskFormData.description}
                            onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            rows={3}
                            placeholder="Description de la tâche"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Priorité
                            </label>
                            <select
                              value={taskFormData.priority}
                              onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                              <option value="low">Faible</option>
                              <option value="medium">Moyenne</option>
                              <option value="high">Haute</option>
                              <option value="urgent">Urgente</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Statut
                            </label>
                            <select
                              value={taskFormData.status}
                              onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
                              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                              <option value="todo">À faire</option>
                              <option value="in_progress">En cours</option>
                              <option value="review">En révision</option>
                              <option value="done">Terminé</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Date d'échéance
                            </label>
                            <input
                              type="date"
                              value={taskFormData.dueDate}
                              onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                          <button
                            onClick={closeTaskForm}
                            className="btn btn-secondary"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleSaveTask}
                            className="btn btn-primary"
                            disabled={!taskFormData.title.trim()}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {editingTaskId ? 'Mettre à jour' : 'Créer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tasks List */}
                  {tasksLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-4 text-gray-400">Chargement des tâches...</p>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-12 bg-gray-800 rounded-lg">
                      <ListTodo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">Aucune tâche</h3>
                      <p className="text-gray-400">Créez votre première tâche pour ce projet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-white font-medium">{task.title}</h4>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                                  {task.status === 'todo' && 'À faire'}
                                  {task.status === 'in_progress' && 'En cours'}
                                  {task.status === 'review' && 'En révision'}
                                  {task.status === 'done' && 'Terminé'}
                                </span>
                              </div>
                              {task.description && (
                                <p className="text-gray-400 text-sm mb-2">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm">
                                <span className={`flex items-center ${getPriorityColor(task.priority)}`}>
                                  <Flag className="h-4 w-4 mr-1" />
                                  {task.priority === 'low' && 'Faible'}
                                  {task.priority === 'medium' && 'Moyenne'}
                                  {task.priority === 'high' && 'Haute'}
                                  {task.priority === 'urgent' && 'Urgente'}
                                </span>
                                {task.dueDate && (
                                  <span className="flex items-center text-gray-400">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openTaskForm(task)}
                                className="text-blue-400 hover:text-blue-300"
                                title="Modifier"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!selectedProject && (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <ListTodo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Sélectionnez un projet</h3>
                  <p className="text-gray-400">Choisissez un projet pour gérer ses tâches.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ClientsTab;