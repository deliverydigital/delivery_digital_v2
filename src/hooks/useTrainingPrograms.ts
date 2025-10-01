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
      
      // Load all programs for admin (both active and inactive)
      const data = await TrainingProgramsApiService.getAllPrograms({
        show_inactive: true // This will show both active and inactive programs
      });
      
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

  const createProgram = async (programData: Partial<TrainingProgram>) => {
    console.log('useTrainingPrograms: Creating program with data:', programData);
    const result = await TrainingProgramsApiService.createProgram(programData);
    console.log('useTrainingPrograms: Create result:', result);
    if (result.success) {
      await loadPrograms();
    }
    return result;
  };

  const updateProgram = async (programId: string, updates: Partial<TrainingProgram>) => {
    console.log('useTrainingPrograms: Updating program:', programId, 'with updates:', updates);
    const result = await TrainingProgramsApiService.updateProgram(programId, updates);
    console.log('useTrainingPrograms: Update result:', result);
    if (result.success) {
      await loadPrograms();
    }
    return result;
  };

  const deleteProgram = async (programId: string) => {
    console.log('useTrainingPrograms: Deleting program:', programId);
    const result = await TrainingProgramsApiService.deleteProgram(programId);
    console.log('useTrainingPrograms: Delete result:', result);
    if (result.success) {
      await loadPrograms();
    }
    return result;
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
    createProgram,
    updateProgram,
    deleteProgram,
    refetch: loadPrograms
  };
};