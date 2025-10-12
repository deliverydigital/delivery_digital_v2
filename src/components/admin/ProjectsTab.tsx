import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Eye, Edit, Trash2, Calendar,
  Clock, DollarSign, User, AlertCircle, CheckCircle,
  XCircle, Pause, Play
} from 'lucide-react';
import { ApiService } from '../../services/api';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  clientName?: string;
  estimatedBudget?: number;
  completionPercentage: number;
  startDate?: string;
  endDate?: string;
}

const ProjectsTab = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setProjects([
        {
          id: '1',
          title: 'Site E-commerce ModeFashion',
          description: 'Développement d\'une plateforme e-commerce complète',
          status: 'in_progress',
          priority: 'high',
          clientName: 'Marie Dupont',
          estimatedBudget: 45000,
          completionPercentage: 65,
          startDate: '2024-01-15',
          endDate: '2024-03-30'
        },
        {
          id: '2',
          title: 'Application Mobile TechStart',
          description: 'Application mobile iOS et Android',
          status: 'submitted',
          priority: 'medium',
          clientName: 'Jean Martin',
          estimatedBudget: 28000,
          completionPercentage: 0,
          startDate: '2024-02-01'
        }
      ]);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      submitted: 'bg-yellow-600',
      reviewing: 'bg-blue-600',
      in_progress: 'bg-green-600',
      completed: 'bg-purple-600',
      on_hold: 'bg-orange-600',
      cancelled: 'bg-red-600'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-600';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      submitted: 'Soumis',
      reviewing: 'En révision',
      in_progress: 'En cours',
      completed: 'Terminé',
      on_hold: 'En pause',
      cancelled: 'Annulé'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-400',
      medium: 'text-blue-400',
      high: 'text-orange-400',
      urgent: 'text-red-400'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-400';
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Gestion des Projets</h2>
        <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Projet
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="submitted">Soumis</option>
            <option value="reviewing">En révision</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
            <option value="on_hold">En pause</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.map(project => (
          <div key={project.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-primary-500 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>
                <p className="text-sm text-gray-400 mb-3">{project.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(project.status)}`}>
                {getStatusLabel(project.status)}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {project.clientName && (
                <div className="flex items-center text-sm text-gray-400">
                  <User className="h-4 w-4 mr-2" />
                  <span>{project.clientName}</span>
                </div>
              )}
              {project.estimatedBudget && (
                <div className="flex items-center text-sm text-gray-400">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>{project.estimatedBudget.toLocaleString('fr-FR')} €</span>
                </div>
              )}
              {project.endDate && (
                <div className="flex items-center text-sm text-gray-400">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Échéance: {new Date(project.endDate).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Progression</span>
                <span className="font-medium">{project.completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${project.completionPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className={`flex items-center text-sm ${getPriorityColor(project.priority)}`}>
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="capitalize">{project.priority}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">Aucun projet trouvé</p>
        </div>
      )}
    </div>
  );
};

export default ProjectsTab;
