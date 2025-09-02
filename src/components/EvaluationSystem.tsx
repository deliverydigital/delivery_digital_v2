import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Eye, Copy, Save, X, Star, 
  CheckCircle, AlertCircle, BarChart3, PieChart, 
  TrendingUp, Users, Calendar, FileText, Download,
  MessageSquare, ThumbsUp, ThumbsDown, Target,
  Award, Clock, Send, ArrowRight, ArrowLeft,
  Settings, Filter, Search, ExternalLink
} from 'lucide-react';

// Types pour les questionnaires simplifiés
interface Question {
  id: string;
  type: 'rating' | 'text' | 'multiple' | 'boolean' | 'scale';
  text: string;
  description?: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  order: number;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  type: 'pre_formation' | 'post_formation';
  trainingId?: string;
  questions: Question[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  responses: QuestionnaireResponse[];
  settings: {
    allowAnonymous: boolean;
    showResults: boolean;
    autoSend: boolean;
    reminderEnabled: boolean;
    reminderDays: number;
  };
}

interface QuestionnaireResponse {
  id: string;
  questionnaireId: string;
  participantId: string;
  participantName?: string;
  responses: { [questionId: string]: any };
  completedAt: Date;
  isAnonymous: boolean;
  sessionId?: string;
}

interface EvaluationResults {
  questionnaireId: string;
  totalResponses: number;
  completionRate: number;
  averageRating: number;
  satisfactionScore: number;
  competenceProgression: { [competence: string]: number };
  recommendations: string[];
  trends: {
    date: Date;
    score: number;
  }[];
}

const EvaluationSystem = () => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'responses' | 'analytics'>('list');
  const [showPreview, setShowPreview] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Questionnaires prédéfinis pour début et fin de formation
  const defaultQuestionnaires: Partial<Questionnaire>[] = [
    {
      title: "Évaluation Début de Formation",
      description: "Évaluation des connaissances et attentes avant la formation",
      type: "pre_formation",
      questions: [
        {
          id: "q1",
          type: "scale",
          text: "Évaluez votre niveau actuel dans le domaine de cette formation",
          description: "De débutant à expert",
          required: true,
          scaleMin: 1,
          scaleMax: 5,
          scaleLabels: { min: "Débutant", max: "Expert" },
          order: 1
        },
        {
          id: "q2",
          type: "text",
          text: "Quels sont vos objectifs principaux pour cette formation ?",
          description: "Décrivez ce que vous espérez apprendre ou accomplir",
          required: true,
          order: 2
        },
        {
          id: "q3",
          type: "multiple",
          text: "Quelles sont vos motivations pour suivre cette formation ?",
          options: [
            "Développer de nouvelles compétences",
            "Évoluer professionnellement",
            "Changer de métier",
            "Améliorer mes performances actuelles",
            "Obtenir une certification",
            "Autre"
          ],
          required: true,
          order: 3
        },
        {
          id: "q4",
          type: "scale",
          text: "À quel point êtes-vous motivé(e) pour cette formation ?",
          required: true,
          scaleMin: 1,
          scaleMax: 5,
          scaleLabels: { min: "Peu motivé(e)", max: "Très motivé(e)" },
          order: 4
        },
        {
          id: "q5",
          type: "text",
          text: "Avez-vous des attentes particulières concernant le contenu ou la méthode pédagogique ?",
          required: false,
          order: 5
        }
      ]
    },
    {
      title: "Évaluation Fin de Formation",
      description: "Évaluation des acquis et de la satisfaction après la formation",
      type: "post_formation",
      questions: [
        {
          id: "q1",
          type: "scale",
          text: "Évaluez votre niveau actuel dans le domaine après la formation",
          description: "De débutant à expert",
          required: true,
          scaleMin: 1,
          scaleMax: 5,
          scaleLabels: { min: "Débutant", max: "Expert" },
          order: 1
        },
        {
          id: "q2",
          type: "scale",
          text: "Dans quelle mesure vos objectifs de formation ont-ils été atteints ?",
          required: true,
          scaleMin: 1,
          scaleMax: 5,
          scaleLabels: { min: "Pas du tout", max: "Complètement" },
          order: 2
        },
        {
          id: "q3",
          type: "scale",
          text: "Comment évaluez-vous la qualité globale de la formation ?",
          required: true,
          scaleMin: 1,
          scaleMax: 5,
          scaleLabels: { min: "Très mauvaise", max: "Excellente" },
          order: 3
        },
        {
          id: "q4",
          type: "scale",
          text: "Comment évaluez-vous la qualité de l'animation ?",
          required: true,
          scaleMin: 1,
          scaleMax: 5,
          scaleLabels: { min: "Très mauvaise", max: "Excellente" },
          order: 4
        },
        {
          id: "q5",
          type: "scale",
          text: "Les supports de formation étaient-ils adaptés ?",
          required: true,
          scaleMin: 1,
          scaleMax: 5,
          scaleLabels: { min: "Pas du tout", max: "Parfaitement" },
          order: 5
        },
        {
          id: "q6",
          type: "boolean",
          text: "Recommanderiez-vous cette formation ?",
          required: true,
          order: 6
        },
        {
          id: "q7",
          type: "text",
          text: "Quelles compétences avez-vous le mieux acquises ?",
          required: true,
          order: 7
        },
        {
          id: "q8",
          type: "text",
          text: "Quels aspects nécessiteraient plus d'approfondissement ?",
          required: false,
          order: 8
        },
        {
          id: "q9",
          type: "text",
          text: "Commentaires et suggestions d'amélioration",
          required: false,
          order: 9
        }
      ]
    }
  ];

