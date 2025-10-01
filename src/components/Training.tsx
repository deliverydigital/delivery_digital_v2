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

const Training = () => {
  const { t } = useTranslation();
  const { categories, loading: categoriesLoading } = useCategories();
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
    { id: 'all', name: t('training.categories.all'), color: '#6b7280' },
    ...categories.map(category => ({
      id: category.slug,
      name: category.name,
      color: category.color,
      description: category.description
    }))
  ];

  const filteredPrograms = staticPrograms.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            {t('training.certification')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('training.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('training.subtitle')}
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
                placeholder={t('training.search.placeholder')}
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
                {category.name} ({staticPrograms.filter(p => category.id === 'all' || p.category === category.id).length})
              </button>
            ))}
          </div>
        </motion.div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredPrograms.map((program, index) => {
            const IconComponent = getIconComponent(categoryIcons[program.category]);
            
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
                      style={{ backgroundColor: `${categoryColors[program.category]}20` }}
                    >
                      <IconComponent 
                        className="h-6 w-6" 
                        style={{ color: categoryColors[program.category] }}
                      />
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(program.level)}`}>
                        {t(`training.levels.${program.level}`)}
                      </span>
                      {program.opcoEligible && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          OPCO
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {program.name}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {program.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      {program.duration}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('training.nextSession')}: {formatDate(program.nextSession)}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Euro className="h-4 w-4 mr-2" />
                      {program.price}€
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {program.cpfEligible && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          CPF
                        </span>
                      )}
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        {program.certification}
                      </span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center bg-primary-50 rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {t('training.cta.title')}
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            {t('training.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contact@deliverydigital.fr"
              className="btn btn-primary"
            >
              <Mail className="h-5 w-5 mr-2" />
              {t('training.cta.contact')}
            </a>
            <a
              href="tel:0749707773"
              className="btn btn-outline"
            >
              <Phone className="h-5 w-5 mr-2" />
              {t('training.cta.call')}
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
                      style={{ backgroundColor: `${categoryColors[selectedProgram.category]}20` }}
                    >
                      {(() => {
                        const IconComponent = getIconComponent(categoryIcons[selectedProgram.category]);
                        return <IconComponent 
                          className="h-8 w-8" 
                          style={{ color: categoryColors[selectedProgram.category] }}
                        />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedProgram.name}
                      </h2>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelBadgeColor(selectedProgram.level)}`}>
                          {t(`training.levels.${selectedProgram.level}`)}
                        </span>
                        {selectedProgram.opcoEligible && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            OPCO Eligible
                          </span>
                        )}
                        {selectedProgram.cpfEligible && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            CPF Eligible
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
                        {t('training.modal.description')}
                      </h3>
                      <p className="text-gray-600">
                        {selectedProgram.description}
                      </p>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {t('training.modal.objectives')}
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

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {t('training.modal.prerequisites')}
                      </h3>
                      <p className="text-gray-600">{selectedProgram.prerequisites}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-xl p-6 sticky top-6">
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">{t('training.modal.duration')}</span>
                          <span className="font-semibold">{selectedProgram.duration}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">{t('training.modal.price')}</span>
                          <span className="font-semibold">{selectedProgram.price}€</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">{t('training.modal.nextSession')}</span>
                          <span className="font-semibold">{formatDate(selectedProgram.nextSession)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">{t('training.modal.certification')}</span>
                          <span className="font-semibold text-sm">{selectedProgram.certification}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <a
                          href="mailto:contact@deliverydigital.fr"
                          className="btn btn-primary w-full"
                        >
                          <Mail className="h-5 w-5 mr-2" />
                          {t('training.modal.contact')}
                        </a>
                        <a
                          href="tel:0749707773"
                          className="btn btn-outline w-full"
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          {t('training.modal.call')}
                        </a>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span>Formation certifiée Qualiopi</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <HelpCircle className="h-4 w-4 mr-2" />
                          <span>Accessible aux personnes handicapées</span>
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