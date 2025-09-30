import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Filter, Plus, Eye, Reply, Trash2, RefreshCw,
  MessageCircle, Calendar, User, Building2, Clock, CheckCircle,
  AlertTriangle, Star, ChevronDown, ChevronUp, X, Send,
  FileText, ExternalLink, Paperclip, Mail
} from 'lucide-react';
import { useMessages } from '../../hooks/useApi';

const MessagesTab = () => {
  const { messages, loading, sendMessage, markAsRead, refreshMessages } = useMessages();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [replyText, setReplyText] = useState('');

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (message.subject && message.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'all' || message.messageType === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project': return 'bg-blue-100 text-blue-800';
      case 'support': return 'bg-green-100 text-green-800';
      case 'notification': return 'bg-yellow-100 text-yellow-800';
      case 'system': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-400';
      case 'normal': return 'text-gray-400';
      case 'high': return 'text-orange-400';
      case 'urgent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const openMessageModal = (message: any) => {
    setSelectedMessage(message);
    setShowModal(true);
    if (!message.isRead) {
      markAsRead(message.id);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMessage(null);
    setReplyText('');
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    
    try {
      await sendMessage({
        projectId: selectedMessage.projectId,
        content: replyText,
        attachments: []
      });
      setReplyText('');
      closeModal();
      refreshMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const MessageModal = () => {
    if (!selectedMessage) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">
                {selectedMessage.subject || 'Message'}
              </h3>
              <p className="text-gray-400 text-sm">
                De: {selectedMessage.senderName} • {new Date(selectedMessage.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>
            <button onClick={closeModal} className="text-gray-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300 whitespace-pre-wrap">{selectedMessage.content}</p>
            </div>

            {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-white mb-3">Pièces jointes</h4>
                <div className="space-y-2">
                  {selectedMessage.attachments.map((attachment: any, index: number) => (
                    <div key={index} className="flex items-center p-3 bg-gray-800 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-400 mr-3" />
                      <span className="text-gray-300 flex-1">{attachment.name}</span>
                      <button className="text-blue-400 hover:text-blue-300">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-lg font-medium text-white mb-3">Répondre</h4>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
                placeholder="Votre réponse..."
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="btn btn-primary"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestion des Messages</h2>
          <p className="text-gray-400">Gérez toutes les communications</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={refreshMessages}
            className="btn btn-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les messages..."
            className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="all">Tous les types</option>
          <option value="project">Projet</option>
          <option value="support">Support</option>
          <option value="notification">Notification</option>
          <option value="system">Système</option>
        </select>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Chargement des messages...</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun message trouvé</h3>
          <p className="text-gray-400">
            {searchQuery || selectedType !== 'all'
              ? 'Aucun message ne correspond aux critères de recherche.'
              : 'Aucun message n\'a été reçu.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer ${
                !message.isRead ? 'border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => openMessageModal(message)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-white font-medium">
                      {message.subject || 'Sans sujet'}
                    </h4>
                    {!message.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                    <span className={`px-2 py-1 rounded text-xs ${getTypeColor(message.messageType)}`}>
                      {message.messageType}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                    {message.content}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>De: {message.senderName}</span>
                    <span>{new Date(message.createdAt).toLocaleDateString('fr-FR')}</span>
                    <span className={getPriorityColor(message.priority)}>
                      {message.priority}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openMessageModal(message);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                    title="Voir le message"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openMessageModal(message);
                    }}
                    className="text-green-400 hover:text-green-300"
                    title="Répondre"
                  >
                    <Reply className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message Modal */}
      {showModal && <MessageModal />}
    </div>
  );
};

export default MessagesTab;