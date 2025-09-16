// API Service for training document management

// Get API base URL from environment
const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || '';
};

export interface TrainingDocument {
  id: string;
  program_id: string;
  program_name: string;
  title: string;
  description?: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  download_count: number;
  category: 'program' | 'guide' | 'certificate' | 'evaluation' | 'other';
  tags: string[];
  version: string;
  uploaded_by?: string;
  created_at: Date;
  download_url: string;
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

// Training Documents API Service
export class TrainingDocumentsApiService {
  // Get documents for a specific training program
  static async getProgramDocuments(programId: string): Promise<TrainingDocument[]> {
    try {
      const response = await makeRequest(`/training/documents/${programId}`);
      
      if (response.success && response.data.documents) {
        return response.data.documents.map((doc: any) => ({
          ...doc,
          created_at: new Date(doc.created_at)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching program documents:', error);
      // Return fallback data for demo
      return this.getFallbackDocuments(programId);
    }
  }

  // Get all training documents (admin only)
  static async getAllDocuments(filters?: {
    program_id?: string;
    category?: string;
    search?: string;
  }): Promise<TrainingDocument[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.program_id) params.append('program_id', filters.program_id);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);

      const response = await makeRequest(`/training/documents?${params.toString()}`);
      
      if (response.success && response.data.documents) {
        return response.data.documents.map((doc: any) => ({
          ...doc,
          created_at: new Date(doc.created_at)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching all documents:', error);
      return [];
    }
  }

  // Upload training document (admin only)
  static async uploadDocument(documentData: {
    program_id: string;
    program_name: string;
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    version?: string;
    files: File[];
  }): Promise<{ success: boolean; documents?: TrainingDocument[]; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('program_id', documentData.program_id);
      formData.append('program_name', documentData.program_name);
      formData.append('title', documentData.title);
      
      if (documentData.description) {
        formData.append('description', documentData.description);
      }
      if (documentData.category) {
        formData.append('category', documentData.category);
      }
      if (documentData.tags) {
        formData.append('tags', documentData.tags.join(','));
      }
      if (documentData.version) {
        formData.append('version', documentData.version);
      }

      documentData.files.forEach((file) => {
        formData.append('training_materials', file);
      });

      const token = localStorage.getItem('authToken');
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/training/documents`, {
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
        documents: result.data.documents.map((doc: any) => ({
          ...doc,
          created_at: new Date(doc.created_at)
        }))
      };
    } catch (error) {
      console.error('Upload document error:', error);
      return { success: false, error: error.message || 'Failed to upload document' };
    }
  }

  // Delete training document (admin only)
  static async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await makeRequest(`/training/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      return { success: true };
    } catch (error) {
      console.error('Delete document error:', error);
      return { success: false, error: error.message || 'Failed to delete document' };
    }
  }

  // Download document (public)
  static downloadDocument(documentId: string): void {
    const baseUrl = getApiBaseUrl();
    // This method should not be used for training program documents
    // Use TrainingProgramsApiService.downloadDocument instead
    console.warn('TrainingDocumentsApiService.downloadDocument is deprecated for training program documents');
    
    // Create a temporary link and trigger download
    // const link = document.createElement('a');
    // link.href = downloadUrl;
    // link.style.display = 'none';
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
  }

  // Fallback data for demo purposes
  private static getFallbackDocuments(programId: string): TrainingDocument[] {
    const fallbackData: { [key: string]: TrainingDocument[] } = {
      'wordpress': [
        {
          id: 'doc-wp-1',
          program_id: 'wordpress',
          program_name: 'WordPress',
          title: 'Programme détaillé WordPress',
          description: 'Programme complet de la formation WordPress',
          filename: 'wordpress-program.pdf',
          original_name: 'wordpress-program.pdf',
          file_type: 'application/pdf',
          file_size: 1024000,
          download_count: 45,
          category: 'program',
          tags: ['wordpress', 'cms', 'web'],
          version: '1.0',
          uploaded_by: 'Admin',
          created_at: new Date('2024-01-15'),
          download_url: '#'
        },
        {
          id: 'doc-wp-2',
          program_id: 'wordpress',
          program_name: 'WordPress',
          title: 'Guide d\'installation',
          description: 'Guide pas à pas pour installer WordPress',
          filename: 'wordpress-installation.pdf',
          original_name: 'wordpress-installation.pdf',
          file_type: 'application/pdf',
          file_size: 512000,
          download_count: 32,
          category: 'guide',
          tags: ['wordpress', 'installation', 'guide'],
          version: '1.0',
          uploaded_by: 'Admin',
          created_at: new Date('2024-01-20'),
          download_url: '#'
        }
      ],
      'photoshop': [
        {
          id: 'doc-ps-1',
          program_id: 'photoshop',
          program_name: 'Photoshop',
          title: 'Programme Photoshop',
          description: 'Programme détaillé de la formation Photoshop',
          filename: 'photoshop-program.pdf',
          original_name: 'photoshop-program.pdf',
          file_type: 'application/pdf',
          file_size: 768000,
          download_count: 28,
          category: 'program',
          tags: ['photoshop', 'design', 'retouche'],
          version: '1.0',
          uploaded_by: 'Admin',
          created_at: new Date('2024-01-18'),
          download_url: '#'
        }
      ],
      'canva': [
        {
          id: 'doc-canva-1',
          program_id: 'canva',
          program_name: 'Canva',
          title: 'Guide Canva',
          description: 'Guide complet pour Canva',
          filename: 'canva-guide.pdf',
          original_name: 'canva-guide.pdf',
          file_type: 'application/pdf',
          file_size: 256000,
          download_count: 15,
          category: 'guide',
          tags: ['canva', 'design', 'création'],
          version: '1.0',
          uploaded_by: 'Admin',
          created_at: new Date('2024-01-22'),
          download_url: '#'
        }
      ]
    };

    return fallbackData[programId] || [];
  }

  // Get document statistics (admin only)
  static async getDocumentStatistics(): Promise<{
    totalDocuments: number;
    totalDownloads: number;
    documentsByProgram: { [program: string]: number };
    documentsByCategory: { [category: string]: number };
    popularDocuments: TrainingDocument[];
  }> {
    try {
      const documents = await this.getAllDocuments();
      
      const stats = {
        totalDocuments: documents.length,
        totalDownloads: documents.reduce((sum, doc) => sum + doc.download_count, 0),
        documentsByProgram: {},
        documentsByCategory: {},
        popularDocuments: documents
          .sort((a, b) => b.download_count - a.download_count)
          .slice(0, 5)
      };

      // Calculate distributions
      documents.forEach(doc => {
        stats.documentsByProgram[doc.program_name] = (stats.documentsByProgram[doc.program_name] || 0) + 1;
        stats.documentsByCategory[doc.category] = (stats.documentsByCategory[doc.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching document statistics:', error);
      return {
        totalDocuments: 0,
        totalDownloads: 0,
        documentsByProgram: {},
        documentsByCategory: {},
        popularDocuments: []
      };
    }
  }
}

export default TrainingDocumentsApiService;