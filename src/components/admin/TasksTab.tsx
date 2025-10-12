import { useState, useEffect } from 'react';
import { RefreshCw, FolderOpen, ClipboardList, AlertTriangle, Link, ExternalLink, ChevronRight } from 'lucide-react';
import { useProjects } from '../../hooks/useApi';
import { useTasks } from '../../hooks/useTasks';
import TaskBoard from '../TaskBoard';

const TasksTab = () => {
  const { projects, loading } = useProjects();
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const { tasks, loading: tasksLoading, error: tasksError, refreshTasks } = useTasks(
    selectedProject?.id || ''
  );

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects]);

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    overdue: tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length
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
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Gestion des Tâches</h2>
        <div className="flex items-center space-x-4">
          {/* Project Selector */}
          <div className="relative">
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project);
              }}
              className="px-4 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm appearance-none"
            >
              <option value="">Tous les projets</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.hasUrgentTasks ? '🔴 ' : ''}{project.title}
                </option>
              ))}
            </select>
            {selectedProject?.hasUrgentTasks && (
              <AlertTriangle className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500 pointer-events-none animate-pulse" />
            )}
            <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={refreshTasks}
            className="btn btn-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Project Links */}
      {selectedProject && selectedProject.links && selectedProject.links.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <Link className="h-5 w-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Liens du Projet</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedProject.links.map((link: any, index: number) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-gray-900 hover:bg-gray-700 p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition-all group"
              >
                <div className="text-white font-medium truncate">{link.title}</div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-400 ml-2 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Task Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{taskStats.total}</div>
            <div className="text-gray-400 text-sm">Total</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">{taskStats.todo}</div>
            <div className="text-gray-400 text-sm">À faire</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{taskStats.in_progress}</div>
            <div className="text-gray-400 text-sm">En cours</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{taskStats.review}</div>
            <div className="text-gray-400 text-sm">En révision</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{taskStats.done}</div>
            <div className="text-gray-400 text-sm">Terminé</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{taskStats.blocked}</div>
            <div className="text-gray-400 text-sm">Bloqué</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{taskStats.overdue}</div>
            <div className="text-gray-400 text-sm">En retard</div>
          </div>
        </div>
      </div>

      {/* Task Content */}
      {tasksLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Chargement des tâches...</p>
        </div>
      ) : tasksError ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Erreur de chargement</h3>
          <p className="text-gray-400 mb-6">{tasksError}</p>
          <button
            onClick={refreshTasks}
            className="btn btn-primary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </button>
        </div>
      ) : !selectedProject ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun projet sélectionné</h3>
          <p className="text-gray-400">Sélectionnez un projet pour voir les tâches associées.</p>
        </div>
      ) : (
        <TaskBoard projectId={selectedProject.id} isAdmin={true} />
      )}
    </div>
  );
};

export default TasksTab;
