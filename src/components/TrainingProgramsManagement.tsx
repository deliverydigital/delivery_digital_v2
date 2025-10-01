import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard as Edit, Trash2, Eye, Save, X, Upload, Download, Search, Filter, RefreshCw, BookOpen, Users, Clock, Euro, Star, Award, CheckCircle, AlertTriangle, FileText, Calendar, Target, Settings, Copy, ChevronDown, ChevronUp, ExternalLink, Zap, Code, PenTool, Globe, Shield, Heart, Briefcase, GraduationCap, Building2, Utensils, Car } from 'lucide-react';
import { useTrainingPrograms } from '../hooks/useTrainingPrograms';
import { useCategories } from '../hooks/useCategories';

interface TrainingProgram {
  id: string;
  program_id: string;
  title: string;
  description: string;
  category: string;
  duration_hours: number;
  price: number;
  level: string;
  max_participants: number;
  prerequisites?: string;
  objectives: string[];
  methods: string[];
  evaluation_methods: string[];
  accessibility_info?: string;
  access_delay?: string;
  is_active: boolean;
  is_featured?: boolean;
  opco_eligible?: boolean;
  cpf_eligible?: boolean;
  certification_type?: string;
  certification_provider?: string;
  modules: {
    title: string;
    duration_hours: number;
    topics: string[];
    order: number;
  }[];
}

