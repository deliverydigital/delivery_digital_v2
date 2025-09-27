import { useState, useEffect } from 'react';
import { TrainingProgramsApiService } from '../services/trainingProgramsApi';

export interface TrainingProgram {
  id: string;
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

export const useTrainingPrograms = () => {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TrainingProgramsApiService.getAllPrograms({ active_only: true });
      setPrograms(data);
    } catch (err) {
      console.error('Error loading training programs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load programs');
      setPrograms([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const createProgram = async (programData: Partial<TrainingProgram>) => {
    try {
      const result = await TrainingProgramsApiService.createProgram(programData as any);
      if (result.success) {
        await loadPrograms();
      }
      return result;
    } catch (error) {
      console.error('Error creating program:', error);
      return { success: false, error: error.message || 'Failed to create program' };
    }
  };

  const updateProgram = async (programId: string, updates: Partial<TrainingProgram>) => {
    try {
      const result = await TrainingProgramsApiService.updateProgram(programId, updates);
      if (result.success) {
        await loadPrograms();
      }
      return result;
    } catch (error) {
      console.error('Error updating program:', error);
      return { success: false, error: error.message || 'Failed to update program' };
    }
  };

  const deleteProgram = async (programId: string) => {
    try {
      const result = await TrainingProgramsApiService.deleteProgram(programId);
      if (result.success) {
        await loadPrograms();
      }
      return result;
    } catch (error) {
      console.error('Error deleting program:', error);
      return { success: false, error: error.message || 'Failed to delete program' };
    }
  };

  const uploadDocument = async (programId: string, documentData: any) => {
    try {
      const result = await TrainingProgramsApiService.uploadDocument(programId, documentData);
      if (result.success) {
        await loadPrograms();
      }
      return result;
    } catch (error) {
      console.error('Error uploading document:', error);
      return { success: false, error: error.message || 'Failed to upload document' };
    }
  };

  const downloadDocument = (documentId: string, programId: string) => {
    try {
      TrainingProgramsApiService.downloadDocument(documentId, programId);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  return {
    programs,
    loading,
    error,
    createProgram,
    updateProgram,
    deleteProgram,
    uploadDocument,
    downloadDocument,
    refetch: loadPrograms
  };
};