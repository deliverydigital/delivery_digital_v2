import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Eye, Save, X, Search, Filter,
  Users, Clock, Euro, MapPin, Calendar, BookOpen,
  Target, Award, Settings, Upload, Download, Copy,
  AlertCircle, CheckCircle, User, GraduationCap,
  FileText, Globe, Accessibility, DollarSign,
  Building2, Phone, Mail, Star, ChevronDown,
  ChevronUp, Info, HelpCircle, Zap, Shield
} from 'lucide-react';

interface TrainingProgram {
  id: string;
  program_id: string;
  title: string;
  description: string;
  target_audience: string;
  prerequisites: string;
  objectives: string[];
  duration_hours: number;
  organization_modalities: string;
  detailed_program: string;
  pedagogical_methods: string[];
  evaluation_methods: string[];
  access_modalities: string;
  access_delay: string;
  price: number;
  accessibility_info: string;
  trainers: string[];
  category: string;
  level: string;
  max_participants: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface TrainingProgramManagerProps {
  onClose?: () => void;
}

const TrainingProgramManager = ({ onClose }: TrainingProgramManagerProps) => {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Initialize with demo data
  useEffect(() => {
    const demoPrograms: TrainingProgram[] = [
      {
        id: 'prog-1',
        program_id: 'wordpress',
        title: 'WordPress - Création et gestion de sites web',
        description: 'Formation complète pour créer et gérer des sites web professionnels avec WordPress',
        target_audience: 'Entrepreneurs, salariés, demandeurs d\'emploi souhaitant créer ou gérer un site web',
        prerequisites: 'Connaissances de base en informatique et navigation internet',
        objectives: [
          'Installer et configurer WordPress',
          'Créer et gérer du contenu (pages, articles, médias)',
          'Personnaliser l\'apparence avec les thèmes',
          'Étendre les fonctionnalités avec les plugins',
          'Optimiser le référencement naturel (SEO)',
          'Sécuriser et maintenir son site web'
        ],
        duration_hours: 35,
        organization_modalities: 'Formation en présentiel ou à distance, rythme adapté selon les besoins',
        detailed_program: `Module 1 : Installation et Configuration (7h)
- Installation locale et en ligne
- Configuration de base
- Interface d'administration
- Gestion des utilisateurs

Module 2 : Création de Contenu (14h)
- Pages et articles
- Éditeur Gutenberg
- Gestion des médias
- Menus et widgets
- Catégories et étiquettes

Module 3 : Personnalisation Avancée (14h)
- Thèmes et customizer
- CSS personnalisé
- Plugins essentiels
- E-commerce avec WooCommerce
- SEO et optimisation`,
        pedagogical_methods: [
          'Formation pratique avec exercices dirigés',
          'Projets concrets et mise en situation',
          'Support pédagogique personnalisé',
          'Plateforme d\'apprentissage en ligne',
          'Accompagnement individualisé'
        ],
        evaluation_methods: [
          'QCM d\'évaluation des connaissances',
          'Projet final : création d\'un site web complet',
          'Évaluation continue des acquis',
          'Attestation de fin de formation'
        ],
        access_modalities: 'Inscription en ligne ou par téléphone. Entretien de positionnement préalable.',
        access_delay: '1 semaine (délai moyen)',
        price: 1200,
        accessibility_info: 'Formation accessible aux personnes en situation de handicap. Adaptation possible selon les besoins.',
        trainers: ['Alexandre Martin - Expert WordPress', 'Sarah Dubois - Développeuse Web'],
        category: 'web',
        level: 'beginner',
        max_participants: 12,
        is_active: true,
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-15')
      },
      {
        id: 'prog-2',
        program_id: 'photoshop',
        title: 'Photoshop - Retouche photo et création graphique',
        description: 'Maîtrisez les outils de retouche photo et de création graphique avec Adobe Photoshop',
        target_audience: 'Graphistes, photographes, communicants, créateurs de contenu',
        prerequisites: 'Connaissances de base en informatique',
        objectives: [
          'Maîtriser l\'interface et les outils Photoshop',
          'Réaliser des retouches photo professionnelles',
          'Créer des compositions graphiques',
          'Optimiser les images pour différents supports',
          'Automatiser les tâches répétitives'
        ],
        duration_hours: 28,
        organization_modalities: 'Formation en présentiel dans nos locaux équipés',
        detailed_program: `Module 1 : Interface et Outils de Base (7h)
- Découverte de l'interface
- Outils de sélection et de transformation
- Gestion des calques
- Masques et modes de fusion

Module 2 : Retouche Photo (14h)
- Correction colorimétrique
- Retouche beauté et portrait
- Photomontage et composition
- Effets et filtres créatifs

Module 3 : Création Graphique (7h)
- Design graphique et mise en page
- Typographie et texte
- Préparation pour l'impression
- Export et optimisation web`,
        pedagogical_methods: [
          'Apprentissage progressif par la pratique',
          'Exercices sur des cas réels',
          'Accompagnement individualisé',
          'Ressources et tutoriels en ligne'
        ],
        evaluation_methods: [
          'Exercices pratiques notés',
          'Portfolio de créations personnelles',
          'QCM sur les fonctionnalités',
          'Projet final évalué'
        ],
        access_modalities: 'Inscription directe. Test de positionnement recommandé.',
        access_delay: '1 semaine',
        price: 800,
        accessibility_info: 'Locaux accessibles PMR. Adaptation pédagogique possible.',
        trainers: ['Marie Créative - Graphiste Senior', 'Paul Design - Formateur Adobe'],
        category: 'design',
        level: 'beginner',
        max_participants: 10,
        is_active: true,
        created_at: new Date('2024-01-20'),
        updated_at: new Date('2024-01-20')
      },
      {
        id: 'prog-3',
        program_id: 'dev-web-mobile',
        title: 'Développeur Web et Web Mobile',
        description: 'Formation intensive pour devenir développeur full-stack avec les technologies modernes',
        target_audience: 'Demandeurs d\'emploi, salariés en reconversion, étudiants',
        prerequisites: 'Bac+2 ou expérience équivalente. Logique et motivation indispensables.',
        objectives: [
          'Maîtriser HTML5, CSS3 et JavaScript moderne',
          'Développer avec React.js et Node.js',
          'Créer des applications mobiles avec React Native',
          'Gérer les bases de données (MongoDB, PostgreSQL)',
          'Déployer et maintenir des applications en production',
          'Travailler en équipe avec Git et méthodes agiles'
        ],
        duration_hours: 400,
        organization_modalities: 'Formation intensive en présentiel, 35h/semaine sur 12 semaines',
        detailed_program: `Module 1 : Fondamentaux Web (80h)
- HTML5 sémantique et accessibilité
- CSS3 avancé et Flexbox/Grid
- JavaScript ES6+ et DOM
- Git et GitHub
- Responsive Design

Module 2 : Frontend Moderne (120h)
- React.js et hooks
- State management avec Redux
- TypeScript
- Tests unitaires
- Optimisation des performances

Module 3 : Backend et APIs (100h)
- Node.js et Express
- Bases de données (MongoDB, PostgreSQL)
- APIs REST et GraphQL
- Authentification et sécurité
- Architecture microservices

Module 4 : Mobile et Déploiement (100h)
- React Native
- Déploiement cloud (AWS, Heroku)
- DevOps et CI/CD
- Monitoring et maintenance
- Projet final en équipe`,
        pedagogical_methods: [
          'Pédagogie par projet et apprentissage actif',
          'Pair programming et code review',
          'Méthodes agiles (Scrum)',
          'Mentorat individuel',
          'Plateforme d\'apprentissage 24h/24'
        ],
        evaluation_methods: [
          'Projets pratiques tout au long de la formation',
          'Portfolio professionnel GitHub',
          'Évaluations techniques régulières',
          'Soutenance finale devant jury professionnel',
          'Certification des compétences acquises'
        ],
        access_modalities: 'Sélection sur dossier et entretien technique. Tests de logique et motivation.',
        access_delay: '2 semaines (selon financement)',
        price: 8000,
        accessibility_info: 'Formation accessible aux personnes en situation de handicap. Matériel adapté disponible.',
        trainers: [
          'Alexandre Dev - Lead Developer Full-Stack',
          'Sophie Code - Architecte Logiciel',
          'Thomas Mobile - Expert React Native'
        ],
        category: 'web',
        level: 'intermediate',
        max_participants: 16,
        is_active: true,
        created_at: new Date('2024-01-10'),
        updated_at: new Date('2024-01-10')
      },
      {
        id: 'prog-4',
        program_id: 'hygiene-security',
        title: 'Hygiène, Sécurité et Développement Durable',
        description: 'Formation obligatoire pour le secteur de la restauration',
        target_audience: 'Personnel de restauration, gérants d\'établissements alimentaires',
        prerequisites: 'Aucun prérequis spécifique',
        objectives: [
          'Acquérir les bonnes pratiques d\'hygiène alimentaire',
          'Identifier et prévenir les risques de sécurité',
          'Intégrer des pratiques de développement durable',
          'Respecter la réglementation en vigueur'
        ],
        duration_hours: 21,
        organization_modalities: 'AFEST (Action de Formation en Situation de Travail) ou présentiel',
        detailed_program: `Module 1 : Hygiène Alimentaire (7h)
- Réglementation et normes HACCP
- Microbiologie alimentaire
- Bonnes pratiques d'hygiène
- Gestion des contaminations
- Stockage et conservation

Module 2 : Sécurité au Travail (7h)
- Identification des risques
- Équipements de protection individuelle
- Gestes et postures
- Prévention des accidents
- Premiers secours

Module 3 : Développement Durable (7h)
- Gestion des déchets et recyclage
- Économies d'énergie et d'eau
- Produits éco-responsables
- Réduction du gaspillage alimentaire
- Sensibilisation environnementale`,
        pedagogical_methods: [
          'AFEST avec accompagnement en visioconférence',
          'Exercices pratiques en situation réelle',
          'Études de cas sectorielles',
          'Plateforme pédagogique accessible 24h/24'
        ],
        evaluation_methods: [
          'Évaluation initiale et finale',
          'QCM de validation des acquis',
          'Mise en situation pratique',
          'Suivi personnalisé des compétences'
        ],
        access_modalities: 'Inscription directe. Formation obligatoire selon la réglementation.',
        access_delay: '1 semaine',
        price: 525,
        accessibility_info: 'Formation adaptée aux contraintes du secteur. Accessibilité handicap assurée.',
        trainers: ['Dr. Nutrition - Expert Hygiène Alimentaire', 'Sécurité Pro - Formateur Sécurité'],
        category: 'safety',
        level: 'beginner',
        max_participants: 15,
        is_active: true,
        created_at: new Date('2024-01-25'),
        updated_at: new Date('2024-01-25')
      }
    ];

    const savedPrograms = localStorage.getItem('trainingPrograms');
    if (savedPrograms) {
      const parsed = JSON.parse(savedPrograms).map((p: any) => ({
        ...p,
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at)
      }));
      setPrograms(parsed);
    } else {
      setPrograms(demoPrograms);
      localStorage.setItem('trainingPrograms', JSON.stringify(demoPrograms));
    }
  }, []);

  const savePrograms = (updatedPrograms: TrainingProgram[]) => {
    setPrograms(updatedPrograms);
    localStorage.setItem('trainingPrograms', JSON.stringify(updatedPrograms));
  };

  const createEmptyProgram = (): TrainingProgram => ({
    id: `prog-${Date.now()}`,
    program_id: '',
    title: '',
    description: '',
    target_audience: '',
    prerequisites: '',
    objectives: [''],
    duration_hours: 0,
    organization_modalities: '',
    detailed_program: '',
    pedagogical_methods: [''],
    evaluation_methods: [''],
    access_modalities: '',
    access_delay: '',
    price: 0,
    accessibility_info: '',
    trainers: [''],
    category: 'web',
    level: 'beginner',
    max_participants: 12,
    is_active: false,
    created_at: new Date(),
    updated_at: new Date()
  });

  const handleCreate = () => {
    setSelectedProgram(createEmptyProgram());
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = (program: TrainingProgram) => {
    setSelectedProgram({ ...program });
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedProgram) return;

    const updatedProgram = {
      ...selectedProgram,
      updated_at: new Date()
    };

    let updatedPrograms;
    if (isCreating) {
      updatedPrograms = [...programs, updatedProgram];
    } else {
      updatedPrograms = programs.map(p => 
        p.id === selectedProgram.id ? updatedProgram : p
      );
    }

    savePrograms(updatedPrograms);
    setIsEditing(false);
    setIsCreating(false);
    setSelectedProgram(null);
  };

