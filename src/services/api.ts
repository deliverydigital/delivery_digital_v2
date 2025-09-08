// API Service pour gérer les communications client-admin
export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  joinDate: Date;
  projectsCount: number;
  status: 'active' | 'inactive' | 'pending';
  lastActivity: Date;
}

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  type: string;
  budget: string;
  timeline: string;
  status: 'submitted' | 'reviewing' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedAt: Date;
  lastUpdate: Date;
  attachments: {
    name: string;
    type: string;
    url: string;
  }[];
  figmaUrl?: string;
  gitlabUrl?: string;
  notes: string;
  estimatedHours?: number;
  assignedTo?: string;
}

export interface Message {
  id: string;
  projectId: string;
  clientId: string;
  sender: 'client' | 'admin';
  content: string;
  timestamp: Date;
  read: boolean;
  attachments?: {
    name: string;
    type: string;
    url: string;
  }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  role: 'client' | 'admin' | 'trainer' | 'developer';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  isAuthenticated: boolean;
}

// Get API base URL from environment
const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3008';
};

// API Service
export class ApiService {
  static getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private static setAuthToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  private static removeAuthToken(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }

  private static async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const token = this.getAuthToken();
    const baseUrl = getApiBaseUrl();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
      'bypass-tunnel-reminder' :'true'
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/api${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  static async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.token && response.user) {
        this.setAuthToken(response.token);
        const user: User = {
          ...response.user,
          isAuthenticated: true
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
        return { success: true, user };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  static async register(userData: { name: string; email: string; company: string; password: string }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (response.token && response.user) {
        this.setAuthToken(response.token);
        const user: User = {
          ...response.user,
          isAuthenticated: true
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
        return { success: true, user };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  }

  static logout(): void {
    this.removeAuthToken();
  }

  static getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('currentUser');
      const token = this.getAuthToken();
      
      if (!userStr || !token) {
        return null;
      }

      const user = JSON.parse(userStr);
      return { ...user, isAuthenticated: true };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Projects
  static async submitProject(projectData: {
    title: string;
    description: string;
    type: string;
    budget: string;
    timeline: string;
    figmaUrl?: string;
    gitlabUrl?: string;
    attachments: File[];
  }): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('title', projectData.title);
      formData.append('description', projectData.description);
      formData.append('type', projectData.type);
      formData.append('budget_range', projectData.budget);
      formData.append('timeline', projectData.timeline);
      
      if (projectData.figmaUrl) {
        formData.append('figma_url', projectData.figmaUrl);
      }
      if (projectData.gitlabUrl) {
        formData.append('gitlab_url', projectData.gitlabUrl);
      }

      projectData.attachments.forEach((file, index) => {
        formData.append(`attachments`, file);
      });

      const token = this.getAuthToken();
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, project: result.project };
    } catch (error) {
      console.error('Submit project error:', error);
      return { success: false, error: error.message || 'Failed to submit project' };
    }
  }

  static async getClientProjects(clientId: string): Promise<Project[]> {
    try {
      const response = await this.makeRequest(`/projects/client/${clientId}`);
      return response.projects || [];
    } catch (error) {
      console.error('Error fetching client projects:', error);
      return [];
    }
  }

  static async getAllProjects(): Promise<Project[]> {
    try {
      const response = await this.makeRequest('/projects');
      return response.projects || [];
    } catch (error) {
      console.error('Error fetching all projects:', error);
      return [];
    }
  }

  static async updateProject(projectId: string, updates: Partial<Project>): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const response = await this.makeRequest(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return { success: true, project: response.project };
    } catch (error) {
      console.error('Update project error:', error);
      return { success: false, error: error.message || 'Failed to update project' };
    }
  }

  // Messages
  static async sendMessage(messageData: {
    projectId: string;
    content: string;
    attachments?: File[];
  }): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('project_id', messageData.projectId);
      formData.append('content', messageData.content);

      messageData.attachments?.forEach((file) => {
        formData.append('attachments', file);
      });

      const token = this.getAuthToken();
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Send message error:', error);
      return { success: false, error: error.message || 'Failed to send message' };
    }
  }

  static async getProjectMessages(projectId: string): Promise<Message[]> {
    try {
      const response = await this.makeRequest(`/messages/project/${projectId}`);
      return response.messages || [];
    } catch (error) {
      console.error('Error fetching project messages:', error);
      return [];
    }
  }

  static async getAllMessages(): Promise<Message[]> {
    try {
      const response = await this.makeRequest('/messages');
      return response.messages || [];
    } catch (error) {
      console.error('Error fetching all messages:', error);
      return [];
    }
  }

  static async markMessageAsRead(messageId: string): Promise<void> {
    try {
      await this.makeRequest(`/messages/${messageId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  // Clients (pour admin)
  static async getAllClients(): Promise<Client[]> {
    try {
      const response = await this.makeRequest('/users/clients');
      return response.clients || [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  }

  static async updateClient(clientId: string, updates: Partial<Client>): Promise<{ success: boolean; client?: Client; error?: string }> {
    try {
      const response = await this.makeRequest(`/users/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return { success: true, client: response.user };
    } catch (error) {
      console.error('Update client error:', error);
      return { success: false, error: error.message || 'Failed to update client' };
    }
  }

  // Statistics (pour admin)
  static async getStatistics(): Promise<{
    totalClients: number;
    activeClients: number;
    totalProjects: number;
    activeProjects: number;
    pendingReviews: number;
    unreadMessages: number;
  }> {
    try {
      const response = await this.makeRequest('/analytics/dashboard');
      return response.stats || {
        totalClients: 0,
        activeClients: 0,
        totalProjects: 0,
        activeProjects: 0,
        pendingReviews: 0,
        unreadMessages: 0
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        totalClients: 0,
        activeClients: 0,
        totalProjects: 0,
        activeProjects: 0,
        pendingReviews: 0,
        unreadMessages: 0
      };
    }
  }
}