import { useState, useEffect } from 'react';
import { TrainingProgramsApiService, TrainingProgram } from '../services/trainingProgramsApi';

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
      // Set fallback data on error
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = (documentId: string, programId: string) => {
    TrainingProgramsApiService.downloadDocument(documentId, programId);
  };

  const getProgramsByCategory = (category: string) => {
    return programs.filter(program => program.category === category);
  };

  const getFeaturedPrograms = () => {
    return programs.filter(program => program.is_featured);
  };

  const getOPCOEligiblePrograms = () => {
    return programs.filter(program => program.opco_eligible);
  };

  const searchPrograms = (query: string) => {
    if (!query.trim()) return programs;
    
    const lowercaseQuery = query.toLowerCase();
    return programs.filter(program => 
      program.title.toLowerCase().includes(lowercaseQuery) ||
      program.description.toLowerCase().includes(lowercaseQuery) ||
      program.category.toLowerCase().includes(lowercaseQuery)
    );
  };

  return {
    programs,
    loading,
    error,
    downloadDocument,
    getProgramsByCategory,
    getFeaturedPrograms,
    getOPCOEligiblePrograms,
    searchPrograms,
    refetch: loadPrograms
  };
};