  const handleDelete = (programId: string) => {
    const updatedPrograms = programs.filter(p => p.id !== programId);
    savePrograms(updatedPrograms);
    setShowDeleteConfirm(null);
    if (selectedProgram?.id === programId) {
      setSelectedProgram(null);
      setIsEditing(false);
    }
  };

  const handleDuplicate = (program: TrainingProgram) => {
    const duplicated: TrainingProgram = {
      ...program,
      id: `prog-${Date.now()}`,
      program_id: `${program.program_id}-copy`,
      title: `${program.title} (Copie)`,
      is_active: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    const updatedPrograms = [...programs, duplicated];
    savePrograms(updatedPrograms);
  };

  const toggleActive = (programId: string) => {
    const updatedPrograms = programs.map(p => 
      p.id === programId 
        ? { ...p, is_active: !p.is_active, updated_at: new Date() }
        : p
    );
    savePrograms(updatedPrograms);
  };

  const updateSelectedProgram = (field: keyof TrainingProgram, value: any) => {
    if (!selectedProgram) return;
    setSelectedProgram({
      ...selectedProgram,
      [field]: value
    });
  };

  const addArrayItem = (field: 'objectives' | 'pedagogical_methods' | 'evaluation_methods' | 'trainers') => {
    if (!selectedProgram) return;
    const currentArray = selectedProgram[field] as string[];
    updateSelectedProgram(field, [...currentArray, '']);
  };

  const updateArrayItem = (field: 'objectives' | 'pedagogical_methods' | 'evaluation_methods' | 'trainers', index: number, value: string) => {
    if (!selectedProgram) return;
    const currentArray = [...(selectedProgram[field] as string[])];
    currentArray[index] = value;
    updateSelectedProgram(field, currentArray);
  };

  const removeArrayItem = (field: 'objectives' | 'pedagogical_methods' | 'evaluation_methods' | 'trainers', index: number) => {
    if (!selectedProgram) return;
    const currentArray = selectedProgram[field] as string[];
    if (currentArray.length > 1) {
      const newArray = currentArray.filter((_, i) => i !== index);
      updateSelectedProgram(field, newArray);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || program.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'web', label: 'Développement Web' },
    { value: 'design', label: 'Design & Création' },
    { value: 'office', label: 'Bureautique' },
    { value: 'languages', label: 'Langues' },
    { value: 'safety', label: 'Hygiène & Sécurité' },
    { value: 'business', label: 'Management & Vente' },
    { value: 'health', label: 'Santé & Nutrition' },
    { value: 'other', label: 'Autres' }
  ];

  const levels = [
    { value: 'beginner', label: 'Débutant' },
    { value: 'intermediate', label: 'Intermédiaire' },
    { value: 'advanced', label: 'Avancé' }
  ];

  const renderArrayEditor = (
    field: 'objectives' | 'pedagogical_methods' | 'evaluation_methods' | 'trainers',
    label: string,
    placeholder: string
  ) => {
    if (!selectedProgram) return null;
    
    const items = selectedProgram[field] as string[];
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateArrayItem(field, index, e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={`${placeholder} ${index + 1}`}
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem(field, index)}
                  className="text-red-400 hover:text-red-300 p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem(field)}
            className="text-primary-400 hover:text-primary-300 text-sm flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter {label.toLowerCase()}
          </button>
        </div>
      </div>
    );
  };

