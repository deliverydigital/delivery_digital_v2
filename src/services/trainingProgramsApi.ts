// API Service for training programs management

// Get API base URL from environment
const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || '';
};

export interface TrainingProgram {
  id: string;
  name: string;
  program_id: string;
  title: string;
  description: string;
  category: string;
  duration_hours: number;
  price: number;
  level: string;
  max_participants: number;
  prerequisites?: string;
  objectives: string[];
  methods: string[];
  evaluation_methods: string[];
  accessibility_info?: string;
  access_delay?: string;
  is_active: boolean;
  is_featured?: boolean;
  opco_eligible?: boolean;
  cpf_eligible?: boolean;
  certification_type?: string;
  certification_provider?: string;
  modules: {
    title: string;
    duration_hours: number;
    topics: string[];
    order: number;
  }[];
  documents: {
    id: string;
    title: string;
    description?: string;
    document_type: string;
    file_size: number;
    download_count: number;
    uploaded_at: Date;
    download_url: string;
  }[];
  created_at: Date;
  updated_at: Date;
}

// Helper function to make API requests
const makeRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem('authToken');
  const baseUrl = getApiBaseUrl();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
    'bypass-tunnel-reminder': 'true'
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
};

// Training Programs API Service
export class TrainingProgramsApiService {
  // Get all training programs
  static async getAllPrograms(filters?: {
    category?: string;
    search?: string;
    active_only?: boolean;
  }): Promise<TrainingProgram[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.active_only !== undefined) params.append('active_only', filters.active_only.toString());

      try {
        const response = await makeRequest(`/training-programs?${params.toString()}`);
        
        if (response.data && response.data.programs) {
          return response.data.programs.map((program: any) => ({
            ...program,
            created_at: program.created_at ? new Date(program.created_at) : new Date(),
            updated_at: program.updated_at ? new Date(program.updated_at) : new Date(),
            documents: (program.documents || []).map((doc: any) => ({
              ...doc,
              uploaded_at: doc.uploaded_at ? new Date(doc.uploaded_at) : new Date()
            }))
          }));
        }
        
        // If API call fails but returns data, use fallback
        if (response.data && response.data.programs) {
          return response.data.programs;
        }
        
        // Return fallback data
        return this.getFallbackPrograms();
      } catch (apiError) {
        console.log('API endpoint not available, using fallback data');
        return this.getFallbackPrograms();
      }
    } catch (error) {
      console.error('Error fetching training programs:', error);
      return this.getFallbackPrograms();
    }
  }

  // Fallback data when API is not available
  private static getFallbackPrograms(): TrainingProgram[] {
    return [];
  }

  // Get single training program
  static async getProgram(programId: string): Promise<TrainingProgram | null> {
    try {
      try {
        const response = await makeRequest(`/training-programs/${programId}`);
        
        if (response.success && response.data.program) {
          const program = response.data.program;
          return {
            ...program,
            created_at: new Date(program.created_at),
            updated_at: new Date(program.updated_at),
            documents: (program.documents || []).map((doc: any) => ({
              ...doc,
              uploaded_at: new Date(doc.uploaded_at)
            }))
          };
        }
        
        return null;
      } catch (apiError) {
        console.log('API endpoint not available for single program');
        return null;
      }
    } catch (error) {
      console.error('Error fetching training program:', error);
      return null;
    }
  }

  // Get documents for a training program
  static async getProgramDocuments(programId: string): Promise<TrainingProgram['documents']> {
    try {
      try {
        const response = await makeRequest(`/training-programs/${programId}/documents`);
        
        if (response.success && response.data.documents) {
          return response.data.documents.map((doc: any) => ({
            ...doc,
            uploaded_at: new Date(doc.uploaded_at)
          }));
        }
        
        return [];
      } catch (apiError) {
        console.log('API endpoint not available for program documents');
        return [];
      }
    } catch (error) {
      console.error('Error fetching program documents:', error);
      return [];
    }
  }

  // Create new training program (admin only)
  static async createProgram(programData: {
    program_id: string;
    title: string;
    description: string;
    category: string;
    duration_hours: number;
    price: number;
    level?: string;
    max_participants?: number;
    prerequisites?: string;
    objectives?: string[];
    methods?: string[];
    evaluation_methods?: string[];
    accessibility_info?: string;
    access_delay?: string;
    modules?: any[];
  }): Promise<{ success: boolean; program?: TrainingProgram; error?: string }> {
    try {
      const response = await makeRequest('/training-programs', {
        method: 'POST',
        body: JSON.stringify(programData),
      });

      if (response.success) {
        return { 
          success: true, 
          program: {
            ...response.data.program,
            created_at: new Date(response.data.program.created_at),
            updated_at: new Date(response.data.program.updated_at)
          }
        };
      }
      
      return { success: false, error: 'Failed to create program' };
    } catch (error) {
      console.error('Create program error:', error);
      return { success: false, error: error.message || 'Failed to create program' };
    }
  }

  // Upload document to training program (admin only)
  static async uploadDocument(programId: string, documentData: {
    title: string;
    description?: string;
    document_type?: string;
    files: File[];
  }): Promise<{ success: boolean; documents?: any[]; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('title', documentData.title);
      
      if (documentData.description) {
        formData.append('description', documentData.description);
      }
      if (documentData.document_type) {
        formData.append('document_type', documentData.document_type);
      }

      documentData.files.forEach((file) => {
        formData.append('training_materials', file);
      });

      const token = localStorage.getItem('authToken');
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/training-programs/${programId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { 
        success: true, 
        documents: result.data.uploaded_documents
      };
    } catch (error) {
      console.error('Upload document error:', error);
      return { success: false, error: error.message || 'Failed to upload document' };
    }
  }

  // Update training program (admin only)
  static async updateProgram(programId: string, updates: Partial<TrainingProgram>): Promise<{ success: boolean; program?: TrainingProgram; error?: string }> {
    try {
      const response = await makeRequest(`/training-programs/${programId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (response.success) {
        return { 
          success: true, 
          program: {
            ...response.data.program,
            created_at: new Date(response.data.program.created_at),
            updated_at: new Date(response.data.program.updated_at)
          }
        };
      }
      
      return { success: false, error: 'Failed to update program' };
    } catch (error) {
      console.error('Update program error:', error);
      return { success: false, error: error.message || 'Failed to update program' };
    }
  }

  // Delete training program (admin only)
  static async deleteProgram(programId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await makeRequest(`/training-programs/${programId}`, {
        method: 'DELETE',
      });
      
      return { success: true };
    } catch (error) {
      console.error('Delete program error:', error);
      return { success: false, error: error.message || 'Failed to delete program' };
    }
  }

  // Delete document from training program (admin only)
  static async deleteDocument(programId: string, documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await makeRequest(`/training-programs/${programId}/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      return { success: true };
    } catch (error) {
      console.error('Delete document error:', error);
      return { success: false, error: error.message || 'Failed to delete document' };
    }
  }

  // Download document (public)
  static downloadDocument(documentId: string, programId: string): void {
    const baseUrl = getApiBaseUrl();
    const downloadUrl = `${baseUrl}/api/training-programs/${programId}/documents/${documentId}/download`;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Get training program statistics (admin only)
  static async getProgramStatistics(): Promise<{
    total_programs: number;
    active_programs: number;
    total_documents: number;
    total_downloads: number;
    programs_by_category: { [category: string]: number };
    popular_programs: { program_id: string; title: string; total_downloads: number }[];
    average_price: number;
  }> {
    try {
      const response = await makeRequest('/training-programs/stats/overview');
      
      if (response.success && response.data.stats) {
        return response.data.stats;
      }
      
      return {
        total_programs: 0,
        active_programs: 0,
        total_documents: 0,
        total_downloads: 0,
        programs_by_category: {},
        popular_programs: [],
        average_price: 0
      };
    } catch (error) {
      console.error('Error fetching program statistics:', error);
      return {
        total_programs: 0,
        active_programs: 0,
        total_documents: 0,
        total_downloads: 0,
        programs_by_category: {},
        popular_programs: [],
        average_price: 0
      };
    }
  }
}

export default TrainingProgramsApiService;