import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Plus, MessageCircle, FolderOpen, Settings, LogOut, 
  ChevronRight, FileText, Image as ImageIcon, ExternalLink,
  Clock, CheckCircle, AlertTriangle, X
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  lastUpdate: Date;
  attachments: {
    name: string;
    type: string;
    url: string;
  }[];
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<'projects' | 'messages' | 'settings'>('projects');
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      title: 'Application E-commerce',
      description: 'Plateforme de vente en ligne avec système de paiement intégré',
      status: 'in_progress',
      lastUpdate: new Date(),
      attachments: [
        { name: 'maquette.pdf', type: 'application/pdf', url: '#' },
        { name: 'logo.png', type: 'image/png', url: '#' }
      ]
    },
    {
      id: '2',
      title: 'Site Vitrine Restaurant',
      description: 'Site web responsive avec réservation en ligne',
      status: 'pending',
      lastUpdate: new Date(Date.now() - 86400000),
      attachments: [
        { name: 'specifications.pdf', type: 'application/pdf', url: '#' }
      ]
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'in_progress':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'in_progress':
        return <AlertTriangle className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 min-h-screen p-4">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-2">Dashboard</h2>
            <p className="text-sm text-gray-400">Gérez vos projets et communications</p>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'projects'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <FolderOpen className="h-5 w-5 mr-3" />
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
              <MessageCircle className="h-5 w-5 mr-3" />
              Messages
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Settings className="h-5 w-5 mr-3" />
              Paramètres
            </button>
          </nav>

          <div className="absolute bottom-4">
            <button className="flex items-center text-gray-400 hover:text-white transition-colors">
              <LogOut className="h-5 w-5 mr-2" />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === 'projects' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Mes Projets</h2>
                <button className="btn btn-primary">
                  <Plus className="h-5 w-5 mr-2" />
                  Nouveau Projet
                </button>
              </div>

              <div className="grid gap-6">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          {project.title}
                        </h3>
                        <p className="text-gray-400">{project.description}</p>
                      </div>
                      <div className={`flex items-center ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        <span className="ml-2 text-sm">
                          {project.status === 'pending' && 'En attente'}
                          {project.status === 'in_progress' && 'En cours'}
                          {project.status === 'completed' && 'Terminé'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button className="text-primary-400 hover:text-primary-300 transition-colors">
                            <MessageCircle className="h-5 w-5" />
                          </button>
                          <span className="text-sm text-gray-400">
                            Dernière mise à jour : {project.lastUpdate.toLocaleDateString()}
                          </span>
                        </div>
                        <button className="text-primary-400 hover:text-primary-300 transition-colors">
                          Voir les détails
                          <ChevronRight className="h-5 w-5 inline ml-1" />
                        </button>
                      </div>

                      {project.attachments.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {project.attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-gray-700 rounded px-3 py-1"
                            >
                              {file.type.includes('image') ? (
                                <ImageIcon className="h-4 w-4 text-primary-400 mr-2" />
                              ) : (
                                <FileText className="h-4 w-4 text-primary-400 mr-2" />
                              )}
                              <span className="text-sm text-gray-300">{file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-8">Messages</h2>
              {/* Messages content */}
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-8">Paramètres</h2>
              {/* Settings content */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;