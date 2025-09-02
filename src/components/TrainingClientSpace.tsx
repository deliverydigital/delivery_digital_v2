import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Mail, Phone, Building2, Calendar, Clock, 
  MapPin, Users, Euro, CheckCircle, AlertCircle, 
  FileText, Download, Star, GraduationCap, Send,
  CreditCard, Shield, Award, BookOpen, Target, ExternalLink,
  Utensils, Leaf
} from 'lucide-react';

interface TrainingClientSpaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const TrainingClientSpace = ({ isOpen, onClose }: TrainingClientSpaceProps) => {
  const [activeTab, setActiveTab] = useState<'programs' | 'register' | 'account'>('programs');

  const program = {
    id: 'hygiene-security',
    title: 'Hygiène, Sécurité et Développement Durable',
    description: 'Formation complète en hygiène, sécurité et pratiques durables pour le secteur de la restauration',
    duration: '21 heures',
    price: 525,
    level: 'beginner',
    nextSession: new Date('2024-03-15'),
    available: true
  };

  const getProgramIcon = () => {
    return <Leaf className="h-6 w-6 text-green-400" />;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
            <GraduationCap className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-xl font-bold text-gray-900">
              Formation Professionnelle DELIVERY Digital
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
            {[
              { id: 'programs', label: 'Notre Formation', icon: <BookOpen className="h-4 w-4" /> },
              { id: 'register', label: 'S\'inscrire', icon: <Send className="h-4 w-4" /> },
              { id: 'account', label: 'Mon Compte', icon: <User className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Programs Tab */}
          {activeTab === 'programs' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Formation Certifiée Qualiopi
                </h2>
                <p className="text-gray-600">
                  Formation spécialisée pour le secteur de la restauration
                </p>
                <div className="mt-4 flex justify-center">
                  <img 
                    src="/LogoQualiopi-300dpi-Avec Marianne (1).png" 
                    alt="Certification Qualiopi" 
                    className="h-16 object-contain"
                  />
                </div>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      {getProgramIcon()}
                      <div className="ml-3">
                        <h3 className="text-lg font-bold text-gray-900">{program.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(program.level)}`}>
                          {program.level === 'beginner' ? 'Débutant' :
                           program.level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{program.price}€</div>
                      <div className="text-sm text-gray-500">par apprenant</div>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">{program.description}</p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{program.duration}</span>
                    </div>
                    {program.nextSession && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Prochaine session : {program.nextSession.toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>Nice - 470 Promenade des Anglais</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span>Éligible OPCO</span>
                    </div>
                    <a
                      href="https://app.deliverydigital.fr/student/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center"
                    >
                      S'inscrire
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
                <div className="flex items-start">
                  <Award className="h-6 w-6 text-blue-600 mr-3 mt-1" />
                  <div>
                    <h3 className="text-lg font-medium text-blue-900 mb-2">
                      Financement et Prise en Charge
                    </h3>
                    <div className="text-blue-800 space-y-2">
                      <p>• <strong>OPCO :</strong> Prise en charge jusqu'à 100% selon votre secteur</p>
                      <p>• <strong>Pôle Emploi :</strong> Financement possible pour les demandeurs d'emploi</p>
                      <p>• <strong>Entreprise :</strong> Formation continue de vos équipes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Register Tab */}
          {activeTab === 'register' && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-8">
                <GraduationCap className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Inscription à la Formation
                </h2>
                <p className="text-gray-600 mb-6">
                  Inscrivez-vous directement sur notre plateforme de formation pour accéder à notre programme certifié Qualiopi.
                </p>
                <a
                  href="https://app.deliverydigital.fr/student/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center text-lg font-medium"
                >
                  <Send className="h-5 w-5 mr-2" />
                  S'inscrire maintenant
                  <ExternalLink className="h-5 w-5 ml-2" />
                </a>
                <p className="text-sm text-gray-500 mt-4">
                  Vous serez redirigé vers notre plateforme sécurisée d'inscription
                </p>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
                <User className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Espace Apprenant
                </h2>
                <p className="text-gray-600 mb-6">
                  Connectez-vous pour accéder à votre formation, suivre votre progression et télécharger vos certificats.
                </p>
                <a
                  href="https://app.deliverydigital.fr/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <User className="h-5 w-5 mr-2" />
                  Accéder à mon espace
                  <ExternalLink className="h-5 w-5 ml-2" />
                </a>
                <p className="text-sm text-gray-500 mt-4">
                  Déjà inscrit ? Connectez-vous à votre espace personnel
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TrainingClientSpace;