  useEffect(() => {
    // Initialiser avec les questionnaires par défaut
    const existingQuestionnaires = localStorage.getItem('evaluationQuestionnaires');
    if (!existingQuestionnaires) {
      const initialQuestionnaires = defaultQuestionnaires.map((q, index) => ({
        id: `questionnaire-${index + 1}`,
        ...q,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        responses: [],
        settings: {
          allowAnonymous: false,
          showResults: true,
          autoSend: true,
          reminderEnabled: true,
          reminderDays: 3
        }
      })) as Questionnaire[];
      
      setQuestionnaires(initialQuestionnaires);
      localStorage.setItem('evaluationQuestionnaires', JSON.stringify(initialQuestionnaires));
    } else {
      setQuestionnaires(JSON.parse(existingQuestionnaires));
    }
  }, []);

  const saveQuestionnaires = (updatedQuestionnaires: Questionnaire[]) => {
    setQuestionnaires(updatedQuestionnaires);
    localStorage.setItem('evaluationQuestionnaires', JSON.stringify(updatedQuestionnaires));
  };

  const createNewQuestionnaire = (type: 'pre_formation' | 'post_formation') => {
    const template = defaultQuestionnaires.find(q => q.type === type);
    const newQuestionnaire: Questionnaire = {
      id: `questionnaire-${Date.now()}`,
      title: template?.title || "Nouveau Questionnaire",
      description: template?.description || "",
      type: type,
      questions: template?.questions || [],
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      responses: [],
      settings: {
        allowAnonymous: false,
        showResults: true,
        autoSend: false,
        reminderEnabled: false,
        reminderDays: 3
      }
    };
    
    setSelectedQuestionnaire(newQuestionnaire);
    setActiveTab('create');
  };

  const duplicateQuestionnaire = (questionnaire: Questionnaire) => {
    const duplicated: Questionnaire = {
      ...questionnaire,
      id: `questionnaire-${Date.now()}`,
      title: `${questionnaire.title} (Copie)`,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      responses: []
    };
    
    const updated = [...questionnaires, duplicated];
    saveQuestionnaires(updated);
  };

  const deleteQuestionnaire = (id: string) => {
    const updated = questionnaires.filter(q => q.id !== id);
    saveQuestionnaires(updated);
  };

  const toggleQuestionnaireStatus = (id: string) => {
    const updated = questionnaires.map(q => 
      q.id === id ? { ...q, isActive: !q.isActive, updatedAt: new Date() } : q
    );
    saveQuestionnaires(updated);
  };

  const addQuestion = (questionnaire: Questionnaire) => {
    const newQuestion: Question = {
      id: `q${questionnaire.questions.length + 1}`,
      type: 'text',
      text: 'Nouvelle question',
      required: false,
      order: questionnaire.questions.length + 1
    };
    
    const updated = {
      ...questionnaire,
      questions: [...questionnaire.questions, newQuestion],
      updatedAt: new Date()
    };
    
    setSelectedQuestionnaire(updated);
  };

  const updateQuestion = (questionnaire: Questionnaire, questionId: string, updates: Partial<Question>) => {
    const updated = {
      ...questionnaire,
      questions: questionnaire.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      ),
      updatedAt: new Date()
    };
    
