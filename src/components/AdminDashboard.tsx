import {useEffect, useState} from 'react';
import {
    AlertTriangle,
    Bell,
    CheckCircle,
    Clock,
    Download,
    Edit,
    ExternalLink,
    Eye,
    FileText,
    FolderOpen, Home,
    Image as ImageIcon, Kanban,
    LogOut,
    Mail,
    MessageCircle,
    Paperclip,
    Phone,
    Plus, Receipt,
    RefreshCw,
    Reply,
    Save,
    Search,
    Send,
    Settings,
    Star,
    Trash2,
    User,
    Users,
    X,
    Upload
    , GraduationCap
} from 'lucide-react';

import {useAuth, useClients, useMessages, useProjects, useStatistics} from '../hooks/useApi';
import { useTrainingDocuments, useTrainingDocumentStats } from '../hooks/useTrainingDocuments';
import Auth from './Auth';
import TaskBoard from "./TaskBoard.tsx";

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
    const [uploadFormData, setUploadFormData] = useState({
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

    const trainingPrograms = [
        { id: 'wordpress', name: 'WordPress' },
        { id: 'photoshop', name: 'Photoshop' },
        { id: 'canva', name: 'Canva' },
        { id: 'excel', name: 'Excel' },
        { id: 'dev-web-mobile', name: 'Développeur Web et Web Mobile' },
        { id: 'reflex-english-1', name: 'Reflex English 1' },
        { id: 'reflex-english-2', name: 'Reflex English 2' },
        { id: 'reflex-english-3', name: 'Reflex English 3' },
        { id: 'hygiene-security', name: 'Hygiène, Sécurité et Développement Durable' },
        { id: 'hygiene-security-afest', name: 'Hygiène, Sécurité et Développement Durable - AFEST' },
        { id: 'conduite-securitaire', name: 'Conduite Sécuritaire' },
        { id: 'autocad-sketchup-revit', name: 'AutoCAD, SketchUp, et Revit' },
        { id: 'reflex-espagnol-1', name: 'Reflex Espagnol Niveau 1' },
        { id: 'reflex-espagnol-2', name: 'Reflex Espagnol Niveau 2' },
        { id: 'reflex-espagnol-3', name: 'Reflex Espagnol Niveau 3' },
        { id: 'management-complet', name: 'Management Parcours Complet' },
        { id: 'vente-omnicanal', name: 'Techniques de Vente Omnicanal' },
        { id: 'nutrition', name: 'Nutrition' }
    ];

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

    const UploadDocumentModal = () => (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Télécharger un document</h3>
                    <button
                        onClick={() => {
                            setShowUploadModal(false);
                            setUploadStatus('idle');
                            setUploadError('');
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="p-6 space-y-6">
                    <input type="hidden" key={documentFormKey} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Programme de formation *
                            </label>
                            <select
                                value={uploadFormData.program_id}
                                onChange={(e) => {
                                    const selectedProgram = trainingPrograms.find(p => p.id === e.target.value);
                                    handleProgramChange(e);
                                }}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            >
                                <option value="">Sélectionner un programme</option>
                                {trainingPrograms.map((program) => (
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
                                value={uploadFormData.category}
                                onChange={(e) => setUploadFormData({ ...uploadFormData, category: e.target.value })}
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
                            value={uploadFormData.title}
                            onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
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
                            value={uploadFormData.description}
                            onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Description du document..."
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
                                value={uploadFormData.tags}
                                onChange={(e) => setUploadFormData({ ...uploadFormData, tags: e.target.value })}
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
                                value={uploadFormData.version}
                                onChange={(e) => setUploadFormData({ ...uploadFormData, version: e.target.value })}
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
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-lg">
                            <div className="space-y-1 text-center">
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-400">
                                    <label
                                        htmlFor="document-upload"
                                        className="relative cursor-pointer rounded-md font-medium text-primary-400 hover:text-primary-300"
                                    >
                                        <span>Télécharger des fichiers PDF</span>
                                        <input
                                            id="document-upload"
                                            type="file"
                                            className="sr-only"
                                            multiple
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">PDF uniquement, jusqu'à 10MB par fichier</p>
                            </div>
                        </div>
                        {uploadFormData.files.length > 0 && (
                            <div className="mt-3">
                                <p className="text-sm text-gray-300 mb-2">{uploadFormData.files.length} fichier(s) sélectionné(s):</p>
                                <div className="space-y-2">
                                    {uploadFormData.files.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                                            <div className="flex items-center">
                                                <FileText className="h-4 w-4 text-red-400 mr-2" />
                                                <span className="text-white text-sm">{file.name}</span>
                                                <span className="text-gray-400 text-xs ml-2">
                                                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {uploadError && (
                        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {uploadError}
                        </div>
                    )}

                    {uploadStatus === 'success' && (
                        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-400 text-sm flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Documents téléchargés avec succès !
                        </div>
                    )}

                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                setShowUploadModal(false);
                                setUploadStatus('idle');
                                setUploadError('');
                            }}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={uploadStatus === 'uploading' || !uploadFormData.program_id || !uploadFormData.title || uploadFormData.files.length === 0}
                            className={`btn ${
                                uploadStatus === 'uploading' || !uploadFormData.program_id || !uploadFormData.title || uploadFormData.files.length === 0
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'btn-primary'
                            }`}
                        >
                            {uploadStatus === 'uploading' ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                    Téléchargement...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Sauvegarder
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

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

                            <div className="grid gap-6">
                                {filteredProjects.map((project) => (
                                    <div key={project.id} className="bg-gray-800 rounded-lg p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                                                <p className="text-gray-400 mb-2">{project.description}</p>
                                                <p className="text-sm text-gray-500">Client: {project.clientName}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div
                                                    className={`px-2 py-1 rounded text-xs flex items-center ${getPriorityColor(project.priority)}`}>
                                                    <Star className="h-3 w-3 mr-1"/>
                                                    {project.priority}
                                                </div>
                                                <div
                                                    className={`px-2 py-1 rounded text-xs flex items-center ${getStatusColor(project.status)}`}>
                                                    {getStatusIcon(project.status)}
                                                    <span className="ml-1">{project.status}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                            <div>
                                                <span className="text-gray-400">Type:</span>
                                                <span className="text-white ml-2">{project.type}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Budget:</span>
                                                <span className="text-white ml-2">{project.budget}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Délai:</span>
                                                <span className="text-white ml-2">{project.timeline}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Heures estimées:</span>
                                                <span
                                                    className="text-white ml-2">{project.estimatedHours || 'N/A'}h</span>
                                            </div>
                                        </div>

                                        {project.notes && (
                                            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                                                <p className="text-sm text-gray-300">
                                                    <strong>Notes:</strong> {project.notes}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                                                <span>Soumis le {project?.submittedAt?.toLocaleDateString('fr-FR')}</span>
                                                <span>Mis à jour le {project?.lastUpdate?.toLocaleDateString('fr-FR')}</span>
                                                {project.attachments.length > 0 && (
                                                    <span className="flex items-center">
                            <Paperclip className="h-4 w-4 mr-1"/>
                                                        {project.attachments.length} fichier(s)
                          </span>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <select
                                                    value={project.status}
                                                    onChange={(e) => updateProjectStatus(project.id, e.target.value)}
                                                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                                                >
                                                    <option value="submitted">Soumis</option>
                                                    <option value="reviewing">En révision</option>
                                                    <option value="in_progress">En cours</option>
                                                    <option value="completed">Terminé</option>
                                                    <option value="on_hold">En pause</option>
                                                </select>
                                                <select
                                                    value={project.priority}
                                                    onChange={(e) => updateProjectPriority(project.id, e.target.value)}
                                                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                                                >
                                                    <option value="low">Basse</option>
                                                    <option value="medium">Moyenne</option>
                                                    <option value="high">Haute</option>
                                                    <option value="urgent">Urgent</option>
                                                </select>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProject(project);
                                                        setShowProjectDetails(true);
                                                    }}
                                                    className="text-primary-400 hover:text-primary-300"
                                                >
                                                    <Eye className="h-5 w-5"/>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProject(project);
                                                        setActiveTab('tasks');
                                                    }}
                                                    className="text-green-400 hover:text-green-300"
                                                >
                                                    <Kanban className="h-5 w-5"/>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProject(project);
                                                        setShowMessageModal(true);
                                                    }}
                                                    className="text-blue-400 hover:text-blue-300"
                                                >
                                                    <MessageCircle className="h-5 w-5"/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {renderPagination(pagination)}
                        </div>
                    )}

                    {/* Tasks Tab */}
                    {activeTab === 'tasks' && (
                        <div>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white">Gestion des Tâches</h2>
                                <div className="flex items-center space-x-4">
                                    <select
                                        value={selectedProject?.id || ''}
                                        onChange={(e) => {
                                            const project = projects.find(p => p.id === e.target.value);
                                            setSelectedProject(project || null);
                                        }}
                                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                                    >
                                        <option value="">Sélectionner un projet</option>
                                        {projects.map((project) => (
                                            <option key={project.id} value={project.id}>
                                                {project.title} - {project.clientName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {selectedProject ? (
                                <div className="bg-gray-800 rounded-lg p-6 h-[calc(100vh-200px)]">
                                    <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                                        <h3 className="text-lg font-bold text-white">{selectedProject.title}</h3>
                                        <p className="text-gray-400">Client: {selectedProject.clientName}</p>
                                    </div>
                                    <TaskBoard projectId={selectedProject.id} isAdmin={true}/>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400 py-16">
                                    <Kanban className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                                    <p className="text-lg">Sélectionnez un projet pour gérer ses tâches</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quotes Tab */}
                    {activeTab === 'quotes' && (
                        <div>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white">Gestion des Devis</h2>
                                <button
                                    onClick={() => setShowCreateQuoteModal(true)}
                                    className="btn btn-primary"
                                    disabled={clients.length === 0}
                                >
                                    <Plus className="h-4 w-4 mr-2"/>
                                    Nouveau Devis
                                </button>
                            </div>

                            {loadingQuotes ? (
                                <div className="flex items-center justify-center h-64">
                                    <div
                                        className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                                </div>
                            ) : quotes.length === 0 ? (
                                <div className="bg-gray-800 rounded-lg p-12 text-center">
                                    <Receipt className="h-16 w-16 text-gray-600 mx-auto mb-4"/>
                                    <h3 className="text-xl font-medium text-white mb-2">Aucun devis</h3>
                                    <p className="text-gray-400 mb-6">Vous n'avez pas encore créé de devis.</p>
                                    <button
                                        onClick={() => setShowCreateQuoteModal(true)}
                                        className="btn btn-primary"
                                    >
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Créer un devis
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Devis</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Client</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Montant</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Statut</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                                </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700">
                                                {quotes.map((quote) => (
                                                    <tr key={quote.id} className="hover:bg-gray-700/50">
                                                        <td className="px-6 py-4">
                                                            <div
                                                                className="text-sm font-medium text-white">{quote.title}</div>
                                                            <div
                                                                className="text-sm text-gray-400">{quote.projects?.title || 'Aucun projet'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div
                                                                className="text-sm text-gray-300">{quote.users?.name}</div>
                                                            <div
                                                                className="text-sm text-gray-400">{quote.users?.company}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div
                                                                className="text-sm text-gray-300">{quote.total_amount.toLocaleString('fr-FR')} {quote.currency}</div>
                                                            <div
                                                                className="text-sm text-gray-400">TVA: {quote.tax_rate}%
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-300">Créé
                                                                le: {new Date(quote.created_at).toLocaleDateString('fr-FR')}</div>
                                                            <div className="text-sm text-gray-400">Valide
                                                                jusqu'au: {new Date(quote.valid_until).toLocaleDateString('fr-FR')}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQuoteStatusColor(quote.status)}`}>
                                  {quote.status === 'draft' ? 'Brouillon' :
                                      quote.status === 'sent' ? 'Envoyé' :
                                          quote.status === 'accepted' ? 'Accepté' :
                                              quote.status === 'rejected' ? 'Refusé' : 'Expiré'}
                                </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedQuote(quote);
                                                                        setShowQuoteDetails(true);
                                                                    }}
                                                                    className="text-blue-400 hover:text-blue-300"
                                                                    title="Voir"
                                                                >
                                                                    <Eye className="h-4 w-4"/>
                                                                </button>
                                                                {quote.status === 'draft' && (
                                                                    <button
                                                                        onClick={() => updateQuoteStatus(quote.id, 'sent')}
                                                                        className="text-green-400 hover:text-green-300"
                                                                        title="Marquer comme envoyé"
                                                                    >
                                                                        <Send className="h-4 w-4"/>
                                                                    </button>
                                                                )}
                                                                {quote.status === 'sent' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => updateQuoteStatus(quote.id, 'accepted')}
                                                                            className="text-green-400 hover:text-green-300"
                                                                            title="Marquer comme accepté"
                                                                        >
                                                                            <CheckCircle className="h-4 w-4"/>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => updateQuoteStatus(quote.id, 'rejected')}
                                                                            className="text-red-400 hover:text-red-300"
                                                                            title="Marquer comme refusé"
                                                                        >
                                                                            <X className="h-4 w-4"/>
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {quote.status === 'accepted' && (
                                                                    <button
                                                                        onClick={() => convertQuoteToInvoice(quote.id)}
                                                                        className="text-purple-400 hover:text-purple-300"
                                                                        title="Convertir en facture"
                                                                    >
                                                                        <FileCheck className="h-4 w-4"/>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => deleteQuote(quote.id)}
                                                                    className="text-red-400 hover:text-red-300"
                                                                    title="Supprimer"
                                                                >
                                                                    <Trash2 className="h-4 w-4"/>
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
                        </div>
                    )}

                    {/* Training Tab */}
                    {activeTab === 'training' && (
                        <div>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white">Formation Professionnelle</h2>
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="btn btn-primary"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Télécharger un document
                                </button>
                            </div>

                            {/* Document Statistics */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-gray-800 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">Documents totaux</p>
                                            <p className="text-2xl font-bold text-white">{documentStats.totalDocuments}</p>
                                        </div>
                                        <FileText className="h-8 w-8 text-blue-400" />
                                    </div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">Téléchargements</p>
                                            <p className="text-2xl font-bold text-white">{documentStats.totalDownloads}</p>
                                        </div>
                                        <Download className="h-8 w-8 text-green-400" />
                                    </div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">Programmes couverts</p>
                                            <p className="text-2xl font-bold text-white">
                                                {Object.keys(documentStats.documentsByProgram).length}
                                            </p>
                                        </div>
                                        <GraduationCap className="h-8 w-8 text-purple-400" />
                                    </div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">Document populaire</p>
                                            <p className="text-sm font-bold text-white truncate">
                                                {documentStats.popularDocuments[0]?.title || 'Aucun'}
                                            </p>
                                        </div>
                                        <Star className="h-8 w-8 text-yellow-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Documents by Program */}
                            <div className="space-y-6">
                                {trainingPrograms.map((program) => {
                                    const programDocuments = allDocuments.filter(doc => doc.program_id === program.id);

                                    return (
                                        <div key={program.id} className="bg-gray-800 rounded-lg p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-bold text-white">{program.name}</h3>
                                                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                                                    {programDocuments.length} documents
                                                </span>
                                            </div>

                                            {programDocuments.length === 0 ? (
                                                <div className="text-center py-8 text-gray-400">
                                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">Aucun document pour ce programme</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {programDocuments.map((document) => (
                                                        <div key={document.id} className="bg-gray-700 rounded-lg p-4">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex-1">
                                                                    <h4 className="text-white font-medium text-sm mb-1">{document.title}</h4>
                                                                    {document.description && (
                                                                        <p className="text-gray-400 text-xs mb-2 line-clamp-2">{document.description}</p>
                                                                    )}
                                                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                                        <span>{(document.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                                                        <span>•</span>
                                                                        <span>{document.download_count} téléchargements</span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => deleteDocument(document.id)}
                                                                    className="text-red-400 hover:text-red-300 ml-2"
                                                                    title="Supprimer"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>

                                                            {document.tags.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mb-2">
                                                                    {document.tags.slice(0, 3).map((tag, index) => (
                                                                        <span key={index} className="bg-blue-900/50 text-blue-400 text-xs px-2 py-0.5 rounded">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                    {document.tags.length > 3 && (
                                                                        <span className="text-gray-400 text-xs">+{document.tags.length - 3}</span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-xs px-2 py-1 rounded ${
                                                                    document.category === 'program' ? 'bg-blue-900/50 text-blue-400' :
                                                                        document.category === 'guide' ? 'bg-green-900/50 text-green-400' :
                                                                            document.category === 'certificate' ? 'bg-yellow-900/50 text-yellow-400' :
                                                                                'bg-gray-900/50 text-gray-400'
                                                                }`}>
                                                                    {document.category}
                                                                </span>
                                                                <span className="text-gray-400 text-xs">
                                                                    v{document.version}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Messages Tab */}
                    {activeTab === 'messages' && (
                        <div>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white">Messages</h2>
                                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-400">
                    {stats.unreadMessages} message(s) non lu(s)
                  </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <div key={message.id}
                                         className={`bg-gray-800 rounded-lg p-6 ${!message.read && message.sender === 'client' ? 'border-l-4 border-primary-500' : ''}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                        message.sender === 'client' ? 'bg-blue-600' : 'bg-green-600'
                                                    }`}>
                                                    {message.sender === 'client' ? (
                                                        <User className="h-4 w-4 text-white"/>
                                                    ) : (
                                                        <MessageCircle className="h-4 w-4 text-white"/>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">
                                                        {message.sender === 'client'
                                                            ? clients.find(c => c.id === message.clientId)?.name || 'Client'
                                                            : 'Admin'
                                                        }
                                                    </p>
                                                    <p className="text-gray-400 text-sm">
                                                        Projet: {projects.find(p => p.id === message.projectId)?.title || 'Projet'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">
                          {message.timestamp.toLocaleString('fr-FR')}
                        </span>
                                                {!message.read && message.sender === 'client' && (
                                                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-gray-300 mb-4">{message.content}</p>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => {
                                                    const project = projects.find(p => p.id === message.projectId);
                                                    if (project) {
                                                        setSelectedProject(project);
                                                        setShowMessageModal(true);
                                                    }
                                                }}
                                                className="text-primary-400 hover:text-primary-300 text-sm flex items-center"
                                            >
                                                <Reply className="h-4 w-4 mr-1"/>
                                                Répondre
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-8">Paramètres</h2>
                            <div className="bg-gray-800 rounded-lg p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Configuration générale</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Notifications par email
                                        </label>
                                        <input type="checkbox" className="rounded" defaultChecked/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Délai de réponse automatique (heures)
                                        </label>
                                        <input
                                            type="number"
                                            defaultValue={24}
                                            className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Project Details Modal */}
            {showProjectDetails && selectedProject && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">
                                Détails du projet: {selectedProject.title}
                            </h3>
                            <button
                                onClick={() => setShowProjectDetails(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="h-6 w-6"/>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-lg font-medium text-white mb-4">Informations générales</h4>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <span className="text-gray-400">Client:</span>
                                            <span className="text-white ml-2">{selectedProject.clientName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Type:</span>
                                            <span className="text-white ml-2">{selectedProject.type}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Budget:</span>
                                            <span className="text-white ml-2">{selectedProject.budget}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Délai:</span>
                                            <span className="text-white ml-2">{selectedProject.timeline}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Heures estimées:</span>
                                            <span
                                                className="text-white ml-2">{selectedProject.estimatedHours || 'N/A'}h</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Assigné à:</span>
                                            <span
                                                className="text-white ml-2">{selectedProject.assignedTo || 'Non assigné'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-lg font-medium text-white mb-4">Statut et priorité</h4>
                                    <div className="space-y-3">
                                        <div className={`px-3 py-2 rounded ${getStatusColor(selectedProject.status)}`}>
                                            Statut: {selectedProject.status}
                                        </div>
                                        <div
                                            className={`px-3 py-2 rounded ${getPriorityColor(selectedProject.priority)}`}>
                                            Priorité: {selectedProject.priority}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-medium text-white mb-4">Description</h4>
                                <p className="text-gray-300 bg-gray-800 p-4 rounded-lg">
                                    {selectedProject.description}
                                </p>
                            </div>

                            {selectedProject.notes && (
                                <div>
                                    <h4 className="text-lg font-medium text-white mb-4">Notes internes</h4>
                                    <p className="text-gray-300 bg-gray-800 p-4 rounded-lg">
                                        {selectedProject.notes}
                                    </p>
                                </div>
                            )}

                            {(selectedProject.figmaUrl || selectedProject.gitlabUrl) && (
                                <div>
                                    <h4 className="text-lg font-medium text-white mb-4">Liens</h4>
                                    <div className="space-y-2">
                                        {selectedProject.figmaUrl && (
                                            <a
                                                href={selectedProject.figmaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center text-primary-400 hover:text-primary-300"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2"/>
                                                Figma Design
                                            </a>
                                        )}
                                        {selectedProject.gitlabUrl && (
                                            <a
                                                href={selectedProject.gitlabUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center text-primary-400 hover:text-primary-300"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2"/>
                                                GitLab Repository
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedProject.attachments.length > 0 && (
                                <div>
                                    <h4 className="text-lg font-medium text-white mb-4">Fichiers joints</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedProject.attachments.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center bg-gray-800 rounded-lg p-3"
                                            >
                                                {file.type.includes('image') ? (
                                                    <ImageIcon className="h-5 w-5 text-primary-400 mr-3"/>
                                                ) : (
                                                    <FileText className="h-5 w-5 text-primary-400 mr-3"/>
                                                )}
                                                <span className="text-gray-300 flex-1">{file.name}</span>
                                                <button className="text-primary-400 hover:text-primary-300">
                                                    <Download className="h-4 w-4"/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-800 flex justify-end gap-4">
                            <button
                                onClick={() => setShowProjectDetails(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Fermer
                            </button>
                            <button className="btn btn-primary">
                                <Edit className="h-4 w-4 mr-2"/>
                                Modifier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {showMessageModal && selectedProject && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">
                                Envoyer un message - {selectedProject.title}
                            </h3>
                            <button
                                onClick={() => setShowMessageModal(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="h-6 w-6"/>
                            </button>
                        </div>

                        <form onSubmit={handleSendMessage} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Destinataire
                                </label>
                                <div className="text-white bg-gray-800 p-3 rounded-lg">
                                    {selectedProject.clientName}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Message
                                </label>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    rows={6}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Tapez votre message..."
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowMessageModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    <Send className="h-4 w-4 mr-2"/>
                                    Envoyer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Quote Modal */}
            {showCreateQuoteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Créer un nouveau devis</h3>
                            <button
                                onClick={() => setShowCreateQuoteModal(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="h-6 w-6"/>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Client *
                                    </label>
                                    <select
                                        value={quoteFormData.clientId}
                                        onChange={(e) => setQuoteFormData({...quoteFormData, clientId: e.target.value})}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    >
                                        <option value="">Sélectionner un client</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {client.name} - {client.company}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Projet (optionnel)
                                    </label>
                                    <select
                                        value={quoteFormData.projectId}
                                        onChange={(e) => setQuoteFormData({
                                            ...quoteFormData,
                                            projectId: e.target.value
                                        })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Aucun projet spécifique</option>
                                        {projects.filter(p => p.clientId === quoteFormData.clientId).map((project) => (
                                            <option key={project.id} value={project.id}>
                                                {project.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Titre du devis *
                                    </label>
                                    <input
                                        type="text"
                                        value={quoteFormData.title}
                                        onChange={(e) => setQuoteFormData({...quoteFormData, title: e.target.value})}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Valide jusqu'au *
                                    </label>
                                    <input
                                        type="date"
                                        value={quoteFormData.validUntil}
                                        onChange={(e) => setQuoteFormData({
                                            ...quoteFormData,
                                            validUntil: e.target.value
                                        })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={quoteFormData.description}
                                    onChange={(e) => setQuoteFormData({...quoteFormData, description: e.target.value})}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            {/* Quote Items */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="block text-sm font-medium text-gray-300">
                                        Éléments du devis *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addQuoteItem}
                                        className="text-primary-400 hover:text-primary-300 text-sm flex items-center"
                                    >
                                        <Plus className="h-4 w-4 mr-1"/>
                                        Ajouter un élément
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {quoteFormData.items.map((item, index) => (
                                        <div key={index}
                                             className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg">
                                            <div className="md:col-span-2">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => updateQuoteItem(index, 'description', e.target.value)}
                                                    placeholder="Description de l'élément"
                                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuoteItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    placeholder="Quantité"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                                    required
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateQuoteItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    placeholder="Prix unitaire"
                                                    min="0"
                                                    step="0.01"
                                                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                                    required
                                                />
                                                {quoteFormData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuoteItem(index)}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        <Trash2 className="h-4 w-4"/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Quote Total */}
                                <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-gray-300">
                                            <span>Sous-total:</span>
                                            <span>{calculateQuoteTotal().subtotal.toFixed(2)} €</span>
                                        </div>
                                        <div className="flex justify-between text-gray-300">
                                            <span>TVA ({quoteFormData.taxRate}%):</span>
                                            <span>{calculateQuoteTotal().taxAmount.toFixed(2)} €</span>
                                        </div>
                                        <div
                                            className="flex justify-between text-white font-bold text-lg border-t border-gray-700 pt-2">
                                            <span>Total:</span>
                                            <span>{calculateQuoteTotal().total.toFixed(2)} €</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Taux de TVA (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={quoteFormData.taxRate}
                                        onChange={(e) => setQuoteFormData({
                                            ...quoteFormData,
                                            taxRate: parseFloat(e.target.value) || 20
                                        })}
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Devise
                                    </label>
                                    <select
                                        value={quoteFormData.currency}
                                        onChange={(e) => setQuoteFormData({...quoteFormData, currency: e.target.value})}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="EUR">Euro (€)</option>
                                        <option value="USD">Dollar ($)</option>
                                        <option value="GBP">Livre (£)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Notes
                                </label>
                                <textarea
                                    value={quoteFormData.notes}
                                    onChange={(e) => setQuoteFormData({...quoteFormData, notes: e.target.value})}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Notes additionnelles..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-800 flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => setShowCreateQuoteModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={createQuote}
                                className="btn btn-primary"
                                disabled={!quoteFormData.title || !quoteFormData.clientId || !quoteFormData.validUntil || quoteFormData.items.some(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0)}
                            >
                                <Save className="h-4 w-4 mr-2"/>
                                Créer le devis
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quote Details Modal */}
            {showQuoteDetails && selectedQuote && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">
                                Devis: {selectedQuote.title}
                            </h3>
                            <button
                                onClick={() => setShowQuoteDetails(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="h-6 w-6"/>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-lg font-medium text-white mb-4">Informations du devis</h4>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <span className="text-gray-400">Client:</span>
                                            <span className="text-white ml-2">{selectedQuote.users?.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Entreprise:</span>
                                            <span className="text-white ml-2">{selectedQuote.users?.company}</span>
                                        </div>
                                        {selectedQuote.projects && (
                                            <div>
                                                <span className="text-gray-400">Projet:</span>
                                                <span className="text-white ml-2">{selectedQuote.projects.title}</span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-gray-400">Créé le:</span>
                                            <span
                                                className="text-white ml-2">{new Date(selectedQuote.created_at).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Valide jusqu'au:</span>
                                            <span
                                                className="text-white ml-2">{new Date(selectedQuote.valid_until).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-lg font-medium text-white mb-4">Statut</h4>
                                    <div className="space-y-3">
                                        <div
                                            className={`px-3 py-2 rounded ${getQuoteStatusColor(selectedQuote.status)}`}>
                                            Statut: {selectedQuote.status === 'draft' ? 'Brouillon' :
                                            selectedQuote.status === 'sent' ? 'Envoyé' :
                                                selectedQuote.status === 'accepted' ? 'Accepté' :
                                                    selectedQuote.status === 'rejected' ? 'Refusé' : 'Expiré'}
                                        </div>
                                        <div className="flex space-x-2">
                                            {selectedQuote.status === 'draft' && (
                                                <button
                                                    onClick={() => {
                                                        updateQuoteStatus(selectedQuote.id, 'sent');
                                                        setShowQuoteDetails(false);
                                                    }}
                                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                                >
                                                    <Send className="h-3 w-3 mr-1 inline"/>
                                                    Marquer comme envoyé
                                                </button>
                                            )}
                                            {selectedQuote.status === 'sent' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            updateQuoteStatus(selectedQuote.id, 'accepted');
                                                            setShowQuoteDetails(false);
                                                        }}
                                                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1 inline"/>
                                                        Accepter
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            updateQuoteStatus(selectedQuote.id, 'rejected');
                                                            setShowQuoteDetails(false);
                                                        }}
                                                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                                    >
                                                        <X className="h-3 w-3 mr-1 inline"/>
                                                        Refuser
                                                    </button>
                                                </>
                                            )}
                                            {selectedQuote.status === 'accepted' && (
                                                <button
                                                    onClick={() => {
                                                        convertQuoteToInvoice(selectedQuote.id);
                                                        setShowQuoteDetails(false);
                                                    }}
                                                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                                                >
                                                    <FileCheck className="h-3 w-3 mr-1 inline"/>
                                                    Convertir en facture
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedQuote.description && (
                                <div>
                                    <h4 className="text-lg font-medium text-white mb-4">Description</h4>
                                    <p className="text-gray-300 bg-gray-800 p-4 rounded-lg">
                                        {selectedQuote.description}
                                    </p>
                                </div>
                            )}

                            <div>
                                <h4 className="text-lg font-medium text-white mb-4">Éléments du devis</h4>
                                <div className="bg-gray-800 rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-300">Description</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-300">Quantité</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-300">Prix
                                                unitaire
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-300">Total</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                        {selectedQuote.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-3 text-sm text-white">{item.description}</td>
                                                <td className="px-4 py-3 text-sm text-white text-right">{item.quantity}</td>
                                                <td className="px-4 py-3 text-sm text-white text-right">{parseFloat(item.unitPrice).toLocaleString('fr-FR')} €</td>
                                                <td className="px-4 py-3 text-sm text-white text-right">{parseFloat(item.totalPrice).toLocaleString('fr-FR')} €</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                        <tfoot className="bg-gray-700">
                                        <tr>
                                            <td colSpan={3}
                                                className="px-4 py-2 text-sm font-medium text-gray-300 text-right">Sous-total:
                                            </td>
                                            <td className="px-4 py-2 text-sm font-medium text-white text-right">{parseFloat(selectedQuote.subtotal).toLocaleString('fr-FR')} €</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3}
                                                className="px-4 py-2 text-sm font-medium text-gray-300 text-right">TVA
                                                ({selectedQuote.tax_rate}%):
                                            </td>
                                            <td className="px-4 py-2 text-sm font-medium text-white text-right">{parseFloat(selectedQuote.tax_amount).toLocaleString('fr-FR')} €</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3}
                                                className="px-4 py-2 text-sm font-bold text-white text-right">Total:
                                            </td>
                                            <td className="px-4 py-2 text-sm font-bold text-white text-right">{parseFloat(selectedQuote.total_amount).toLocaleString('fr-FR')} €</td>
                                        </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {selectedQuote.notes && (
                                <div>
                                    <h4 className="text-lg font-medium text-white mb-4">Notes</h4>
                                    <p className="text-gray-300 bg-gray-800 p-4 rounded-lg">
                                        {selectedQuote.notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-800 flex justify-end gap-4">
                            <button
                                onClick={() => setShowQuoteDetails(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: Implement PDF generation
                                    alert('Fonctionnalité en cours de développement');
                                }}
                                className="btn btn-secondary"
                            >
                                <Download className="h-4 w-4 mr-2"/>
                                Télécharger PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && <UploadDocumentModal />}
        </div>
    );
};

export default AdminDashboard;