const TrainingProgramsManagement = () => {
  const { programs, loading, error, refetch } = useTrainingPrograms();
  const { categories, loading: categoriesLoading } = useCategories();
  
  // Import the CRUD functions from the hook
  const { createProgram, updateProgram, deleteProgram } = useTrainingPrograms();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showInactive, setShowInactive] = useState(true); // Show all programs by default
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<TrainingProgram>>({
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

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (program: TrainingProgram) => {
    console.log('Opening edit modal for program:', program);
    
    // Create a deep copy of the program data for editing
    // Ensure we have all the required fields with proper fallbacks
    const editData = {
      program_id: program.program_id || program.id || program.name || '',
      title: program.title || program.name || '',
      description: program.description || '',
      category: program.category || 'web',
      duration_hours: Number(program.duration_hours) || 0,
      price: Number(program.price) || 0,
      level: program.level || 'beginner',
      max_participants: Number(program.max_participants) || 12,
      prerequisites: program.prerequisites || 'Aucun prérequis',
      objectives: Array.isArray(program.objectives) && program.objectives.length > 0 ? 
        [...program.objectives] : 
        ['Objectif principal de la formation'],
      methods: Array.isArray(program.methods) && program.methods.length > 0 ? 
        [...program.methods] : 
        ['Formation pratique avec exercices'],
      evaluation_methods: Array.isArray(program.evaluation_methods) && program.evaluation_methods.length > 0 ? 
        [...program.evaluation_methods] : 
        ['QCM d\'évaluation'],
      accessibility_info: program.accessibility_info || 'Formation accessible aux personnes en situation de handicap',
      access_delay: program.access_delay || '1 semaine',
      is_active: Boolean(program.is_active),
      is_featured: Boolean(program.is_featured),
      opco_eligible: Boolean(program.opco_eligible),
      cpf_eligible: Boolean(program.cpf_eligible),
      certification_type: program.certification_type || '',
      certification_provider: program.certification_provider || '',
      modules: Array.isArray(program.modules) && program.modules.length > 0 ? 
        [...program.modules] : 
        [{
          title: 'Module 1',
          duration_hours: Math.floor((program.duration_hours || 35) / 3),
          topics: ['Sujet 1', 'Sujet 2'],
          order: 1
        }]
    };
    
    console.log('Edit data prepared:', editData);
    setFormData(editData);
    setSelectedProgram(program);
    setModalMode('edit');
    setShowModal(true);
    
    // Force a re-render to ensure form fields are populated
    setTimeout(() => {
      console.log('📊 Form data after timeout:', formData);
    }, 100);
  };

  const openViewModal = (program: TrainingProgram) => {
    setSelectedProgram(program);
    setModalMode('view');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProgram(null);
    resetForm();
    setExpandedModules([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', formData);
    
    // Validate required fields
    if (!formData.program_id || !formData.title || !formData.description) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validate numeric fields
    if (!formData.duration_hours || formData.duration_hours <= 0) {
      alert('La durée doit être un nombre positif');
      return;
    }

    if (!formData.price || formData.price < 0) {
      alert('Le prix doit être un nombre positif ou zéro');
      return;
    }

    try {
      // Clean up array fields
      const cleanedData = {
        ...formData,
        // Ensure numeric fields are properly converted
        duration_hours: Number(formData.duration_hours) || 0,
        price: Number(formData.price) || 0,
        max_participants: Number(formData.max_participants) || 12,
        // Clean up array fields
        objectives: formData.objectives?.filter(obj => obj.trim() !== '') || [],
        methods: formData.methods?.filter(method => method.trim() !== '') || [],
        evaluation_methods: formData.evaluation_methods?.filter(method => method.trim() !== '') || [],
        // Ensure boolean fields are properly set
        is_active: Boolean(formData.is_active),
        is_featured: Boolean(formData.is_featured),
        opco_eligible: Boolean(formData.opco_eligible),
        cpf_eligible: Boolean(formData.cpf_eligible),
        // Clean up string fields
        prerequisites: formData.prerequisites?.trim() || '',
        accessibility_info: formData.accessibility_info?.trim() || '',
        access_delay: formData.access_delay?.trim() || '',
        certification_type: formData.certification_type?.trim() || '',
        certification_provider: formData.certification_provider?.trim() || ''
      };

      console.log('Cleaned data for submission:', cleanedData);
      
      if (modalMode === 'create') {
        console.log('Creating new program...');
        const result = await createProgram(cleanedData);
        console.log('Create result:', result);
        if (result.success) {
          console.log('Program created successfully:', result.program);
          alert('Programme créé avec succès !');
          closeModal();
          refetch();
        } else {
          console.error('Create failed:', result.error);
          alert(`Erreur lors de la création: ${result.error || 'Erreur inconnue'}`);
        }
      } else if (modalMode === 'edit') {
        if (!selectedProgram) {
          alert('Aucun programme sélectionné');
          return;
        }
        
        console.log('Updating program:', selectedProgram.id || selectedProgram.program_id);
        const programId = selectedProgram.program_id || selectedProgram.id;
        const result = await updateProgram(programId, cleanedData);
        console.log('Update result:', result);
        if (result.success) {
          console.log('Program updated successfully:', result.program);
          alert('Programme modifié avec succès !');
          closeModal();
          refetch();
        } else {
          console.error('Update failed:', result.error);
          alert(`Erreur lors de la modification: ${result.error || 'Erreur inconnue'}`);
        }
      }
    } catch (error) {
      console.error('Error saving program:', error);
      alert(`Erreur lors de la sauvegarde du programme: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleDelete = async (programId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce programme ?')) {
      try {
        console.log('Deleting program:', programId);
        const result = await deleteProgram(programId);
        console.log('Delete result:', result);
        if (result.success) {
          console.log('Program deleted successfully');
          refetch();
        } else {
          console.error('Delete failed:', result.error);
          alert(`Erreur lors de la suppression: ${result.error || 'Erreur inconnue'}`);
        }
      } catch (error) {
        console.error('Error deleting program:', error);
        alert(`Erreur lors de la suppression du programme: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const handleToggleStatus = async (programId: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return;

    const action = program.is_active ? 'désactiver' : 'activer';
    if (window.confirm(`Êtes-vous sûr de vouloir ${action} ce programme ?`)) {
      try {
        console.log(`Toggling program status:`, programId, 'to', !program.is_active);
        const result = await updateProgram(programId, { is_active: !program.is_active });
        console.log('Toggle status result:', result);
        if (result.success) {
          console.log('Program status updated successfully');
          alert(`Programme ${action === 'activer' ? 'activé' : 'désactivé'} avec succès !`);
          refetch();
        } else {
          console.error('Toggle status failed:', result.error);
          alert(`Erreur lors de la modification du statut: ${result.error || 'Erreur inconnue'}`);
        }
      } catch (error) {
        console.error('Error toggling program status:', error);
        alert(`Erreur lors de la modification du statut: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };
  const addArrayField = (field: 'objectives' | 'methods' | 'evaluation_methods') => {
    setFormData({
      ...formData,
      [field]: [...(formData[field] || []), '']
    });
  };

  const updateArrayField = (field: 'objectives' | 'methods' | 'evaluation_methods', index: number, value: string) => {
    setFormData(prevData => {
      const currentArray = prevData[field] || [];
      const newArray = [...currentArray];
      newArray[index] = value;
      return {
        ...prevData,
        [field]: newArray
      };
    });
  };

  const removeArrayField = (field: 'objectives' | 'methods' | 'evaluation_methods', index: number) => {
    setFormData(prevData => {
      const currentArray = prevData[field] || [];
      const newArray = currentArray.filter((_, i) => i !== index);
      return {
        ...prevData,
        [field]: newArray.length > 0 ? newArray : ['']
      };
    });
  };

  const addModule = () => {
    const newModule = {
      title: '',
      duration_hours: 0,
      topics: [''],
      order: (formData.modules?.length || 0) + 1
    };
    setFormData({
      ...formData,
      modules: [...(formData.modules || []), newModule]
    });
  };

  const updateModule = (index: number, field: string, value: any) => {
    setFormData(prevData => {
      const currentModules = prevData.modules || [];
      const newModules = [...currentModules];
      newModules[index] = { ...newModules[index], [field]: value };
      return {
        ...prevData,
        modules: newModules
      };
    });
  };

  const removeModule = (index: number) => {
    setFormData(prevData => {
      const currentModules = prevData.modules || [];
      const newModules = currentModules.filter((_, i) => i !== index);
      return {
        ...prevData,
        modules: newModules
      };
    });
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // Memoized handlers to prevent re-creation on every render
  const handleFormDataChange = React.useCallback((field: string, value: any) => {
    console.log(`Form field ${field} changed to:`, value);
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  }, []);

  const handleArrayFieldChange = React.useCallback((field: 'objectives' | 'methods' | 'evaluation_methods', index: number, value: string) => {
    setFormData(prevData => {
      const currentArray = prevData[field] || [];
      const newArray = [...currentArray];
      newArray[index] = value;
      return {
        ...prevData,
        [field]: newArray
      };
    });
  }, []);

  const getCategoryIcon = (categorySlug: string) => {
    switch (categorySlug) {
      case 'web': return <Code className="h-5 w-5" />;
      case 'design': return <PenTool className="h-5 w-5" />;
      case 'office': return <FileText className="h-5 w-5" />;
      case 'languages': return <Globe className="h-5 w-5" />;
      case 'safety': return <Shield className="h-5 w-5" />;
      case 'management': return <Users className="h-5 w-5" />;
      case 'business': return <Briefcase className="h-5 w-5" />;
      case 'health': return <Heart className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (categorySlug: string) => {
    const category = categories.find(cat => cat.slug === categorySlug);
    return category?.color || '#3b82f6';
  };

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || program.category === selectedCategory;
    const matchesStatus = showInactive || program.is_active;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Move ProgramModal outside to prevent recreation on every render
  const renderProgramModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-gray-900 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">
            {modalMode === 'create' ? 'Créer un Programme' : 
             modalMode === 'edit' ? 'Modifier le Programme' : 'Détails du Programme'}
          </h3>
          <button onClick={closeModal} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {modalMode === 'view' && selectedProgram ? (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-bold text-white mb-4">{selectedProgram.title}</h4>
                <p className="text-gray-300 mb-4">{selectedProgram.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-blue-400 mr-2" />
                    <span className="text-gray-300">{selectedProgram.duration_hours} heures</span>
                  </div>
                  <div className="flex items-center">
                    <Euro className="h-4 w-4 text-green-400 mr-2" />
                    <span className="text-gray-300">{selectedProgram.price}€</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-purple-400 mr-2" />
                    <span className="text-gray-300">Max {selectedProgram.max_participants} participants</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    selectedProgram.is_featured ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {selectedProgram.is_featured ? 'Programme vedette' : 'Programme standard'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    selectedProgram.opco_eligible ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {selectedProgram.opco_eligible ? 'OPCO éligible' : 'OPCO non éligible'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    selectedProgram.cpf_eligible ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {selectedProgram.cpf_eligible ? 'CPF éligible' : 'CPF non éligible'}
                  </span>
                </div>
              </div>
            </div>

            {selectedProgram.objectives.length > 0 && (
              <div>
                <h5 className="text-lg font-medium text-white mb-3">Objectifs</h5>
                <ul className="space-y-2">
                  {selectedProgram.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start text-gray-300">
                      <Target className="h-4 w-4 mr-2 text-blue-400 mt-0.5" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedProgram.modules.length > 0 && (
              <div>
                <h5 className="text-lg font-medium text-white mb-3">Modules</h5>
                <div className="space-y-3">
                  {selectedProgram.modules.map((module, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <h6 className="font-medium text-white">{module.title}</h6>
                        <span className="text-sm text-gray-400">{module.duration_hours}h</span>
                      </div>
                      {module.topics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {module.topics.map((topic, topicIndex) => (
                            <span key={topicIndex} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ID du Programme *
                </label>
                <input
                  type="text"
                  value={formData.program_id || ''}
                  onChange={(e) => handleFormDataChange('program_id', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: wordpress-advanced"
                  required
                  disabled={modalMode === 'edit'}
                />
                <p className="text-xs text-gray-400 mt-1">Identifiant unique (non modifiable après création)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => {
                    console.log('Title changed to:', e.target.value);
                    handleFormDataChange('title', e.target.value);
                  }}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre de la formation"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => {
                  console.log('📝 Description changed:', e.target.value.substring(0, 50) + '...');
                  setFormData({ ...formData, description: e.target.value });
                }}
                rows={4}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Description détaillée de la formation..."
                required
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Catégorie *
                </label>
                <select
                  value={formData.category || 'web'}
                  onChange={(e) => handleFormDataChange('category', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Durée (heures) *
                </label>
                <input
                  type="number"
                  value={formData.duration_hours || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    console.log('Duration changed to:', value);
                    handleFormDataChange('duration_hours', value);
                  }}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prix (€) *
                </label>
                <input
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    console.log('Price changed to:', value);
                    handleFormDataChange('price', value);
                  }}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Niveau
                </label>
                <select
                  value={formData.level || 'beginner'}
                  onChange={(e) => handleFormDataChange('level', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Débutant</option>
                  <option value="intermediate">Intermédiaire</option>
                  <option value="advanced">Avancé</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Participants maximum
                </label>
                <input
                  type="number"
                  value={formData.max_participants || 12}
                  onChange={(e) => handleFormDataChange('max_participants', parseInt(e.target.value) || 12)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Délai d'accès
                </label>
                <input
                  type="text"
                  value={formData.access_delay || ''}
                  onChange={(e) => handleFormDataChange('access_delay', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: 1 semaine"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prérequis
              </label>
              <textarea
                value={formData.prerequisites || ''}
                onChange={(e) => handleFormDataChange('prerequisites', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Prérequis nécessaires pour suivre cette formation"
                autoComplete="off"
              />
            </div>

            {/* Objectives */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Objectifs pédagogiques
                </label>
                <button
                  type="button"
                  onClick={() => addArrayField('objectives')}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {(formData.objectives || ['']).map((objective, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => handleArrayFieldChange('objectives', index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Objectif ${index + 1}`}
                    />
                    {(formData.objectives?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('objectives', index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Methods */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Méthodes pédagogiques
                </label>
                <button
                  type="button"
                  onClick={() => addArrayField('methods')}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {(formData.methods || ['']).map((method, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={method}
                      onChange={(e) => handleArrayFieldChange('methods', index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Méthode ${index + 1}`}
                    />
                    {(formData.methods?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('methods', index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Evaluation Methods */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Méthodes d'évaluation
                </label>
                <button
                  type="button"
                  onClick={() => addArrayField('evaluation_methods')}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {(formData.evaluation_methods || ['']).map((method, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={method}
                      onChange={(e) => handleArrayFieldChange('evaluation_methods', index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Méthode d'évaluation ${index + 1}`}
                    />
                    {(formData.evaluation_methods?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('evaluation_methods', index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Modules de formation
                </label>
                <button
                  type="button"
                  onClick={addModule}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un module
                </button>
              </div>
              <div className="space-y-4">
                {(formData.modules || []).map((module, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h6 className="text-white font-medium">Module {index + 1}</h6>
                      <button
                        type="button"
                        onClick={() => removeModule(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        value={module.title}
                        onChange={(e) => updateModule(index, 'title', e.target.value)}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Titre du module"
                      />
                      <input
                        type="number"
                        value={module.duration_hours}
                        onChange={(e) => updateModule(index, 'duration_hours', parseInt(e.target.value) || 0)}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Durée (heures)"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Sujets (un par ligne)</label>
                      <textarea
                        value={module.topics.join('\n')}
                        onChange={(e) => updateModule(index, 'topics', e.target.value.split('\n').filter(topic => topic.trim()))}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Sujet 1&#10;Sujet 2&#10;Sujet 3"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type de certification
                </label>
                <input
                  type="text"
                  value={formData.certification_type || ''}
                  onChange={(e) => setFormData({ ...formData, certification_type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Attestation de formation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organisme certificateur
                </label>
                <input
                  type="text"
                  value={formData.certification_provider || ''}
                  onChange={(e) => setFormData({ ...formData, certification_provider: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: DELIVERY Digital Technology"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h5 className="text-lg font-medium text-white mb-4">Paramètres</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active || false}
                      onChange={(e) => handleFormDataChange('is_active', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    <span className="text-gray-300">Programme actif</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_featured || false}
                      onChange={(e) => handleFormDataChange('is_featured', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    <span className="text-gray-300">Programme vedette</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.opco_eligible || false}
                      onChange={(e) => handleFormDataChange('opco_eligible', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    <span className="text-gray-300">Éligible OPCO</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.cpf_eligible || false}
                      onChange={(e) => handleFormDataChange('cpf_eligible', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    <span className="text-gray-300">Éligible CPF</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Informations d'accessibilité
              </label>
              <textarea
                value={formData.accessibility_info || ''}
                onChange={(e) => handleFormDataChange('accessibility_info', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Informations sur l'accessibilité de la formation"
                autoComplete="off"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <Save className="h-4 w-4 mr-2" />
                {modalMode === 'create' ? 'Créer le programme' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Programmes de Formation</h2>
          <p className="text-gray-400">Gérez vos programmes de formation certifiés Qualiopi</p>
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
            className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <div className="flex items-center space-x-2">
          <label className="flex items-center text-gray-300">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="mr-2 rounded"
            />
            <span className="text-sm">Afficher les programmes inactifs</span>
          </label>
        </div>
      </div>

      {/* Programs Grid */}
      {loading || categoriesLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Chargement des programmes...</p>
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
      ) : filteredPrograms.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun programme trouvé</h3>
          <p className="text-gray-400">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Aucun programme ne correspond aux critères de recherche.'
              : 'Aucun programme de formation n\'a été créé.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => {
            const categoryColor = getCategoryColor(program.category);
            
            return (
              <div
                key={program.id}
                className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all overflow-hidden"
              >
                <div 
                  className="h-2"
                  style={{ backgroundColor: categoryColor }}
                />
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                        style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
                      >
                        {getCategoryIcon(program.category)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{program.title}</h3>
                        <p className="text-sm text-gray-400">
                          {program.duration_hours}h • {program.price}€
                        </p>
                      </div>
                    </div>
                    {program.is_featured && (
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    )}
                  </div>

                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                    {program.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      program.level === 'beginner' ? 'bg-green-900/50 text-green-400' :
                      program.level === 'intermediate' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {program.level === 'beginner' ? 'Débutant' :
                       program.level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      program.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {program.is_active ? 'Actif' : 'Inactif'}
                    </span>
                    {program.opco_eligible && (
                      <span className="px-2 py-1 bg-blue-900/50 text-blue-400 rounded text-xs font-medium">
                        OPCO
                      </span>
                    )}
                    {program.cpf_eligible && (
                      <span className="px-2 py-1 bg-purple-900/50 text-purple-400 rounded text-xs font-medium">
                        CPF
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-400">
                      <Users className="h-4 w-4 mr-1" />
                      <span>Max {program.max_participants}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleStatus(program.id);
                        }}
                        className={`${
                          program.is_active 
                            ? 'text-red-400 hover:text-red-300' 
                            : 'text-green-400 hover:text-green-300'
                        }`}
                        title={program.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {program.is_active ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openViewModal(program)}
                        className="text-blue-400 hover:text-blue-300"
                        title="Voir les détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openEditModal(program);
                        }}
                        className="text-green-400 hover:text-green-300"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(program.id);
                        }}
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

      {/* Modal */}
      <AnimatePresence>
        {showModal && renderProgramModal()}
      </AnimatePresence>
    </div>
  );
};

// Add React import at the top if not already present
import React from 'react';

export default TrainingProgramsManagement;