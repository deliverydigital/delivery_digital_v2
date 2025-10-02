import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard as Edit, Trash2, Eye, Save, X, Upload, Download, FileText, Search, Filter, RefreshCw, CheckCircle, AlertTriangle, Star, Award, Clock, Users, Euro, BookOpen, Target, Globe, Code, Palette, Shield, Briefcase, Heart, Folder, GraduationCap, Settings, ExternalLink, Calendar, MapPin, Phone, Mail, Building2, Tag, BarChart3, TrendingUp, Activity, Zap, PieChart } from 'lucide-react';
import { useTrainingPrograms } from '../hooks/useTrainingPrograms';
import { useTrainingDocuments } from '../hooks/useTrainingDocuments';
import { useCategories } from '../hooks/useCategories';
import React from 'react';

// Separate memoized modal component to prevent re-renders
const ProgramFormModalComponent = memo(({
  formData,
  modalType,
  isSubmitting,
  categories,
  onClose,
  onSubmit,
  onChange
}: any) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">
          {modalType === 'create' ? 'Créer un Programme' : 'Modifier le Programme'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ID Programme *
            </label>
            <input
              type="text"
              value={formData.program_id}
              onChange={(e) => onChange('program_id', e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: wordpress-advanced"
              required
              disabled={modalType === 'edit'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Titre *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onChange('title', e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: WordPress Avancé"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => onChange('description', e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Description détaillée du programme..."
            rows={4}
            required
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`btn ${isSubmitting ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'btn-primary'}`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {modalType === 'create' ? 'Créer' : 'Sauvegarder'}
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
));

const TrainingProgramsManagement = () => {
  const { 
    programs, 
    loading: programsLoading, 
    createProgram, 
    updateProgram, 
    deleteProgram, 
    refetch: refetchPrograms 
  } = useTrainingPrograms();
  
  const { 
    uploadDocument, 
    deleteDocument, 
    downloadDocument 
  } = useTrainingDocuments();
  
  const { categories } = useCategories();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'documents'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'edit' | 'create' | 'upload'>('view');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    program_id: '',
    title: '',
    description: '',
    category: 'web',
    duration_hours: 0,
    price: 0,
    level: 'beginner',
    max_participants: 12,
    prerequisites: '',
    objectives: [''],
    methods: [''],
    evaluation_methods: [''],
    accessibility_info: 'Formation accessible aux personnes en situation de handicap',
    access_delay: '1 semaine',
    is_active: true,
    is_featured: false,
    opco_eligible: true,
    cpf_eligible: false,
    certification_type: '',
    certification_provider: '',
    modules: []
  });

  const [uploadFormData, setUploadFormData] = useState({
    program_id: '',
    program_name: '',
    title: '',
    description: '',
    category: 'program',
    tags: '',
    version: '1.0',
    files: [] as File[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUploadFormChange = (field: string, value: any) => {
    setUploadFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      program_id: '',
      title: '',
      description: '',
      category: 'web',
      duration_hours: 0,
      price: 0,
      level: 'beginner',
      max_participants: 12,
      prerequisites: '',
      objectives: [''],
      methods: [''],
      evaluation_methods: [''],
      accessibility_info: 'Formation accessible aux personnes en situation de handicap',
      access_delay: '1 semaine',
      is_active: true,
      is_featured: false,
      opco_eligible: true,
      cpf_eligible: false,
      certification_type: '',
      certification_provider: '',
      modules: []
    });
  };

  const resetUploadForm = () => {
    setUploadFormData({
      program_id: '',
      program_name: '',
      title: '',
      description: '',
      category: 'program',
      tags: '',
      version: '1.0',
      files: []
    });
  };

  const openCreateModal = () => {
    resetForm();
    setModalType('create');
    setShowModal(true);
  };

  const openEditModal = (program: any) => {
    setFormData({
      program_id: program.program_id || program.id,
      title: program.title || program.name,
      description: program.description || '',
      category: program.category || 'web',
      duration_hours: program.duration_hours || 0,
      price: program.price || 0,
      level: program.level || 'beginner',
      max_participants: program.max_participants || 12,
      prerequisites: program.prerequisites || '',
      objectives: program.objectives && program.objectives.length > 0 ? program.objectives : [''],
      methods: program.methods && program.methods.length > 0 ? program.methods : [''],
      evaluation_methods: program.evaluation_methods && program.evaluation_methods.length > 0 ? program.evaluation_methods : [''],
      accessibility_info: program.accessibility_info || 'Formation accessible aux personnes en situation de handicap',
      access_delay: program.access_delay || '1 semaine',
      is_active: program.is_active !== undefined ? program.is_active : true,
      is_featured: program.is_featured || false,
      opco_eligible: program.opco_eligible !== undefined ? program.opco_eligible : true,
      cpf_eligible: program.cpf_eligible || false,
      certification_type: program.certification_type || '',
      certification_provider: program.certification_provider || '',
      modules: program.modules || []
    });
    setSelectedProgram(program);
    setModalType('edit');
    setShowModal(true);
  };

  const openUploadModal = (program: any) => {
    setUploadFormData({
      program_id: program.program_id || program.id,
      program_name: program.title || program.name,
      title: '',
      description: '',
      category: 'program',
      tags: '',
      version: '1.0',
      files: []
    });
    setSelectedProgram(program);
    setShowUploadModal(true);
  };

  const handleFormChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedProgram(null);
    resetForm();
  }, []);

  const closeUploadModal = useCallback(() => {
    setShowUploadModal(false);
    setSelectedProgram(null);
    resetUploadForm();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result;

      if (modalType === 'create') {
        result = await createProgram(formData);
      } else if (modalType === 'edit' && selectedProgram) {
        result = await updateProgram(selectedProgram.program_id || selectedProgram.id, formData);
      }

      if (result?.success) {
        setShowModal(false);
        setSelectedProgram(null);
        resetForm();
        refetchPrograms();
      } else {
        alert(`Erreur: ${result?.error || 'Opération échouée'}`);
      }
    } catch (error) {
      console.error('Error saving program:', error);
      alert(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
    }

    setIsSubmitting(false);
  }, [modalType, formData, selectedProgram, createProgram, updateProgram, refetchPrograms]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await uploadDocument({
        program_id: uploadFormData.program_id,
        program_name: uploadFormData.program_name,
        title: uploadFormData.title,
        description: uploadFormData.description,
        category: uploadFormData.category,
        tags: uploadFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        version: uploadFormData.version,
        files: uploadFormData.files
      });

      if (result.success) {
        closeUploadModal();
        refetchPrograms();
        alert('Documents téléchargés avec succès !');
      } else {
        alert(`Erreur: ${result.error || 'Échec du téléchargement'}`);
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert(`Erreur lors du téléchargement: ${error.message || 'Erreur inconnue'}`);
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async (programId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce programme de formation ?')) {
      try {
        const result = await deleteProgram(programId);
        if (result.success) {
          refetchPrograms();
        } else {
          alert(`Erreur lors de la suppression: ${result.error || 'Erreur inconnue'}`);
        }
      } catch (error) {
        console.error('Error deleting program:', error);
        alert(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const addArrayItem = (field: 'objectives' | 'methods' | 'evaluation_methods') => {
    setFormData({
      ...formData,
      [field]: [...formData[field], '']
    });
  };

  const updateArrayItem = (field: 'objectives' | 'methods' | 'evaluation_methods', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({
      ...formData,
      [field]: newArray
    });
  };

  const removeArrayItem = (field: 'objectives' | 'methods' | 'evaluation_methods', index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({
      ...formData,
      [field]: newArray.length > 0 ? newArray : ['']
    });
  };

  const getIconComponent = (iconName: string) => {
    const iconMap = {
      code: Code,
      palette: Palette,
      'file-text': FileText,
      globe: Globe,
      shield: Shield,
      users: Users,
      briefcase: Briefcase,
      heart: Heart,
      book: BookOpen,
      folder: Folder
    };
    return iconMap[iconName] || BookOpen;
  };

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || program.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Document Upload Modal Component
  const DocumentUploadModal = () => (
null
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestion des Programmes de Formation</h2>
          <p className="text-gray-400">Gérez les programmes de formation Qualiopi</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={refetchPrograms}
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
            Nouveau Programme
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
            placeholder="Rechercher un programme..."
            className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Programs Grid */}
      {programsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Chargement des programmes...</p>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun programme trouvé</h3>
          <p className="text-gray-400">
            {searchQuery || selectedCategory !== 'all'
              ? 'Aucun programme ne correspond aux critères de recherche.'
              : 'Aucun programme n\'a été créé.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => {
            const categoryData = categories.find(cat => cat.slug === program.category);
            const IconComponent = getIconComponent(categoryData?.icon || 'book');
            
            return (
              <div
                key={program.id}
                className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all overflow-hidden"
              >
                <div 
                  className="h-2"
                  style={{ backgroundColor: categoryData?.color || '#3b82f6' }}
                />
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                        style={{ 
                          backgroundColor: `${categoryData?.color || '#3b82f6'}20`, 
                          color: categoryData?.color || '#3b82f6' 
                        }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{program.title}</h3>
                        <p className="text-sm text-gray-400">{categoryData?.name || program.category}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        program.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {program.is_active ? 'Actif' : 'Inactif'}
                      </span>
                      {program.is_featured && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-900/50 text-yellow-400">
                          <Star className="h-3 w-3 inline mr-1" />
                          Phare
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {program.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Durée:</span>
                      <span className="text-white">{program.duration_hours}h</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Prix:</span>
                      <span className="text-white">{program.price}€</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Participants:</span>
                      <span className="text-white">Max {program.max_participants}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {program.opco_eligible && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-900/50 text-green-400">
                          OPCO
                        </span>
                      )}
                      {program.cpf_eligible && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-400">
                          CPF
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      program.level === 'beginner' ? 'bg-green-900/50 text-green-400' :
                      program.level === 'intermediate' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {program.level === 'beginner' ? 'Débutant' :
                       program.level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      {program.created_at ? new Date(program.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openUploadModal(program)}
                        className="text-blue-400 hover:text-blue-300"
                        title="Télécharger des documents"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(program)}
                        className="text-green-400 hover:text-green-300"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(program.program_id || program.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence mode="wait">
        {showModal && (
          <ProgramFormModalComponent
            key="program-form-modal"
            formData={formData}
            modalType={modalType}
            isSubmitting={isSubmitting}
            categories={categories}
            onClose={closeModal}
            onSubmit={handleSubmit}
            onChange={handleFormChange}
          />
        )}
        {showUploadModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl"
              >
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">Télécharger des documents</h3>
                  <button
                      onClick={closeUploadModal}
                      className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Programme de formation *
                      </label>
                      <select
                          value={uploadFormData.program_id}
                          onChange={(e) => {
                            const selectedProgram = programs.find(p => (p.program_id || p.id) === e.target.value);
                            setUploadFormData(prev => ({
                              ...prev,
                              program_id: e.target.value,
                              program_name: selectedProgram?.title || selectedProgram?.name || ''
                            }));
                          }}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                      >
                        <option value="">Sélectionner un programme</option>
                        {programs.map((program) => (
                            <option key={program.program_id || program.id} value={program.program_id || program.id}>
                              {program.title || program.name}
                            </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Type de document
                      </label>
                      <select
                          value={uploadFormData.category}
                          onChange={(e) => setUploadFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="program">Programme de formation</option>
                        <option value="guide">Guide pratique</option>
                        <option value="certificate">Modèle de certificat</option>
                        <option value="evaluation">Évaluation</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Titre du document *
                    </label>
                    <input
                        type="text"
                        value={uploadFormData.title}
                        onChange={(e) => handleUploadFormChange('title', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: Programme détaillé WordPress"
                        required
                        autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                        value={uploadFormData?.description ?? ''}
                        onChange={(e) => setUploadFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Description du document..."
                        rows={3}
                        autoComplete="off"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tags (séparés par des virgules)
                      </label>
                      <input
                          type="text"
                          value={uploadFormData.tags}
                          onChange={(e) => handleUploadFormChange('tags', e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Ex: wordpress, guide, installation"
                          autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Version
                      </label>
                      <input
                          type="text"
                          value={uploadFormData.version}
                          onChange={(e) => handleUploadFormChange('version', e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="1.0"
                          autoComplete="off"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Fichiers PDF *
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-md hover:border-gray-600 transition-colors">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-400">
                          <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-primary-400 hover:text-primary-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 px-3 py-1"
                          >
                            <span>Télécharger des fichiers PDF</span>
                            <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                className="sr-only"
                                multiple
                                accept=".pdf"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    handleUploadFormChange('files', Array.from(e.target.files));
                                  }
                                }}
                            />
                          </label>
                          <p className="pl-1">ou glisser-déposer</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PDF uniquement, jusqu'à 10MB par fichier
                        </p>
                      </div>
                    </div>
                    {uploadFormData.files.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">
                            Fichiers sélectionnés ({uploadFormData.files.length})
                          </h4>
                          <div className="space-y-2">
                            {uploadFormData.files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                  <div className="flex items-center">
                                    <FileText className="h-5 w-5 text-red-400 mr-3" />
                                    <div>
                                      <p className="text-white text-sm font-medium">{file.name}</p>
                                      <p className="text-gray-400 text-xs">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                      type="button"
                                      onClick={() => {
                                        const newFiles = uploadFormData.files.filter((_, i) => i !== index);
                                        handleUploadFormChange('files', newFiles);
                                      }}
                                      className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                            ))}
                          </div>
                        </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={closeUploadModal}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        disabled={isSubmitting}
                    >
                      Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !uploadFormData.title || uploadFormData.files.length === 0}
                        className={`btn ${
                            isSubmitting || !uploadFormData.title || uploadFormData.files.length === 0
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'btn-primary'
                        }`}
                    >
                      {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                            Téléchargement...
                          </>
                      ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Télécharger
                          </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainingProgramsManagement;