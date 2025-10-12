import { useState } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Plus, Eye, CreditCard as Edit, Trash2, RefreshCw, Tag, Save, X, CheckCircle, AlertTriangle, Palette, Code, PenTool, FileText, Globe, Shield, Users, Briefcase, Heart, BookOpen, Folder } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';

// Move CategoryModal outside the main component to prevent recreation
interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalMode: 'create' | 'edit' | 'view';
  selectedCategory: any;
  formData: any;
  onFormDataChange: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  iconOptions: any[];
  colorOptions: string[];
  getIconComponent: (iconName: string) => React.ReactNode;
}

const CategoryModal = React.memo(({
  isOpen,
  onClose,
  modalMode,
  selectedCategory,
  formData,
  onFormDataChange,
  onSubmit,
  iconOptions,
  colorOptions,
  getIconComponent
}: CategoryModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl"
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">
            {modalMode === 'create' ? 'Créer une Catégorie' : 
             modalMode === 'edit' ? 'Modifier la Catégorie' : 'Détails de la Catégorie'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {modalMode === 'view' && selectedCategory ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                style={{ backgroundColor: `${selectedCategory.color}20`, color: selectedCategory.color }}
              >
                {getIconComponent(selectedCategory.icon)}
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">{selectedCategory.name}</h4>
                <p className="text-gray-400">{selectedCategory.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400">Couleur</label>
                <div className="flex items-center mt-1">
                  <div 
                    className="w-6 h-6 rounded mr-2"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                  <span className="text-white">{selectedCategory.color}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400">Ordre</label>
                <div className="text-white mt-1">{selectedCategory.order}</div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {}}
                className="btn btn-primary"
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom de la catégorie *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormDataChange('name', e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Développement Web"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => onFormDataChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description de la catégorie..."
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icône
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => onFormDataChange('icon', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {iconOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center text-gray-400">
                  <span className="mr-2">Aperçu:</span>
                  {getIconComponent(formData.icon)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => onFormDataChange('order', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Couleur
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onFormDataChange('color', color)}
                    className={`w-8 h-8 rounded border-2 ${
                      formData.color === color ? 'border-white' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => onFormDataChange('color', e.target.value)}
                className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <Save className="h-4 w-4 mr-2" />
                {modalMode === 'create' ? 'Créer' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
});

const CategoriesTab = () => {
  const { 
    categories, 
    loading, 
    error, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    refetch 
  } = useCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'folder',
    order: 0
  });

  const iconOptions = [
    { value: 'code', label: 'Code', icon: <Code className="h-4 w-4" /> },
    { value: 'palette', label: 'Palette', icon: <PenTool className="h-4 w-4" /> },
    { value: 'file-text', label: 'Document', icon: <FileText className="h-4 w-4" /> },
    { value: 'globe', label: 'Globe', icon: <Globe className="h-4 w-4" /> },
    { value: 'shield', label: 'Bouclier', icon: <Shield className="h-4 w-4" /> },
    { value: 'users', label: 'Utilisateurs', icon: <Users className="h-4 w-4" /> },
    { value: 'briefcase', label: 'Mallette', icon: <Briefcase className="h-4 w-4" /> },
    { value: 'heart', label: 'Cœur', icon: <Heart className="h-4 w-4" /> },
    { value: 'book', label: 'Livre', icon: <BookOpen className="h-4 w-4" /> },
    { value: 'folder', label: 'Dossier', icon: <Folder className="h-4 w-4" /> }
  ];

  const colorOptions = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
    '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: 'folder',
      order: categories.length
    });
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (category: any) => {
    setFormData({
      name: category.name || '',
      description: category.description || '',
      color: category.color || '#3b82f6',
      icon: category.icon || 'folder',
      order: category.order || 0
    });
    setSelectedCategory(category);
    setModalMode('edit');
    setShowModal(true);
  };

  const openViewModal = (category: any) => {
    setSelectedCategory(category);
    setModalMode('view');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCategory(null);
    resetForm();
  };

  // Memoized handlers to prevent re-creation on every render
  const handleFormDataChange = React.useCallback((field: string, value: any) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Le nom de la catégorie est requis');
      return;
    }

    try {
      let result;
      
      if (modalMode === 'create') {
        result = await createCategory(formData);
      } else if (modalMode === 'edit' && selectedCategory) {
        result = await updateCategory(selectedCategory.id, formData);
      }

      if (result?.success) {
        closeModal();
        refetch();
      } else {
        alert(`Erreur: ${result?.error || 'Opération échouée'}`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      try {
        const result = await deleteCategory(categoryId);
        if (result.success) {
          refetch();
        } else {
          alert(`Erreur lors de la suppression: ${result.error || 'Erreur inconnue'}`);
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption?.icon || <Folder className="h-4 w-4" />;
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestion des Catégories</h2>
          <p className="text-gray-400">Gérez les catégories de formation</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={refetch}
            className="btn btn-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </button>
          <button
            onClick={openCreateModal}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Catégorie
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une catégorie..."
          className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Chargement des catégories...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Erreur de chargement</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={refetch} className="btn btn-primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucune catégorie trouvée</h3>
          <p className="text-gray-400">
            {searchQuery 
              ? 'Aucune catégorie ne correspond à votre recherche.'
              : 'Aucune catégorie n\'a été créée.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all overflow-hidden"
            >
              <div 
                className="h-2"
                style={{ backgroundColor: category.color }}
              />
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      {getIconComponent(category.icon)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{category.name}</h3>
                      <p className="text-sm text-gray-400">Ordre: {category.order}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    category.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {category.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {category.description && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {category.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Créé le {new Date(category.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openViewModal(category)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(category)}
                      className="text-green-400 hover:text-green-300"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <CategoryModal
            isOpen={showModal}
            onClose={closeModal}
            modalMode={modalMode}
            selectedCategory={selectedCategory}
            formData={formData}
            onFormDataChange={handleFormDataChange}
            onSubmit={handleSubmit}
            iconOptions={iconOptions}
            colorOptions={colorOptions}
            getIconComponent={getIconComponent}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoriesTab;