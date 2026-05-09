import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Brain, Globe, Smartphone, Server,
  ChevronDown, ChevronUp, CheckCircle,
  Users, Settings, Blocks
} from 'lucide-react';

/**
 * Apple.fr-style "Guide" section.
 * - Light bg
 * - Pill segmented control for tabs
 * - White cards with subtle ring
 * - Accordion expand for content
 */

const TechnologyGuide = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const [activeTab, setActiveTab] = useState('basics');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (techId: number, section: string) => {
    const key = `${techId}-${section}`;
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  const techGuides: any = {
    basics: {
      title: 'Comprendre le Développement',
      description: 'Guide simple pour comprendre les bases du développement',
      options: [
        {
          name: "Qu'est-ce que le développement ?",
          description: 'Une introduction simple au monde du développement',
          icon: Brain,
          content: {
            introduction: {
              title: 'Les bases',
              description: 'Le développement informatique, c\'est comme construire une maison numérique. Chaque élément a son rôle :',
              elements: [
                'Le Front-end est ce que vous voyez (comme les murs et la décoration)',
                'Le Back-end est ce qui fait fonctionner (comme l\'électricité et la plomberie)',
                'La Base de données est où on range les informations (comme les placards)',
                'Le Cloud est comme un grand garage partagé où on peut stocker et faire fonctionner nos applications',
              ],
            },
            analogies: {
              title: 'Comparaisons simples',
              examples: [
                { tech: 'Site Web', comparison: 'Comme un magasin : une vitrine (front-end) et une réserve (back-end)' },
                { tech: 'Application Mobile', comparison: 'Comme une télécommande personnalisée pour vos services' },
                { tech: 'Base de données', comparison: 'Comme un grand classeur bien organisé' },
              ],
            },
          },
        },
        {
          name: 'Les différents métiers',
          description: 'Découvrez les rôles dans le développement',
          icon: Users,
          content: {
            roles: {
              'Développeur Front-end': 'Crée ce que vous voyez à l\'écran',
              'Développeur Back-end': 'Gère le fonctionnement en coulisses',
              'Développeur Full-stack': 'Fait les deux (front et back)',
              'Designer UI/UX': 'Rend l\'application belle et facile à utiliser',
              'DevOps': 'S\'assure que tout fonctionne bien ensemble',
            },
          },
        },
      ],
    },
    web: {
      title: 'Le Web Simplifié',
      description: 'Comprendre comment fonctionne un site web',
      options: [
        {
          name: 'Les briques d\'un site web',
          description: 'Les éléments essentiels d\'un site web',
          icon: Blocks,
          content: {
            composants: {
              HTML: 'La structure (comme les murs d\'une maison)',
              CSS: 'Le style (comme la peinture et la décoration)',
              JavaScript: 'L\'interactivité (comme les interrupteurs et les portes)',
              'Base de données': 'Le stockage (comme les armoires)',
            },
            exemples: [
              'Un formulaire de contact',
              'Un menu de navigation',
              'Une galerie d\'images',
              'Un panier d\'achat',
            ],
          },
        },
      ],
    },
    mobile: {
      title: 'Applications Mobiles',
      description: 'Comment fonctionnent les apps de votre téléphone',
      options: [
        {
          name: 'Types d\'applications',
          description: 'Les différentes façons de créer une app mobile',
          icon: Smartphone,
          content: {
            types: {
              'Applications natives': 'Faites spécialement pour iPhone ou Android',
              'Applications hybrides': 'Fonctionnent sur tous les téléphones',
              'Progressive Web Apps': 'Sites web qui ressemblent à des apps',
            },
            exemples: [
              'Application de messagerie',
              'Jeu mobile',
              'Application de livraison',
              'Réseau social',
            ],
          },
        },
      ],
    },
    backend: {
      title: 'L\'Arrière-boutique',
      description: 'Ce qui se passe en coulisses',
      options: [
        {
          name: 'Le Back-end expliqué',
          description: 'Comment ça marche derrière l\'écran',
          icon: Server,
          content: {
            fonctionnement: {
              Serveur: 'L\'ordinateur qui fait fonctionner votre site',
              API: 'Comment les différentes parties communiquent',
              'Base de données': 'Où sont stockées les informations',
              Sécurité: 'Protection des données et des utilisateurs',
            },
            exemples: [
              'Stocker les informations des utilisateurs',
              'Traiter les paiements',
              'Envoyer des emails',
              'Gérer les connexions',
            ],
          },
        },
      ],
    },
  };

  const tabs = [
    { id: 'basics', label: 'Les Bases', icon: Brain },
    { id: 'web', label: 'Web', icon: Globe },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'backend', label: 'Back-end', icon: Server },
  ];

  const renderSection = (techId: number, sectionKey: string, sectionData: any) => {
    const isExpanded = expandedSection === `${techId}-${sectionKey}`;
    return (
      <div key={sectionKey} className="mt-2">
        <button
          onClick={() => toggleSection(techId, sectionKey)}
          className="w-full flex items-center justify-between px-4 py-3 text-left text-[14.5px] font-semibold text-[var(--ink-900)] bg-[var(--ink-50)] rounded-2xl hover:bg-[var(--ink-100)] transition-colors capitalize"
        >
          {sectionKey}
          {isExpanded ? <ChevronUp className="h-4 w-4 text-[var(--ink-500)]" strokeWidth={2} /> : <ChevronDown className="h-4 w-4 text-[var(--ink-500)]" strokeWidth={2} />}
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
              <div className="p-4 mt-2 space-y-4 bg-[var(--ink-50)] rounded-2xl text-[14px] text-[var(--ink-700)]">
                {typeof sectionData === 'string' ? (
                  <p>{sectionData}</p>
                ) : Array.isArray(sectionData) ? (
                  <ul className="space-y-2.5">
                    {sectionData.map((item, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2.5 mt-0.5 text-[var(--link)] flex-shrink-0" strokeWidth={2} />
                        <span>{typeof item === 'string' ? item : `${item.tech} - ${item.comparison}`}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  Object.entries(sectionData).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <h4 className="font-semibold text-[var(--ink-900)] flex items-center text-[14px]">
                        <span className="w-1.5 h-1.5 bg-[var(--link)] rounded-full mr-2"></span>
                        {key}
                      </h4>
                      {Array.isArray(value) ? (
                        <ul className="space-y-1.5 ml-4">
                          {(value as string[]).map((item, i) => (
                            <li key={i} className="flex items-start text-[13.5px] text-[var(--ink-700)]">
                              <CheckCircle className="h-3.5 w-3.5 mr-2 mt-0.5 text-[var(--link)] flex-shrink-0" strokeWidth={2} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="ml-4 text-[13.5px] text-[var(--ink-700)]">{value as string}</p>
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
    <section id="tech-guide" className="tile tile-pure py-20 sm:py-24" ref={ref}>
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="display-2 text-[36px] sm:text-[48px] lg:text-[56px] text-[var(--ink-900)] mb-3">
            Guide des Technologies
          </h2>
          <p className="text-[18px] sm:text-[20px] text-[var(--ink-700)] max-w-2xl mx-auto tracking-tight">
            Comprendre le développement informatique simplement.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 lg:gap-10">
          {/* Left intro card */}
          <div className="bg-[var(--bg-soft)] rounded-[22px] ring-1 ring-[var(--ink-100)] p-7">
            <div className="text-center mb-6">
              <Brain className="h-9 w-9 text-[var(--ink-900)] mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="display-3 text-[19px] text-[var(--ink-900)] mb-2">
                Nouveau dans le développement ?
              </h3>
              <p className="text-[14px] text-[var(--ink-700)] leading-relaxed">
                Découvrez les bases du développement avec des explications simples et des exemples concrets.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Blocks, title: 'Concepts de base', desc: 'Les fondamentaux expliqués simplement' },
                { icon: Users, title: 'Métiers du développement', desc: 'Découvrez les différents rôles' },
                { icon: Settings, title: 'Outils et technologies', desc: 'Les outils essentiels pour débuter' },
              ].map((it, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white ring-1 ring-[var(--ink-100)]">
                  <it.icon className="h-5 w-5 text-[var(--ink-900)] flex-shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-[14px] text-[var(--ink-900)]">{it.title}</h4>
                    <p className="text-[12.5px] text-[var(--ink-500)]">{it.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: tabs + accordions */}
          <div>
            {/* Segmented pill control */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex p-1 rounded-full bg-[var(--ink-50)] ring-1 ring-[var(--ink-100)]">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-[var(--ink-900)] shadow-sm'
                        : 'text-[var(--ink-500)] hover:text-[var(--ink-900)]'
                    }`}
                  >
                    <tab.icon className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {techGuides[activeTab].options.map((tech: any, index: number) => {
                const Icon = tech.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-[22px] ring-1 ring-[var(--ink-100)] p-6"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-[var(--ink-50)] p-2.5 rounded-2xl flex-shrink-0">
                        <Icon className="h-5 w-5 text-[var(--ink-900)]" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="display-3 text-[18px] text-[var(--ink-900)] mb-1">{tech.name}</h3>
                        <p className="text-[14px] text-[var(--ink-700)] leading-relaxed">{tech.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(tech.content).map(([key, value]) => renderSection(index, key, value))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechnologyGuide;
