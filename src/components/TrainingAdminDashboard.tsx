import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MessageCircle, FolderOpen, Settings, LogOut, Search, ChevronRight, FileText, Image as ImageIcon, ExternalLink, Clock, CheckCircle, AlertTriangle, X, Edit, Trash2, Send, Filter, Download, Eye, User, Building2, Mail, Phone, Calendar, Tag, DollarSign, Star, Archive, Bell, Plus, MoreVertical, Reply, Forward, Paperclip, Save, RefreshCw, Home, Kanban, GraduationCap, Code, BookOpen, UserCheck, FileSignature, ClipboardList, BarChart3, TrendingUp, Zap, Link, Upload, Database, Globe, Shield, Award, Target, PieChart, Activity, Workflow, UserPlus, FileCheck, FileSignature as Signature, QrCode, Printer, Calculator, CreditCard, Briefcase, School, AlignCenterVertical as Certificate, Users2, MessageSquare, UploadCloud as CloudUpload, HardDrive, Folder, Share2, Lock, Key, Monitor, Smartphone, Server, Cloud, Cpu, Network, ClipboardCheck 
} from 'lucide-react';
import { useAuth } from '../hooks/useApi';
import Auth from './Auth';
import EvaluationSystem from './EvaluationSystem';
import TrainerManagement from './TrainerManagement';

// Types pour la formation professionnelle
interface TrainingSession {
  id: string;
  title: string;
  type: 'web' | 'devops' | 'security' | 'hygiene';
  startDate: Date;
  endDate: Date;
  participants: Participant[];
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  location: string;
  maxParticipants: number;
  price: number;
  formateur: string;
  formateurId?: string;
  documents: Document[];
  evaluations: Evaluation[];
  description: string;
  objectives: string[];
  prerequisites: string;
  duration: number; // en heures
  schedule: {
    startTime: string;
    endTime: string;
    days: string[];
  };
}

interface Participant {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: 'registered' | 'confirmed' | 'attended' | 'absent' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  documents: string[];
  evaluations: { [key: string]: number };
  attendance: AttendanceRecord[];
}

interface AttendanceRecord {
  date: Date;
  present: boolean;
  signatureTime?: Date;
  digitalSignature?: string;
}

interface Document {
  id: string;
  name: string;
  type: 'convention' | 'convocation' | 'emargement' | 'certificate' | 'evaluation';
  url: string;
  generatedAt: Date;
  signedBy?: string[];
  status: 'draft' | 'sent' | 'signed' | 'archived';
}

interface Evaluation {
  id: string;
  type: 'satisfaction' | 'knowledge' | 'skills';
  questions: Question[];
  responses: { [participantId: string]: { [questionId: string]: any } };
  results: EvaluationResults;
}

interface Question {
  id: string;
  text: string;
  type: 'rating' | 'text' | 'multiple' | 'boolean';
  options?: string[];
  required: boolean;
}

interface EvaluationResults {
  averageRating: number;
  satisfactionRate: number;
  completionRate: number;
  recommendations: string[];
}

