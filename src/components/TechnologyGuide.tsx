import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Brain, Globe, Smartphone, Server, Code, Database, Cloud,
  ChevronDown, ChevronUp, CheckCircle, Shield,
  Laptop, BookOpen, Zap, Trophy, Users, Clock, Settings,
  Wrench, Bell, ExternalLink, Blocks, Timer
} from 'lucide-react';

const TechnologyGuide = () => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const [activeTab, setActiveTab] = useState('basics');
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (techId, section) => {
    if (expandedSection === `${techId}-${section}`) {
      setExpandedSection(null);
    } else {
      setExpandedSection(`${techId}-${section}`);
    }
  };

  const techGuides = {
    basics: {
      title: "Comprendre le Développement",
      description: "Guide simple pour comprendre les bases du développement",
      options: [
        {
          name: "Qu'est-ce que le développement ?",
          description: "Une introduction simple au monde du développement",
          icon: <Brain className="h-6 w-6 text-blue-400" />,
          content: {
            introduction: {
              title: "Les bases",
              description: "Le développement informatique, c'est comme construire une maison numérique. Chaque élément a son rôle :",
              elements: [
                "Le Front-end est ce que vous voyez (comme les murs et la décoration)",
                "Le Back-end est ce qui fait fonctionner (comme l'électricité et la plomberie)",
                "La Base de données est où on range les informations (comme les placards)",
                "Le Cloud est comme un grand garage partagé où on peut stocker et faire fonctionner nos applications"
              ]
            },
            analogies: {
              title: "Comparaisons simples",
              examples: [
                {
                  tech: "Site Web",
                  comparison: "Comme un magasin : une vitrine (front-end) et une réserve (back-end)"
                },
                {
                  tech: "Application Mobile",
                  comparison: "Comme une télécommande personnalisée pour vos services"
                },
                {
                  tech: "Base de données",
                  comparison: "Comme un grand classeur bien organisé"
                }
              ]
            }
          }
        },
        {
          name: "Les différents métiers",
          description: "Découvrez les rôles dans le développement",
          icon: <Users className="h-6 w-6 text-green-400" />,
          content: {
            roles: {
              "Développeur Front-end": "Crée ce que vous voyez à l'écran",
              "Développeur Back-end": "Gère le fonctionnement en coulisses",
              "Développeur Full-stack": "Fait les deux (front et back)",
              "Designer UI/UX": "Rend l'application belle et facile à utiliser",
              "DevOps": "S'assure que tout fonctionne bien ensemble"
            }
          }
        }
      ]
    },
    web: {
      title: "Le Web Simplifié",
      description: "Comprendre comment fonctionne un site web",
      options: [
        {
          name: "Les briques d'un site web",
          description: "Les éléments essentiels d'un site web",
          icon: <Blocks className="h-6 w-6 text-purple-400" />,
          content: {
            composants: {
              "HTML": "La structure (comme les murs d'une maison)",
              "CSS": "Le style (comme la peinture et la décoration)",
              "JavaScript": "L'interactivité (comme les interrupteurs et les portes)",
              "Base de données": "Le stockage (comme les armoires)"
            },
            exemples: [
              "Un formulaire de contact",
              "Un menu de navigation",
              "Une galerie d'images",
              "Un panier d'achat"
            ]
          }
        }
      ]
    },
    mobile: {
      title: "Applications Mobiles",
      description: "Comment fonctionnent les apps de votre téléphone",
      options: [
        {
          name: "Types d'applications",
          description: "Les différentes façons de créer une app mobile",
          icon: <Smartphone className="h-6 w-6 text-orange-400" />,
          content: {
            types: {
              "Applications natives": "Faites spécialement pour iPhone ou Android",
              "Applications hybrides": "Fonctionnent sur tous les téléphones",
              "Progressive Web Apps": "Sites web qui ressemblent à des apps"
            },
            exemples: [
              "Application de messagerie",
              "Jeu mobile",
              "Application de livraison",
              "Réseau social"
            ]
          }
        }
      ]
    },
    backend: {
      title: "L'Arrière-boutique",
      description: "Ce qui se passe en coulisses",
      options: [
        {
          name: "Le Back-end expliqué",
          description: "Comment ça marche derrière l'écran",
          icon: <Server className="h-6 w-6 text-red-400" />,
          content: {
            fonctionnement: {
              "Serveur": "L'ordinateur qui fait fonctionner votre site",
              "API": "Comment les différentes parties communiquent",
              "Base de données": "Où sont stockées les informations",
              "Sécurité": "Protection des données et des utilisateurs"
            },
            exemples: [
              "Stocker les informations des utilisateurs",
              "Traiter les paiements",
              "Envoyer des emails",
              "Gérer les connexions"
            ]
          }
        }
      ]
    }
  };

  const renderContent = (tech, index) => {
    const renderSection = (sectionKey, sectionData) => {
      const isExpanded = expandedSection === `${index}-${sectionKey}`;
      
      return (
        <div key={sectionKey} className="mt-4">
          <button
            onClick={() => toggleSection(index, sectionKey)}
            className="w-full flex items-center justify-between p-4 text-left text-gray-300 hover:text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="font-medium capitalize">{sectionKey}</span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
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
                <div className="p-4 space-y-4 bg-white/5 rounded-lg mt-2">
                  {typeof sectionData === 'string' ? (
                    <p className="text-gray-300">{sectionData}</p>
                  ) : Array.isArray(sectionData) ? (
                    <ul className="space-y-3">
                      {sectionData.map((item, i) => (
                        <li key={i} className="flex items-start text-gray-300">
                          <CheckCircle className="h-5 w-5 mr-3 text-primary-400 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    Object.entries(sectionData).map(([key, value]) => (
                      <div key={key} className="space-y-3">
                        <h4 className="font-medium text-white flex items-center">
                          <div className="w-2 h-2 bg-primary-400 rounded-full mr-2"></div>
                          {key}
                        </h4>
                        {Array.isArray(value) ? (
                          <ul className="space-y-2 ml-4">
                            {value.map((item, i) => (
                              <li key={i} className="flex items-center text-gray-300">
                                <CheckCircle className="h-4 w-4 mr-2 text-primary-400" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-300 ml-4">{value}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    };

    return (
      <div className="mt-4 space-y-2">
        {Object.entries(tech.content).map(([key, value]) => renderSection(key, value))}
      </div>
    );
  };

  const tabs = [
    { id: 'basics', label: 'Les Bases', icon: <Brain className="h-5 w-5" /> },
    { id: 'web', label: 'Web', icon: <Globe className="h-5 w-5" /> },
    { id: 'mobile', label: 'Mobile', icon: <Smartphone className="h-5 w-5" /> },
    { id: 'backend', label: 'Back-end', icon: <Server className="h-5 w-5" /> }
  ];

  return (
    <section id="tech-guide" className="py-16 relative overflow-hidden" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
            Guide des Technologies
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Comprendre le développement informatique simplement
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-white/5 rounded-xl p-8 backdrop-blur-sm border border-white/10">
              <div className="text-center mb-8">
                <Brain className="h-12 w-12 text-primary-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  Nouveau dans le développement ?
                </h3>
                <p className="text-gray-300">
                  Découvrez les bases du développement avec des explications simples et des exemples concrets
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center p-4 bg-white/5 rounded-lg">
                  <Blocks className="h-6 w-6 text-primary-400 mr-4" />
                  <div>
                    <h4 className="font-medium text-white">Concepts de base</h4>
                    <p className="text-sm text-gray-300">Les fondamentaux expliqués simplement</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-white/5 rounded-lg">
                  <Users className="h-6 w-6 text-green-400 mr-4" />
                  <div>
                    <h4 className="font-medium text-white">Métiers du développement</h4>
                    <p className="text-sm text-gray-300">Découvrez les différents rôles</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-white/5 rounded-lg">
                  <Settings className="h-6 w-6 text-orange-400 mr-4" />
                  <div>
                    <h4 className="font-medium text-white">Outils et technologies</h4>
                    <p className="text-sm text-gray-300">Les outils essentiels pour débuter</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-lg border border-white/10 p-1 bg-white/5 backdrop-blur-sm">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 rounded-md transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    <span className="ml-2">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {techGuides[activeTab].options.map((tech, index) => (
                <div
                  key={index}
                  className="card p-6 backdrop-blur-sm"
                >
                  <div className="flex items-start">
                    <div className="bg-white/10 p-3 rounded-lg mr-4">
                      {tech.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{tech.name}</h3>
                      <p className="text-gray-300">{tech.description}</p>
                      {renderContent(tech, index)}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechnologyGuide;