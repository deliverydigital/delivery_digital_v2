import { useState, useEffect } from 'react';
import { ApiService, User, Project, Message, Client } from '../services/api';

// Hook pour l'authentification
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for current user on mount
    const checkCurrentUser = () => {
      const currentUser = ApiService.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    checkCurrentUser();

    // Listen for storage changes (in case user logs in from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken' || e.key === 'currentUser') {
        checkCurrentUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const result = await ApiService.login(email, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    setLoading(false);
    return result;
  };

  const register = async (userData: { name: string; email: string; company: string; password: string }) => {
    setLoading(true);
    const result = await ApiService.register(userData);
    if (result.success && result.user) {
      setUser(result.user);
    }
    setLoading(false);
    return result;
  };

  const logout = () => {
    ApiService.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!ApiService.getAuthToken(),
    isAdmin: user?.role === 'admin'
  };
};

// Hook pour les projets
export const useProjects = (clientId?: string) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = clientId 
        ? await ApiService.getClientProjects(clientId)
        : await ApiService.getAllProjects();
      setProjects(data);
    } catch (error) {
      alert(2)
      console.log('Erreur lors du chargement des projets:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (clientId) {
      loadProjects();
    } else {
      // For admin view, load all projects
      loadProjects();
    }
  }, [clientId]);

  const submitProject = async (projectData: {
    title: string;
    description: string;
    type: string;
    budget: string;
    timeline: string;
    figmaUrl?: string;
    gitlabUrl?: string;
    attachments: File[];
  }) => {
    const result = await ApiService.submitProject(projectData);
    if (result.success) {
      await loadProjects();
    }
    return result;
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    const result = await ApiService.updateProject(projectId, updates);
    if (result.success) {
      await loadProjects();
    }
    return result;
  };

  return {
    projects,
    loading,
    submitProject,
    updateProject,
    refreshProjects: loadProjects
  };
};

// Hook pour les messages
export const useMessages = (projectId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = projectId 
        ? await ApiService.getProjectMessages(projectId)
        : await ApiService.getAllMessages();
      setMessages(data);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
  }, [projectId]);

  const sendMessage = async (messageData: {
    projectId: string;
    content: string;
    attachments?: File[];
  }) => {
    const result = await ApiService.sendMessage(messageData);
    if (result.success) {
      await loadMessages();
    }
    return result;
  };

  const markAsRead = async (messageId: string) => {
    await ApiService.markMessageAsRead(messageId);
    await loadMessages();
  };

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    refreshMessages: loadMessages
  };
};

// Hook pour les clients (admin)
export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    const result = await ApiService.updateClient(clientId, updates);
    if (result.success) {
      await loadClients();
    }
    return result;
  };

  return {
    clients,
    loading,
    updateClient,
    refreshClients: loadClients
  };
};

// Hook pour les statistiques (admin)
export const useStatistics = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalProjects: 0,
    activeProjects: 0,
    pendingReviews: 0,
    unreadMessages: 0
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getStatistics();
      setStats(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  return {
    stats,
    loading,
    refreshStats: loadStats
  };
};