import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3008';

export interface DefaultTask {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectType {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  defaultTasks?: DefaultTask[];
  createdAt?: string;
  updatedAt?: string;
}

class ProjectTypesApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async getAllProjectTypes(): Promise<{ success: boolean; data?: ProjectType[]; error?: string }> {
    try {
      const response = await axios.get(`${API_URL}/api/project-types`, {
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error fetching project types:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch project types'
      };
    }
  }

  async getProjectType(id: string): Promise<{ success: boolean; data?: ProjectType; error?: string }> {
    try {
      const response = await axios.get(`${API_URL}/api/project-types/${id}`, {
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error fetching project type:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch project type'
      };
    }
  }

  async createProjectType(data: { name: string; description?: string }): Promise<{ success: boolean; data?: ProjectType; error?: string }> {
    try {
      const response = await axios.post(`${API_URL}/api/project-types`, data, {
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error creating project type:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create project type'
      };
    }
  }

  async updateProjectType(id: string, data: { name: string; description?: string }): Promise<{ success: boolean; data?: ProjectType; error?: string }> {
    try {
      const response = await axios.put(`${API_URL}/api/project-types/${id}`, data, {
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error updating project type:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update project type'
      };
    }
  }

  async deleteProjectType(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.delete(`${API_URL}/api/project-types/${id}`, {
        headers: this.getAuthHeaders()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting project type:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete project type'
      };
    }
  }

  async createDefaultTask(
    projectTypeId: string,
    data: {
      title: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      estimatedHours?: number;
      orderIndex?: number;
    }
  ): Promise<{ success: boolean; data?: DefaultTask; error?: string }> {
    try {
      const response = await axios.post(
        `${API_URL}/api/project-types/${projectTypeId}/tasks`,
        data,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error creating default task:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create default task'
      };
    }
  }

  async updateDefaultTask(
    projectTypeId: string,
    taskId: string,
    data: {
      title: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      estimatedHours?: number;
      orderIndex?: number;
    }
  ): Promise<{ success: boolean; data?: DefaultTask; error?: string }> {
    try {
      const response = await axios.put(
        `${API_URL}/api/project-types/${projectTypeId}/tasks/${taskId}`,
        data,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error updating default task:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update default task'
      };
    }
  }

  async deleteDefaultTask(projectTypeId: string, taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.delete(`${API_URL}/api/project-types/${projectTypeId}/tasks/${taskId}`, {
        headers: this.getAuthHeaders()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting default task:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete default task'
      };
    }
  }
}

export default new ProjectTypesApiService();
