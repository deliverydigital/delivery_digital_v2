import { useState } from 'react';
import { Plus, Search, Mail, Phone, Eye, Edit, Trash2, Building } from 'lucide-react';

const ClientsTab = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const clients = [
    {
      id: '1',
      name: 'Marie Dupont',
      email: 'marie.dupont@example.com',
      phone: '+33 6 12 34 56 78',
      company: 'ModeFashion SAS',
      projectsCount: 3,
      totalSpent: 85000,
      status: 'active'
    },
    {
      id: '2',
      name: 'Jean Martin',
      email: 'jean.martin@example.com',
      phone: '+33 6 98 76 54 32',
      company: 'TechStart',
      projectsCount: 1,
      totalSpent: 28000,
      status: 'active'
    }
  ];

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Gestion des Clients</h2>
        <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"
        />
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Projets</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredClients.map(client => (
              <tr key={client.id} className="hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-white">{client.name}</div>
                    <div className="text-sm text-gray-400 flex items-center mt-1">
                      <Building className="h-3 w-3 mr-1" />
                      {client.company}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-400 flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {client.email}
                    </div>
                    <div className="text-sm text-gray-400 flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      {client.phone}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white">{client.projectsCount}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white font-medium">
                    {client.totalSpent.toLocaleString('fr-FR')} €
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="text-gray-400 hover:text-white">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-white">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsTab;
