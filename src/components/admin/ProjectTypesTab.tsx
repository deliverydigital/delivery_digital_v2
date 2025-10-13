import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, ListChecks, RefreshCw } from 'lucide-react';
import ProjectTypesApiService, { ProjectType as ApiProjectType, DefaultTask as ApiDefaultTask } from '../../services/projectTypesApi';

interface DefaultTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours?: number;
  orderIndex?: number;
}

interface ProjectType {
  id: string;
  name: string;
  description: string;
  defaultTasks?: DefaultTask[];
  createdAt: Date;
}

const ProjectTypesTab = () => {
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingTasksId, setManagingTasksId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [taskFormData, setTaskFormData] = useState<DefaultTask>({
    id: '',
    title: '',
    description: '',
    priority: 'medium' as const,
    estimatedHours: undefined,
    orderIndex: 0
  });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadProjectTypes();
  }, []);

  const loadProjectTypes = async () => {
    setLoading(true);
    try {
      const result = await ProjectTypesApiService.getAllProjectTypes();
      if (result.success && result.data) {
        const mappedTypes = result.data.map((type: ApiProjectType) => ({
          id: type.id,
          name: type.name,
          description: type.description,
          defaultTasks: type.default_tasks?.map((task: ApiDefaultTask) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            estimatedHours: task.estimated_hours,
            orderIndex: task.order_index
          })),
          createdAt: new Date(type.created_at)
        }));
        setProjectTypes(mappedTypes);
      } else {
        console.error('Failed to load project types:', result.error);
        alert('Erreur lors du chargement des types de projets');
      }
    } catch (error) {
      console.error('Error loading project types:', error);
      alert('Erreur lors du chargement des types de projets');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('Le nom du type de projet est requis');
      return;
    }

    try {
      const result = await ProjectTypesApiService.createProjectType({
        name: formData.name.trim(),
        description: formData.description.trim()
      });

      if (result.success) {
        await loadProjectTypes();
        setFormData({ name: '', description: '' });
        setIsAdding(false);
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch (error: any) {
      alert('Erreur lors de la création: ' + error.message);
    }
  };

  const handleEdit = (type: ProjectType) => {
    setEditingId(type.id);
    setFormData({
      name: type.name,
      description: type.description || ''
    });
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      alert('Le nom du type de projet est requis');
      return;
    }

    if (!editingId) return;

    try {
      const result = await ProjectTypesApiService.updateProjectType(editingId, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });

      if (result.success) {
        await loadProjectTypes();
        setEditingId(null);
        setFormData({ name: '', description: '' });
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch (error: any) {
      alert('Erreur lors de la mise à jour: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de projet ?')) {
      return;
    }

    try {
      const result = await ProjectTypesApiService.deleteProjectType(id);
      if (result.success) {
        await loadProjectTypes();
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch (error: any) {
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  const handleManageTasks = (type: ProjectType) => {
    setManagingTasksId(type.id);
  };

  const handleAddTask = async () => {
    if (!taskFormData.title.trim()) {
      alert('Le titre de la tâche est requis');
      return;
    }

    if (!managingTasksId) return;

    try {
      const result = await ProjectTypesApiService.createDefaultTask(managingTasksId, {
        title: taskFormData.title.trim(),
        description: taskFormData.description.trim(),
        priority: taskFormData.priority,
        estimatedHours: taskFormData.estimatedHours || 0,
        orderIndex: taskFormData.orderIndex || 0
      });

      if (result.success) {
        await loadProjectTypes();
        setTaskFormData({
          id: '',
          title: '',
          description: '',
          priority: 'medium',
          estimatedHours: undefined,
          orderIndex: 0
        });
        setIsAddingTask(false);
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch (error: any) {
      alert('Erreur lors de la création de la tâche: ' + error.message);
    }
  };

  const handleEditTask = (task: DefaultTask) => {
    setEditingTaskId(task.id);
    setTaskFormData(task);
  };

  const handleUpdateTask = async () => {
    if (!taskFormData.title.trim()) {
      alert('Le titre de la tâche est requis');
      return;
    }

    if (!managingTasksId || !editingTaskId) return;

    try {
      const result = await ProjectTypesApiService.updateDefaultTask(
        managingTasksId,
        editingTaskId,
        {
          title: taskFormData.title.trim(),
          description: taskFormData.description.trim(),
          priority: taskFormData.priority,
          estimatedHours: taskFormData.estimatedHours || 0,
          orderIndex: taskFormData.orderIndex || 0
        }
      );

      if (result.success) {
        await loadProjectTypes();
        setTaskFormData({
          id: '',
          title: '',
          description: '',
          priority: 'medium',
          estimatedHours: undefined,
          orderIndex: 0
        });
        setEditingTaskId(null);
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch (error: any) {
      alert('Erreur lors de la mise à jour de la tâche: ' + error.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche par défaut ?')) {
      return;
    }

    if (!managingTasksId) return;

    try {
      const result = await ProjectTypesApiService.deleteDefaultTask(managingTasksId, taskId);
      if (result.success) {
        await loadProjectTypes();
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch (error: any) {
      alert('Erreur lors de la suppression de la tâche: ' + error.message);
    }
  };

  const handleCancelTask = () => {
    setIsAddingTask(false);
    setEditingTaskId(null);
    setTaskFormData({
      id: '',
      title: '',
      description: '',
      priority: 'medium',
      estimatedHours: undefined,
      orderIndex: 0
    });
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Types de Projets</h2>
          <p className="text-gray-400">Gérez les types de projets disponibles dans le système</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadProjectTypes}
            className="btn btn-secondary flex items-center"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Actualiser
          </button>
          {!isAdding && !editingId && (
            <button
              onClick={() => setIsAdding(true)}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Ajouter un type
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {isAdding ? 'Nouveau type de projet' : 'Modifier le type de projet'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom du type <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ex: Site Web / Application Web"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="Description du type de projet"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5 inline mr-2" />
                Annuler
              </button>
              <button
                onClick={isAdding ? handleAdd : handleUpdate}
                className="btn btn-primary"
              >
                <Save className="h-5 w-5 inline mr-2" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Types List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Tâches par défaut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date de création
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {projectTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    Aucun type de projet défini
                  </td>
                </tr>
              ) : (
                projectTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{type.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-400">{type.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleManageTasks(type)}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                        disabled={isAdding || !!editingId}
                      >
                        <ListChecks className="h-4 w-4 mr-2" />
                        {type.defaultTasks?.length || 0} tâche(s)
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {type.createdAt.toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(type)}
                        className="text-primary-400 hover:text-primary-300 mr-4"
                        disabled={isAdding || !!editingId}
                      >
                        <Edit className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="text-red-400 hover:text-red-300"
                        disabled={isAdding || !!editingId}
                      >
                        <Trash2 className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <p>Total: {projectTypes.length} type(s) de projet</p>
      </div>

      {/* Task Management Modal */}
      {managingTasksId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900">
              <div>
                <h3 className="text-xl font-bold text-white">Tâches par défaut</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {projectTypes.find(pt => pt.id === managingTasksId)?.name}
                </p>
              </div>
              <button
                onClick={() => setManagingTasksId(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Add/Edit Task Form */}
              {(isAddingTask || editingTaskId) && (
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-white mb-4">
                    {isAddingTask ? 'Nouvelle tâche par défaut' : 'Modifier la tâche'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Titre <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={taskFormData.title}
                        onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ex: Configuration initiale du projet"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={taskFormData.description}
                        onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={3}
                        placeholder="Description détaillée de la tâche"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Priorité
                        </label>
                        <select
                          value={taskFormData.priority}
                          onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as any })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="low">Faible</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Heures estimées
                        </label>
                        <input
                          type="number"
                          value={taskFormData.estimatedHours || ''}
                          onChange={(e) => setTaskFormData({ ...taskFormData, estimatedHours: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Ex: 8"
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={handleCancelTask}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="h-5 w-5 inline mr-2" />
                        Annuler
                      </button>
                      <button
                        onClick={isAddingTask ? handleAddTask : handleUpdateTask}
                        className="btn btn-primary"
                      >
                        <Save className="h-5 w-5 inline mr-2" />
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Task Button */}
              {!isAddingTask && !editingTaskId && (
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="w-full mb-6 py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-primary-500 transition-colors flex items-center justify-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ajouter une tâche par défaut
                </button>
              )}

              {/* Tasks List */}
              <div className="space-y-4">
                {projectTypes.find(pt => pt.id === managingTasksId)?.defaultTasks?.length === 0 ||
                 !projectTypes.find(pt => pt.id === managingTasksId)?.defaultTasks ? (
                  <div className="text-center py-12 text-gray-400">
                    <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune tâche par défaut définie</p>
                    <p className="text-sm mt-2">Ces tâches seront automatiquement créées pour chaque nouveau projet de ce type</p>
                  </div>
                ) : (
                  projectTypes.find(pt => pt.id === managingTasksId)?.defaultTasks?.map((task) => (
                    <div key={task.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h5 className="text-white font-medium">{task.title}</h5>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                              task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {task.priority === 'urgent' ? 'Urgente' :
                               task.priority === 'high' ? 'Haute' :
                               task.priority === 'medium' ? 'Moyenne' : 'Faible'}
                            </span>
                            {task.estimatedHours && (
                              <span className="text-xs text-gray-400">
                                {task.estimatedHours}h estimées
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-400">{task.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="text-primary-400 hover:text-primary-300"
                            disabled={isAddingTask || !!editingTaskId}
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-400 hover:text-red-300"
                            disabled={isAddingTask || !!editingTaskId}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTypesTab;
