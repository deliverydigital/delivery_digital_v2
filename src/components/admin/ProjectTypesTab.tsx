import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface ProjectType {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

const ProjectTypesTab = () => {
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadProjectTypes();
  }, []);

  const loadProjectTypes = () => {
    const stored = localStorage.getItem('projectTypes');
    if (stored) {
      const types = JSON.parse(stored);
      setProjectTypes(types.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt)
      })));
    } else {
      const defaultTypes: ProjectType[] = [
        { id: '1', name: 'Site Web / Application Web', description: 'Développement de sites web et applications web', createdAt: new Date() },
        { id: '2', name: 'Application Mobile', description: 'Développement d\'applications mobiles iOS et Android', createdAt: new Date() },
        { id: '3', name: 'E-commerce', description: 'Boutiques en ligne et plateformes de vente', createdAt: new Date() },
        { id: '4', name: 'Application Desktop', description: 'Applications de bureau multi-plateformes', createdAt: new Date() },
        { id: '5', name: 'API / Backend', description: 'Services backend et APIs REST/GraphQL', createdAt: new Date() },
        { id: '6', name: 'Formation', description: 'Programmes de formation et cours', createdAt: new Date() },
        { id: '7', name: 'Consulting', description: 'Services de conseil et expertise technique', createdAt: new Date() }
      ];
      setProjectTypes(defaultTypes);
      localStorage.setItem('projectTypes', JSON.stringify(defaultTypes));
    }
  };

  const saveProjectTypes = (types: ProjectType[]) => {
    localStorage.setItem('projectTypes', JSON.stringify(types));
    setProjectTypes(types);
  };

  const handleAdd = () => {
    if (!formData.name.trim()) {
      alert('Le nom du type de projet est requis');
      return;
    }

    const newType: ProjectType = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      createdAt: new Date()
    };

    saveProjectTypes([...projectTypes, newType]);
    setFormData({ name: '', description: '' });
    setIsAdding(false);
  };

  const handleEdit = (type: ProjectType) => {
    setEditingId(type.id);
    setFormData({
      name: type.name,
      description: type.description || ''
    });
  };

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      alert('Le nom du type de projet est requis');
      return;
    }

    const updated = projectTypes.map(type =>
      type.id === editingId
        ? { ...type, name: formData.name.trim(), description: formData.description.trim() }
        : type
    );

    saveProjectTypes(updated);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce type de projet ?')) {
      const filtered = projectTypes.filter(type => type.id !== id);
      saveProjectTypes(filtered);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Types de Projets</h2>
          <p className="text-gray-400">Gérez les types de projets disponibles dans le système</p>
        </div>
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
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
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
    </div>
  );
};

export default ProjectTypesTab;
