import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Search, Filter, X, Calendar, Clock, Users, Euro, 
  CheckCircle, Star, ExternalLink, Award, MapPin, 
  Code, Palette, FileText, Globe, Shield, Briefcase, 
  Heart, GraduationCap, BookOpen, Target, ChevronDown, 
  ChevronUp, Download, Mail, Phone, Building2, HelpCircle,
  Utensils, Leaf, Car, Apple, BarChart3, PenTool, Languages
} from 'lucide-react';
import { staticPrograms, categoryColors, categoryIcons } from '../constants/trainingPrograms';
import { useCategories } from '../hooks/useCategories';
import { useTrainingPrograms } from '../hooks/useTrainingPrograms';

const Training = () => {
  const { t } = useTranslation();
  const { categories, loading: categoriesLoading } = useCategories();
  const { programs, loading: programsLoading } = useTrainingPrograms();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const getIconComponent = (iconName: string) => {
    const iconMap = {
      Code,
      Palette,
      FileText,
      Globe,
      Shield,
      Users,
      Briefcase,
      Heart
    };
    return iconMap[iconName] || BookOpen;
  };

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  // Build categories array with API data
  const categoriesWithAll = [
    { id: 'all', name: t('training.categories.all', 'Toutes les catégories'), color: '#6b7280' },
    ...categories.map(category => ({
      id: category.slug,
      name: category.name,
      color: category.color,
      description: category.description
    }))
  ];

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || program.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return t('training.levels.beginner', 'Débutant');
      case 'intermediate': return t('training.levels.intermediate', 'Intermédiaire');
      case 'advanced': return t('training.levels.advanced', 'Avancé');
      default: return level;
    }
  };
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  return (
    <section id="training" className="section bg-gradient-to-b from-gray-50 to-white">
      <div ref={ref} className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-4">
            <Award className="h-4 w-4 mr-2" />
            {t('training.certification', 'Formation Certifiée')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('training.title', 'Nos Formations')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('training.subtitle', 'Développez vos compétences avec nos formations professionnelles certifiées Qualiopi')}
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('training.search.placeholder', 'Rechercher une formation...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {categoriesWithAll.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
                style={{
                  backgroundColor: selectedCategory === category.id ? category.color : undefined
                }}
              >
                {category.name} ({programs.filter(p => category.id === 'all' || p.category === category.id).length})
              </button>
            ))}
          </div>
        </motion.div>

        {/* Programs Grid */}
        {programsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('training.loading', 'Chargement des formations...')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredPrograms.map((program, index) => {
            const IconComponent = getIconComponent(categoryIcons[program.category] || 'BookOpen');
            
            return (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
                onClick={() => {
                  setSelectedProgram(program);
                  setShowModal(true);
                }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${categoryColors[program.category] || '#3b82f6'}20` }}
                    >
                      <IconComponent 
                        className="h-6 w-6" 
                        style={{ color: categoryColors[program.category] || '#3b82f6' }}
                      />
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(program.level)}`}>
                        {getLevelText(program.level)}
                      </span>
                      {program.opco_eligible && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          OPCO
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {program.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {program.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      {program.duration_hours}h
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Euro className="h-4 w-4 mr-2" />
                      {program.price}€
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-2" />
                      {t('training.maxParticipants', 'Max {{count}} participants', { count: program.max_participants })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {program.cpf_eligible && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          CPF
                        </span>
                      )}
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        {program.certification_type || t('training.defaultCertification', 'Attestation de formation')}
                      </span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                </div>
              </motion.div>
            );
          })}
          </div>
        )}

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center bg-primary-50 rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {t('training.cta.title', 'Prêt à commencer votre formation ?')}
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            {t('training.cta.description', 'Contactez-nous pour discuter de vos besoins en formation et obtenir un programme personnalisé.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contact@deliverydigital.fr"
              className="btn btn-primary"
            >
              <Mail className="h-5 w-5 mr-2" />
              {t('training.cta.contact', 'Nous contacter')}
            </a>
            <a
              href="tel:0749707773"
              className="btn btn-outline"
            >
              <Phone className="h-5 w-5 mr-2" />
              {t('training.cta.call', 'Nous appeler')}
            </a>
          </div>
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && selectedProgram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center">
                    <div 
                      className="p-3 rounded-lg mr-4"
                      style={{ backgroundColor: `${categoryColors[selectedProgram.category] || '#3b82f6'}20` }}
                    >
                      {(() => {
                        const IconComponent = getIconComponent(categoryIcons[selectedProgram.category] || 'BookOpen');
                        return <IconComponent 
                          className="h-8 w-8" 
                          style={{ color: categoryColors[selectedProgram.category] || '#3b82f6' }}
                        />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedProgram.title}
                      </h2>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelBadgeColor(selectedProgram.level)}`}>
                          {getLevelText(selectedProgram.level)}
                        </span>
                        {selectedProgram.opco_eligible && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {t('training.opcoEligible', 'OPCO Éligible')}
                          </span>
                        )}
                        {selectedProgram.cpf_eligible && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {t('training.cpfEligible', 'CPF Éligible')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {t('training.modal.description', 'Description')}
                      </h3>
                      <p className="text-gray-600">
                        {selectedProgram.description}
                      </p>
                    </div>

                    {selectedProgram.objectives && selectedProgram.objectives.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {t('training.modal.objectives', 'Objectifs pédagogiques')}
                      </h3>
                      <ul className="space-y-2">
                        {selectedProgram.objectives.map((objective, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    )}

                    {selectedProgram.methods && selectedProgram.methods.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          {t('training.modal.methods', 'Méthodes pédagogiques')}
                        </h3>
                        <ul className="space-y-2">
                          {selectedProgram.methods.map((method, index) => (
                            <li key={index} className="flex items-start">
                              <Target className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-600">{method}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedProgram.evaluation_methods && selectedProgram.evaluation_methods.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          {t('training.modal.evaluationMethods', 'Méthodes d\'évaluation')}
                        </h3>
                        <ul className="space-y-2">
                          {selectedProgram.evaluation_methods.map((method, index) => (
                            <li key={index} className="flex items-start">
                              <Award className="h-5 w-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-600">{method}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedProgram.modules && selectedProgram.modules.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          {t('training.modal.modules', 'Modules de formation')}
                        </h3>
                        <div className="space-y-4">
                          {selectedProgram.modules.map((module, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">{module.title}</h4>
                                <span className="text-sm text-gray-500">{module.duration_hours}h</span>
                              </div>
                              {module.topics && module.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {module.topics.map((topic, topicIndex) => (
                                    <span key={topicIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
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

                    {selectedProgram.prerequisites && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          {t('training.modal.prerequisites', 'Prérequis')}
                        </h3>
                        <p className="text-gray-600">{selectedProgram.prerequisites}</p>
                      </div>
                    )}

                    {selectedProgram.accessibility_info && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          {t('training.modal.accessibility', 'Accessibilité')}
                        </h3>
                        <p className="text-gray-600">{selectedProgram.accessibility_info}</p>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-xl p-6 sticky top-6">
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">{t('training.modal.duration', 'Durée')}</span>
                          <span className="font-semibold">{selectedProgram.duration_hours}h</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">{t('training.modal.price', 'Prix')}</span>
                          <span className="font-semibold">{selectedProgram.price}€</span>
                        </div>
                        {selectedProgram.max_participants && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">{t('training.modal.maxParticipants', 'Participants max')}</span>
                            <span className="font-semibold">{selectedProgram.max_participants}</span>
                          </div>
                        )}
                        {selectedProgram.access_delay && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">{t('training.modal.accessDelay', 'Délai d\'accès')}</span>
                            <span className="font-semibold">{selectedProgram.access_delay}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">{t('training.modal.certification', 'Certification')}</span>
                          <span className="font-semibold text-sm">{selectedProgram.certification_type || t('training.defaultCertification', 'Attestation de formation')}</span>
                        </div>
                      </div>

                      {/* Eligibility badges */}
                      <div className="mb-6 space-y-2">
                        {selectedProgram.opco_eligible && (
                          <div className="flex items-center p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-sm text-green-800">{t('training.eligibility.opco', 'Éligible OPCO')}</span>
                          </div>
                        )}
                        {selectedProgram.cpf_eligible && (
                          <div className="flex items-center p-2 bg-blue-50 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm text-blue-800">{t('training.eligibility.cpf', 'Éligible CPF')}</span>
                          </div>
                        )}
                        {selectedProgram.is_featured && (
                          <div className="flex items-center p-2 bg-yellow-50 rounded-lg">
                            <Star className="h-4 w-4 text-yellow-600 mr-2" />
                            <span className="text-sm text-yellow-800">{t('training.featured', 'Formation phare')}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <a
                          href="mailto:contact@deliverydigital.fr"
                          className="btn btn-primary w-full"
                        >
                          <Mail className="h-5 w-5 mr-2" />
                          {t('training.modal.contact', 'Nous contacter')}
                        </a>
                        <a
                          href="tel:0749707773"
                          className="btn btn-outline w-full"
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          {t('training.modal.call', 'Nous appeler')}
                        </a>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span>{t('training.qualiopiCertified', 'Formation certifiée Qualiopi')}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <HelpCircle className="h-4 w-4 mr-2" />
                          <span>{selectedProgram.accessibility_info || t('training.defaultAccessibility', 'Accessible aux personnes handicapées')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Training;