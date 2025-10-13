import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, User, Mail, Phone, Building2, Calendar, Clock, 
  MapPin, Users, Euro, CheckCircle, AlertCircle, 
  FileText, Download, Star, Send, Briefcase, 
  CreditCard, Shield, Award, BookOpen, Target, ExternalLink,
  Utensils, Leaf, Code, Database, Cloud, Server, Smartphone,
  Laptop, Globe, Upload, PlusCircle, Info, HelpCircle
} from 'lucide-react';
import Auth from './Auth';
import { useAuth, useProjects } from '../hooks/useApi';

interface DigitalClientSpaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const DigitalClientSpace = ({ isOpen, onClose }: DigitalClientSpaceProps) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'submit' | 'account'>('submit');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { projects, loading, submitProject } = useProjects(isAuthenticated ? user?.id : undefined);
  const [projectTypes, setProjectTypes] = useState<{id: string, name: string}[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'web',
    budget: 'medium',
    timeline: 'normal',
    figmaUrl: '',
    gitlabUrl: '',
    files: [] as File[]
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileInputRef] = useState<HTMLInputElement | null>(null);
  const [authKey, setAuthKey] = useState(0); // Force re-render after auth

  useEffect(() => {
    const stored = localStorage.getItem('projectTypes');
    if (stored) {
      const types = JSON.parse(stored);
      setProjectTypes(types);
    } else {
      const defaultTypes = [
        { id: '1', name: 'Site Web / Application Web' },
        { id: '2', name: 'Application Mobile' },
        { id: '3', name: 'E-commerce' },
        { id: '4', name: 'Application Desktop' },
        { id: '5', name: 'API / Backend' },
        { id: '6', name: 'Formation' },
        { id: '7', name: 'Consulting' }
      ];
      setProjectTypes(defaultTypes);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isAuthenticated && user && activeTab === 'projects') {
      // Force refresh projects when opening the projects tab
      const event = new CustomEvent('refreshProjects');
      window.dispatchEvent(event);
    }
  }, [isOpen, isAuthenticated, user, activeTab]);

  // Listen for login events to refresh the component
  useEffect(() => {
    const handleUserLoggedIn = () => {
      // Force re-render and switch to projects tab
      setAuthKey(prev => prev + 1);
      setActiveTab('projects');
      // Trigger projects refresh
      const event = new CustomEvent('refreshProjects');
      window.dispatchEvent(event);
    };

    const handleAuthStateChanged = () => {
      // Force re-render when auth state changes
      setAuthKey(prev => prev + 1);
    };
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    window.addEventListener('authStateChanged', handleAuthStateChanged);
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
      window.removeEventListener('authStateChanged', handleAuthStateChanged);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setFormStatus('submitting');
    setErrorMessage('');

    try {
      // Submit project using the API service
      const result = await submitProject({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        budget: formData.budget,
        timeline: formData.timeline,
        figmaUrl: formData.figmaUrl,
        gitlabUrl: formData.gitlabUrl,
        attachments: formData.files
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit project');
      }

      setFormStatus('success');
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          title: '',
          description: '',
          type: 'web',
          budget: 'medium',
          timeline: 'normal',
          figmaUrl: '',
          gitlabUrl: '',
          files: []
        });
        setActiveTab('projects');
        setFormStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting project:', error);
      setFormStatus('error');
      setErrorMessage(error.message || 'Une erreur est survenue lors de la soumission du projet.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({
        ...formData,
        files: Array.from(e.target.files)
      });
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Switch to projects tab after successful login
    setActiveTab('projects');
    setAuthKey(prev => prev + 1);
  };

  const handleLogout = async () => {
    logout();
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'reviewing': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Soumis';
      case 'reviewing': return 'En révision';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      case 'on_hold': return 'En pause';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <Code className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-bold text-gray-900">
              Solutions Digitales DELIVERY Digital
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              <span>Mes Projets</span>
            </button>
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex items-center py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'submit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Send className="h-4 w-4 mr-2" />
              <span>Soumettre un Projet</span>
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'account'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="h-4 w-4 mr-2" />
              <span>Mon Compte</span>
            </button>
          </nav>
        </div>

        <div key={authKey} className="p-6">
          {/* Projects Tab */}
          {activeTab === 'projects' && (
            isAuthenticated ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Mes Projets</h2>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nouveau Projet
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Chargement de vos projets...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet</h3>
                  <p className="text-gray-600 mb-6">Vous n'avez pas encore soumis de projet.</p>
                  <button
                    onClick={() => setActiveTab('submit')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Soumettre un projet
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{project.title}</h3>
                          <p className="text-gray-600 mt-1">{project.description}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-gray-500 text-sm">Type:</span>
                          <span className="text-gray-900 ml-2 text-sm capitalize">{project.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Budget:</span>
                          <span className="text-gray-900 ml-2 text-sm capitalize">{project.budget}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Délai:</span>
                          <span className="text-gray-900 ml-2 text-sm">{project.timeline}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Soumis le:</span>
                          <span className="text-gray-900 ml-2 text-sm">
                            {project.submittedAt ? new Date(project.submittedAt).toLocaleDateString('fr-FR') : 'Date non disponible'}
                          </span>
                        </div>
                      </div>

                      {project.attachments && project.attachments.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Pièces jointes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {project.attachments.map((attachment, index) => (
                              <div key={index} className="flex items-center bg-gray-100 rounded-lg px-3 py-1">
                                <FileText className="h-4 w-4 text-gray-500 mr-2" />
                                <span className="text-sm text-gray-700">{attachment.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Mes Projets</h3>
                <p className="text-gray-600 mb-6">
                  Connectez-vous pour voir et gérer vos projets en cours.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <User className="h-4 w-4 mr-2" />
                  Se connecter
                </button>
              </div>
            )
          )}

          {/* Submit Project Tab */}
          {activeTab === 'submit' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Soumettre un Nouveau Projet
                </h2>
                <p className="text-gray-600">
                  Décrivez votre projet et nous vous contacterons rapidement pour en discuter
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Titre du projet *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Type de projet *
                    </label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {projectTypes.length > 0 ? (
                        projectTypes.map((type) => (
                          <option key={type.id} value={type.name.toLowerCase().replace(/\s+/g, '-')}>
                            {type.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="web">Site Web / Application Web</option>
                          <option value="mobile">Application Mobile</option>
                          <option value="e-commerce">E-commerce</option>
                          <option value="desktop">Application Desktop</option>
                          <option value="api">API / Backend</option>
                          <option value="formation">Formation</option>
                          <option value="consulting">Consulting</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description du projet *
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    minLength={10}
                    maxLength={5000}
                    required
                  ></textarea>
                  <div className="mt-1 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {formData.description.length < 10 ? (
                        <span className="text-red-500">
                          Minimum 10 caractères requis ({10 - formData.description.length} restants)
                        </span>
                      ) : formData.description.length > 5000 ? (
                        <span className="text-red-500">
                          Trop de caractères ({formData.description.length - 5000} en trop)
                        </span>
                      ) : (
                        <span className="text-green-600">
                          Description valide
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formData.description.length}/5000
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                      Budget estimé
                    </label>
                    <select
                      id="budget"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="small">Petit ({"< 10k €"})</option>
                      <option value="medium">Moyen (10k € - 50k €)</option>
                      <option value="large">Grand (50k € - 100k €)</option>
                      <option value="enterprise">Entreprise ({"> 100k €"})</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-1">
                      Délai souhaité
                    </label>
                    <select
                      id="timeline"
                      value={formData.timeline}
                      onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="urgent">Urgent ({"< 1 mois"})</option>
                      <option value="normal">Normal (1-3 mois)</option>
                      <option value="flexible">Flexible (3-6 mois)</option>
                      <option value="longterm">Long terme ({"> 6 mois"})</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="figmaUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      URL Figma (optionnel)
                    </label>
                    <input
                      type="url"
                      id="figmaUrl"
                      value={formData.figmaUrl}
                      onChange={(e) => setFormData({ ...formData, figmaUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://figma.com/..."
                    />
                  </div>
                  <div>
                    <label htmlFor="gitlabUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      URL GitLab (optionnel)
                    </label>
                    <input
                      type="url"
                      id="gitlabUrl"
                      value={formData.gitlabUrl}
                      onChange={(e) => setFormData({ ...formData, gitlabUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://gitlab.com/..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pièces jointes (optionnel)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Télécharger des fichiers</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            multiple
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">ou glisser-déposer</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, PDF jusqu'à 10MB
                      </p>
                    </div>
                  </div>
                  {formData.files.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{formData.files.length} fichier(s) sélectionné(s)</p>
                      <ul className="mt-2 divide-y divide-gray-200">
                        {formData.files.map((file, index) => (
                          <li key={index} className="py-2 flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{file.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {formStatus === 'error' && (
                  <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {errorMessage || "Une erreur est survenue. Veuillez réessayer."}
                  </div>
                )}

                {formStatus === 'success' && (
                  <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Votre projet a été soumis avec succès ! Nous vous contacterons bientôt.
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={formStatus === 'submitting' || formData.description.length < 10 || formData.description.length > 5000}
                    className={`bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center ${
                      (formStatus === 'submitting' || formData.description.length < 10 || formData.description.length > 5000) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {formStatus === 'submitting' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Soumettre le projet
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            isAuthenticated ? (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Mon Compte
                </h2>
                <p className="text-gray-600">
                  Gérez vos informations personnelles et vos préférences
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{user?.email}</h3>
                      <p className="text-gray-500">Client</p>
                    </div>
                  </div>
                  <a
                    href="/?admin=true"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center text-sm font-medium"
                  >
                    <User className="h-5 w-5 mr-2" />
                    Accéder au Dashboard
                  </a>
                  <button
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Se déconnecter
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Informations personnelles</h4>
                  <p className="text-gray-600 mb-4">
                    Vous pouvez mettre à jour vos informations personnelles et préférences dans votre profil.
                  </p>
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Modifier mon profil
                  </button>
                </div>
              </div>
            </div>
            ) : (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Mon Compte</h3>
                <p className="text-gray-600 mb-6">
                  Connectez-vous pour accéder à votre espace personnel et gérer vos informations.
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center text-lg font-medium"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Se connecter / S'inscrire
                  </button>
                  <p className="text-sm text-gray-500">
                    Nouveau client ? Créez votre compte pour commencer
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </motion.div>

      {/* Auth Modal */}
      <Auth
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default DigitalClientSpace;