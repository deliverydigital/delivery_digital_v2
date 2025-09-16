import { useState, useEffect } from 'react';
import { TrainingProgramsApiService } from '../services/trainingProgramsApi';

export interface TrainingProgram {
  _id: string;
  title: string;
  description: string;
  duration: string;
  level: string;
  modules: string[];
  documents: Array<{
    _id: string;
    filename: string;
    originalName: string;
    size: number;
    uploadDate: Date;
  }>;
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
      const data = await TrainingProgramsApiService.getAllPrograms();
      setPrograms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = (documentId: string, programId: string) => {
    TrainingProgramsApiService.downloadDocument(documentId, programId);
  };

  return {
    programs,
    loading,
    error,
    downloadDocument,
    refetch: loadPrograms
  };
};