import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  GraduationCap, Clock, Users, Euro, Star, Award, 
  CheckCircle, ExternalLink, BookOpen, Target, 
  FileText, Download, X, MapPin, Phone, Mail,
  Code, PenTool, FileIcon as FileTextIcon, Globe, 
  Shield, UserCheck, Briefcase, Heart, Search, Filter
} from 'lucide-react';
import { useTrainingPrograms } from '../hooks/useTrainingPrograms';
import { useCategories } from '../hooks/useCategories';

const Training = () => {
  const { t } = useTranslation();
  const { programs, loading, error } = useTrainingPrograms();
  const { categories } = useCategories();
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'web': return <Code className="h-5 w-5" />;
      case 'design': return <PenTool className="h-5 w-5" />;
      case 'office': return <FileTextIcon className="h-5 w-5" />;
      case 'languages': return <Globe className="h-5 w-5" />;
      case 'safety': return <Shield className="h-5 w-5" />;
      case 'management': return <UserCheck className="h-5 w-5" />;
      case 'business': return <Briefcase className="h-5 w-5" />;
      case 'health': return <Heart className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const categoryData = categories.find(cat => cat.slug === category);
    return categoryData?.color || '#3b82f6';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Débutant';
      case 'intermediate': return 'Intermédiaire';
      case 'advanced': return 'Avancé';
      default: return level;
    }
  };

  const openModal = (program) => {
    setSelectedProgram(program);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProgram(null);
  };

  // Filter programs based on category and search
  const filteredPrograms = programs.filter(program => {
    const matchesCategory = selectedCategory === 'all' || program.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && program.is_active;
  });

  const TrainingProgramModal = () => {
    if (!selectedProgram) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                style={{ backgroundColor: `${getCategoryColor(selectedProgram.category)}20`, color: getCategoryColor(selectedProgram.category) }}
              >
                {getCategoryIcon(selectedProgram.category)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedProgram.title}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(selectedProgram.level)}`}>
                  {getLevelText(selectedProgram.level)}
                </span>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Program Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Durée</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{selectedProgram.duration_hours}h</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Euro className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">Prix</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{selectedProgram.price}€</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Users className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="font-medium text-purple-900">Participants max</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{selectedProgram.max_participants}</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-3">Description</h4>
              <p className="text-gray-700 leading-relaxed">{selectedProgram.description}</p>
            </div>

            {/* Objectives */}
            {selectedProgram.objectives && selectedProgram.objectives.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-blue-600" />
                  Objectifs pédagogiques
                </h4>
                <ul className="space-y-2">
                  {selectedProgram.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prerequisites */}
            {selectedProgram.prerequisites && (
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Prérequis</h4>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedProgram.prerequisites}</p>
              </div>
            )}

            {/* Methods */}
            {selectedProgram.methods && selectedProgram.methods.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Méthodes pédagogiques</h4>
                <ul className="space-y-2">
                  {selectedProgram.methods.map((method, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{method}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modules */}
            {selectedProgram.modules && selectedProgram.modules.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Modules de formation</h4>
                <div className="space-y-4">
                  {selectedProgram.modules.map((module, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-900">{module.title}</h5>
                        <span className="text-sm text-gray-500">{module.duration_hours}h</span>
                      </div>
                      {module.topics && module.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {module.topics.map((topic, topicIndex) => (
                            <span key={topicIndex} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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

            {/* Certification and Financing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Certification */}
              {(selectedProgram.certification_type || selectedProgram.opco_eligible || selectedProgram.cpf_eligible) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Award className="h-6 w-6 text-yellow-600 mr-2" />
                    <h4 className="text-lg font-bold text-yellow-900">Certification & Financement</h4>
                  </div>
                  <div className="space-y-3">
                    {selectedProgram.certification_type && (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-yellow-800">Certification: {selectedProgram.certification_type}</span>
                      </div>
                    )}
                    {selectedProgram.opco_eligible && (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-yellow-800">Éligible OPCO</span>
                      </div>
                    )}
                    {selectedProgram.cpf_eligible && (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-yellow-800">Éligible CPF</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Accessibility */}
              {selectedProgram.accessibility_info && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <UserCheck className="h-6 w-6 text-blue-600 mr-2" />
                    <h4 className="text-lg font-bold text-blue-900">Accessibilité</h4>
                  </div>
                  <p className="text-blue-800">{selectedProgram.accessibility_info}</p>
                  {selectedProgram.access_delay && (
                    <p className="text-blue-700 mt-2">
                      <strong>Délai d'accès:</strong> {selectedProgram.access_delay}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Documents */}
            {selectedProgram.documents && selectedProgram.documents.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-600" />
                  Documents disponibles
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedProgram.documents.map((document, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 mb-1">{document.title}</h5>
                          {document.description && (
                            <p className="text-gray-600 text-sm mb-2">{document.description}</p>
                          )}
                          <div className="flex items-center text-xs text-gray-500">
                            <span>{(document.file_size / 1024 / 1024).toFixed(1)} MB</span>
                            <span className="mx-2">•</span>
                            <span>{document.download_count} téléchargements</span>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(document.download_url, '_blank')}
                          className="ml-4 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact and Registration */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
              <div className="text-center">
                <h4 className="text-lg font-bold text-gray-900 mb-2">Intéressé par cette formation ?</h4>
                <p className="text-gray-700 mb-6">
                  Contactez-nous pour plus d'informations ou pour vous inscrire
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                  <a
                    href="mailto:contact@deliverydigital.fr"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    contact@deliverydigital.fr
                  </a>
                  <a
                    href="tel:0749707773"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    07 49 70 77 73
                  </a>
                </div>
                <div className="flex items-center justify-center text-gray-600 text-sm">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>470 promenade des anglais, 06200 Nice</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <section id="training" className="section bg-gradient-to-b from-white to-blue-50">
      <div className="container">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 border border-green-200">
              <Award className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">Certifié Qualiopi</span>
            </div>
          </motion.div>
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            Formation Professionnelle
          </motion.h2>
          <motion.p 
            className="text-lg text-gray-600 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Développez vos compétences avec nos formations certifiées Qualiopi
          </motion.p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une formation..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              showCategories 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Catégories
          </button>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              showCategories 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Catégories
          </button>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Categories Display */}
        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
                  Catégories de Formation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categories.map((category) => {
                    const categoryPrograms = programs.filter(program => program.category === category.slug);
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer border-l-4"
                        style={{ borderLeftColor: category.color }}
                        onClick={() => {
                          setSelectedCategory(category.slug);
                          setShowCategories(false);
                        }}
                      >
                        <div className="flex items-center mb-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                            style={{ backgroundColor: `${category.color}20`, color: category.color }}
                          >
                            {getCategoryIcon(category.slug)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{category.name}</h4>
                            <p className="text-sm text-gray-600">{categoryPrograms.length} formation{categoryPrograms.length > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {categoryPrograms.slice(0, 3).map((program) => (
                            <span 
                              key={program.id}
                              className="inline-block px-2 py-1 bg-white rounded text-xs text-gray-600 border"
                            >
                              {program.title}
                            </span>
                          ))}
                          {categoryPrograms.length > 3 && (
                            <span className="inline-block px-2 py-1 bg-gray-200 rounded text-xs text-gray-500">
                              +{categoryPrograms.length - 3}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowCategories(false)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Masquer les catégories
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories Display */}
        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
                  Catégories de Formation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categories.map((category) => {
                    const categoryPrograms = programs.filter(program => program.category === category.slug);
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer border-l-4"
                        style={{ borderLeftColor: category.color }}
                        onClick={() => {
                          setSelectedCategory(category.slug);
                          setShowCategories(false);
                        }}
                      >
                        <div className="flex items-center mb-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                            style={{ backgroundColor: `${category.color}20`, color: category.color }}
                          >
                            {getCategoryIcon(category.slug)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{category.name}</h4>
                            <p className="text-sm text-gray-600">{categoryPrograms.length} formation{categoryPrograms.length > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {categoryPrograms.slice(0, 3).map((program) => (
                            <span 
                              key={program.id}
                              className="inline-block px-2 py-1 bg-white rounded text-xs text-gray-600 border"
                            >
                              {program.title}
                            </span>
                          ))}
                          {categoryPrograms.length > 3 && (
                            <span className="inline-block px-2 py-1 bg-gray-200 rounded text-xs text-gray-500">
                              +{categoryPrograms.length - 3}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowCategories(false)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Masquer les catégories
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={ref}>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des formations...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-red-50 rounded-lg">
              <div className="text-red-600 mb-4">Erreur lors du chargement des formations</div>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune formation trouvée</h3>
              <p className="text-gray-600">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Aucune formation ne correspond à vos critères de recherche.'
                  : 'Aucune formation n\'est disponible pour le moment.'}
              </p>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {filteredPrograms.map((program, index) => (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group"
                  onClick={() => openModal(program)}
                >
                  <div 
                    className="h-2"
                    style={{ backgroundColor: getCategoryColor(program.category) }}
                  ></div>
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${getCategoryColor(program.category)}20`, color: getCategoryColor(program.category) }}
                      >
                        {getCategoryIcon(program.category)}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(program.level)}`}>
                          {getLevelText(program.level)}
                        </span>
                        {program.is_featured && (
                          <div className="flex items-center text-yellow-600">
                            <Star className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">Populaire</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {program.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">{program.description}</p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-500">
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="text-sm">{program.duration_hours} heures</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Users className="h-4 w-4 mr-2" />
                        <span className="text-sm">Max {program.max_participants} participants</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Euro className="h-4 w-4 mr-2" />
                        <span className="text-sm">{program.price}€</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {program.opco_eligible && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                            OPCO
                          </span>
                        )}
                        {program.cpf_eligible && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                            CPF
                          </span>
                        )}
                      </div>
                      <div className="text-blue-600 group-hover:text-blue-800 transition-colors">
                        <span className="text-sm font-medium">Voir les détails</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Qualiopi Certification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 bg-white rounded-xl shadow-lg p-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-6 md:mb-0">
              <img 
                src="/LogoQualiopi-300dpi-Avec Marianne (1).png" 
                alt="Certification Qualiopi" 
                className="h-16 w-auto mr-6"
              />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Organisme de Formation Certifié Qualiopi
                </h3>
                <p className="text-gray-600">
                  Certification qualité pour les actions de formation
                  <br />
                  N° de déclaration : 93061064306
                </p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <a
                href="https://certifopac.fr/qualiopi/certification/verification/?siren=902945195#webApp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Vérifier la certification
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Training Program Modal */}
      <AnimatePresence>
        {showModal && <TrainingProgramModal />}
      </AnimatePresence>
    </section>
  );
};

export default Training;