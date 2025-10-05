import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, FolderOpen, MessageCircle, ClipboardList, TrendingUp, 
  Calendar, CheckCircle, AlertTriangle, Clock, Star, Euro,
  BarChart3, PieChart, Activity, Zap, Target, Award
} from 'lucide-react';
import { useStatistics, useProjects, useClients } from '../../hooks/useApi';

const OverviewTab = () => {
  const { stats, loading: statsLoading } = useStatistics();
  const { projects } = useProjects();
  const { clients } = useClients();

  const quickStats = [
    {
      title: 'Clients Totaux',
      value: stats.totalClients,
      icon: <Users className="h-8 w-8 text-blue-400" />,
      color: 'blue',
      change: '+12%'
    },
    {
      title: 'Projets Actifs',
      value: stats.activeProjects,
      icon: <FolderOpen className="h-8 w-8 text-green-400" />,
      color: 'green',
      change: '+8%'
    },
    {
      title: 'Messages Non Lus',
      value: stats.unreadMessages,
      icon: <MessageCircle className="h-8 w-8 text-yellow-400" />,
      color: 'yellow',
      change: '-5%'
    },
    {
      title: 'Tâches En Cours',
      value: stats.pendingReviews,
      icon: <ClipboardList className="h-8 w-8 text-purple-400" />,
      color: 'purple',
      change: '+15%'
    }
  ];

  const recentProjects = projects.slice(0, 5);
  const recentClients = clients.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
          <p className="text-gray-400">Tableau de bord administrateur DELIVERY Digital</p>
        </div>
        <div className="text-sm text-gray-400">
          Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-600 h-8 w-16 rounded"></div>
                  ) : (
                    stat.value
                  )}
                </p>
                <p className={`text-sm ${
                  stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.change} ce mois
                </p>
              </div>
              {stat.icon}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Évolution des Projets</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Graphique des projets par mois</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Répartition par Type</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Répartition des projets par type</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Projets Récents</h3>
            <button className="text-blue-400 hover:text-blue-300 text-sm">
              Voir tout
            </button>
          </div>
          <div className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <FolderOpen className="h-5 w-5 text-blue-400 mr-3" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{project.title}</p>
                  <p className="text-gray-400 text-xs">
                    {project.clientName} • {new Date(project.lastUpdate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  project.status === 'in_progress' ? 'bg-green-900/50 text-green-400' :
                  project.status === 'reviewing' ? 'bg-yellow-900/50 text-yellow-400' :
                  'bg-gray-900/50 text-gray-400'
                }`}>
                  {project.status === 'in_progress' ? 'En cours' :
                   project.status === 'reviewing' ? 'En révision' :
                   project.status === 'completed' ? 'Terminé' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Nouveaux Clients</h3>
            <button className="text-blue-400 hover:text-blue-300 text-sm">
              Voir tout
            </button>
          </div>
          <div className="space-y-4">
            {recentClients.map((client) => (
              <div key={client.id} className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{client.name}</p>
                  <p className="text-gray-400 text-xs">
                    {client.company} • {new Date(client.joinDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  client.status === 'active' ? 'bg-green-900/50 text-green-400' :
                  'bg-gray-900/50 text-gray-400'
                }`}>
                  {client.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-6">Indicateurs de Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">94%</div>
            <p className="text-gray-400">Satisfaction Client</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">87%</div>
            <p className="text-gray-400">Projets Livrés à Temps</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">92%</div>
            <p className="text-gray-400">Taux de Rétention</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;