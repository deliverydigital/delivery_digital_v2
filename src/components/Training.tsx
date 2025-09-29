import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Search, Filter, Download, ExternalLink, Clock, Users, Euro, 
  Star, Award, CheckCircle, BookOpen, GraduationCap, Target,
  Code, PenTool, Languages, Car, Apple, Leaf, ShoppingCart, 
  BarChart3, Globe, Utensils, Shield, Building2, Heart, Briefcase,
  FileText, Calendar, MapPin, Phone, Mail, User, ChevronDown,
  ChevronUp, X, Send, Eye, Edit, Trash2, Plus, Settings,
  Laptop, Database, Server, Cloud, Smartphone, Monitor,
  Palette, FileSpreadsheet, MessageSquare, HardHat, Zap
} from 'lucide-react';
import { useTrainingPrograms } from '../hooks/useTrainingPrograms';
import { useCategories } from '../hooks/useCategories';

const Training = () => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  // Fetch data from APIs
  const { programs, loading: programsLoading, error: programsError } = useTrainingPrograms();
  const { categories, loading: categoriesLoading } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    program: '',
    message: ''
  });

  const getIconComponent = (iconName) => {
    const iconMap = {
      'code': Code,
      'palette': Palette,
      'file-text': FileText,
      'globe': Globe,
      'shield': Shield,
      'users': Users,
      'briefcase': Briefcase,
      'heart': Heart,
      'book-open': BookOpen,
      'laptop': Laptop,
      'database': Database,
      'server': Server,
      'cloud': Cloud,
      'smartphone': Smartphone,
      'monitor': Monitor,
      'file-spreadsheet': FileSpreadsheet,
      'message-square': MessageSquare,
      'hard-hat': HardHat,
      'zap': Zap,
      'car': Car,
      'apple': Apple,
      'leaf': Leaf,
      'shopping-cart': ShoppingCart,
      'bar-chart-3': BarChart3,
      'utensils': Utensils,
      'building-2': Building2,
      'pen-tool': PenTool,
      'languages': Languages,
      'target': Target
    };
    return iconMap[iconName] || BookOpen;
  };

  // Filtrer les programmes selon la catégorie et la recherche
  const filteredPrograms = programs.filter(program => {
    const matchesCategory = selectedCategory === 'all' || program.category === selectedCategory;
    const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (program.description && program.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // Ici, vous pouvez ajouter la logique pour envoyer le formulaire
    console.log('Contact form submitted:', contactForm);
    setShowContactModal(false);
    // Reset form
    setContactForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      program: '',
      message: ''
    });
  };

  return (
    <section id="training" className="section bg-gradient-to-b from-gray-900 to-primary-950">
      <div ref={ref} className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-900/20 border border-green-500/20 mb-4">
              <Award className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-400">Formation Certifiée Qualiopi</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Formations Professionnelles
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Développez vos compétences avec nos formations certifiées et éligibles aux financements OPCO et CPF
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8">
            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Toutes les formations
              </button>
              {categoriesLoading ? (
                <div className="px-4 py-2 text-gray-400">Chargement des catégories...</div>
              ) : (
                categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                  style={{
                    backgroundColor: selectedCategory === category.id ? category.color : undefined
                  }}
                >
                  {category.name}
                </button>
                ))
              )}
            </div>

            {/* Search */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une formation..."
                  className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Programs Grid */}
          {programsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Chargement des formations...</p>
            </div>
          ) : programsError ? (
            <div className="text-center py-12 bg-red-900/20 rounded-lg border border-red-500/20">
              <p className="text-red-400">Erreur lors du chargement des formations</p>
              <p className="text-gray-400 text-sm mt-2">{programsError}</p>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/50 rounded-lg">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Aucune formation ne correspond aux critères de recherche.'
                  : 'Aucune formation disponible pour le moment.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrograms.map((program) => {
                const category = categories.find(c => c.id === program.category);
                const IconComponent = getIconComponent(category?.icon || 'book-open');
                
                return (
                  <motion.div
                    key={program.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="card p-6 hover:-translate-y-2 cursor-pointer"
                    onClick={() => {
                      setSelectedProgram(program);
                      setShowProgramModal(true);
                    }}
                  >
                    <div className="flex items-center mb-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                        style={{ backgroundColor: category?.color || '#3b82f6' }}
                      >
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{program.title}</h3>
                        <p className="text-gray-400 text-sm">
                          {program.duration_hours}h • {program.price}€
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                      {program.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {program.opco_eligible && (
                          <span className="bg-green-900/50 text-green-400 text-xs px-2 py-1 rounded">
                            OPCO
                          </span>
                        )}
                        {program.cpf_eligible && (
                          <span className="bg-blue-900/50 text-blue-400 text-xs px-2 py-1 rounded">
                            CPF
                          </span>
                        )}
                        {program.is_featured && (
                          <Star className="h-4 w-4 text-yellow-400" />
                        )}
                      </div>
                      <span className="text-primary-400 font-medium">Voir les détails</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Program Modal */}
        <AnimatePresence>
          {showProgramModal && selectedProgram && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setShowProgramModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">{selectedProgram.title}</h3>
                    <button
                      onClick={() => setShowProgramModal(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-white mb-3">Description</h4>
                        <p className="text-gray-300">{selectedProgram.description}</p>
                      </div>

                      {selectedProgram.objectives && (
                        <div className="mb-6">
                          <h4 className="text-lg font-semibold text-white mb-3">Objectifs</h4>
                          <ul className="space-y-2">
                            {selectedProgram.objectives.map((objective, index) => (
                              <li key={index} className="flex items-start text-gray-300">
                                <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                <span>{objective}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedProgram.prerequisites && (
                        <div className="mb-6">
                          <h4 className="text-lg font-semibold text-white mb-3">Prérequis</h4>
                          <p className="text-gray-300">{selectedProgram.prerequisites}</p>
                        </div>
                      )}

                      {selectedProgram.program_content && (
                        <div className="mb-6">
                          <h4 className="text-lg font-semibold text-white mb-3">Programme</h4>
                          <div className="text-gray-300 whitespace-pre-line">
                            {selectedProgram.program_content}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-1">
                      <div className="bg-gray-700 rounded-lg p-6 mb-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Informations</h4>
                        <div className="space-y-3">
                          <div className="flex items-center text-gray-300">
                            <Clock className="h-5 w-5 mr-3 text-primary-400" />
                            <span>{selectedProgram.duration_hours} heures</span>
                          </div>
                          <div className="flex items-center text-gray-300">
                            <Euro className="h-5 w-5 mr-3 text-primary-400" />
                            <span>{selectedProgram.price}€</span>
                          </div>
                          <div className="flex items-center text-gray-300">
                            <Users className="h-5 w-5 mr-3 text-primary-400" />
                            <span>Max {selectedProgram.max_participants || 12} participants</span>
                          </div>
                          {selectedProgram.certification && (
                            <div className="flex items-center text-gray-300">
                              <Award className="h-5 w-5 mr-3 text-primary-400" />
                              <span>Certification incluse</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 space-y-2">
                          {selectedProgram.opco_eligible && (
                            <div className="bg-green-900/50 text-green-400 text-sm px-3 py-2 rounded">
                              ✓ Éligible OPCO
                            </div>
                          )}
                          {selectedProgram.cpf_eligible && (
                            <div className="bg-blue-900/50 text-blue-400 text-sm px-3 py-2 rounded">
                              ✓ Éligible CPF
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setContactForm(prev => ({ ...prev, program: selectedProgram.title }));
                            setShowContactModal(true);
                            setShowProgramModal(false);
                          }}
                          className="w-full mt-6 btn btn-primary"
                        >
                          Demander des informations
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact Modal */}
        <AnimatePresence>
          {showContactModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setShowContactModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-800 rounded-lg max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Demande d'informations</h3>
                    <button
                      onClick={() => setShowContactModal(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Entreprise
                      </label>
                      <input
                        type="text"
                        value={contactForm.company}
                        onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Formation d'intérêt
                      </label>
                      <input
                        type="text"
                        value={contactForm.program}
                        onChange={(e) => setContactForm(prev => ({ ...prev, program: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Message
                      </label>
                      <textarea
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Décrivez vos besoins en formation..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full btn btn-primary flex items-center justify-center"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer la demande
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            Besoin d'informations ?
          </h3>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Notre équipe est à votre disposition pour vous accompagner dans le choix de vos formations
            et vous aider avec les démarches de financement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contact@deliverydigital.fr"
              className="btn btn-outline flex items-center justify-center"
            >
              <Mail className="h-5 w-5 mr-2" />
              contact@deliverydigital.fr
            </a>
            <a
              href="tel:0749707773"
              className="btn btn-outline flex items-center justify-center"
            >
              <Phone className="h-5 w-5 mr-2" />
              07 49 70 77 73
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Training;