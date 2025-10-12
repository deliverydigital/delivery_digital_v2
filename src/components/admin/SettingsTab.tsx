import { Save } from 'lucide-react';

const SettingsTab = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Paramètres</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Informations de compte</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nom
              </label>
              <input
                type="text"
                defaultValue="Admin User"
                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              <input
                type="email"
                defaultValue="admin@deliverydigital.com"
                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
            <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Nouveaux projets</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Nouveaux messages</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Mises à jour de tâches</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
            <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
