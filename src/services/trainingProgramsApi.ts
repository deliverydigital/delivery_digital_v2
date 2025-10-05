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
  satisfaction_rate?: number;
  success_rate?: number;
  recommendation_rate?: number;
  attendance_rate?: number;
  satisfaction_rating?: number;
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
    show_inactive?: boolean;
  }): Promise<TrainingProgram[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      
      // Handle filtering logic
      if (filters?.active_only === true) {
        params.append('active_only', 'true');
      } else if (filters?.active_only === false) {
        params.append('active_only', 'false');
      } else if (filters?.show_inactive === true) {
        // Don't add active_only parameter to show all programs
      } else if (filters?.show_inactive === false) {
        params.append('active_only', 'true');
      }
      // If no filter is specified, default behavior depends on context

      try {
        const response = await makeRequest(`/training-programs?${params.toString()}`);
        
        if (response.data && response.data.programs) {
          console.log('📊 API returned programs:', response.data.programs.length);
          return response.data.programs.map((program: any) => ({
            ...program,
            // Ensure we have both id and program_id for compatibility
            id: program.id || program.program_id,
            name: program.name || program.title,
            created_at: program.created_at ? new Date(program.created_at) : new Date(),
            updated_at: program.updated_at ? new Date(program.updated_at) : new Date(),
            is_active: program.is_active !== undefined ? program.is_active : true,
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
    return [
      { id: 'wordpress', name: 'WordPress', program_id: 'wordpress', title: 'WordPress', description: 'Créez et gérez des sites web professionnels', category: 'web', duration_hours: 35, price: 1200, level: 'beginner', max_participants: 12, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'photoshop', name: 'Photoshop', program_id: 'photoshop', title: 'Photoshop', description: 'Maîtrisez les outils de retouche photo', category: 'design', duration_hours: 28, price: 800, level: 'beginner', max_participants: 12, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'canva', name: 'Canva', program_id: 'canva', title: 'Canva', description: 'Créez des designs professionnels facilement', category: 'design', duration_hours: 21, price: 600, level: 'beginner', max_participants: 15, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'excel', name: 'Excel', program_id: 'excel', title: 'Excel', description: 'Maîtrisez Excel pour l\'analyse de données', category: 'office', duration_hours: 35, price: 900, level: 'intermediate', max_participants: 10, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'dev-web-mobile', name: 'Développeur Web et Web Mobile', program_id: 'dev-web-mobile', title: 'Développeur Web et Web Mobile', description: 'Formation complète pour devenir développeur', category: 'web', duration_hours: 400, price: 8000, level: 'intermediate', max_participants: 12, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'reflex-english-1', name: 'Reflex English 1', program_id: 'reflex-english-1', title: 'Reflex English Niveau 1', description: 'Apprentissage de l\'anglais niveau débutant', category: 'languages', duration_hours: 60, price: 1500, level: 'beginner', max_participants: 15, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'reflex-english-2', name: 'Reflex English 2', program_id: 'reflex-english-2', title: 'Reflex English Niveau 2', description: 'Perfectionnement en anglais niveau intermédiaire', category: 'languages', duration_hours: 60, price: 1500, level: 'intermediate', max_participants: 15, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'reflex-english-3', name: 'Reflex English 3', program_id: 'reflex-english-3', title: 'Reflex English Niveau 3', description: 'Anglais avancé pour un niveau professionnel', category: 'languages', duration_hours: 60, price: 1500, level: 'advanced', max_participants: 15, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'hygiene-security', name: 'Hygiène, Sécurité et Développement Durable', program_id: 'hygiene-security', title: 'Hygiène, Sécurité et Développement Durable', description: 'Formation en hygiène et sécurité pour la restauration', category: 'safety', duration_hours: 14, price: 350, level: 'beginner', max_participants: 12, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'hygiene-security-afest', name: 'Hygiène, Sécurité et Développement Durable - AFEST', program_id: 'hygiene-security-afest', title: 'Hygiène, Sécurité et Développement Durable - AFEST', description: 'Formation AFEST en hygiène et sécurité', category: 'safety', duration_hours: 21, price: 525, level: 'beginner', max_participants: 8, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'conduite-securitaire', name: 'Conduite Sécuritaire', program_id: 'conduite-securitaire', title: 'Conduite Sécuritaire', description: 'Formation à la conduite préventive et sécuritaire', category: 'safety', duration_hours: 14, price: 400, level: 'beginner', max_participants: 12, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'autocad-sketchup-revit', name: 'AutoCAD, SketchUp, et Revit', program_id: 'autocad-sketchup-revit', title: 'AutoCAD, SketchUp, et Revit', description: 'Maîtrisez les logiciels de CAO et BIM', category: 'design', duration_hours: 100, price: 2500, level: 'intermediate', max_participants: 10, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'reflex-espagnol-1', name: 'Reflex Espagnol Niveau 1', program_id: 'reflex-espagnol-1', title: 'Reflex Espagnol Niveau 1', description: 'Apprentissage de l\'espagnol niveau débutant', category: 'languages', duration_hours: 60, price: 1500, level: 'beginner', max_participants: 15, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'reflex-espagnol-2', name: 'Reflex Espagnol Niveau 2', program_id: 'reflex-espagnol-2', title: 'Reflex Espagnol Niveau 2', description: 'Perfectionnement en espagnol niveau intermédiaire', category: 'languages', duration_hours: 60, price: 1500, level: 'intermediate', max_participants: 15, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'reflex-espagnol-3', name: 'Reflex Espagnol Niveau 3', program_id: 'reflex-espagnol-3', title: 'Reflex Espagnol Niveau 3', description: 'Espagnol avancé pour un niveau professionnel', category: 'languages', duration_hours: 60, price: 1500, level: 'advanced', max_participants: 15, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'management-complet', name: 'Management Parcours Complet', program_id: 'management-complet', title: 'Management Parcours Complet', description: 'Formation complète en management et leadership', category: 'management', duration_hours: 70, price: 2100, level: 'intermediate', max_participants: 12, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'vente-omnicanal', name: 'Techniques de Vente Omnicanal', program_id: 'vente-omnicanal', title: 'Techniques de Vente Omnicanal', description: 'Maîtrisez les techniques de vente modernes', category: 'business', duration_hours: 35, price: 1050, level: 'intermediate', max_participants: 12, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() },
      { id: 'nutrition', name: 'Nutrition', program_id: 'nutrition', title: 'Nutrition', description: 'Formation en nutrition et diététique', category: 'health', duration_hours: 42, price: 1260, level: 'intermediate', max_participants: 15, objectives: [], methods: [], evaluation_methods: [], is_active: true, modules: [], documents: [], created_at: new Date(), updated_at: new Date() }
    ];
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
  static async createProgram(programData: Partial<TrainingProgram>): Promise<{ success: boolean; program?: TrainingProgram; error?: string }> {
    try {
      console.log('Creating program with data:', programData);
      
      const response = await makeRequest('/training-programs', {
        method: 'POST',
        body: JSON.stringify(programData),
      });

      console.log('Create program response:', response);
      
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
      console.log('Updating program:', programId, 'with data:', updates);
      
      const response = await makeRequest(`/training-programs/${programId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      console.log('Update program response:', response);
      
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
      console.log('Deleting program:', programId);
      
      await makeRequest(`/training-programs/${programId}`, {
        method: 'DELETE',
      });
      
      console.log('Program deleted successfully');
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