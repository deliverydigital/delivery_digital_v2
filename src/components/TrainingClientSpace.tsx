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
    title: 'Hygiène, Sécurité et Développement Durable - Initiation',
    description: "Sensibilisation des professionnels de la restauration et de l'industrie agro-alimentaire aux bonnes pratiques sanitaires (HACCP, PMS, TIAC), à la sécurité au travail et au développement durable.",
    duration: '21 heures',
    price: 525,
    level: 'beginner',
    nextSession: new Date('2025-10-20'),
    available: true,
    targetAudience: "Cuisiniers, chefs de cuisine, responsables de cuisine, personnel de restauration collective, gestionnaires d'établissements alimentaires, et toute personne impliquée dans la gestion de l'hygiène, de la sécurité et du développement durable.",
    objectives: [
      "Mettre en œuvre les bonnes pratiques d'hygiène alimentaire selon les exigences réglementaires (HACCP, PMS, TIAC)",
      "Assurer la sécurité du personnel et des clients en respectant les normes en cuisine",
      "Intégrer des pratiques respectueuses de l'environnement dans l'organisation du travail",
    ],
    modalities: 'Distanciel en visio-conférence avec un formateur',
    methods: [
      'Visioconférences interactives avec formateur',
      'Plateforme pédagogique en ligne',
      'Activités pratiques',
    ],
    evaluation: ['Évaluation en début de formation', 'Évaluation en fin de formation'],
    modules: [
      { title: 'Hygiène en Restauration', hours: 7, topics: ["Bonnes pratiques d'hygiène", 'Normes HACCP', 'Gestion des contaminations', 'Stockage des aliments'] },
      { title: 'Sécurité au travail', hours: 7, topics: ['Prévention des risques', 'EPI', 'Gestes et postures', 'Premiers secours'] },
      { title: 'Développement Durable', hours: 7, topics: ['Gestion des déchets', "Économie d'énergie", 'Produits éco-responsables', 'Réduction du gaspillage'] },
    ],
    prerequisites: 'Aucun prérequis',
    accessibility: 'Formation accessible aux personnes en situation de handicap',
    lastUpdate: '09/05/2026',
    category: 'safety',
  };

  const getProgramIcon = () => {
    return <Leaf className="h-6 w-6 text-[var(--ink-700)]" />;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-[var(--ink-50)] text-[var(--ink-700)] ring-1 ring-[var(--ink-100)]';
      case 'intermediate': return 'bg-[var(--ink-50)] text-[var(--ink-700)] ring-1 ring-[var(--ink-100)]';
      case 'advanced': return 'bg-[var(--ink-50)] text-[var(--ink-700)] ring-1 ring-[var(--ink-100)]';
      default: return 'bg-[var(--ink-50)] text-[var(--ink-700)] ring-1 ring-[var(--ink-100)]';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-[22px] shadow-2xl ring-1 ring-black/5 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-7 py-5 border-b border-[var(--ink-100)] flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="h-5 w-5 text-[var(--ink-900)]" strokeWidth={1.5} />
            <h3 className="display-3 text-[20px] text-[var(--ink-900)]">
              Formation Professionnelle
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--ink-500)] hover:text-[var(--ink-900)] -mr-1"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Apple-style segmented pill tabs */}
        <div className="px-7 pt-5 pb-3">
          <div className="inline-flex p-1 rounded-full bg-[var(--ink-50)] ring-1 ring-[var(--ink-100)]">
            {[
              { id: 'programs', label: 'Notre Formation', Icon: BookOpen },
              { id: 'register', label: "S'inscrire", Icon: Send },
              { id: 'account', label: 'Mon Compte', Icon: User },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-white text-[var(--ink-900)] shadow-sm'
                    : 'text-[var(--ink-500)] hover:text-[var(--ink-900)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.6} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Programs Tab */}
          {activeTab === 'programs' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="display-3 text-[24px] text-[var(--ink-900)] mb-2">
                  Formation
                </h2>
                <p className="text-[15px] text-[var(--ink-700)]">
                  Formation spécialisée pour le secteur de la restauration
                </p>
                {/**<div className="mt-4 flex justify-center">
                  <img 
                    src="/LogoQualiopi-300dpi-Avec Marianne (1).png" 
                    alt="Certification Qualiopi" 
                    className="h-16 object-contain"
                  />
                </div>**/}
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="rounded-[18px] ring-1 ring-[var(--ink-100)] hover:ring-[var(--ink-300)] p-6 transition-all bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      {getProgramIcon()}
                      <div className="ml-3">
                        <h3 className="display-3 text-[16px] text-[var(--ink-900)]">{program.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(program.level)}`}>
                          {program.level === 'beginner' ? 'Débutant' :
                           program.level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="display-3 text-[26px] text-[var(--ink-900)]">{program.price}€</div>
                      <div className="text-[13px] text-[var(--ink-500)]">par apprenant</div>
                    </div>
                  </div>

                  <p className="text-[var(--ink-700)] mb-4">{program.description}</p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-[13px] text-[var(--ink-500)]">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{program.duration}</span>
                    </div>
                    {program.nextSession && (
                      <div className="flex items-center text-[13px] text-[var(--ink-500)]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Prochaine session : {program.nextSession.toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                    <div className="flex items-center text-[13px] text-[var(--ink-500)]">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>Nice - 470 Promenade des Anglais</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-[var(--ink-700)]">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span>Éligible OPCO</span>
                    </div>
                    <a
                      href="https://app.deliverydigital.fr/student/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-pill inline-flex items-center"
                    >
                      S'inscrire
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--ink-50)] ring-1 ring-[var(--ink-100)] rounded-2xl p-6 mt-8">
                <div className="flex items-start">
                  <Award className="h-6 w-6 text-[var(--link)] mr-3 mt-1" />
                  <div>
                    <h3 className="text-lg font-medium text-[var(--ink-900)] mb-2">
                      Financement et Prise en Charge
                    </h3>
                    <div className="text-[var(--ink-700)] space-y-2">
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
                <GraduationCap className="h-16 w-16 text-[var(--ink-700)] mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Inscription à la Formation
                </h2>
                <p className="text-[var(--ink-700)] mb-6">
                  Inscrivez-vous directement sur notre plateforme de formation pour accéder à notre programme.
                </p>
                <a
                  href="https://app.deliverydigital.fr/student/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-pill inline-flex items-center text-lg font-medium"
                >
                  <Send className="h-5 w-5 mr-2" />
                  S'inscrire maintenant
                  <ExternalLink className="h-5 w-5 ml-2" />
                </a>
                <p className="text-[13px] text-[var(--ink-500)] mt-4">
                  Vous serez redirigé vers notre plateforme sécurisée d'inscription
                </p>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-[var(--ink-50)] ring-1 ring-[var(--ink-100)] rounded-2xl p-8">
                <User className="h-16 w-16 text-[var(--link)] mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Espace Apprenant
                </h2>
                <p className="text-[var(--ink-700)] mb-6">
                  Connectez-vous pour accéder à votre formation, suivre votre progression et télécharger vos certificats.
                </p>
                <a
                  href="https://app.deliverydigital.fr/student/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-pill inline-flex items-center"
                >
                  <User className="h-5 w-5 mr-2" />
                  Accéder à mon espace
                  <ExternalLink className="h-5 w-5 ml-2" />
                </a>
                <p className="text-[13px] text-[var(--ink-500)] mt-4">
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