import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Clock, Users, CheckCircle2, BookOpen, Search, Utensils, Leaf, Mail, Phone, 
  Accessibility, Calculator, Euro, Building2, PiggyBank, GraduationCap, 
  Code, Palette, Camera, Globe, FileSpreadsheet, Smartphone, ShoppingCart,
  Apple, Shield, Car, UserCheck, Languages, Wrench, Filter, ChevronDown,
  Briefcase, Heart, Zap, PenTool, Layers, Target, TrendingUp
} from 'lucide-react';

const Training = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('hygiene-security');
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const programs = {
    'wordpress': {
      title: "WordPress",
      duration: "35 heures",
      price: "1200€ par apprenant",
      category: "web",
      description: "Créez et gérez des sites web professionnels avec WordPress",
      icon: <Code className="h-6 w-6" />,
      modules: [
        {
          title: "Installation et Configuration",
          duration: "7h",
          topics: ["Installation WordPress", "Configuration de base", "Thèmes et plugins", "Sécurité"]
        },
        {
          title: "Création de Contenu",
          duration: "14h",
          topics: ["Pages et articles", "Médias", "Menus", "Widgets"]
        },
        {
          title: "Personnalisation Avancée",
          duration: "14h",
          topics: ["Customizer", "CSS personnalisé", "Fonctions avancées", "E-commerce"]
        }
      ]
    },
    'photoshop': {
      title: "Photoshop",
      duration: "28 heures",
      price: "800€ par apprenant",
      category: "design",
      description: "Maîtrisez les outils de retouche photo et de création graphique",
      icon: <Camera className="h-6 w-6" />,
      modules: [
        {
          title: "Interface et Outils de Base",
          duration: "7h",
          topics: ["Interface Photoshop", "Outils de sélection", "Calques", "Masques"]
        },
        {
          title: "Retouche Photo",
          duration: "14h",
          topics: ["Correction colorimétrique", "Retouche beauté", "Montage photo", "Effets"]
        },
        {
          title: "Création Graphique",
          duration: "7h",
          topics: ["Design graphique", "Typographie", "Composition", "Export"]
        }
      ]
    },
    'canva': {
      title: "Canva",
      duration: "21 heures",
      price: "600€ par apprenant",
      category: "design",
      description: "Créez des visuels professionnels facilement avec Canva",
      icon: <Palette className="h-6 w-6" />,
      modules: [
        {
          title: "Prise en Main",
          duration: "7h",
          topics: ["Interface Canva", "Templates", "Éléments graphiques", "Textes"]
        },
        {
          title: "Création de Supports",
          duration: "7h",
          topics: ["Réseaux sociaux", "Présentations", "Flyers", "Logos"]
        },
        {
          title: "Fonctionnalités Avancées",
          duration: "7h",
          topics: ["Animations", "Vidéos", "Collaboration", "Brand Kit"]
        }
      ]
    },
    'reflex-english-1': {
      title: "Reflex English 1",
      duration: "30 heures",
      price: "900€ par apprenant",
      category: "languages",
      description: "Apprentissage de l'anglais niveau débutant",
      icon: <Globe className="h-6 w-6" />,
      modules: [
        {
          title: "Bases de l'Anglais",
          duration: "10h",
          topics: ["Alphabet et phonétique", "Vocabulaire de base", "Grammaire élémentaire", "Présentation"]
        },
        {
          title: "Communication Quotidienne",
          duration: "10h",
          topics: ["Conversations simples", "Situations courantes", "Temps et dates", "Nombres"]
        },
        {
          title: "Pratique Orale",
          duration: "10h",
          topics: ["Prononciation", "Écoute", "Dialogue", "Exercices interactifs"]
        }
      ]
    },
    'reflex-english-2': {
      title: "Reflex English 2",
      duration: "30 heures",
      price: "900€ par apprenant",
      category: "languages",
      description: "Apprentissage de l'anglais niveau intermédiaire",
      icon: <Globe className="h-6 w-6" />,
      modules: [
        {
          title: "Grammaire Intermédiaire",
          duration: "10h",
          topics: ["Temps complexes", "Conditionnels", "Voix passive", "Discours rapporté"]
        },
        {
          title: "Vocabulaire Professionnel",
          duration: "10h",
          topics: ["Anglais des affaires", "Présentations", "Réunions", "Emails"]
        },
        {
          title: "Expression Orale Avancée",
          duration: "10h",
          topics: ["Débats", "Négociations", "Argumentation", "Accent"]
        }
      ]
    },
    'reflex-english-3': {
      title: "Reflex English 3",
      duration: "30 heures",
      price: "900€ par apprenant",
      category: "languages",
      description: "Apprentissage de l'anglais niveau avancé",
      icon: <Globe className="h-6 w-6" />,
      modules: [
        {
          title: "Anglais Avancé",
          duration: "10h",
          topics: ["Nuances linguistiques", "Expressions idiomatiques", "Littérature", "Culture"]
        },
        {
          title: "Communication Professionnelle",
          duration: "10h",
          topics: ["Leadership", "Management", "Négociation", "Stratégie"]
        },
        {
          title: "Certification",
          duration: "10h",
          topics: ["Préparation TOEIC", "Tests blancs", "Stratégies d'examen", "Certification"]
        }
      ]
    },
    'excel': {
      title: "Excel",
      duration: "28 heures",
      price: "700€ par apprenant",
      category: "office",
      description: "Maîtrisez Excel pour l'analyse de données et la bureautique",
      icon: <FileSpreadsheet className="h-6 w-6" />,
      modules: [
        {
          title: "Fondamentaux Excel",
          duration: "7h",
          topics: ["Interface", "Saisie de données", "Formules de base", "Mise en forme"]
        },
        {
          title: "Fonctions Avancées",
          duration: "14h",
          topics: ["Fonctions complexes", "Tableaux croisés", "Graphiques", "Macros"]
        },
        {
          title: "Analyse de Données",
          duration: "7h",
          topics: ["Filtres avancés", "Solveur", "Scénarios", "Tableaux de bord"]
        }
      ]
    },
    'dev-web-mobile': {
      title: "Développeur Web et Web Mobile",
      duration: "400 heures",
      price: "6000€ par apprenant",
      category: "web",
      description: "Formation complète pour devenir développeur web et mobile",
      icon: <Smartphone className="h-6 w-6" />,
      modules: [
        {
          title: "Fondamentaux Web",
          duration: "100h",
          topics: ["HTML5/CSS3", "JavaScript", "Responsive Design", "Git"]
        },
        {
          title: "Développement Frontend",
          duration: "150h",
          topics: ["React.js", "Vue.js", "TypeScript", "Outils de build"]
        },
        {
          title: "Développement Backend",
          duration: "100h",
          topics: ["Node.js", "Bases de données", "API REST", "Sécurité"]
        },
        {
          title: "Mobile et Déploiement",
          duration: "50h",
          topics: ["React Native", "PWA", "Déploiement", "Projet final"]
        }
      ]
    },
    'reflex-english-2-3': {
      title: "Reflex English 2,3",
      duration: "60 heures",
      price: "1500€ par apprenant",
      category: "languages",
      description: "Formation combinée anglais intermédiaire et avancé",
      icon: <Globe className="h-6 w-6" />,
      modules: [
        {
          title: "Niveau Intermédiaire",
          duration: "30h",
          topics: ["Grammaire intermédiaire", "Vocabulaire professionnel", "Expression orale", "Compréhension"]
        },
        {
          title: "Niveau Avancé",
          duration: "30h",
          topics: ["Anglais avancé", "Communication professionnelle", "Préparation certification", "Pratique intensive"]
        }
      ]
    },
    'vente-omnicanal': {
      title: "Techniques de Vente Omnicanal",
      duration: "35 heures",
      price: "1800€ par apprenant",
      category: "business",
      description: "Maîtrisez les techniques de vente modernes sur tous les canaux",
      icon: <ShoppingCart className="h-6 w-6" />,
      modules: [
        {
          title: "Fondamentaux de la Vente",
          duration: "14h",
          topics: ["Psychologie du client", "Techniques de persuasion", "Objections", "Closing"]
        },
        {
          title: "Vente Digitale",
          duration: "14h",
          topics: ["E-commerce", "Réseaux sociaux", "Email marketing", "CRM"]
        },
        {
          title: "Stratégie Omnicanal",
          duration: "7h",
          topics: ["Parcours client", "Cohérence des canaux", "Mesure de performance", "Fidélisation"]
        }
      ]
    },
    'nutrition': {
      title: "Nutrition",
      duration: "28 heures",
      price: "1200€ par apprenant",
      category: "health",
      description: "Formation en nutrition et diététique",
      icon: <Apple className="h-6 w-6" />,
      modules: [
        {
          title: "Bases de la Nutrition",
          duration: "14h",
          topics: ["Macronutriments", "Micronutriments", "Métabolisme", "Besoins nutritionnels"]
        },
        {
          title: "Nutrition Appliquée",
          duration: "14h",
          topics: ["Régimes spéciaux", "Nutrition sportive", "Pathologies", "Conseils pratiques"]
        }
      ]
    },
    'hygiene-dev-durable': {
      title: "Hygiène et Développement Durable",
      duration: "14 heures",
      price: "450€ par apprenant",
      category: "safety",
      description: "Formation en hygiène et pratiques durables",
      icon: <Leaf className="h-6 w-6" />,
      modules: [
        {
          title: "Hygiène Professionnelle",
          duration: "7h",
          topics: ["Bonnes pratiques", "Normes HACCP", "Prévention", "Contrôles"]
        },
        {
          title: "Développement Durable",
          duration: "7h",
          topics: ["Éco-responsabilité", "Gestion des déchets", "Économies d'énergie", "Pratiques vertes"]
        }
      ]
    },
    'hygiene-security': {
      title: "Hygiène, Sécurité et Développement Durable",
      duration: "21 heures",
      price: "525€ par apprenant",
      category: "safety",
      description: "Formation complète en hygiène, sécurité et pratiques durables pour le secteur de la restauration",
      icon: <Leaf className="h-6 w-6" />,
      modules: [
        {
          title: "Hygiène en Restauration",
          duration: "7h",
          topics: ["Bonnes pratiques d'hygiène", "Normes HACCP", "Gestion des contaminations", "Stockage des aliments"]
        },
        {
          title: "Sécurité au Travail",
          duration: "7h",
          topics: ["Prévention des risques", "Équipements de protection", "Gestes et postures", "Premiers secours"]
        },
        {
          title: "Développement Durable",
          duration: "7h",
          topics: ["Gestion des déchets", "Économie d'énergie", "Produits éco-responsables", "Réduction du gaspillage"]
        }
      ],
      prerequisites: "Aucun prérequis",
      objectives: [
        "Acquérir des compétences en matière de bonnes pratiques d'hygiène",
        "Identifier et prévenir les risques de sécurité",
        "Intégrer des pratiques durables"
      ],
      methods: [
        "AFEST (Action de Formation en Situation de Travail)",
        "Exercices pratiques et études de cas",
        "Alternance théorie et pratique",
        "Suivi personnalisé"
      ],
      evaluationMethods: [
        "Évaluation initiale et finale",
        "Plateforme d'apprentissage DELIVERY Digital",
        "Suivi des acquis personnalisé"
      ],
      accessibility: "Formation accessible aux personnes en situation de handicap"
    },
    'hygiene-security-afest': {
      title: "Hygiène, Sécurité et Développement Durable - AFEST",
      duration: "21 heures",
      price: "525€ par apprenant",
      category: "safety",
      description: "Formation en situation de travail (AFEST) pour acquérir les compétences essentielles en hygiène, sécurité et développement durable",
      icon: <Leaf className="h-6 w-6" />,
      modules: [
        {
          title: "Hygiène en Situation de Travail",
          duration: "7h",
          topics: ["Bonnes pratiques d'hygiène appliquées", "Identification des risques sur le terrain", "Mise en situation réelle", "Observation et analyse des pratiques"]
        },
        {
          title: "Sécurité Pratique",
          duration: "7h",
          topics: ["Prévention des risques en situation", "Application des équipements de protection", "Gestes et postures adaptés", "Situations d'urgence réelles"]
        },
        {
          title: "Développement Durable Appliqué",
          duration: "7h",
          topics: ["Intégration de solutions durables", "Réduction du gaspillage en pratique", "Éco-responsabilité au quotidien", "Amélioration continue"]
        }
      ],
      prerequisites: "Pas de prérequis",
      objectives: [
        "Fournir aux participants les compétences essentielles pour comprendre les bonnes pratiques d'hygiène",
        "Assurer la sécurité dans leur environnement de travail",
        "Adopter des comportements responsables en matière de développement durable",
        "Identifier les risques, les prévenir, et intégrer des solutions durables dans leurs activités quotidiennes",
        "Développer des savoir-faire pratiques, directement applicables dans les situations réelles de travail"
      ],
      methods: [
        "Formation en situation de travail (AFEST) avec l'accompagnement d'un formateur en visioconférence",
        "L'apprentissage se fait directement sur le terrain, au sein de l'environnement professionnel des apprenants",
        "Un formateur guide les apprenants dans l'acquisition des compétences en combinant temps de travail, observation, analyse des pratiques et mises en situation concrètes",
        "L'AFEST repose sur une alternance entre phases de mises en situation professionnelles et réflexions guidées par un formateur en visioconférence",
        "Chaque compétence est travaillée directement en contexte professionnel, avec des ajustements continus selon les besoins des apprenants"
      ],
      evaluationMethods: [
        "La progression est suivie à travers des observations en situation de travail",
        "Évaluations régulières par le formateur",
        "Projet final validant les compétences acquises",
        "Évaluation de début et fin de formation : Chaque apprenant est évalué en début et en fin de formation afin de mesurer les compétences acquises et l'évolution des connaissances tout au long du parcours"
      ],
      accessibility: "En cas de handicap, merci de bien vouloir nous contacter : E-mail : contact@deliverydigital.fr",
      accessDelay: "1 semaine"
    },
    'reflex-espagnol-2': {
      title: "Reflex Espagnol Niveau 2 B1/B2",
      duration: "80 heures",
      price: "4000€ par apprenant",
      category: "languages",
      description: "Apprentissage de l'espagnol niveau intermédiaire",
      icon: <Languages className="h-6 w-6" />,
      modules: [
        {
          title: "Grammaire Intermédiaire",
          duration: "25h",
          topics: ["Temps complexes", "Subjonctif", "Conditionnels", "Expressions idiomatiques"]
        },
        {
          title: "Vocabulaire Thématique",
          duration: "30h",
          topics: ["Voyage", "Travail", "Culture", "Actualités"]
        },
        {
          title: "Expression Orale",
          duration: "25h",
          topics: ["Conversations", "Débats", "Présentations", "Prononciation"]
        }
      ]
    },
    'conduite-securitaire': {
      title: "Conduite Sécuritaire et Prévention des Risques Routiers",
      duration: "100 heures",
      price: "3500€ par apprenant",
      category: "safety",
      description: "Formation complète pour améliorer les compétences en conduite sécuritaire et gestion des risques routiers",
      icon: <Car className="h-6 w-6" />,
      modules: [
        {
          title: "Connaissance des Risques Routiers",
          duration: "15h",
          topics: ["Dangers en milieu urbain", "Conduite sur autoroute", "Conditions difficiles", "Gestion des imprévus"]
        },
        {
          title: "Conduite Défensive",
          duration: "20h",
          topics: ["Techniques de réduction des risques", "Anticipation des comportements", "Gestion des autres usagers", "Stratégies préventives"]
        },
        {
          title: "Sécurité et Premiers Secours",
          duration: "15h",
          topics: ["Sécurité des passagers", "Gestes de premiers secours", "Réaction en cas d'urgence", "Protocoles de sécurité"]
        },
        {
          title: "Gestion des Situations d'Urgence",
          duration: "15h",
          topics: ["Réaction en cas d'accident", "Gestion des pannes", "Incidents sur la route", "Procédures d'urgence"]
        },
        {
          title: "Conduite Adaptée aux Conditions",
          duration: "15h",
          topics: ["Conduite par temps de pluie", "Conduite sur neige et verglas", "Adaptation aux conditions climatiques", "Techniques spécialisées"]
        },
        {
          title: "Navigation et Planification",
          duration: "10h",
          topics: ["Outils de navigation modernes", "Planification de trajets", "Optimisation des déplacements", "Évitement des risques"]
        },
        {
          title: "Gestion du Stress",
          duration: "10h",
          topics: ["Techniques de gestion du stress", "Émotions négatives au volant", "Conduite sereine", "Risques psychosociaux"]
        }
      ],
      prerequisites: "Accessible à tous les chauffeurs souhaitant améliorer leurs compétences en conduite sécuritaire, sans prérequis spécifiques. Un test de logique pourra être effectué lors du processus d'admission pour vérifier les connaissances de base en sécurité routière.",
      objectives: [
        "Appréhender les dangers liés à la conduite en milieu urbain, sur autoroute et en conditions difficiles",
        "Maîtriser les techniques permettant de réduire les risques liés à la conduite en anticipant les comportements des autres usagers",
        "Apprendre à garantir la sécurité des passagers et être en mesure de réagir en cas d'urgence avec des gestes de premiers secours",
        "Savoir comment réagir en cas d'accident, de panne ou d'incident sur la route",
        "Apprendre à adapter la conduite en fonction des conditions climatiques difficiles (pluie, neige, verglas)",
        "Savoir utiliser des outils de navigation modernes et planifier les trajets pour optimiser les déplacements et éviter les risques",
        "Acquérir des techniques pour gérer le stress et les émotions négatives au volant, afin de conduire de manière sereine"
      ],
      methods: [
        "Séquences de travail en visioconférence : Des séances interactives en ligne, encadrées par un formateur, permettent d'approfondir les concepts et d'appliquer les compétences sur des exercices pratiques",
        "Accès continu à la plateforme pédagogique : Tous les cours, quizz, et exercices sont accessibles en permanence, 24h/24 et 7j/7, via la plateforme pédagogique DELIVERY Digital. Vous pouvez y accéder à tout moment en vous connectant à votre Espace apprenant"
      ],
      evaluationMethods: [
        "QCM, exercices et projets quotidiens : Ces éléments sont disponibles chaque jour sur votre Espace apprenant et permettent d'appliquer et de tester vos connaissances de manière continue",
        "Évaluation de début et fin de formation : Chaque apprenant est évalué en début et en fin de formation afin de mesurer les compétences acquises et l'évolution des connaissances tout au long du parcours",
        "Projet final : Ce projet synthétise et évalue l'ensemble des compétences acquises durant la formation, constituant une validation complète des apprentissages réalisés"
      ],
      accessibility: "En cas de handicap, merci de bien vouloir nous contacter pour obtenir les informations nécessaires à l'adaptation de la formation : E-mail : contact@deliverydigital.fr - Tel : 0749707773",
      accessDelay: "1 semaine : Accès à la plateforme et début de la formation dans les 7 jours suivant l'inscription"
    },
    'reflex-espagnol-1': {
      title: "Reflex Espagnol Niveau 1 A1/B1",
      duration: "80 heures",
      price: "4000€ par apprenant",
      category: "languages",
      description: "Apprentissage de l'espagnol niveau débutant",
      icon: <Languages className="h-6 w-6" />,
      modules: [
        {
          title: "Bases de l'Espagnol",
          duration: "40h",
          topics: ["Alphabet", "Prononciation", "Grammaire de base", "Vocabulaire essentiel"]
        },
        {
          title: "Communication de Base",
          duration: "40h",
          topics: ["Présentations", "Situations courantes", "Dialogues simples", "Culture hispanique"]
        }
      ]
    },
    'management-complet': {
      title: "Management Parcours Complet",
      duration: "70 heures",
      price: "2500€ par apprenant",
      category: "management",
      description: "Formation complète en management et leadership",
      icon: <Target className="h-6 w-6" />,
      modules: [
        {
          title: "Fondamentaux du Management",
          duration: "21h",
          topics: ["Leadership", "Motivation", "Communication", "Délégation"]
        },
        {
          title: "Gestion d'Équipe",
          duration: "21h",
          topics: ["Recrutement", "Évaluation", "Gestion des conflits", "Développement"]
        },
        {
          title: "Management Stratégique",
          duration: "28h",
          topics: ["Planification", "Prise de décision", "Gestion du changement", "Performance"]
        }
      ]
    },
    'reflex-espagnol-3': {
      title: "Reflex'Español - Niveau 3 (C1/C2)",
      duration: "80 heures",
      price: "4000€ par apprenant",
      category: "languages",
      description: "Apprentissage de l'espagnol niveau avancé",
      icon: <Languages className="h-6 w-6" />,
      modules: [
        {
          title: "Espagnol Avancé",
          duration: "40h",
          topics: ["Nuances linguistiques", "Littérature", "Registres de langue", "Culture approfondie"]
        },
        {
          title: "Maîtrise Professionnelle",
          duration: "40h",
          topics: ["Espagnol des affaires", "Négociation", "Rédaction", "Certification"]
        }
      ]
    },
    'autocad-sketchup-revit': {
      title: "AutoCAD, SketchUp, et Revit",
      duration: "100 heures",
      price: "3500€ par apprenant",
      category: "design",
      description: "Maîtrise complète des outils AutoCAD, SketchUp, et Revit pour le design architectural et le BIM",
      icon: <PenTool className="h-6 w-6" />,
      modules: [
        {
          title: "AutoCAD - Plans 2D et 3D",
          duration: "35h",
          topics: ["Interface AutoCAD", "Dessin 2D professionnel", "Modélisation 3D", "Cotation et annotations", "Mise en page et impression"]
        },
        {
          title: "SketchUp - Modélisation 3D",
          duration: "30h",
          topics: ["Interface SketchUp", "Modélisation 3D interactive", "Textures et matériaux", "Rendus réalistes", "Animations et présentations"]
        },
        {
          title: "Revit - BIM et Maquettes Numériques",
          duration: "35h",
          topics: ["Principes du BIM", "Interface Revit", "Conception de projets BIM", "Gestion des informations de construction", "Maquettes numériques collaboratives"]
        }
      ],
      prerequisites: "Aucun pré-requis spécifique n'est nécessaire pour suivre cette formation. Toutefois, une connaissance de base en informatique et des notions générales de dessin technique ou d'architecture peuvent être un atout.",
      objectives: [
        "Créer et modéliser des plans 2D et 3D professionnels avec AutoCAD",
        "Élaborer des modèles 3D interactifs et des rendus réalistes avec SketchUp",
        "Utiliser Revit pour la conception de projets en BIM, incluant la gestion des informations de construction et la création de maquettes numériques",
        "Appliquer les principes du dessin technique, de la modélisation 3D et du travail collaboratif en BIM sur un projet complet",
        "Optimiser votre workflow avec ces logiciels pour gagner en efficacité et en qualité"
      ],
      methods: [
        "Séquences de travail en visioconférence : Des séances interactives en ligne, encadrées par un formateur, permettent d'approfondir les concepts et d'appliquer les compétences sur des exercices pratiques",
        "Accès continu à la plateforme pédagogique : Tous les cours, quizz, et exercices sont accessibles en permanence, 24h/24 et 7j/7, via la plateforme pédagogique DELIVERY Digital. Vous pouvez y accéder à tout moment en vous connectant à votre Espace apprenant"
      ],
      evaluationMethods: [
        "QCM, exercices et projets quotidiens : Ces éléments sont disponibles chaque jour sur votre Espace apprenant et permettent d'appliquer et de tester vos connaissances de manière continue",
        "Évaluation de début et fin de formation : Chaque apprenant est évalué en début et en fin de formation afin de mesurer les compétences acquises et l'évolution des connaissances tout au long du parcours"
      ],
      accessibility: "En cas de handicap, merci de bien vouloir nous contacter pour obtenir les informations nécessaires à l'adaptation de la formation : E-mail : contact@deliverydigital.fr - Tel : 0749707773",
      accessDelay: "1 semaine : Accès à la plateforme et début de la formation dans les 7 jours suivant l'inscription"
    }
  };

  const categories = [
    { id: 'all', label: 'Toutes les formations', count: Object.keys(programs).length },
    { id: 'web', label: 'Web & Digital', count: Object.values(programs).filter(p => p.category === 'web').length },
    { id: 'design', label: 'Design & Création', count: Object.values(programs).filter(p => p.category === 'design').length },
    { id: 'languages', label: 'Langues', count: Object.values(programs).filter(p => p.category === 'languages').length },
    { id: 'office', label: 'Bureautique', count: Object.values(programs).filter(p => p.category === 'office').length },
    { id: 'safety', label: 'Sécurité & Hygiène', count: Object.values(programs).filter(p => p.category === 'safety').length },
    { id: 'business', label: 'Business', count: Object.values(programs).filter(p => p.category === 'business').length },
    { id: 'health', label: 'Santé', count: Object.values(programs).filter(p => p.category === 'health').length },
    { id: 'management', label: 'Management', count: Object.values(programs).filter(p => p.category === 'management').length }
  ];

  const filteredPrograms = Object.entries(programs).filter(([key, program]) => {
    const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || program.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const currentProgram = programs[selectedProgram];

  return (
    <section id="training" className="section bg-gradient-to-b from-gray-900 to-primary-950">
      <div ref={ref} className="container relative z-10">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-900/20 border border-green-500/20">
              <GraduationCap className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-400">Formation Certifiée Qualiopi - Prise en charge OPCO 100%</span>
            </div>
          </motion.div>
          
          <motion.h2 
            className="text-2xl md:text-3xl font-bold mb-4 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Formations Professionnelles
          </motion.h2>
          <motion.p 
            className="text-lg text-gray-300 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Développez vos compétences avec nos {Object.keys(programs).length} formations certifiées - Financement intégral OPCO
          </motion.p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une formation..."
                className="w-full px-4 py-2 pl-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  selectedCategory === category.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {category.label} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {filteredPrograms.map(([key, program]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={`card p-6 cursor-pointer transition-all hover:scale-105 ${
                selectedProgram === key ? 'ring-2 ring-primary-500 bg-primary-900/20' : ''
              }`}
              onClick={() => setSelectedProgram(key)}
            >
              <div className="flex items-center mb-4">
                <div className="bg-white/10 p-3 rounded-lg mr-3">
                  {program.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{program.title}</h3>
                  <p className="text-primary-400 text-sm">{program.duration}</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-4 line-clamp-2">{program.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm">{program.price}</span>
                <div className="flex items-center text-xs text-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  <span>100% OPCO</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Program Details */}
        {currentProgram && (
          <motion.div
            key={selectedProgram}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12"
          >
            <div className="lg:col-span-1">
              <div className="card p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {currentProgram.title}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    {currentProgram.description}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-300 text-sm">
                      <Clock className="h-4 w-4 mr-2 text-primary-400" />
                      <span>{currentProgram.duration}</span>
                    </div>
                    <div className="flex items-center text-gray-300 text-sm">
                      <Users className="h-4 w-4 mr-2 text-primary-400" />
                      <span>12 participants maximum</span>
                    </div>
                    {currentProgram.accessDelay && (
                      <div className="flex items-center text-gray-300 text-sm">
                        <Clock className="h-4 w-4 mr-2 text-primary-400" />
                        <span>Délai d'accès : {currentProgram.accessDelay}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-green-900/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                    <span className="text-green-400 font-medium text-sm">
                      Prise en charge OPCO 100%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {currentProgram.price}
                  </p>
                  <p className="text-green-400 text-sm font-medium">
                    Reste à charge : 0€
                  </p>
                </div>

                <a
                  href="https://app.deliverydigital.fr/student/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full text-sm"
                >
                  S'inscrire
                </a>
              </div>

              {/* Additional info for specific programs */}
              {(selectedProgram === 'hygiene-security' || selectedProgram === 'hygiene-security-afest' || selectedProgram === 'conduite-securitaire' || selectedProgram === 'autocad-sketchup-revit') && currentProgram.prerequisites && (
                <div className="card p-6 mt-6">
                  <h4 className="text-lg font-bold text-white mb-4">Informations complémentaires</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-2">Prérequis</h5>
                      <p className="text-gray-300 text-sm">{currentProgram.prerequisites}</p>
                    </div>

                    {currentProgram.objectives && (
                      <div>
                        <h5 className="text-sm font-medium text-white mb-2">Objectifs pédagogiques</h5>
                        <ul className="space-y-2">
                          {currentProgram.objectives.map((objective, index) => (
                            <li key={index} className="flex items-start text-gray-300 text-sm">
                              <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-primary-400" />
                              <span>{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentProgram.methods && (
                      <div>
                        <h5 className="text-sm font-medium text-white mb-2">Méthodes pédagogiques</h5>
                        <ul className="space-y-2">
                          {currentProgram.methods.map((method, index) => (
                            <li key={index} className="flex items-start text-gray-300 text-sm">
                              <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-primary-400" />
                              <span>{method}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentProgram.evaluationMethods && (
                      <div>
                        <h5 className="text-sm font-medium text-white mb-2">Modalités d'évaluation</h5>
                        <ul className="space-y-2">
                          {currentProgram.evaluationMethods.map((item, index) => (
                            <li key={index} className="flex items-start text-gray-300 text-sm">
                              <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-primary-400" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentProgram.accessibility && (
                      <div>
                        <h5 className="text-sm font-medium text-white mb-2">Accessibilité</h5>
                        <p className="text-gray-300 text-sm">{currentProgram.accessibility}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="space-y-4">
                {currentProgram.modules.map((module, index) => (
                  <div key={index} className="card p-4">
                    <div className="flex items-start">
                      <div className="bg-white/10 p-2 rounded-lg mr-3">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-bold text-white">
                            {module.title}
                          </h4>
                          <span className="text-primary-400 font-medium text-sm">
                            {module.duration}
                          </span>
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {module.topics.map((topic, topicIndex) => (
                            <li 
                              key={topicIndex}
                              className="flex items-center text-gray-300 text-sm"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-2 text-primary-400" />
                              {topic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-12 card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Accessibility className="h-6 w-6 text-primary-400 mr-2" />
                <h3 className="text-xl font-bold text-white">Accessibilité</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Toutes nos formations sont accessibles aux personnes en situation de handicap. Notre équipe est formée pour adapter nos programmes et méthodes pédagogiques selon vos besoins spécifiques.
              </p>
              <p className="text-gray-300">
                En cas de handicap, merci de nous contacter pour que nous puissions évaluer ensemble les meilleures adaptations possibles.
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-4">
                <Mail className="h-6 w-6 text-primary-400 mr-2" />
                <h3 className="text-xl font-bold text-white">Contact</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center text-gray-300">
                  <Mail className="h-5 w-5 mr-3 text-primary-400" />
                  <a 
                    href="mailto:contact@deliverydigital.fr"
                    className="hover:text-white transition-colors"
                  >
                    contact@deliverydigital.fr
                  </a>
                </div>
                <div className="flex items-center text-gray-300">
                  <Phone className="h-5 w-5 mr-3 text-primary-400" />
                  <a 
                    href="tel:0749707773"
                    className="hover:text-white transition-colors"
                  >
                    07 49 70 77 73
                  </a>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                Notre équipe est à votre disposition pour répondre à toutes vos questions concernant l'accessibilité et l'adaptation de nos formations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Training;