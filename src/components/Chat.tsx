import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Paperclip, Image as ImageIcon, FileText, Download } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'service';
  content: string;
  timestamp: Date;
  attachments?: {
    name: string;
    type: string;
    url: string;
  }[];
}

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

const Chat = ({ isOpen, onClose, projectId }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Simulate loading initial messages
    setMessages([
      {
        id: '1',
        sender: 'service',
        content: 'Bonjour ! Comment puis-je vous aider avec votre projet ?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && files.length === 0) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: newMessage,
      timestamp: new Date(),
      attachments: files.map(file => ({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file)
      }))
    };

    setMessages(prev => [...prev, newUserMessage]);
    setNewMessage('');
    setFiles([]);

    // Simulate service response
    setTimeout(() => {
      const serviceResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'service',
        content: 'Merci pour votre message. Un membre de notre équipe vous répondra dans les plus brefs délais.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, serviceResponse]);
    }, 1000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Discussion</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${
                message.sender === 'user' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-800 text-gray-100'
              } rounded-lg p-3`}>
                <p className="text-sm">{message.content}</p>
                
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center bg-black/20 rounded p-2"
                      >
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="h-4 w-4 mr-2" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        <span className="text-xs flex-1 truncate">{file.name}</span>
                        <a
                          href={file.url}
                          download={file.name}
                          className="ml-2 text-primary-300 hover:text-primary-200"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-1 text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-800">
          {files.length > 0 && (
            <div className="mb-4 space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-800 rounded p-2"
                >
                  <div className="flex items-center">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-primary-400 mr-2" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary-400 mr-2" />
                    )}
                    <span className="text-sm text-gray-300 truncate">
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-white ml-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*,.pdf,.doc,.docx"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-white p-2"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Votre message..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>

            <button
              type="submit"
              className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              disabled={!newMessage.trim() && files.length === 0}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;