    setSelectedQuestionnaire(updated);
  };

  const deleteQuestion = (questionnaire: Questionnaire, questionId: string) => {
    const updated = {
      ...questionnaire,
      questions: questionnaire.questions.filter(q => q.id !== questionId),
      updatedAt: new Date()
    };
    
    setSelectedQuestionnaire(updated);
  };

  const saveQuestionnaire = (questionnaire: Questionnaire) => {
    const existing = questionnaires.find(q => q.id === questionnaire.id);
    let updated;
    
    if (existing) {
      updated = questionnaires.map(q => 
        q.id === questionnaire.id ? questionnaire : q
      );
    } else {
      updated = [...questionnaires, questionnaire];
    }
    
    saveQuestionnaires(updated);
    setActiveTab('list');
    setSelectedQuestionnaire(null);
  };

  const renderQuestionEditor = (question: Question, questionnaire: Questionnaire) => (
    <div key={question.id} className="bg-gray-700 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={question.text}
            onChange={(e) => updateQuestion(questionnaire, question.id, { text: e.target.value })}
            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400"
            placeholder="Texte de la question"
          />
          <textarea
            value={question.description || ''}
            onChange={(e) => updateQuestion(questionnaire, question.id, { description: e.target.value })}
            className="w-full px-3 py-2 mt-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400"
            placeholder="Description (optionnelle)"
            rows={2}
          />
        </div>
        <button
          onClick={() => deleteQuestion(questionnaire, question.id)}
          className="ml-4 text-red-400 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Type de question</label>
          <select
            value={question.type}
            onChange={(e) => updateQuestion(questionnaire, question.id, { type: e.target.value as Question['type'] })}
            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
          >
            <option value="text">Texte libre</option>
            <option value="rating">Note (étoiles)</option>
            <option value="scale">Échelle</option>
            <option value="multiple">Choix multiple</option>
            <option value="boolean">Oui/Non</option>
          </select>
        </div>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => updateQuestion(questionnaire, question.id, { required: e.target.checked })}
              className="mr-2"
            />
            <span className="text-gray-300">Obligatoire</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Ordre</label>
          <input
            type="number"
            value={question.order}
            onChange={(e) => updateQuestion(questionnaire, question.id, { order: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
          />
        </div>
      </div>

      {/* Options spécifiques selon le type */}
      {question.type === 'scale' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Échelle</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={question.scaleMin || 1}
                onChange={(e) => updateQuestion(questionnaire, question.id, { scaleMin: parseInt(e.target.value) })}
                className="w-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                placeholder="Min"
              />
              <span className="text-gray-300 self-center">à</span>
              <input
                type="number"
                value={question.scaleMax || 5}
                onChange={(e) => updateQuestion(questionnaire, question.id, { scaleMax: parseInt(e.target.value) })}
                className="w-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                placeholder="Max"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Labels</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={question.scaleLabels?.min || ''}
                onChange={(e) => updateQuestion(questionnaire, question.id, { 
                  scaleLabels: { ...question.scaleLabels, min: e.target.value, max: question.scaleLabels?.max || '' }
                })}
                className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                placeholder="Label min"
              />
              <input
                type="text"
                value={question.scaleLabels?.max || ''}
                onChange={(e) => updateQuestion(questionnaire, question.id, { 
                  scaleLabels: { min: question.scaleLabels?.min || '', max: e.target.value }
                })}
                className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                placeholder="Label max"
              />
            </div>
          </div>
        </div>
      )}

      {question.type === 'multiple' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Options</label>
          <textarea
            value={question.options?.join('\n') || ''}
            onChange={(e) => updateQuestion(questionnaire, question.id, { options: e.target.value.split('\n').filter(o => o.trim()) })}
            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
            placeholder="Une option par ligne"
            rows={4}
          />
        </div>
      )}
    </div>
  );

  const renderQuestionPreview = (question: Question) => (
    <div className="bg-white rounded-lg p-6 mb-4 border">
      <div className="mb-4">
        <h4 className="text-lg font-medium text-gray-900">
          {question.text}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </h4>
        {question.description && (
          <p className="text-gray-600 text-sm mt-1">{question.description}</p>
        )}
      </div>

      {question.type === 'text' && (
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder="Votre réponse..."
          disabled
        />
      )}

      {question.type === 'rating' && (
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="h-6 w-6 text-gray-300 cursor-pointer hover:text-yellow-400" />
          ))}
        </div>
      )}

      {question.type === 'scale' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{question.scaleLabels?.min || question.scaleMin}</span>
            <span>{question.scaleLabels?.max || question.scaleMax}</span>
          </div>
          <div className="flex space-x-2">
            {Array.from({ length: (question.scaleMax || 5) - (question.scaleMin || 1) + 1 }, (_, i) => (
              <button
                key={i}
                className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50"
                disabled
              >
                {(question.scaleMin || 1) + i}
              </button>
            ))}
          </div>
        </div>
      )}

      {question.type === 'multiple' && (
        <div className="space-y-2">
          {question.options?.map((option, index) => (
            <label key={index} className="flex items-center">
              <input type="checkbox" className="mr-2" disabled />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'boolean' && (
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input type="radio" name={`q-${question.id}`} className="mr-2" disabled />
            <span>Oui</span>
          </label>
          <label className="flex items-center">
            <input type="radio" name={`q-${question.id}`} className="mr-2" disabled />
            <span>Non</span>
          </label>
        </div>
      )}
    </div>
  );

  const filteredQuestionnaires = questionnaires.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || q.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Évaluations de Formation</h2>
          <p className="text-gray-400">Questionnaires de début et fin de formation</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('analytics')}
            className="btn btn-secondary"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </button>
          <div className="relative">
            <button className="btn btn-primary flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Questionnaire
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
            <div className="absolute top-full right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-50 hidden group-hover:block">
              <button
                onClick={() => createNewQuestionnaire('pre_formation')}
                className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <Calendar className="h-5 w-5 mr-3 text-blue-400" />
                <div>
                  <div className="font-medium">Début de Formation</div>
                  <div className="text-sm text-gray-400">Évaluation pré-formation</div>
                </div>
              </button>
              <button
                onClick={() => createNewQuestionnaire('post_formation')}
                className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <CheckCircle className="h-5 w-5 mr-3 text-green-400" />
                <div>
                  <div className="font-medium">Fin de Formation</div>
                  <div className="text-sm text-gray-400">Évaluation post-formation</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        {[
          { id: 'list', label: 'Questionnaires', icon: <FileText className="h-4 w-4" /> },
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-4 py-2 rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.icon}
            <span className="ml-2">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un questionnaire..."
                className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="all">Tous les types</option>
              <option value="pre_formation">Début de formation</option>
              <option value="post_formation">Fin de formation</option>
            </select>
          </div>

          {/* Questionnaires Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredQuestionnaires.map((questionnaire) => (
              <div key={questionnaire.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">{questionnaire.title}</h3>
                    <p className="text-gray-400 text-sm mb-2">{questionnaire.description}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        questionnaire.type === 'pre_formation' ? 'bg-blue-900/50 text-blue-400' :
                        'bg-green-900/50 text-green-400'
                      }`}>
                        {questionnaire.type === 'pre_formation' ? 'Début de formation' : 'Fin de formation'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        questionnaire.isActive ? 'bg-green-900/50 text-green-400' : 'bg-gray-900/50 text-gray-400'
                      }`}>
                        {questionnaire.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                  <span>{questionnaire.questions.length} questions</span>
                  <span>{questionnaire.responses.length} réponses</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedQuestionnaire(questionnaire);
                        setShowPreview(true);
                      }}
                      className="text-blue-400 hover:text-blue-300"
                      title="Aperçu"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedQuestionnaire(questionnaire);
                        setActiveTab('edit');
                      }}
                      className="text-green-400 hover:text-green-300"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => duplicateQuestionnaire(questionnaire)}
                      className="text-purple-400 hover:text-purple-300"
                      title="Dupliquer"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteQuestionnaire(questionnaire.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleQuestionnaireStatus(questionnaire.id)}
                    className={`px-3 py-1 rounded text-xs ${
                      questionnaire.isActive 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {questionnaire.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'create' || activeTab === 'edit') && selectedQuestionnaire && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">
              {activeTab === 'create' ? 'Créer un questionnaire' : 'Modifier le questionnaire'}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setSelectedQuestionnaire(selectedQuestionnaire);
                  setShowPreview(true);
                }}
                className="btn btn-secondary"
              >
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </button>
              <button
                onClick={() => saveQuestionnaire(selectedQuestionnaire)}
                className="btn btn-primary"
              >
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </button>
              <button
                onClick={() => {
                  setActiveTab('list');
                  setSelectedQuestionnaire(null);
                }}
                className="btn btn-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
              <input
                type="text"
                value={selectedQuestionnaire.title}
                onChange={(e) => setSelectedQuestionnaire({
                  ...selectedQuestionnaire,
                  title: e.target.value
                })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                value={selectedQuestionnaire.type}
                onChange={(e) => setSelectedQuestionnaire({
                  ...selectedQuestionnaire,
                  type: e.target.value as Questionnaire['type']
                })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="pre_formation">Début de formation</option>
                <option value="post_formation">Fin de formation</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={selectedQuestionnaire.description}
              onChange={(e) => setSelectedQuestionnaire({
                ...selectedQuestionnaire,
                description: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              rows={3}
            />
          </div>

          {/* Settings */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="text-lg font-medium text-white mb-4">Paramètres</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedQuestionnaire.settings.allowAnonymous}
                  onChange={(e) => setSelectedQuestionnaire({
                    ...selectedQuestionnaire,
                    settings: {
                      ...selectedQuestionnaire.settings,
                      allowAnonymous: e.target.checked
                    }
                  })}
                  className="mr-2"
                />
                <span className="text-gray-300">Autoriser les réponses anonymes</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedQuestionnaire.settings.autoSend}
                  onChange={(e) => setSelectedQuestionnaire({
                    ...selectedQuestionnaire,
                    settings: {
                      ...selectedQuestionnaire.settings,
                      autoSend: e.target.checked
                    }
                  })}
                  className="mr-2"
                />
                <span className="text-gray-300">Envoi automatique</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedQuestionnaire.settings.reminderEnabled}
                  onChange={(e) => setSelectedQuestionnaire({
                    ...selectedQuestionnaire,
                    settings: {
                      ...selectedQuestionnaire.settings,
                      reminderEnabled: e.target.checked
                    }
                  })}
                  className="mr-2"
                />
                <span className="text-gray-300">Rappels automatiques</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rappel après (jours)</label>
                <input
                  type="number"
                  value={selectedQuestionnaire.settings.reminderDays}
                  onChange={(e) => setSelectedQuestionnaire({
                    ...selectedQuestionnaire,
                    settings: {
                      ...selectedQuestionnaire.settings,
                      reminderDays: parseInt(e.target.value)
                    }
                  })}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-white">Questions</h4>
              <button
                onClick={() => addQuestion(selectedQuestionnaire)}
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une question
              </button>
            </div>

            <div className="space-y-4">
              {selectedQuestionnaire.questions
                .sort((a, b) => a.order - b.order)
                .map((question) => renderQuestionEditor(question, selectedQuestionnaire))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Questionnaires actifs</p>
                  <p className="text-2xl font-bold text-white">
                    {questionnaires.filter(q => q.isActive).length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Réponses totales</p>
                  <p className="text-2xl font-bold text-white">
                    {questionnaires.reduce((sum, q) => sum + q.responses.length, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Taux de réponse moyen</p>
                  <p className="text-2xl font-bold text-white">87%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Satisfaction moyenne</p>
                  <p className="text-2xl font-bold text-white">4.3/5</p>
                </div>
                <Star className="h-8 w-8 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Répartition par Type</h3>
              <div className="space-y-4">
                {['pre_formation', 'post_formation'].map((type) => {
                  const count = questionnaires.filter(q => q.type === type).length;
                  const percentage = questionnaires.length > 0 ? (count / questionnaires.length) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">
                        {type === 'pre_formation' ? 'Début de formation' : 'Fin de formation'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-white text-sm">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Évolution des Réponses</h3>
              <div className="h-64 flex items-center justify-center text-gray-400">
                <BarChart3 className="h-16 w-16" />
                <span className="ml-4">Graphique des réponses par mois</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedQuestionnaire && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                Aperçu : {selectedQuestionnaire.title}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedQuestionnaire.title}
                  </h2>
                  <p className="text-gray-600">{selectedQuestionnaire.description}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedQuestionnaire.type === 'pre_formation' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedQuestionnaire.type === 'pre_formation' ? 'Début de formation' : 'Fin de formation'}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {selectedQuestionnaire.questions
                    .sort((a, b) => a.order - b.order)
                    .map((question) => renderQuestionPreview(question))}
                </div>

                <div className="mt-8 flex justify-between">
                  <button className="btn btn-secondary" disabled>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Précédent
                  </button>
                  <button className="btn btn-primary" disabled>
                    Suivant
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationSystem;