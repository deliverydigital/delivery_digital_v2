import {useEffect, useState} from 'react';
import { AlertTriangle, Bell, CheckCircle, Clock, Download, CreditCard as Edit, ExternalLink, Eye, FileText, FolderOpen, Home, Image as ImageIcon, Kanban, LogOut, Mail, MessageCircle, Paperclip, Phone, Plus, Receipt, RefreshCw, Reply, Save, Search, Send, Settings, Star, Trash2, User, Users, X, Upload, GraduationCap } from 'lucide-react';

import {useAuth, useClients, useMessages, useProjects, useStatistics} from '../hooks/useApi';
import { useTrainingDocuments, useTrainingDocumentStats } from '../hooks/useTrainingDocuments';
import { useTrainingPrograms } from '../hooks/useTrainingPrograms';
import Auth from './Auth';
import TaskBoard from "./TaskBoard.tsx";

// Define the upload form data type
interface UploadDocumentFormDataType {
  program_id: string;
  program_name: string;
  title: string;
  description: string;
  category: string;
  tags: string;
  version: string;
  files: File[];
}

// Define the modal props interface
interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: UploadDocumentFormDataType;
  setFormData: (data: UploadDocumentFormDataType) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  programs: any[];
}

// Move UploadDocumentModal outside of AdminDashboard component
const UploadDocumentModal = ({ 
  isOpen, 
  onClose, 
  formData, 
  setFormData, 
  onSubmit, 
  isSubmitting, 
  programs 
}: UploadDocumentModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className="bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl"
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Télécharger un document</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Programme de formation *
              </label>
              <select
                value={formData.program_id}
                onChange={(e) => {
                  const selectedProgram = programs.find(p => p.id === e.target.value);
                  console.log(e.target.value, selectedProgram);
                  setFormData({
                    ...formData,
                    program_id: e.target.value,
                    program_name: selectedProgram?.name || '',
                    title: formData.title || '' // Preserve existing title
                  });
                }}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Sélectionner un programme</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Catégorie
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="program">Programme</option>
                <option value="guide">Guide</option>
                <option value="certificate">Certificat</option>
                <option value="evaluation">Évaluation</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Titre du document *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Programme détaillé WordPress"
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Description du document..."
              rows={3}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: wordpress, guide, installation"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Version
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="1.0"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fichiers PDF *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-md hover:border-gray-600 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-400">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-primary-400 hover:text-primary-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 px-3 py-1"
                  >
                    <span>Télécharger des fichiers PDF</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files) {
                          setFormData({ ...formData, files: Array.from(e.target.files) });
                        }
                      }}
                    />
                  </label>
                  <p className="pl-1">ou glisser-déposer</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF uniquement, jusqu'à 10MB par fichier
                </p>
              </div>
            </div>
            {formData.files.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Fichiers sélectionnés ({formData.files.length})
                </h4>
                <div className="space-y-2">
                  {formData.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-red-400 mr-3" />
                        <div>
                          <p className="text-white text-sm font-medium">{file.name}</p>
                          <p className="text-gray-400 text-xs">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = formData.files.filter((_, i) => i !== index);
                          setFormData({ ...formData, files: newFiles });
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.program_id || !formData.title || formData.files.length === 0}
              className={`btn ${
                isSubmitting || !formData.program_id || !formData.title || formData.files.length === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Téléchargement...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Télécharger
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
    const {user, logout, isAuthenticated} = useAuth();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const {clients, loading: clientsLoading} = useClients();
    const { messages, sendMessage } = useMessages();

    const {projects, pagination, updateProject} = useProjects(undefined, currentPage, itemsPerPage);
    const {clients: allClients, loading: clientsDataLoading, refreshClients} = useClients();
    const {stats, refreshStats} = useStatistics();
    const { documents: allDocuments, loading: documentsLoading, uploadDocument, deleteDocument } = useTrainingDocuments();
    const { stats: documentStats } = useTrainingDocumentStats();
    const { programs: trainingPrograms, loading: programsLoading } = useTrainingPrograms();

    const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'projects' | 'tasks' | 'messages' | 'quotes' | 'training' | 'settings'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showProjectDetails, setShowProjectDetails] = useState(false);
    const [showClientDetails, setShowClientDetails] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showTaskBoard, setShowTaskBoard] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');

    // Quotes state
    const [showCreateQuoteModal, setShowCreateQuoteModal] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [quotes, setQuotes] = useState([]);
    const [quotesLoading, setQuotesLoading] = useState(false);
    const [quoteFormData, setQuoteFormData] = useState({
        clientId: '',
        projectId: '',
        title: '',
        description: '',
        validUntil: '',
        items: [{description: '', quantity: 1, unitPrice: 0}],
        taxRate: 20.00,
        currency: 'EUR',
        notes: ''
    });
    const [loadingQuotes, setLoadingQuotes] = useState(false);
    const [showQuoteDetails, setShowQuoteDetails] = useState(false);

    // Training state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState('');
    const [trainingDocuments, setTrainingDocuments] = useState<{[key: string]: {name: string, url: string}[]}>({
        'wordpress': [
            { name: "Programme détaillé WordPress", url: "/downloads/wordpress-program.pdf" },
            { name: "Guide d'installation", url: "/downloads/wordpress-installation.pdf" }
        ],
        'photoshop': [
            { name: "Programme Photoshop", url: "/downloads/photoshop-program.pdf" },
            { name: "Raccourcis clavier", url: "/downloads/photoshop-shortcuts.pdf" }
        ],
        'canva': [
            { name: "Guide Canva", url: "/downloads/canva-guide.pdf" }
        ],
        'excel': [],
        'dev-web-mobile': [],
        'hygiene-security': [],
        'nutrition': [],
        'autocad-sketchup-revit': []
    });
    const [uploadFormData, setUploadFormData] = useState<UploadDocumentFormDataType>({
        program_id: '',
        program_name: '',
        title: '',
        description: '',
        category: 'program',
        tags: '',
        version: '1.0',
        files: [] as File[]
    });
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadError, setUploadError] = useState('');
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentFormData, setDocumentFormData] = useState({
        program_id: '',
        program_name: '',
        title: '',
        description: '',
        category: 'program',
        tags: '',
        version: '1.0',
        files: [] as File[]
    });
    const [documentFormKey, setDocumentFormKey] = useState(0);

    // Check authentication on mount
    useEffect(() => {
        if (!isAuthenticated) {
            setShowAuthModal(true);
        }
    }, [isAuthenticated]);

    // Load data on component mount
    useEffect(() => {
        refreshClients();
        refreshStats();
        loadQuotes();
    }, []);

    // Fetch quotes when tab changes to quotes
    useEffect(() => {
        if (activeTab === 'quotes') {
            fetchQuotes();
        }
    }, [activeTab]);

    const addDocument = (programKey: string, name: string, url: string) => {
        setTrainingDocuments(prev => ({
            ...prev,
            [programKey]: [...(prev[programKey] || []), { name, url }]
        }));
    };

    const removeDocument = (programKey: string, index: number) => {
        setTrainingDocuments(prev => ({
            ...prev,
            [programKey]: prev[programKey].filter((_, i) => i !== index)
        }));
    };

    const handleDocumentFormChange = (field: string, value: any) => {
        setDocumentFormData(prev => {
            const newData = { ...prev, [field]: value };
            return newData;
        });
    };

    const resetDocumentForm = () => {
        setDocumentFormData({
            program_id: '',
            program_name: '',
            title: '',
            description: '',
            category: 'program',
            tags: '',
            version: '1.0',
            files: []
        });
        setDocumentFormKey(prev => prev + 1);
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (uploadFormData.files.length === 0) {
            setUploadError('Veuillez sélectionner au moins un fichier');
            return;
        }

        setUploadStatus('uploading');
        setUploadError('');

        try {
            const result = await uploadDocument({
                program_id: uploadFormData.program_id,
                program_name: uploadFormData.program_name,
                title: uploadFormData.title,
                description: uploadFormData.description,
                category: uploadFormData.category as any,
                tags: uploadFormData.tags.split(',').map(t => t.trim()).filter(t => t),
                version: uploadFormData.version,
                files: uploadFormData.files
            });

            if (result.success) {
                setUploadStatus('success');
                setTimeout(() => {
                    setShowUploadModal(false);
                    setUploadStatus('idle');
                    setUploadFormData({
                        program_id: '',
                        program_name: '',
                        title: '',
                        description: '',
                        category: 'program',
                        tags: '',
                        version: '1.0',
                        files: []
                    });
                }, 1500);
            } else {
                setUploadStatus('error');
                setUploadError(result.error || 'Erreur lors de l\'upload');
            }
        } catch (error) {
            setUploadStatus('error');
            setUploadError(error.message || 'Erreur lors de l\'upload');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
            setUploadFormData({ ...uploadFormData, files });

            if (files.length === 0 && e.target.files.length > 0) {
                setUploadError('Seuls les fichiers PDF sont acceptés');
            } else {
                setUploadError('');
            }
        }
    };

    const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedProgram = trainingPrograms.find(p => p.id === e.target.value);
        setUploadFormData({
            ...uploadFormData,
            program_id: e.target.value,
            program_name: selectedProgram?.name || ''
        });
    };

    const UploadModal = () => {
        const [uploadForm, setUploadForm] = useState({
            program: selectedProgram || 'wordpress',
            name: '',
            file: null as File | null
        });

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
                setUploadForm(prev => ({ ...prev, file: e.target.files![0] }));
            }
        };

        const handleUpload = (e: React.FormEvent) => {
            e.preventDefault();
            if (uploadForm.file && uploadForm.name) {
                // In a real app, you would upload to a server
                // For demo, we'll create a blob URL
                const url = URL.createObjectURL(uploadForm.file);
                addDocument(uploadForm.program, uploadForm.name, url);
                setShowUploadModal(false);
                setUploadForm({ program: 'wordpress', name: '', file: null });
            }
        };

        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">Télécharger un document</h3>
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleUpload} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Formation
                            </label>
                            <select
                                value={uploadForm.program}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, program: e.target.value }))}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="wordpress">WordPress</option>
                                <option value="photoshop">Photoshop</option>
                                <option value="canva">Canva</option>
                                <option value="excel">Excel</option>
                                <option value="dev-web-mobile">Développeur Web et Web Mobile</option>
                                <option value="hygiene-security">Hygiène, Sécurité et Développement Durable</option>
                                <option value="nutrition">Nutrition</option>
                                <option value="autocad-sketchup-revit">AutoCAD, SketchUp, et Revit</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Nom du document
                            </label>
                            <input
                                type="text"
                                value={uploadForm.name}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Ex: Programme détaillé"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Fichier PDF
                            </label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowUploadModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={!uploadForm.file || !uploadForm.name}
                                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Télécharger
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const loadQuotes = async () => {
        setQuotesLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/quotes`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json',
                    'bypass-tunnel-reminder': 'true'
                }
            });

            if (response.ok) {
                const result = await response.json();
                setQuotes(result.data || []);
            } else {
                console.error('Failed to load quotes:', response.statusText);
                setQuotes([]);
            }
        } catch (error) {
            console.error('Error loading quotes:', error);
            setQuotes([]);
        }
        setQuotesLoading(false);
    };

    const createQuote = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/quotes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json',
                    'bypass-tunnel-reminder': 'true'
                },
                body: JSON.stringify(quoteFormData)
            });

            if (response.ok) {
                const result = await response.json();
                setQuotes(prev => [...prev, result.data]);
                setShowCreateQuoteModal(false);
                // Reset form
                setQuoteFormData({
                    clientId: '',
                    projectId: '',
                    title: '',
                    description: '',
                    validUntil: '',
                    items: [{description: '', quantity: 1, unitPrice: 0}],
                    taxRate: 20.00,
                    currency: 'EUR',
                    notes: ''
                });
            } else {
                console.error('Failed to create quote:', response.statusText);
            }
        } catch (error) {
            console.error('Error creating quote:', error);
        }
    };

    const addQuoteItem = () => {
        setQuoteFormData({
            ...quoteFormData,
            items: [...quoteFormData.items, {description: '', quantity: 1, unitPrice: 0}]
        });
    };

    const updateQuoteItem = (index: number, field: string, value: any) => {
        const newItems = [...quoteFormData.items];
        newItems[index] = {...newItems[index], [field]: value};
        setQuoteFormData({
            ...quoteFormData,
            items: newItems
        });
    };

    const removeQuoteItem = (index: number) => {
        if (quoteFormData.items.length > 1) {
            const newItems = quoteFormData.items.filter((_, i) => i !== index);
            setQuoteFormData({
                ...quoteFormData,
                items: newItems
            });
        }
    };

    const calculateQuoteTotal = () => {
        const subtotal = quoteFormData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxAmount = subtotal * (quoteFormData.taxRate / 100);
        return {
            subtotal,
            taxAmount,
            total: subtotal + taxAmount
        };
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const renderPagination = (paginationData: any) => {
        if (!paginationData || paginationData.pages <= 1) return null;

        return (
            <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-400">
                    Affichage
                    de {((paginationData.page - 1) * paginationData.limit) + 1} à {Math.min(paginationData.page * paginationData.limit, paginationData.total)} sur {paginationData.total} résultats
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handlePageChange(paginationData.page - 1)}
                        disabled={paginationData.page <= 1}
                        className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                    >
                        Précédent
                    </button>
                    <span className="text-gray-300">
            Page {paginationData.page} sur {paginationData.pages}
          </span>
                    <button
                        onClick={() => handlePageChange(paginationData.page + 1)}
                        disabled={paginationData.page >= paginationData.pages}
                        className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                    >
                        Suivant
                    </button>
                </div>
            </div>
        );
    };

    const fetchQuotes = async () => {
        try {
            setLoadingQuotes(true);
            const response = await fetch(`/api/quotes`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setQuotes(data.data);
            } else {
                console.error('Error fetching quotes:', data.error);
            }
        } catch (error) {
            console.error('Error fetching quotes:', error);
        } finally {
            setLoadingQuotes(false);
        }
    };

    const updateQuoteStatus = async (quoteId: string, status: string) => {
        try {
            const response = await fetch(`/api/quotes/${quoteId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({status})
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                fetchQuotes();
            } else {
                throw new Error(data.error || 'Failed to update quote status');
            }
        } catch (error) {
            console.error('Error updating quote status:', error);
            alert('Failed to update quote status. Please try again.');
        }
    };

    const deleteQuote = async (quoteId: string) => {
        if (!confirm('Are you sure you want to delete this quote?')) {
            return;
        }

        try {
            const response = await fetch(`/api/quotes/${quoteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                fetchQuotes();
            } else {
                throw new Error(data.error || 'Failed to delete quote');
            }
        } catch (error) {
            console.error('Error deleting quote:', error);
            alert('Failed to delete quote. Please try again.');
        }
    };

    const convertQuoteToInvoice = async (quoteId: string) => {
        if (!confirm('Are you sure you want to convert this quote to an invoice?')) {
            return;
        }

        try {
            const response = await fetch(`/api/quotes/${quoteId}/convert-to-invoice`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                alert('Quote successfully converted to invoice!');
                fetchQuotes();
            } else {
                throw new Error(data.error || 'Failed to convert quote to invoice');
            }
        } catch (error) {
            console.error('Error converting quote to invoice:', error);
            alert('Failed to convert quote to invoice. Please try again.');
        }
    };

    const resetQuoteForm = () => {
        setQuoteFormData({
            clientId: '',
            projectId: '',
            title: '',
            description: '',
            validUntil: '',
            items: [{description: '', quantity: 1, unitPrice: 0, totalPrice: 0}],
            taxRate: 20,
            notes: ''
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted':
                return 'text-blue-400 bg-blue-900/20';
            case 'reviewing':
                return 'text-yellow-400 bg-yellow-900/20';
            case 'in_progress':
                return 'text-purple-400 bg-purple-900/20';
            case 'completed':
                return 'text-green-400 bg-green-900/20';
            case 'on_hold':
                return 'text-red-400 bg-red-900/20';
            default:
                return 'text-gray-400 bg-gray-900/20';
        }
    };

    const getQuoteStatusColor = (status: string) => {
        switch (status) {
            case 'draft':
                return 'text-gray-400 bg-gray-900/20';
            case 'sent':
                return 'text-blue-400 bg-blue-900/20';
            case 'accepted':
                return 'text-green-400 bg-green-900/20';
            case 'rejected':
                return 'text-red-400 bg-red-900/20';
            case 'expired':
                return 'text-yellow-400 bg-yellow-900/20';
            default:
                return 'text-gray-400 bg-gray-900/20';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'text-red-400 bg-red-900/20';
            case 'high':
                return 'text-orange-400 bg-orange-900/20';
            case 'medium':
                return 'text-yellow-400 bg-yellow-900/20';
            case 'low':
                return 'text-green-400 bg-green-900/20';
            default:
                return 'text-gray-400 bg-gray-900/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'submitted':
                return <Clock className="h-4 w-4"/>;
            case 'reviewing':
                return <Eye className="h-4 w-4"/>;
            case 'in_progress':
                return <RefreshCw className="h-4 w-4"/>;
            case 'completed':
                return <CheckCircle className="h-4 w-4"/>;
            case 'on_hold':
                return <AlertTriangle className="h-4 w-4"/>;
            default:
                return null;
        }
    };

    const updateProjectStatus = async (projectId: string, newStatus: string) => {
        await updateProject(projectId, {status: newStatus as any});
    };

    const updateProjectPriority = async (projectId: string, newPriority: string) => {
        await updateProject(projectId, {priority: newPriority as any});
    };

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.clientName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || project.priority === filterPriority;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !newMessage.trim()) return;

        try {
            await sendMessage({
                projectId: selectedProject.id,
                content: newMessage
            });
            setNewMessage('');
            setShowMessageModal(false);
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);
        }
    };

    const handleLogout = () => {
        logout();
        // Redirect to main site
        window.location.href = '/';
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
    };

    // Time Tracker Component
    const TimeTracker = ({taskId}: { taskId: string }) => {
        const [isTracking, setIsTracking] = useState(false);
        const [elapsedTime, setElapsedTime] = useState(0);
        const [startTime, setStartTime] = useState<Date | null>(null);

        useEffect(() => {
            let interval: NodeJS.Timeout;

            if (isTracking && startTime) {
                interval = setInterval(() => {
                    const now = new Date();
                    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                    setElapsedTime(elapsed);
                }, 1000);
            }

            return () => {
                if (interval) {
                    clearInterval(interval);
                }
            };
        }, [isTracking, startTime]);

        const handleStartStop = () => {
            if (isTracking) {
                // Stop tracking
                setIsTracking(false);
                setStartTime(null);
                setElapsedTime(0);
            } else {
                // Start tracking
                setIsTracking(true);
                setStartTime(new Date());
                setElapsedTime(0);
            }
        };

        const formatElapsedTime = (seconds: number) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        };

        return (
            <button
                onClick={handleStartStop}
                className={`flex items-center transition-colors ${
                    isTracking ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'
                }`}
                title={isTracking ? 'Arrêter le chrono' : 'Démarrer le chrono'}
            >
                {isTracking ? (
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-1"></div>
                        {formatElapsedTime(elapsedTime)}
                    </div>
                ) : (
                    formatElapsedTime(elapsedTime)
                )}
            </button>
        );
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    // Show auth modal if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-4">Administration DELIVERY Digital</h1>
                    <p className="text-gray-400 mb-8">Connectez-vous pour accéder au tableau de bord</p>
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className="btn btn-primary"
                    >
                        Se connecter
                    </button>
                </div>

                <Auth
                    isOpen={showAuthModal}
                    onClose={() => {
                        setShowAuthModal(false);
                        window.location.href = '/';
                    }}
                    onSuccess={handleAuthSuccess}
                />
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
                        <Home className="h-5 w-5 mr-2"/>
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 bg-gray-800 min-h-screen p-4">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white mb-2">Admin Dashboard</h2>
                        <p className="text-sm text-gray-400">Gestion des clients et projets</p>
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
                            <FolderOpen className="h-5 w-5 mr-3"/>
                            Vue d'ensemble
                        </button>

                        <button
                            onClick={() => setActiveTab('clients')}
                            className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                                activeTab === 'clients'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <Users className="h-5 w-5 mr-3"/>
                            Clients ({stats.totalClients})
                        </button>

                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                                activeTab === 'projects'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <FolderOpen className="h-5 w-5 mr-3"/>
                            Projets ({stats.totalProjects})
                        </button>

                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                                activeTab === 'tasks'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <Kanban className="h-5 w-5 mr-3"/>
                            Gestion des tâches
                        </button>

                        <button
                            onClick={() => setActiveTab('quotes')}
                            className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                                activeTab === 'quotes'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <Receipt className="h-5 w-5 mr-3"/>
                            Devis
                        </button>

                        <button
                            onClick={() => setActiveTab('training')}
                            className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                                activeTab === 'training'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <FileText className="h-5 w-5 mr-3"/>
                            Formation
                        </button>

                        <button
                            onClick={() => setActiveTab('messages')}
                            className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                                activeTab === 'messages'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <MessageCircle className="h-5 w-5 mr-3"/>
                            Messages
                            {stats.unreadMessages > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {stats.unreadMessages}
                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                                activeTab === 'settings'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <Settings className="h-5 w-5 mr-3"/>
                            Paramètres
                        </button>
                    </nav>

                    <div className="absolute bottom-4 space-y-2">
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <Home className="h-5 w-5 mr-3"/>
                            Site principal
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <LogOut className="h-5 w-5 mr-3"/>
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
                                <h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
                                <div className="flex items-center space-x-4">
                                    <Bell className="h-6 w-6 text-gray-400"/>
                                    <div className="text-sm text-gray-400">
                                        {new Date().toLocaleDateString('fr-FR')}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-gray-800 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">Clients actifs</p>
                                            <p className="text-2xl font-bold text-white">{stats.activeClients}</p>
                                        </div>
                                        <Users className="h-8 w-8 text-blue-400"/>
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">Projets en cours</p>
                                            <p className="text-2xl font-bold text-white">{stats.activeProjects}</p>
                                        </div>
                                        <RefreshCw className="h-8 w-8 text-purple-400"/>
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">En attente de révision</p>
                                            <p className="text-2xl font-bold text-white">{stats.pendingReviews}</p>
                                        </div>
                                        <Eye className="h-8 w-8 text-yellow-400"/>
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">Messages non lus</p>
                                            <p className="text-2xl font-bold text-white">{stats.unreadMessages}</p>
                                        </div>
                                        <MessageCircle className="h-8 w-8 text-red-400"/>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-gray-800 rounded-lg p-6">
                                    <h3 className="text-lg font-bold text-white mb-4">Projets récents</h3>
                                    <div className="space-y-4">
                                        {projects.slice(0, 5).map((project) => (
                                            <div key={project.id}
                                                 className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                                                <div>
                                                    <p className="text-white font-medium">{project.title}</p>
                                                    <p className="text-gray-400 text-sm">{project.clientName}</p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <div
                                                        className={`px-2 py-1 rounded text-xs ${getStatusColor(project.status)}`}>
                                                        {project.status}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedProject(project);
                                                            setActiveTab('tasks');
                                                        }}
                                                        className="text-primary-400 hover:text-primary-300"
                                                    >
                                                        <Kanban className="h-4 w-4"/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-lg p-6">
                                    <h3 className="text-lg font-bold text-white mb-4">Messages récents</h3>
                                    <div className="space-y-4">
                                        {messages.slice(0, 5).map((message) => (
                                            <div key={message.id} className="p-3 bg-gray-700 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-white font-medium">
                                                        {clients.find(c => c.id === message.clientId)?.name || 'Client'}
                                                    </p>
                                                    <span className="text-gray-400 text-xs">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                                                </div>
                                                <p className="text-gray-300 text-sm truncate">{message.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clients Tab */}
                    {activeTab === 'clients' && (
                        <div>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white">Gestion des Clients</h2>
                            </div>

                            <div className="mb-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Rechercher un client..."
                                        className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <Search
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                </div>
                            </div>

                            <div className="grid gap-6">
                                {clients.filter(client =>
                                    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    client.company.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((client) => (
                                    <div key={client.id} className="bg-gray-800 rounded-lg p-6">
                                        <button
                                            onClick={() => setShowUploadModal(true)}
                                            className="btn btn-primary"
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Télécharger PDF
                                        </button>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start space-x-4">
                                                <div
                                                    className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
                                                    <User className="h-6 w-6 text-white"/>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white">{client.name}</h3>
                                                    <p className="text-gray-400">{client.company}</p>
                                                    <div
                                                        className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                            <span className="flex items-center">
                              <Mail className="h-4 w-4 mr-1"/>
                                {client.email}
                            </span>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedProgram(programId);
                                                                setShowUploadModal(true);
                                                            }}
                                                            className="text-blue-400 hover:text-blue-300 text-sm"
                                                        >
                                                            <Upload className="h-4 w-4" />
                                                        </button>
                                                        {client.phone && (
                                                            <span className="flex items-center">
                                <Phone className="h-4 w-4 mr-1"/>
                                                                {client.phone}
                              </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className={`px-2 py-1 rounded text-xs ${
                                                    client.status === 'active' ? 'text-green-400 bg-green-900/20' : 'text-gray-400 bg-gray-900/20'
                                                }`}>
                                                    {client.status}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                                            <span>{client.projectsCount} projet(s)</span>
                                            <span>Inscrit le {client?.joinDate?.toLocaleDateString('fr-FR')}</span>
                                            <span>Dernière activité: {client?.lastActivity?.toLocaleDateString('fr-FR')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Projects Tab */}
                    {activeTab === 'projects' && (
                        <div>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white">Gestion des Projets</h2>
                                <div className="flex items-center space-x-4">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                                    >
                                        <option value="all">Tous les statuts</option>
                                        <option value="submitted">Soumis</option>
                                        <option value="reviewing">En révision</option>
                                        <option value="in_progress">En cours</option>
                                        <option value="completed">Terminé</option>
                                        <option value="on_hold">En pause</option>
                                    </select>
                                    <select
                                        value={filterPriority}
                                        onChange={(e) => setFilterPriority(e.target.value)}
                                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                                    >
                                        <option value="all">Toutes les priorités</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="high">Haute</option>
                                        <option value="medium">Moyenne</option>
                                        <option value="low">Basse</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Rechercher un projet..."
                                        className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <Search
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                </div>
                            </div>

                            <div