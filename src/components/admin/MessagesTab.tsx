import { useState } from 'react';
import { Send, Search, Mail, User, Clock } from 'lucide-react';

const MessagesTab = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const messages = [
    {
      id: '1',
      from: 'Marie Dupont',
      subject: 'Question sur le projet e-commerce',
      preview: 'Bonjour, aimerais avoir des précisions sur',
      time: 'Il y a 2h',
      unread: true
    },
    {
      id: '2',
      from: 'Jean Martin',
      subject: 'Demande de devis',
      preview: 'Pourriez-vous me faire parvenir un devis pour',
      time: 'Hier',
      unread: false
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Messagerie</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un message..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {messages.map(message => (
            <div
              key={message.id}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                message.unread
                  ? 'bg-gray-800 border-primary-500'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-2" />
                  <span className={`text-sm ${message.unread ? 'font-semibold text-white' : 'text-gray-400'}`}>
                    {message.from}
                  </span>
                </div>
                {message.unread && (
                  <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                )}
              </div>
              <h3 className={`text-sm mb-1 ${message.unread ? 'font-medium text-white' : 'text-gray-300'}`}>
                {message.subject}
              </h3>
              <p className="text-xs text-gray-500 truncate mb-2">{message.preview}</p>
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                {message.time}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="h-full flex flex-col">
            <div className="flex-1 mb-4">
              <p className="text-gray-400 text-center py-12">
                Sélectionnez un message pour le lire
              </p>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Écrire un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-primary-500"
                />
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;
