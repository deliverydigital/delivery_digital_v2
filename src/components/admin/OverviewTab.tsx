import { useState, useEffect } from 'react';
import {
  Users, FolderOpen, CheckCircle, Clock,
  TrendingUp, AlertTriangle, DollarSign, Activity,
  BarChart3, Calendar, FileText, MessageCircle
} from 'lucide-react';

interface Stats {
  totalClients: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingQuotes: number;
  totalRevenue: number;
  messagesUnread: number;
  tasksOverdue: number;
}

const OverviewTab = () => {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingQuotes: 0,
    totalRevenue: 0,
    messagesUnread: 0,
    tasksOverdue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setStats({
        totalClients: 24,
        totalProjects: 45,
        activeProjects: 12,
        completedProjects: 33,
        pendingQuotes: 8,
        totalRevenue: 125000,
        messagesUnread: 5,
        tasksOverdue: 3
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    trend
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    trend?: string;
  }) => (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <span className="text-sm text-green-400 flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" />
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <p className="text-gray-400 text-sm">{title}</p>
    </div>
  );

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
        <h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
        <button
          onClick={loadStats}
          className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Activity className="h-4 w-4 mr-2" />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Clients totaux"
          value={stats.totalClients}
          icon={Users}
          color="bg-blue-600"
          trend="+12%"
        />
        <StatCard
          title="Projets actifs"
          value={stats.activeProjects}
          icon={FolderOpen}
          color="bg-green-600"
          trend="+8%"
        />
        <StatCard
          title="Projets terminés"
          value={stats.completedProjects}
          icon={CheckCircle}
          color="bg-purple-600"
        />
        <StatCard
          title="Devis en attente"
          value={stats.pendingQuotes}
          icon={FileText}
          color="bg-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Revenu total"
          value={`${stats.totalRevenue.toLocaleString('fr-FR')} €`}
          icon={DollarSign}
          color="bg-emerald-600"
          trend="+15%"
        />
        <StatCard
          title="Messages non lus"
          value={stats.messagesUnread}
          icon={MessageCircle}
          color="bg-cyan-600"
        />
        <StatCard
          title="Tâches en retard"
          value={stats.tasksOverdue}
          icon={AlertTriangle}
          color="bg-red-600"
        />
        <StatCard
          title="Total projets"
          value={stats.totalProjects}
          icon={BarChart3}
          color="bg-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Activité récente
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Nouveau projet créé</span>
              <span className="text-sm text-gray-500">Il y a 2h</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Devis accepté</span>
              <span className="text-sm text-gray-500">Il y a 5h</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Nouveau client inscrit</span>
              <span className="text-sm text-gray-500">Hier</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-400">Projet terminé</span>
              <span className="text-sm text-gray-500">Il y a 2 jours</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Actions à effectuer
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Répondre aux devis en attente</span>
              <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded">8</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Traiter les tâches en retard</span>
              <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">3</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Messages non lus</span>
              <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded">5</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-400">Projets à finaliser</span>
              <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
