import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, AlertTriangle, Kanban } from 'lucide-react';
import { useProjects } from '../../hooks/useApi';

const TasksTab = () => {
  const { projects, loading } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [taskStats, setTaskStats] = useState({
    total: 0,
    todo: 0,
    inProgress: 0,
    review: 0,
    done: 0
  });

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects]);

  useEffect(() => {
    if (selectedProject) {
      loadTaskStats();
    }
  }, [selectedProject]);

  const loadTaskStats = async () => {
    try {
      const response = await fetch(`/api/tasks/project/${selectedProject}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'bypass-tunnel-reminder': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const tasks = data.data.tasks || [];

        setTaskStats({
          total: tasks.length,
          todo: tasks.filter((t: any) => t.status === 'todo').length,
          inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
          review: tasks.filter((t: any) => t.status === 'review').length,
          done: tasks.filter((t: any) => t.status === 'done').length
        });
      }
    } catch (error) {
      console.error('Error loading task stats:', error);
    }
  };

  const handleViewProjectTasks = (projectId: string) => {
    setSelectedProject(projectId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-400 mx-auto mb-2"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Gestion des Tâches</h2>
          <p className="text-gray-400">Gérez les tâches de tous vos projets</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Kanban className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">Aucun projet disponible</p>
          <p className="text-gray-500 text-sm">Créez un projet pour commencer à gérer les tâches</p>
        </div>
      ) : (
        <>
          {/* Project Selector */}
          <div className="bg-gray-800 rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Sélectionner un projet
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Choisir un projet --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          {/* Task Statistics */}
          {selectedProject && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total</p>
                      <p className="text-3xl font-bold text-white mt-1">{taskStats.total}</p>
                    </div>
                    <Kanban className="h-8 w-8 text-gray-600" />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">À faire</p>
                      <p className="text-3xl font-bold text-gray-400 mt-1">{taskStats.todo}</p>
                    </div>
                    <Clock className="h-8 w-8 text-gray-600" />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">En cours</p>
                      <p className="text-3xl font-bold text-blue-400 mt-1">{taskStats.inProgress}</p>
                    </div>
                    <div className="h-8 w-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">En révision</p>
                      <p className="text-3xl font-bold text-yellow-400 mt-1">{taskStats.review}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Terminé</p>
                      <p className="text-3xl font-bold text-green-400 mt-1">{taskStats.done}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Task Board Link */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Tableau des Tâches
                    </h3>
                    <p className="text-primary-100">
                      Gérez les tâches de ce projet avec un tableau Kanban complet
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const project = projects.find(p => p.id === selectedProject);
                      if (project) {
                        window.location.href = `/client?view=project-tasks&projectId=${selectedProject}`;
                      }
                    }}
                    className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center"
                  >
                    <Kanban className="h-5 w-5 mr-2" />
                    Ouvrir le tableau
                  </button>
                </div>
              </div>

              {/* Projects List */}
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-bold text-white">Tous les Projets</h3>
                </div>
                <div className="divide-y divide-gray-700">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={`p-6 hover:bg-gray-750 transition-colors cursor-pointer ${
                        selectedProject === project.id ? 'bg-gray-750' : ''
                      }`}
                      onClick={() => handleViewProjectTasks(project.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="text-white font-medium">{project.title}</h4>
                            <span className={`ml-3 px-2 py-1 rounded-full text-xs ${
                              project.status === 'completed' ? 'bg-green-900 text-green-300' :
                              project.status === 'in_progress' ? 'bg-blue-900 text-blue-300' :
                              project.status === 'on_hold' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {project.status === 'completed' ? 'Terminé' :
                               project.status === 'in_progress' ? 'En cours' :
                               project.status === 'on_hold' ? 'En pause' :
                               'En attente'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mt-1">{project.description}</p>
                        </div>
                        <div className="ml-4 flex items-center space-x-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/client?view=project-tasks&projectId=${project.id}`;
                            }}
                            className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center"
                          >
                            <Kanban className="h-4 w-4 mr-1" />
                            Voir les tâches
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TasksTab;