  const renderFormSection = (title: string, icon: React.ReactNode, children: React.ReactNode, sectionKey: string) => {
    const isExpanded = expandedSections[sectionKey] !== false; // Default to expanded

    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center">
            {icon}
            <h3 className="text-lg font-medium text-white ml-3">{title}</h3>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-4">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestion des Formations</h2>
          <p className="text-gray-400">Créer, modifier et gérer les programmes de formation</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCreate}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Formation
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une formation..."
            className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Programs Grid */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => (
            <div key={program.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{program.title}</h3>
                  <p className="text-gray-400 text-sm mb-2 line-clamp-2">{program.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      program.category === 'web' ? 'bg-blue-900/50 text-blue-400' :
                      program.category === 'design' ? 'bg-purple-900/50 text-purple-400' :
                      program.category === 'safety' ? 'bg-green-900/50 text-green-400' :
                      'bg-gray-900/50 text-gray-400'
                    }`}>
                      {categories.find(c => c.value === program.category)?.label}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      program.is_active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {program.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{program.duration_hours}h</span>
                </div>
                <div className="flex items-center">
                  <Euro className="h-4 w-4 mr-2" />
                  <span>{program.price}€</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Max {program.max_participants} participants</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedProgram(program);
                      setIsEditing(false);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                    title="Voir les détails"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(program)}
                    className="text-green-400 hover:text-green-300"
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(program)}
                    className="text-purple-400 hover:text-purple-300"
                    title="Dupliquer"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(program.id)}
                    className="text-red-400 hover:text-red-300"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => toggleActive(program.id)}
                  className={`px-3 py-1 rounded text-xs ${
                    program.is_active 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {program.is_active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Detail/Edit Form */}
      {selectedProgram && (
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">
              {isEditing ? (isCreating ? 'Créer une formation' : 'Modifier la formation') : 'Détails de la formation'}
            </h3>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="btn btn-primary"
                    disabled={!selectedProgram.title || !selectedProgram.program_id}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setIsCreating(false);
                      setSelectedProgram(null);
                    }}
                    className="btn btn-secondary"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleEdit(selectedProgram)}
                    className="btn btn-primary"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </button>
                  <button
                    onClick={() => setSelectedProgram(null)}
                    className="btn btn-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Informations générales */}
            {renderFormSection(
              'Informations Générales',
              <Info className="h-5 w-5 text-blue-400" />,
              (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ID Programme *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={selectedProgram.program_id}
                        onChange={(e) => updateSelectedProgram('program_id', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="ex: wordpress, photoshop..."
                        required
                      />
                    ) : (
                      <div className="text-white">{selectedProgram.program_id}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Intitulé de la formation *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={selectedProgram.title}
                        onChange={(e) => updateSelectedProgram('title', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    ) : (
                      <div className="text-white">{selectedProgram.title}</div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    {isEditing ? (
                      <textarea
                        value={selectedProgram.description}
                        onChange={(e) => updateSelectedProgram('description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <div className="text-white">{selectedProgram.description}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Catégorie
                    </label>
                    {isEditing ? (
                      <select
                        value={selectedProgram.category}
                        onChange={(e) => updateSelectedProgram('category', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {categories.filter(c => c.value !== 'all').map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-white">
                        {categories.find(c => c.value === selectedProgram.category)?.label}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Niveau
                    </label>
                    {isEditing ? (
                      <select
                        value={selectedProgram.level}
                        onChange={(e) => updateSelectedProgram('level', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {levels.map(level => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-white">
                        {levels.find(l => l.value === selectedProgram.level)?.label}
                      </div>
                    )}
                  </div>
                </div>
              ),
              'general'
            )}

            {/* Public et prérequis */}
            {renderFormSection(
              'Public Visé et Prérequis',
              <Users className="h-5 w-5 text-green-400" />,
              (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Public visé
                    </label>
                    {isEditing ? (
                      <textarea
                        value={selectedProgram.target_audience}
                        onChange={(e) => updateSelectedProgram('target_audience', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Décrivez le public cible de cette formation..."
                      />
                    ) : (
                      <div className="text-white whitespace-pre-wrap">{selectedProgram.target_audience}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Prérequis
                    </label>
                    {isEditing ? (
                      <textarea
                        value={selectedProgram.prerequisites}
                        onChange={(e) => updateSelectedProgram('prerequisites', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Listez les prérequis nécessaires..."
                      />
                    ) : (
                      <div className="text-white whitespace-pre-wrap">{selectedProgram.prerequisites}</div>
                    )}
                  </div>
                </div>
              ),
              'audience'
            )}

            {/* Objectifs pédagogiques */}
            {renderFormSection(
              'Objectifs Pédagogiques',
              <Target className="h-5 w-5 text-purple-400" />,
              isEditing ? renderArrayEditor('objectives', 'Objectifs', 'Objectif') : (
                <ul className="space-y-2">
                  {selectedProgram.objectives.filter(obj => obj.trim()).map((objective, index) => (
                    <li key={index} className="flex items-start text-white">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              ),
              'objectives'
            )}

            {/* Durée et modalités */}
            {renderFormSection(
              'Durée & Modalités d\'Organisation',
              <Clock className="h-5 w-5 text-yellow-400" />,
              (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Durée (heures)
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={selectedProgram.duration_hours}
                        onChange={(e) => updateSelectedProgram('duration_hours', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min="0"
                      />
                    ) : (
                      <div className="text-white">{selectedProgram.duration_hours}h</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Participants maximum
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={selectedProgram.max_participants}
                        onChange={(e) => updateSelectedProgram('max_participants', parseInt(e.target.value) || 12)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min="1"
                      />
                    ) : (
                      <div className="text-white">{selectedProgram.max_participants} participants</div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Modalités d'organisation
                    </label>
                    {isEditing ? (
                      <textarea
                        value={selectedProgram.organization_modalities}
                        onChange={(e) => updateSelectedProgram('organization_modalities', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Décrivez les modalités d'organisation (présentiel, distanciel, rythme...)..."
                      />
                    ) : (
                      <div className="text-white whitespace-pre-wrap">{selectedProgram.organization_modalities}</div>
                    )}
                  </div>
                </div>
              ),
              'duration'
            )}

            {/* Programme détaillé */}
            {renderFormSection(
              'Programme / Contenu Détaillé',
              <BookOpen className="h-5 w-5 text-cyan-400" />,
              (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Programme détaillé
                  </label>
                  {isEditing ? (
                    <textarea
                      value={selectedProgram.detailed_program}
                      onChange={(e) => updateSelectedProgram('detailed_program', e.target.value)}
                      rows={10}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Détaillez le contenu de la formation par modules..."
                    />
                  ) : (
                    <div className="text-white whitespace-pre-wrap bg-gray-800 p-4 rounded-lg">
                      {selectedProgram.detailed_program}
                    </div>
                  )}
                </div>
              ),
              'program'
            )}

            {/* Méthodes pédagogiques */}
            {renderFormSection(
              'Méthodes Pédagogiques',
              <Zap className="h-5 w-5 text-orange-400" />,
              isEditing ? renderArrayEditor('pedagogical_methods', 'Méthodes', 'Méthode pédagogique') : (
                <ul className="space-y-2">
                  {selectedProgram.pedagogical_methods.filter(method => method.trim()).map((method, index) => (
                    <li key={index} className="flex items-start text-white">
                      <Zap className="h-5 w-5 mr-3 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>{method}</span>
                    </li>
                  ))}
                </ul>
              ),
              'methods'
            )}

            {/* Modalités d'évaluation */}
            {renderFormSection(
              'Modalités d\'Évaluation',
              <CheckCircle className="h-5 w-5 text-green-400" />,
              isEditing ? renderArrayEditor('evaluation_methods', 'Modalités d\'évaluation', 'Modalité d\'évaluation') : (
                <ul className="space-y-2">
                  {selectedProgram.evaluation_methods.filter(method => method.trim()).map((method, index) => (
                    <li key={index} className="flex items-start text-white">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{method}</span>
                    </li>
                  ))}
                </ul>
              ),
              'evaluation'
            )}

            {/* Modalités et délais d'accès */}
            {renderFormSection(
              'Modalités et Délais d\'Accès',
              <Calendar className="h-5 w-5 text-pink-400" />,
              (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Modalités d'accès
                    </label>
                    {isEditing ? (
                      <textarea
                        value={selectedProgram.access_modalities}
                        onChange={(e) => updateSelectedProgram('access_modalities', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Décrivez les modalités d'accès à la formation..."
                      />
                    ) : (
                      <div className="text-white whitespace-pre-wrap">{selectedProgram.access_modalities}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Délai d'accès
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={selectedProgram.access_delay}
                        onChange={(e) => updateSelectedProgram('access_delay', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="ex: 1 semaine, 15 jours..."
                      />
                    ) : (
                      <div className="text-white">{selectedProgram.access_delay}</div>
                    )}
                  </div>
                </div>
              ),
              'access'
            )}

            {/* Tarif */}
            {renderFormSection(
              'Tarif',
              <Euro className="h-5 w-5 text-green-400" />,
              (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prix (€)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={selectedProgram.price}
                      onChange={(e) => updateSelectedProgram('price', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <div className="text-white text-2xl font-bold text-green-400">
                      {selectedProgram.price.toLocaleString()}€
                    </div>
                  )}
                </div>
              ),
              'price'
            )}

            {/* Accessibilité */}
            {renderFormSection(
              'Accessibilité',
              <Accessibility className="h-5 w-5 text-blue-400" />,
              (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Informations d'accessibilité
                  </label>
                  {isEditing ? (
                    <textarea
                      value={selectedProgram.accessibility_info}
                      onChange={(e) => updateSelectedProgram('accessibility_info', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Décrivez les mesures d'accessibilité mises en place..."
                    />
                  ) : (
                    <div className="text-white whitespace-pre-wrap">{selectedProgram.accessibility_info}</div>
                  )}
                </div>
              ),
              'accessibility'
            )}

            {/* Formateurs */}
            {renderFormSection(
              'Formateur(s)',
              <GraduationCap className="h-5 w-5 text-indigo-400" />,
              isEditing ? renderArrayEditor('trainers', 'Formateurs', 'Nom et qualification du formateur') : (
                <ul className="space-y-2">
                  {selectedProgram.trainers.filter(trainer => trainer.trim()).map((trainer, index) => (
                    <li key={index} className="flex items-start text-white">
                      <User className="h-5 w-5 mr-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span>{trainer}</span>
                    </li>
                  ))}
                </ul>
              ),
              'trainers'
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-400 mr-3" />
                <h3 className="text-lg font-bold text-white">Confirmer la suppression</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Êtes-vous sûr de vouloir supprimer cette formation ? Cette action est irréversible.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingProgramManager;