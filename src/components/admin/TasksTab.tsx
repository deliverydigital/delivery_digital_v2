import { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Filter } from 'lucide-react';

const TasksTab = () => {
  const [filterStatus, setFilterStatus] = useState('all');

  const tasks = [
    {
      id: '1',
      title: 'Valider le design du projet ModeFashion',
      project: 'Site E-commerce',
      priority: 'high',
      status: 'pending',
      dueDate: '2024-02-15'
    },
    {
      id: '2',
      title: 'Révision du code backend',
      project: 'App Mobile TechStart',
      priority: 'medium',
      status: 'in_progress',
      dueDate: '2024-02-20'
    },
    {
      id: '3',
      title: 'Réunion client - Présentation maquettes',
      project: 'Site E-commerce',
      priority: 'urgent',
      status: 'pending',
      dueDate: '2024-02-12'
    }
  ];

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-400',
      medium: 'text-blue-400',
      high: 'text-orange-400',
      urgent: 'text-red-400'
    };
    return colors[priority as keyof typeof colors];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
    }
  };

  const filteredTasks = tasks.filter(task =>
    filterStatus === 'all' || task.status === filterStatus
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Mes Tâches</h2>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"
          >
            <option value="all">Toutes</option>
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminées</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.map(task => (
          <div
            key={task.id}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-primary-500 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                {getStatusIcon(task.status)}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{task.title}</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">{task.project}</span>
                    <span className={getPriorityColor(task.priority)}>
                      {task.priority === 'urgent' ? 'Urgent' :
                       task.priority === 'high' ? 'Haute' :
                       task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                    </span>
                    <span className="text-gray-400">
                      Échéance: {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                Voir le projet
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">Aucune tâche trouvée</p>
        </div>
      )}
    </div>
  );
};

export default TasksTab;
