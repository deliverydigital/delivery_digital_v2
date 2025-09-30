import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Eye, CreditCard as Edit, Trash2, RefreshCw, Users, Calendar, Building2, Mail, Phone, MapPin, CheckCircle, AlertTriangle, Star, X, Save, User } from 'lucide-react';
import { useClients } from '../../hooks/useApi';

const ClientsTab = () => {
  const { clients, loading, updateClient, refreshClients } = useClients();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [editData, setEditData] = useState<any>({});

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
          <h2 className="text-2xl font-bold text-white">Gestion des Clients</h2>
          <p className="text-gray-400">Gérez tous vos clients</p>
        </div>
        <div className="flex items-center space-x-4">
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
    </div>
  );
};

export default ClientsTab;