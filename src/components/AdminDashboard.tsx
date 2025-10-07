import {useEffect, useState} from 'react';
import {
    AlertTriangle,
    Bell,
    CheckCircle,
    Clock,
    Download,
    CreditCard as Edit,
    ExternalLink,
    Eye,
    FileText,
    FolderOpen,
    Home,
    Image as ImageIcon,
    Kanban,
    LogOut,
    Mail,
    MessageCircle,
    Paperclip,
    Phone,
    Plus,
    Receipt,
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
    Upload,
    GraduationCap,
    BarChart3,
    Tag
} from 'lucide-react';

import {useAuth, useClients, useMessages, useProjects, useStatistics} from '../hooks/useApi';
import { useTrainingDocuments, useTrainingDocumentStats } from '../hooks/useTrainingDocuments';
import { useTrainingPrograms } from '../hooks/useTrainingPrograms';
import { useCategories } from '../hooks/useCategories';
import Auth from './Auth';
import TaskBoard from "./TaskBoard.tsx";

// Import tab components
import OverviewTab from './admin/OverviewTab';
import ProjectsTab from './admin/ProjectsTab';
import ClientsTab from './admin/ClientsTab';
import MessagesTab from './admin/MessagesTab';
import SettingsTab from './admin/SettingsTab';
import TrainingProgramsManagement from './TrainingProgramsManagement';
import CategoriesTab from './admin/CategoriesTab';

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
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    const handleLogout = () => {
        logout();
        window.location.href = '/';
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OverviewTab />;
            case 'projects':
                return <ProjectsTab />;
            case 'clients':
                return <ClientsTab />;
            case 'messages':
                return <MessagesTab />;
            case 'training':
                return <TrainingProgramsManagement />;
            case 'categories':
                return <CategoriesTab />;
            case 'tasks':
                return <TaskBoard projectId="admin-tasks" isAdmin={true} />;
            case 'settings':
                return <SettingsTab />;
            default:
                return <OverviewTab />;
        }
    };

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
                            <BarChart3 className="h-5 w-5 mr-3"/>
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
                            Clients
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
                            Projets
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
                        </button>

                        <button
                            onClick={() => setActiveTab('training')}
                            className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                                activeTab === 'training'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <GraduationCap className="h-5 w-5 mr-3"/>
                            Formation
                        </button>

                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                                activeTab === 'categories'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <Tag className="h-5 w-5 mr-3"/>
                            Catégories
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
                            Mes Tâches
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
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;