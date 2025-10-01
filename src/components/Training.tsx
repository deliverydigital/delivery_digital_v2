import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Search, Filter, Download, ExternalLink, Clock, Users, Euro, Star, Award, CheckCircle, BookOpen, GraduationCap, Target, Code, PenTool, Languages, Car, Apple, Leaf, ShoppingCart, BarChart3, Globe, Utensils, Shield, Building2, Heart, Briefcase, FileText, Calendar, MapPin, Phone, Mail, User, ChevronDown, ChevronUp, X, Send, Eye, CreditCard as Edit, Trash2, Plus, Settings, Laptop, Database, Server, Cloud, Smartphone, Monitor, Palette, FileSpreadsheet, MessageSquare, HardHat, Zap, Briefcase as iefcase, Layers, TrendingUp, Camera, CheckCircle2, Accessibility, Tag, Grid3X3, List } from 'lucide-react';
import { TrainingProgramsApiService } from '../services/trainingProgramsApi';
import {useTrainingPrograms} from "../hooks/useTrainingPrograms.ts";
import {useTrainingDocuments} from "../hooks/useTrainingDocuments.ts";
import {useCategories} from "../hooks/useCategories.ts";

const Training = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedProgram, setSelectedProgram] = useState();
    const [showCategories, setShowCategories] = useState(false);
    const { documents, loading: documentsLoading, downloadDocument , } = useTrainingPrograms();
    const { documents : docs, downloadDocument : downloadTraningDocument} = useTrainingDocuments();
    const { programs, loading: programsLoading, error: programsError } = useTrainingPrograms();
    const { categories, loading: categoriesLoading } = useCategories();

    const { ref, inView } = useInView({
        threshold: 0.1,
        triggerOnce: true,
    });

    const [programDocuments, setProgramDocuments] = useState<{[key: string]: any[]}>({});
    const [loadingDocuments, setLoadingDocuments] = useState<{[key: string]: boolean}>({});

    const staticPrograms = {
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
            ],
            downloads: [
                { name: "Programme détaillé WordPress", url: "/downloads/wordpress-program.pdf" },
                { name: "Guide d'installation", url: "/downloads/wordpress-installation.pdf" }
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
            ],
            downloads: [
                { name: "Programme Photoshop", url: "/downloads/photoshop-program.pdf" },
                { name: "Raccourcis clavier", url: "/downloads/photoshop-shortcuts.pdf" }
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
            ],
            downloads: [
                { name: "Guide Canva", url: "/downloads/canva-guide.pdf" }
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

    // Get icon component for category
    const getCategoryIcon = (iconName: string) => {
        const iconMap = {
            'code': <Code className="h-6 w-6" />,
            'palette': <PenTool className="h-6 w-6" />,
            'file-text': <FileText className="h-6 w-6" />,
            'globe': <Globe className="h-6 w-6" />,
            'shield': <Shield className="h-6 w-6" />,
            'users': <Briefcase className="h-6 w-6" />,
            'briefcase': <ShoppingCart className="h-6 w-6" />,
            'heart': <Heart className="h-6 w-6" />,
            'book': <BookOpen className="h-6 w-6" />,
            'folder': <FileText className="h-6 w-6" />
        };
        return iconMap[iconName] || <BookOpen className="h-6 w-6" />;
    };

    // Add "all" category to the fetched categories
    const allCategories = [
        { id: 'all', name: 'Toutes les formations', slug: 'all', color: '#6b7280', icon: 'book-open' },
        ...categories
    ];

    // Filter programs based on search and category
    const filteredPrograms = programs.filter((program) => {
        const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            program.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || program.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Get programs count by category
    const getProgramsCountByCategory = (categorySlug: string) => {
        return programs.filter(program => program.category === categorySlug).length;
    };

    const toggleCategories = () => {
        setShowCategories(!showCategories);
    };

    console.log('Programs------------------------------>',programs)
    const currentProgram =  selectedProgram;

    // Load documents for a specific program
    const loadProgramDocuments = async (programId: string) => {
        if (programDocuments[programId] || loadingDocuments[programId]) {
            return; // Already loaded or loading
        }

        setLoadingDocuments(prev => ({ ...prev, [programId]: true }));
        
        try {
            const docs = await TrainingProgramsApiService.getProgramDocuments(programId);
            setProgramDocuments(prev => ({ ...prev, [programId]: docs }));
        } catch (error) {
            console.error(`Error loading documents for ${programId}:`, error);
            // Fallback to static downloads if API fails
            const program = Object.values(staticPrograms).find(p => p.id === programId);
            if (program?.downloads) {
                setProgramDocuments(prev => ({ 
                    ...prev, 
                    [programId]: program.downloads.map(download => ({
                        id: `static-${Date.now()}-${Math.random()}`,
                        title: download.title,
                        document_type: 'program',
                        file_size: 1024000, // Default size
                        download_count: 0,
                        uploaded_at: new Date(),
                        download_url: '#' // Static placeholder
                    }))
                }));
            }
        } finally {
            setLoadingDocuments(prev => ({ ...prev, [programId]: false }));
        }
    };

    // Load documents when a program is selected
    useEffect(() => {
        if (selectedProgram?.program_id) {
            console.log(selectedProgram.program_id);
            loadProgramDocuments(selectedProgram?.program_id);
        }
    }, [selectedProgram]);

    const handleDownloadDocument = (documentId: string, programId: string) => {
        try {
            TrainingProgramsApiService.downloadDocument(documentId, programId);
        } catch (error) {
            console.error('Error downloading document:', error);
            // Fallback for static downloads
            const program = Object.values(staticPrograms).find(p => p.id === programId);
            const staticDownload = program?.downloads?.find(d => d.title.includes(documentId));
            if (staticDownload) {
                // For demo purposes, show an alert
                alert(`Téléchargement: ${staticDownload.title}\n\nCe document sera disponible une fois le système de gestion documentaire configuré.`);
            }
        }
    };

    const programDocs = programDocuments[selectedProgram?.program_id || ''] || [];
    const isLoadingDocs = loadingDocuments[selectedProgram?.program_id || ''] || false;

    // Show loading state
    if (program