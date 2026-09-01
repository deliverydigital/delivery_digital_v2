import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Search, Filter, X, Calendar, Clock, Users, Euro, 
  CheckCircle, Star, ExternalLink, Award, MapPin, 
  Code, Palette, FileText, Globe, Shield, Briefcase, 
  Heart, GraduationCap, BookOpen, Target, ChevronDown, 
  ChevronUp, Download, Mail, Phone, Building2, HelpCircle,
  Utensils, Leaf, Car, Apple, BarChart3, PenTool, Languages,
  AlertTriangle
} from 'lucide-react';
import { staticPrograms, categoryColors, categoryIcons } from '../constants/trainingPrograms';
import { useCategories } from '../hooks/useCategories';
import { useTrainingPrograms } from '../hooks/useTrainingPrograms';
import { getProgramIllustration } from './AnimatedIllustrations';

const Training = () => {
  const { t } = useTranslation();
  const { categories, loading: categoriesLoading } = useCategories();
  const { programs, loading: programsLoading } = useTrainingPrograms();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showModal]);

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

  // Affichage TOUTES les formations actives, filtrees par la categorie selectionnee dans l'UI.
  // Refonte 2026-05-14 (Rabah) : avant on hardcodait HYGIENE_ONLY_IDS pour ne montrer
  // que 2 formations, mais le catalogue complet est ouvert (5 formations migrees dans
  // delivery_digital). On revient au comportement standard "toutes les actives, filtre
  // par categorie via le selecteur UI".
  const filteredPrograms = programs.filter(program => {
    if (program.is_active === false) return false;
    if (selectedCategory === 'all') return true;
    return program.category === selectedCategory;
  });

  // Auto-ouverture de la modal supprimee (@author Rabah Ziane 2026-05-14).
  // Avant on auto-ouvrait la modal Hygiene 21h des l'arrivee sur /formation. Avec
  // l'ouverture du catalogue complet (5 formations), on laisse l'utilisateur choisir
  // librement la formation a consulter dans la grille.

  const getLevelBadgeColor = (_level: string) => {
    // Apple-style: all level badges use the same neutral palette.
    return 'bg-[var(--ink-50)] text-[var(--ink-700)] ring-1 ring-[var(--ink-100)]';
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
    <section id="training" className="tile tile-light py-20 sm:py-24 lg:py-28">
      <div ref={ref} className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white ring-1 ring-[var(--ink-100)] text-[12.5px] font-semibold text-[var(--ink-900)] mb-5">
            <Award className="h-3.5 w-3.5 text-[var(--link)]" strokeWidth={2} />
            {t('training.certification', 'Formation Certifiée')}
          </div>
          <h2 className="display-2 text-[28px] sm:text-[48px] lg:text-[56px] text-[var(--ink-900)] mb-3">
            {t('training.title', 'Nos Formations')}
          </h2>
          <p className="text-[15px] sm:text-[20px] text-[var(--ink-700)] max-w-2xl mx-auto tracking-tight">
            {t('training.subtitle', 'Organisme certifié Qualiopi. Profitez du financement OPCO pour développer vos compétences.')}
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-300)]" strokeWidth={2} />
              <input
                type="text"
                placeholder={t('training.search.placeholder', 'Rechercher une formation...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-[15px] rounded-full bg-white border border-[var(--ink-100)] focus:outline-none focus:border-[var(--link)] focus:ring-2 focus:ring-[var(--link)]/20 transition placeholder:text-[var(--ink-300)] text-[var(--ink-900)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {categoriesWithAll.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-all ${
                  selectedCategory === category.id
                    ? 'bg-[var(--ink-900)] text-white'
                    : 'bg-white text-[var(--ink-700)] hover:text-[var(--ink-900)] ring-1 ring-[var(--ink-100)]'
                }`}
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
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                whileHover={{ y: -3 }}
                className="bg-white rounded-[22px] ring-1 ring-black/5 hover:ring-black/15 transition-all duration-200 overflow-hidden group cursor-pointer flex flex-col"
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px -4px rgba(0,0,0,0.06)' }}
                onClick={() => {
                  setSelectedProgram(program);
                  setShowModal(true);
                }}
              >
                {/* Header pro 2026-05-17 : typographie bold + lucide icon mono
                    discrete (plus de SVG cartoon animes). Style Apple/Stripe -
                    categorie en eyebrow + duree XXL bold + icone categorie
                    en filigrane a droite. Plus serieux que les illustrations
                    dessinees. */}
                <div
                  className="relative h-[140px] flex items-center justify-between px-6 overflow-hidden"
                  style={{ background: getCategoryGradient(program.category) }}
                >
                  <div className="flex flex-col z-10">
                    <span className="text-[10.5px] uppercase tracking-[0.22em] font-bold text-[var(--ink-700)] mb-1.5 opacity-70">
                      {getCategoryLabel(program.category)}
                    </span>
                    <span className="text-[40px] leading-none font-bold tracking-[-0.04em] text-[var(--ink-900)]">
                      {program.duration_hours}h
                    </span>
                  </div>
                  <div className="opacity-20 -mr-4">
                    {getCategoryLucideIcon(program.category)}
                  </div>
                  {program.is_featured && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold text-[var(--ink-900)] z-10">
                      <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
                      Phare
                    </span>
                  )}
                  {program.satisfaction && program.satisfaction > 0 && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold text-[var(--ink-900)] tabular-nums z-10">
                      {program.satisfaction}/10
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="display-3 text-[17px] text-[var(--ink-900)] mb-2 leading-snug group-hover:text-[var(--link)] transition-colors">
                    {program.title}
                  </h3>

                  <p className="text-[13.5px] text-[var(--ink-700)] mb-4 line-clamp-2 leading-relaxed flex-1">
                    {program.description}
                  </p>

                  {/* Meta pills row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ink-50)] text-[11.5px] font-semibold text-[var(--ink-700)]">
                      <Clock className="h-2.5 w-2.5" strokeWidth={2} />
                      {program.duration_hours}h
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ink-50)] text-[11.5px] font-semibold text-[var(--ink-700)] tabular-nums">
                      {program.price}€
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ink-50)] text-[11.5px] font-semibold text-[var(--ink-700)]">
                      {getLevelText(program.level)}
                    </span>
                    {program.opco_eligible && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ink-50)] text-[11.5px] font-semibold text-[var(--ink-700)]">
                        OPCO
                      </span>
                    )}
                    {program.cpf_eligible && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ink-50)] text-[11.5px] font-semibold text-[var(--ink-700)]">
                        CPF
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[var(--ink-100)]">
                    <span className="inline-flex items-center text-[13.5px] font-medium text-[var(--link)] group-hover:underline">
                      Voir le programme
                      <span className="ml-1 text-[16px] leading-none transition-transform group-hover:translate-x-0.5">›</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </div>
        )}

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center bg-white rounded-[22px] ring-1 ring-[var(--ink-100)] p-8 sm:p-10 mt-8"
        >
          <h3 className="display-3 text-[24px] sm:text-[28px] text-[var(--ink-900)] mb-3">
            {t('training.cta.title', 'Prêt à commencer votre formation ?')}
          </h3>
          <p className="text-[16px] text-[var(--ink-700)] mb-6 max-w-2xl mx-auto leading-relaxed">
            {t('training.cta.description', 'Contactez-nous pour discuter de vos besoins en formation et obtenir un programme personnalisé.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:contact@deliverydigital.fr" className="btn-pill inline-flex items-center justify-center">
              <Mail className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              {t('training.cta.contact', 'Nous contacter')}
            </a>
          </div>
        </motion.div>
      </div>

      {/* Modal - rendered via portal to document.body so it escapes section overflow:hidden */}
      {createPortal(
      <AnimatePresence>
        {showModal && selectedProgram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-md z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[22px] shadow-2xl ring-1 ring-black/8 max-w-4xl w-full my-auto relative"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxHeight: 'calc(100vh - 48px)',
                overflowY: 'auto',
                background: '#F5F5F7',
              }}
            >
              {/* Apple-style header */}
              <div className="px-7 sm:px-9 pt-7 pb-2 relative">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-5 right-5 text-[var(--ink-500)] hover:text-[var(--ink-900)] p-2 rounded-full hover:bg-[var(--ink-50)] transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" strokeWidth={1.7} />
                </button>
                <span className="text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--ink-500)]">
                  {selectedProgram.category}
                </span>
                <h2 className="display-2 text-[28px] sm:text-[36px] lg:text-[42px] text-[var(--ink-900)] mt-2 leading-[1.05] tracking-[-0.022em] pr-10">
                  {selectedProgram.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className="text-[12.5px] font-medium px-2.5 py-1 rounded-full bg-[var(--ink-50)] text-[var(--ink-700)] ring-1 ring-[var(--ink-100)]">
                    {getLevelText(selectedProgram.level)}
                  </span>
                  {selectedProgram.opco_eligible && (
                    <span className="text-[12.5px] font-medium px-2.5 py-1 rounded-full bg-[var(--ink-50)] text-[var(--ink-700)] ring-1 ring-[var(--ink-100)]">
                      {t('training.opcoEligible', 'OPCO Éligible')}
                    </span>
                  )}
                  {selectedProgram.cpf_eligible && (
                    <span className="text-[12.5px] font-medium px-2.5 py-1 rounded-full bg-[var(--ink-50)] text-[var(--ink-700)] ring-1 ring-[var(--ink-100)]">
                      {t('training.cpfEligible', 'CPF Éligible')}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-7 sm:px-9 pb-9">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 lg:gap-10 mt-6">
                  <div className="space-y-8 min-w-0">
                    <Section title="Description">
                      <p className="text-[16px] text-[var(--ink-700)] leading-[1.55]">{selectedProgram.description}</p>
                    </Section>

                    {selectedProgram.target_audience && (
                      <Section title={t('training.modal.targetAudience', 'Public visé')}>
                        <p className="text-[15.5px] text-[var(--ink-700)] leading-[1.55]">{selectedProgram.target_audience}</p>
                      </Section>
                    )}

                    {selectedProgram.objectives && selectedProgram.objectives.length > 0 && (
                      <Section title={t('training.modal.objectives', 'Objectifs pédagogiques')}>
                        <ul className="space-y-2.5">
                          {selectedProgram.objectives.map((objective: string, index: number) => (
                            <li key={index} className="flex items-start gap-2.5">
                              <span className="mt-[10px] w-1 h-1 rounded-full bg-[var(--ink-900)] flex-shrink-0" />
                              <span className="text-[15.5px] text-[var(--ink-700)] leading-[1.55]">{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {selectedProgram.training_modalities && selectedProgram.training_modalities.length > 0 && (
                      <Section title={t('training.modal.trainingModalities', 'Modalités de la formation')}>
                        <ul className="space-y-2.5">
                          {selectedProgram.training_modalities.map((m: string, i: number) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="mt-[10px] w-1 h-1 rounded-full bg-[var(--ink-900)] flex-shrink-0" />
                              <span className="text-[15.5px] text-[var(--ink-700)] leading-[1.55]">{m}</span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {selectedProgram.methods && selectedProgram.methods.length > 0 && (
                      <Section title={t('training.modal.methods', 'Méthodes mobilisées')}>
                        <ul className="space-y-2.5">
                          {selectedProgram.methods.map((m: string, i: number) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="mt-[10px] w-1 h-1 rounded-full bg-[var(--ink-900)] flex-shrink-0" />
                              <span className="text-[15.5px] text-[var(--ink-700)] leading-[1.55]">{m}</span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {selectedProgram.evaluation_methods && selectedProgram.evaluation_methods.length > 0 && (
                      <Section title={t('training.modal.evaluationMethods', "Méthodes d'évaluation")}>
                        <ul className="space-y-2.5">
                          {selectedProgram.evaluation_methods.map((m: string, i: number) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="mt-[10px] w-1 h-1 rounded-full bg-[var(--ink-900)] flex-shrink-0" />
                              <span className="text-[15.5px] text-[var(--ink-700)] leading-[1.55]">{m}</span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {selectedProgram.modules && selectedProgram.modules.length > 0 && (
                      <Section title={t('training.modal.modules', 'Modules de formation')}>
                        <div className="space-y-3">
                          {selectedProgram.modules.map((module: any, index: number) => (
                            <div key={index} className="rounded-[14px] bg-[var(--ink-50)] px-4 py-3.5">
                              <div className="flex items-baseline justify-between gap-3 mb-1">
                                <h4 className="text-[15.5px] font-semibold text-[var(--ink-900)] tracking-tight">{module.title}</h4>
                                <span className="text-[13px] tabular-nums font-medium text-[var(--ink-500)] flex-shrink-0">{module.duration_hours}h</span>
                              </div>
                              {module.topics && module.topics.length > 0 && (
                                <ul className="space-y-1.5 mt-2">
                                  {module.topics.map((topic: string, topicIndex: number) => (
                                    <li key={topicIndex} className="flex items-start gap-2 text-[14px] text-[var(--ink-700)]">
                                      <span className="mt-[8px] w-[3px] h-[3px] rounded-full bg-[var(--ink-500)] flex-shrink-0" />
                                      {topic}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {selectedProgram.prerequisites && (
                      <Section title={t('training.modal.prerequisites', 'Prérequis')}>
                        <p className="text-[15.5px] text-[var(--ink-700)] leading-[1.55]">{selectedProgram.prerequisites}</p>
                      </Section>
                    )}

                    {selectedProgram.accessibility_info && (
                      <Section title={t('training.modal.accessibility', 'Accessibilité')}>
                        <p className="text-[15.5px] text-[var(--ink-700)] leading-[1.55]">{selectedProgram.accessibility_info}</p>
                      </Section>
                    )}

                    <Section title={t('training.modal.documents', 'Documents')}>
                      <button
                        onClick={() => downloadDocument('program', selectedProgram.id)}
                        className="w-full flex items-center justify-between rounded-[14px] bg-[var(--ink-50)] hover:bg-[var(--ink-100)] transition-colors px-4 py-3.5 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-4 w-4 text-[var(--ink-900)] flex-shrink-0" strokeWidth={1.7} />
                          <div className="min-w-0">
                            <div className="text-[14.5px] font-semibold text-[var(--ink-900)]">Programme détaillé</div>
                            <div className="text-[12.5px] text-[var(--ink-500)]">PDF · Contenu complet</div>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-[var(--ink-500)] flex-shrink-0" strokeWidth={1.7} />
                      </button>
                    </Section>
                  </div>

                  <aside className="lg:sticky lg:top-2 lg:self-start space-y-6">
                    <div className="rounded-[14px] bg-[var(--ink-50)] divide-y divide-[var(--ink-100)]">
                      <Row label={t('training.modal.duration', 'Durée')} value={selectedProgram.duration_hours + 'h'} />
                      <Row label={t('training.modal.price', 'Prix')} value={selectedProgram.price + ' €'} />
                      {selectedProgram.max_participants && <Row label={t('training.modal.maxParticipants', 'Participants max')} value={selectedProgram.max_participants} />}
                      {selectedProgram.access_delay && <Row label={t('training.modal.accessDelay', "Délai d'accès")} value={selectedProgram.access_delay} />}
                      <Row label={t('training.modal.certification', 'Certification')} value={selectedProgram.certification_type || t('training.defaultCertification', 'Attestation de formation')} />
                      {selectedProgram.certification_provider && <Row label={t('training.modal.certificationProvider', 'Organisme')} value={selectedProgram.certification_provider} />}
                      <Row label={t('training.modal.lastUpdated', 'Dernière maj')} value={selectedProgram.updated_at ? new Date(selectedProgram.updated_at).toLocaleDateString('fr-FR') : '09/05/2026'} />
                    </div>

                    {(selectedProgram.satisfaction_rate || selectedProgram.success_rate || selectedProgram.recommendation_rate || selectedProgram.attendance_rate) ? (
                      <div>
                        <h3 className="text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--ink-500)] mb-3">Indicateurs</h3>
                        <div className="space-y-3">
                          {selectedProgram.satisfaction_rate > 0 && <Stat label="Satisfaction" value={selectedProgram.satisfaction_rate} />}
                          {selectedProgram.success_rate > 0 && <Stat label="Réussite" value={selectedProgram.success_rate} />}
                          {selectedProgram.recommendation_rate > 0 && <Stat label="Recommandation" value={selectedProgram.recommendation_rate} />}
                          {selectedProgram.attendance_rate > 0 && <Stat label="Présence" value={selectedProgram.attendance_rate} />}
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2 pt-2">
                      <a
                        href="https://app.deliverydigital.fr/student/signup"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center text-[14.5px] font-semibold py-3 rounded-full bg-[var(--ink-900)] text-white hover:bg-black transition-colors"
                      >
                        {t('training.modal.register', "S'inscrire")}
                      </a>
                      <a
                        href="mailto:contact@deliverydigital.fr"
                        className="block w-full text-center text-[14.5px] font-medium py-3 rounded-full bg-white text-[var(--ink-900)] ring-1 ring-[var(--ink-200)] hover:bg-[var(--ink-50)] transition-colors"
                      >
                        {t('training.modal.contact', 'Nous contacter')}
                      </a>
                    </div>
                  </aside>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </section>
  );
};

// Helper function to download training documents
// PDF programme brandé (image de marque, uploadé) selon la formation. @Rabah 2026-07-10
const brandedProgrammePdf = (prog: any): string | null => {
  const s = ((prog?.title || '') + ' ' + (prog?.category || '')).toLowerCase();
  if (s.includes('nutrition') || s.includes('allerg')) return '/uploads/formations/programme-nutrition-allergenes.pdf';
  if (s.includes('hygi') || s.includes('sécurit') || s.includes('securit') || s.includes('durable')) return '/uploads/formations/programme-hygiene-securite-dd.pdf';
  return null;
};

const downloadDocument = async (type: string, programId: string) => {
  try {
    // Programme détaillé : PDF généré à la volée depuis le contenu du programme. @Rabah 2026-07-10
    if (type === 'program') {
      const a = document.createElement('a');
      a.href = `${import.meta.env.VITE_API_URL || ''}/api/training-programs/${programId}/documents/program/download`;
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    const apiUrl = import.meta.env.VITE_API_URL || '';

    const response = await fetch(`${apiUrl}/api/training/documents/${programId}`, {
      headers: {
        'bypass-tunnel-reminder': 'true'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    const result = await response.json();

    if (result.success && result.data.documents.length > 0) {
      const trainingDoc = result.data.documents.find((doc: any) =>
        doc.category === type || (type === 'program' && doc.category === 'program')
      ) || result.data.documents[0];

      if (trainingDoc && trainingDoc.id) {
        // Construct direct download URL
        const downloadUrl = `${apiUrl}/api/training/documents/${trainingDoc.id}/download`;

        // Create a hidden link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = trainingDoc.original_name || 'document.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Document non disponible pour le téléchargement');
      }
    } else {
      alert('Aucun document trouvé pour ce programme');
    }
  } catch (error) {
    console.error('Download error:', error);
    alert('Erreur lors du téléchargement du document');
  }
};

export default Training;

/* Pick a representative emoji per program based on title keywords */
function getProgramEmoji(program: any): string {
  const t = (program.title || program.id || '').toLowerCase();
  if (/nutrition|allerg/.test(t)) return '🥗';
  if (/hygi[èe]ne|haccp|alimentai/.test(t)) return '🍽️';
  if (/chantier|construction|btp/.test(t)) return '🦺';
  if (/english|anglai|langue|reflex/.test(t)) return '🌍';
  if (/d[ée]veloppement durable|écolog|environn/.test(t)) return '🌱';
  if (/s[ée]curit[ée]/.test(t)) return '🛡️';
  if (/web|d[ée]veloppe(?:ur|ment)|code/.test(t)) return '💻';
  if (/design|ui|ux|figma/.test(t)) return '🎨';
  if (/marketing|seo/.test(t)) return '📈';
  if (/management|gestion/.test(t)) return '💼';
  if (/comptab|finance/.test(t)) return '📊';
  if (/sant[ée]|m[ée]dic/.test(t)) return '🩺';
  return '📚';
}

/* Label fr lisible par categorie (2026-05-17 - refonte cards pro) */
function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    safety: 'Hygiène · Sécurité',
    languages: 'Langues',
    web: 'Web · Développement',
    design: 'Design',
    office: 'Bureautique',
    health: 'Santé',
    business: 'Business',
    management: 'Management',
  };
  return map[category] || 'Formation';
}

/* Icone Lucide minimaliste par categorie - utilisee en filigrane sur le
   header card (opacite 20%) pour un rendu pro typo-driven sans cartoon. */
function getCategoryLucideIcon(category: string) {
  const props = { size: 80, strokeWidth: 1.4, className: 'text-[var(--ink-900)]' };
  switch (category) {
    case 'safety':     return <Shield {...props} />;
    case 'languages':  return <Languages {...props} />;
    case 'web':        return <Code {...props} />;
    case 'design':     return <Palette {...props} />;
    case 'office':     return <FileText {...props} />;
    case 'health':     return <Heart {...props} />;
    case 'business':   return <Briefcase {...props} />;
    case 'management': return <Target {...props} />;
    default:           return <BookOpen {...props} />;
  }
}

/* Apple-style subtle gradient backgrounds per category */
function getCategoryGradient(category: string): string {
  const map: Record<string, string> = {
    safety: 'linear-gradient(135deg, #D4EDDA 0%, #E8F5E9 60%, #F1F8E9 100%)',     // mint/sage
    languages: 'linear-gradient(135deg, #DDEDF7 0%, #EBF4FA 60%, #F0F7FB 100%)',  // sky blue
    web: 'linear-gradient(135deg, #E5DFF8 0%, #EFEBFA 60%, #F5F2FB 100%)',         // lavender
    design: 'linear-gradient(135deg, #FFE0D6 0%, #FFEDE3 60%, #FFF4ED 100%)',     // peach
    office: 'linear-gradient(135deg, #FFF1C5 0%, #FFF7DD 60%, #FFFAEC 100%)',      // cream
    health: 'linear-gradient(135deg, #FFD9DC 0%, #FFE6E8 60%, #FFEEF0 100%)',     // pink
    business: 'linear-gradient(135deg, #DCE9F7 0%, #E9F0F8 60%, #F1F5FA 100%)',   // ice blue
    management: 'linear-gradient(135deg, #E8E0FA 0%, #F0EAFB 60%, #F5F1FC 100%)', // soft purple
  };
  return map[category] || 'linear-gradient(135deg, #EFEFF3 0%, #F4F4F7 60%, #F8F8FA 100%)';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[18px] p-5 sm:p-6 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h3 className="text-[17px] font-semibold tracking-tight text-[var(--ink-900)] mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-[14px]">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span className="font-semibold text-[var(--ink-900)] text-right ml-3">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] text-[var(--ink-700)]">{label}</span>
        <span className="text-[13px] font-bold text-[var(--ink-900)] tabular-nums">{value}%</span>
      </div>
      <div className="h-1 rounded-full bg-[var(--ink-100)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--ink-900)]" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}
