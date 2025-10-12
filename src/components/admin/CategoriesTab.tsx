import { useState } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';

const CategoriesTab = () => {
  const [categories] = useState([
    { id: '1', name: 'Développement Web', color: '#3B82F6', projectsCount: 12 },
    { id: '2', name: 'Applications Mobiles', color: '#10B981', projectsCount: 8 },
    { id: '3', name: 'E-commerce', color: '#F59E0B', projectsCount: 15 },
    { id: '4', name: 'Cloud & Infrastructure', color: '#8B5CF6', projectsCount: 5 }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Catégories de Projets</h2>
        <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Catégorie
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(category => (
          <div key={category.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-primary-500 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: category.color }}
                ></div>
                <h3 className="text-lg font-semibold text-white">{category.name}</h3>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <span>{category.projectsCount} projets</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-700">
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                <Edit className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesTab;