const TrainingAdminDashboard = () => {
  const { user, logout, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'trainers' | 'participants' | 'evaluations' | 'documents' | 'analytics' | 'settings'>('overview');
  const [activeSubTab, setActiveSubTab] = useState<string>('sessions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);

  // Training data (simulation)
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);

  // Charger les données depuis localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('trainingSessions');
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions).map((session: any) => ({
        ...session,
        startDate: new Date(session.startDate),
        endDate: new Date(session.endDate)
      }));
      setTrainingSessions(parsedSessions);
    } else {
      // Créer des sessions de démonstration
      initializeDemoSessions();
    }
  }, []);

  const initializeDemoSessions = () => {
    const demoSessions: TrainingSession[] = [
      {
        id: 'session-1',
        title: 'Développement Web Full-Stack',
        type: 'web',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-15'),
        participants: [
          {
            id: 'p1',
            name: 'Marie Dubois',
            email: 'marie.dubois@example.com',
            company: 'TechStart',
            phone: '06 12 34 56 78',
            status: 'confirmed',
            paymentStatus: 'paid',
            documents: ['convention-1', 'convocation-1'],
            evaluations: {},
            attendance: []
          }
        ],
        status: 'ongoing',
        location: 'Nice - 470 Promenade des Anglais',
        maxParticipants: 12,
        price: 6000,
        formateur: 'Alexandre Développeur',
        formateurId: 'trainer-1',
        documents: [],
        evaluations: [],
        description: 'Formation complète en développement web moderne avec React, Node.js et les meilleures pratiques.',
        objectives: [
          'Maîtriser React et ses concepts avancés',
          'Développer des APIs avec Node.js',
          'Comprendre les architectures modernes',
          'Déployer des applications en production'
        ],
        prerequisites: 'Connaissances de base en HTML, CSS et JavaScript',
        duration: 280,
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
        }
      },
      {
        id: 'session-2',
        title: 'DevOps et Cloud Computing',
        type: 'devops',
        startDate: new Date('2024-04-15'),
        endDate: new Date('2024-06-30'),
        participants: [],
        status: 'planned',
        location: 'Cannes - Centre de formation',
        maxParticipants: 8,
        price: 5500,
        formateur: 'Michel DevOps',
        formateurId: 'trainer-3',
        documents: [],
        evaluations: [],
        description: 'Maîtrisez les outils et pratiques DevOps pour automatiser vos déploiements.',
        objectives: [
          'Comprendre les principes DevOps',
          'Maîtriser Docker et Kubernetes',
          'Automatiser avec CI/CD',
          'Gérer l\'infrastructure as code'
        ],
        prerequisites: 'Expérience en développement et administration système',
        duration: 210,
        schedule: {
          startTime: '08:30',
          endTime: '16:30',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi']
        }
      },
      {
        id: 'session-3',
        title: 'UX/UI Design Avancé',
        type: 'web',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-06-15'),
        participants: [],
        status: 'planned',
        location: 'Formation à distance',
        maxParticipants: 10,
        price: 4500,
        formateur: 'Sarah UX Designer',
        formateurId: 'trainer-2',
        documents: [],
        evaluations: [],
        description: 'Créez des expériences utilisateur exceptionnelles avec les dernières méthodologies.',
        objectives: [
          'Maîtriser le design thinking',
          'Créer des prototypes interactifs',
          'Conduire des tests utilisateurs',
          'Optimiser l\'expérience utilisateur'
        ],
        prerequisites: 'Notions de base en design',
        duration: 168,
        schedule: {
          startTime: '10:00',
          endTime: '18:00',
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi']
        }
      }
    ];

    setTrainingSessions(demoSessions);
    localStorage.setItem('trainingSessions', JSON.stringify(demoSessions));
  };

  const saveSessions = (sessions: TrainingSession[]) => {
    setTrainingSessions(sessions);
    localStorage.setItem('trainingSessions', JSON.stringify(sessions));
  };

  const createSession = (sessionData: Partial<TrainingSession>) => {
    const newSession: TrainingSession = {
      id: `session-${Date.now()}`,
      title: sessionData.title || '',
      type: sessionData.type || 'web',
      startDate: sessionData.startDate || new Date(),
      endDate: sessionData.endDate || new Date(),
      participants: [],
      status: 'planned',
      location: sessionData.location || '',
      maxParticipants: sessionData.maxParticipants || 12,
      price: sessionData.price || 0,
      formateur: sessionData.formateur || '',
      formateurId: sessionData.formateurId,
      documents: [],
      evaluations: [],
      description: sessionData.description || '',
      objectives: sessionData.objectives || [],
      prerequisites: sessionData.prerequisites || '',
      duration: sessionData.duration || 0,
      schedule: sessionData.schedule || {
        startTime: '09:00',
        endTime: '17:00',
        days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
      }
    };

    const updatedSessions = [...trainingSessions, newSession];
    saveSessions(updatedSessions);
    return newSession;
  };

  const updateSession = (sessionId: string, updates: Partial<TrainingSession>) => {
    const updatedSessions = trainingSessions.map(session =>
      session.id === sessionId ? { ...session, ...updates } : session
    );
    saveSessions(updatedSessions);
  };

  const deleteSession = (sessionId: string) => {
    const updatedSessions = trainingSessions.filter(session => session.id !== sessionId);
    saveSessions(updatedSessions);
  };

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  // Show auth modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Administration Formation DELIVERY Digital</h1>
          <p className="text-gray-400 mb-8">Connectez-vous pour accéder au tableau de bord formation</p>
          <Auth
            isOpen={true}
            onClose={() => window.location.href = '/'}
            onSuccess={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Accès non autorisé</h1>
          <p className="text-gray-400 mb-8">Vous n'avez pas les permissions pour accéder à cette page</p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn btn-primary"
          >
            <Home className="h-5 w-5 mr-2" />
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const CreateSessionModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      type: 'web' as 'web' | 'devops' | 'security' | 'hygiene',
      startDate: '',
      endDate: '',
      location: '',
      maxParticipants: 12,
      price: 0,
      formateur: '',
      formateurId: '',
      description: '',
      objectives: [''],
      prerequisites: '',
      duration: 0,
      startTime: '09:00',
      endTime: '17:00',
      days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const sessionData: Partial<TrainingSession> = {
        title: formData.title,
        type: formData.type,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        location: formData.location,
        maxParticipants: formData.maxParticipants,
        price: formData.price,
        formateur: formData.formateur,
        formateurId: formData.formateurId,
        description: formData.description,
        objectives: formData.objectives.filter(obj => obj.trim() !== ''),
        prerequisites: formData.prerequisites,
        duration: formData.duration,
        schedule: {
          startTime: formData.startTime,
          endTime: formData.endTime,
          days: formData.days
        }
      };

      createSession(sessionData);
      setShowCreateSessionModal(false);
      
      // Reset form
      setFormData({
        title: '',
        type: 'web',
        startDate: '',
        endDate: '',
        location: '',
        maxParticipants: 12,
        price: 0,
        formateur: '',
        formateurId: '',
        description: '',
        objectives: [''],
        prerequisites: '',
        duration: 0,
        startTime: '09:00',
        endTime: '17:00',
        days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
      });
    };

    const addObjective = () => {
      setFormData({
        ...formData,
        objectives: [...formData.objectives, '']
      });
    };

    const updateObjective = (index: number, value: string) => {
      const newObjectives = [...formData.objectives];
      newObjectives[index] = value;
      setFormData({
        ...formData,
        objectives: newObjectives
      });
    };

    const removeObjective = (index: number) => {
      const newObjectives = formData.objectives.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        objectives: newObjectives.length > 0 ? newObjectives : ['']
      });
    };

    const isFormValid = formData.title && formData.startDate && formData.endDate && formData.location && formData.formateur;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Créer une nouvelle session</h3>
            <button
              onClick={() => setShowCreateSessionModal(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Titre de la formation *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type de formation
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="web">Développement Web</option>
                  <option value="devops">DevOps</option>
                  <option value="security">Cybersécurité</option>
                  <option value="hygiene">Hygiène & Sécurité</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date de fin *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lieu *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Nice - 470 Promenade des Anglais"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Formateur *
                </label>
                <input
                  type="text"
                  value={formData.formateur}
                  onChange={(e) => setFormData({ ...formData, formateur: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nom du formateur"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Participants max
                </label>
                <input
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 12 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prix (€)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Durée (heures)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Description de la formation..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Objectifs pédagogiques
              </label>
              <div className="space-y-2">
                {formData.objectives.map((objective, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => updateObjective(index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={`Objectif ${index + 1}`}
                    />
                    {formData.objectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeObjective(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addObjective}
                  className="text-primary-400 hover:text-primary-300 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un objectif
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prérequis
              </label>
              <textarea
                value={formData.prerequisites}
                onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Prérequis nécessaires pour suivre cette formation..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Horaires
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Heure de début</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Heure de fin</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowCreateSessionModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!isFormValid}
                className={`btn ${isFormValid ? 'btn-primary' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
              >
                <Save className="h-4 w-4 mr-2" />
                Créer la session
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderTrainingManagement = () => {
    const subTabs = [
      { id: 'sessions', label: 'Sessions', icon: <Calendar className="h-4 w-4" /> },
      { id: 'participants', label: 'Participants', icon: <Users className="h-4 w-4" /> },
      { id: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
      { id: 'evaluations', label: 'Évaluations', icon: <ClipboardCheck className="h-4 w-4" /> },
      { id: 'attendance', label: 'Émargement', icon: <UserCheck className="h-4 w-4" /> },
      { id: 'certificates', label: 'Certificats', icon: <Award className="h-4 w-4" /> }
    ];

    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Formation Professionnelle</h2>
          <div className="flex items-center space-x-4">
            <button className="btn btn-secondary">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </button>
            <button 
              onClick={() => setShowCreateSessionModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Session
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-800 rounded-lg p-1">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md transition-all ${
                activeSubTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content based on active sub tab */}
        {activeSubTab === 'sessions' && (
          <div className="space-y-6">
            {/* Sessions Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Sessions actives</p>
                    <p className="text-2xl font-bold text-white">
                      {trainingSessions.filter(s => s.status === 'ongoing').length}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-400" />
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Participants inscrits</p>
                    <p className="text-2xl font-bold text-white">
                      {trainingSessions.reduce((total, session) => total + session.participants.length, 0)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Taux de satisfaction</p>
                    <p className="text-2xl font-bold text-white">94%</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">CA Formation</p>
                    <p className="text-2xl font-bold text-white">
                      {trainingSessions.reduce((total, session) => total + (session.price * session.participants.length), 0).toLocaleString()}€
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Sessions List */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Sessions de Formation</h3>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        className="w-64 px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <select className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                      <option value="all">Toutes les formations</option>
                      <option value="web">Développement Web</option>
                      <option value="devops">DevOps</option>
                      <option value="security">Cybersécurité</option>
                      <option value="hygiene">Hygiène & Sécurité</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Formation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Participants</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Formateur</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {trainingSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-white">{session.title}</div>
                            <div className="text-sm text-gray-400">{session.location}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
                            {session.startDate.toLocaleDateString('fr-FR')} - {session.endDate.toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
                            {session.participants.length}/{session.maxParticipants}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{session.formateur}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            session.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                            session.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                            session.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {session.status === 'ongoing' ? 'En cours' :
                             session.status === 'planned' ? 'Planifiée' :
                             session.status === 'completed' ? 'Terminée' : 'Annulée'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-400 hover:text-blue-300">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-green-400 hover:text-green-300">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-purple-400 hover:text-purple-300">
                              <FileSignature className="h-4 w-4" />
                            </button>
                            <button className="text-yellow-400 hover:text-yellow-300">
                              <QrCode className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => deleteSession(session.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'evaluations' && (
          <EvaluationSystem />
        )}

        {/* Autres onglets... */}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 min-h-screen p-4">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-2">Formation Admin</h2>
            <p className="text-sm text-gray-400">DELIVERY Digital Technology</p>
            {user && (
              <p className="text-xs text-gray-500 mt-2">{user.name}</p>
            )}
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'overview'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <BarChart3 className="h-5 w-5 mr-3" />
              Vue d'ensemble
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'sessions'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <GraduationCap className="h-5 w-5 mr-3" />
              Sessions de Formation
            </button>

            <button
              onClick={() => setActiveTab('trainers')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'trainers'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Users className="h-5 w-5 mr-3" />
              Formateurs
            </button>

            <button
              onClick={() => setActiveTab('participants')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'participants'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <UserCheck className="h-5 w-5 mr-3" />
              Participants
            </button>

            <button
              onClick={() => setActiveTab('evaluations')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'evaluations'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <ClipboardCheck className="h-5 w-5 mr-3" />
              Évaluations
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'documents'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <FileText className="h-5 w-5 mr-3" />
              Documents
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <TrendingUp className="h-5 w-5 mr-3" />
              Analytics
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Settings className="h-5 w-5 mr-3" />
              Paramètres
            </button>
          </nav>

          <div className="absolute bottom-4 space-y-2">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <Home className="h-5 w-5 mr-3" />
              Site principal
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Tableau de Bord Formation</h2>
                <div className="flex items-center space-x-4">
                  <Bell className="h-6 w-6 text-gray-400" />
                  <div className="text-sm text-gray-400">
                    {new Date().toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>

              {/* Global Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Sessions totales</p>
                      <p className="text-2xl font-bold text-white">{trainingSessions.length}</p>
                    </div>
                    <GraduationCap className="h-8 w-8 text-green-400" />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Participants actifs</p>
                      <p className="text-2xl font-bold text-white">
                        {trainingSessions.reduce((total, session) => total + session.participants.length, 0)}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Sessions en cours</p>
                      <p className="text-2xl font-bold text-white">
                        {trainingSessions.filter(s => s.status === 'ongoing').length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-400" />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">CA Formation</p>
                      <p className="text-2xl font-bold text-white">
                        {trainingSessions.reduce((total, session) => total + (session.price * session.participants.length), 0).toLocaleString()}€
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>
              </div>

              {/* Activity Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Sessions récentes</h3>
                  <div className="space-y-4">
                    {trainingSessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="flex items-center p-3 bg-gray-700 rounded-lg">
                        <GraduationCap className="h-5 w-5 text-green-400 mr-3" />
                        <div>
                          <p className="text-white text-sm">{session.title}</p>
                          <p className="text-gray-400 text-xs">{session.formateur} - {session.participants.length} participants</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Indicateurs Qualité</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Satisfaction Formation</span>
                      <span className="text-green-400 font-bold">94%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Taux de réussite</span>
                      <span className="text-blue-400 font-bold">92%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Taux de présence</span>
                      <span className="text-purple-400 font-bold">88%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Recommandations</span>
                      <span className="text-yellow-400 font-bold">96%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && renderTrainingManagement()}

          {/* Trainers Tab */}
          {activeTab === 'trainers' && (
            <TrainerManagement />
          )}

          {/* Evaluations Tab */}
          {activeTab === 'evaluations' && (
            <EvaluationSystem />
          )}

          {/* Other tabs... */}
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateSessionModal && <CreateSessionModal />}
    </div>
  );
};

export default TrainingAdminDashboard;