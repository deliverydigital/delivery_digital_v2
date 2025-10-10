import { useState, useEffect } from 'react';
import { ApiService, User, Project, Message, Client } from '../services/api';

// Initialize demo projects
const initializeDemoProjects = () => {
  const existingProjects = localStorage.getItem('demoProjects');
  if (!existingProjects) {
    const demoProjects = [
      {
        id: 'project-1',
        clientId: 'client-1',
        clientName: 'Marie Dupont',
        title: 'Site E-commerce Boutique Mode',
        description: 'Création d\'un site e-commerce complet avec catalogue produits, panier, paiement sécurisé et gestion des commandes.',
        type: 'web',
        status: 'in_progress',
        priority: 'high',
        budget: 'medium',
        timeline: 'normal',
        submittedAt: new Date('2024-01-15'),
        lastUpdate: new Date('2024-01-28'),
        attachments: [
          { name: 'maquettes-boutique.pdf', type: 'application/pdf', url: '#' },
          { name: 'logo-boutique.png', type: 'image/png', url: '#' }
        ],
        figmaUrl: 'https://figma.com/design/boutique-mode',
        gitlabUrl: '',
        notes: 'Projet prioritaire avec deadline serrée'
      },
      {
        id: 'project-2',
        clientId: 'client-1',
        clientName: 'Marie Dupont',
        title: 'Application Mobile Livraison',
        description: 'Application mobile de livraison de repas avec géolocalisation, suivi en temps réel et paiement intégré.',
        type: 'mobile',
        status: 'reviewing',
        priority: 'medium',
        budget: 'large',
        timeline: 'flexible',
        submittedAt: new Date('2024-01-20'),
        lastUpdate: new Date('2024-01-25'),
        attachments: [
          { name: 'specifications-mobile.pdf', type: 'application/pdf', url: '#' },
          { name: 'wireframes.sketch', type: 'application/sketch', url: '#' }
        ],
        figmaUrl: 'https://figma.com/design/app-livraison',
        gitlabUrl: '',
        notes: 'En attente de validation des spécifications techniques'
      },
      {
        id: 'project-3',
        clientId: 'client-1',
        clientName: 'Marie Dupont',
        title: 'Système de Gestion Interne',
        description: 'Développement d\'un ERP sur mesure pour la gestion des stocks, commandes et facturation.',
        type: 'enterprise',
        status: 'submitted',
        priority: 'low',
        budget: 'enterprise',
        timeline: 'longterm',
        submittedAt: new Date('2024-01-25'),
        lastUpdate: new Date('2024-01-25'),
        attachments: [
          { name: 'cahier-charges-erp.pdf', type: 'application/pdf', url: '#' }
        ],
        figmaUrl: '',
        gitlabUrl: '',
        notes: 'Projet à long terme, analyse des besoins en cours'
      }
    ];
    
    localStorage.setItem('demoProjects', JSON.stringify(demoProjects));
  }
};

// Initialize demo projects on module load
initializeDemoProjects();

// Hook pour l'authentification
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);

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

    // Listen for custom auth events
    const handleAuthChange = () => {
      checkCurrentUser();
      setForceUpdate(prev => prev + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const result = await ApiService.login(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      // Dispatch auth state change event
      window.dispatchEvent(new CustomEvent('authStateChanged'));
    }
    setLoading(false);
    return result;
  };

  const register = async (userData: { name: string; email: string; company: string; password: string }) => {
    setLoading(true);
    console.log('🔄 useAuth register called with:', { ...userData, password: '[HIDDEN]' });
    
    const result = await ApiService.register(userData);
    console.log('📊 Registration result:', { success: result.success, error: result.error });
    
    if (result.success && result.user) {
      console.log('✅ Setting user in useAuth:', result.user);
      setUser(result.user);
      // Dispatch auth state change event
      window.dispatchEvent(new CustomEvent('authStateChanged'));
    } else {
      console.error('❌ Registration failed in useAuth:', result.error);
    }
    setLoading(false);
    return result;
  };

  const logout = () => {
    ApiService.logout();
    setUser(null);
    // Dispatch auth state change event
    window.dispatchEvent(new CustomEvent('authStateChanged'));
  };

  const forgotPassword = async (email: string) => {
    const result = await ApiService.forgotPassword(email);
    return result;
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    isAuthenticated: !!user && !!ApiService.getAuthToken(),
    isAdmin: user?.role === 'admin',
    isProjectManager: user?.role === 'project_manager'
  };
};

// Hook pour les projets
export const useProjects = (clientId?: string, page: number = 1, limit: number = 10) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const loadProjects = async () => {
    // Check if user is authenticated before making API calls
    const token = ApiService.getAuthToken();
    const currentUser = ApiService.getCurrentUser();
    
    if (!token || !currentUser) {
      console.log('🔒 User not authenticated, skipping API call');
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let data;
      let paginationData;
      if (clientId) {
        data = await ApiService.getClientProjects(clientId, page, limit);
      } else {
        // For admin view, load all projects
        const response = await ApiService.getAllProjects(page, limit);
        data = response.projects || response;
        paginationData = response.pagination;
      }
      setProjects(data);
      if (paginationData) {
        setPagination(paginationData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
      // Set empty array on error to prevent infinite loading
      setProjects([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Only load projects if we have authentication
    const token = ApiService.getAuthToken();
    const currentUser = ApiService.getCurrentUser();
    
    if (token && currentUser) {
      loadProjects();
    } else {
      console.log('🔒 No authentication found, not loading projects');
      setProjects([]);
      setLoading(false);
    }

    const handleRefreshProjects = () => loadProjects();

    window.addEventListener('refreshProjects', handleRefreshProjects);
    return () => window.removeEventListener('refreshProjects', handleRefreshProjects);
  }, [clientId, page, limit, ApiService.getAuthToken()]);

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
    // Check authentication before submitting
    const token = ApiService.getAuthToken();
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    const result = await ApiService.submitProject(projectData);
    if (result.success) {
      await loadProjects();
    }
    return result;
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    // Check authentication before updating
    const token = ApiService.getAuthToken();
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    const result = await ApiService.updateProject(projectId, updates);
    if (result.success) {
      await loadProjects();
    }
    return result;
  };

  return {
    projects,
    pagination,
    loading,
    submitProject,
    updateProject,
    refreshProjects: loadProjects,
    loadPage: (newPage: number) => loadProjects()
  };
};

// Hook pour les messages
export const useMessages = (projectId?: string, userRole?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    setLoading(true);
    try {
      let data;
      if (projectId) {
        data = await ApiService.getProjectMessages(projectId);
      } else if (userRole === 'admin') {
        data = await ApiService.getAllMessages();
      } else {
        // For non-admin users without a specific project, return empty array
        data = [];
      }
      setMessages(data);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      setMessages([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
  }, [projectId, userRole]);

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