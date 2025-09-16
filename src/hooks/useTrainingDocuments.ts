import { useState, useEffect } from 'react';
import { TrainingDocumentsApiService, TrainingDocument } from '../services/trainingApi';

// Hook for managing training documents
export const useTrainingDocuments = (programId?: string) => {
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {

      let docs: TrainingDocument[];
      if (programId) {
        docs = await TrainingDocumentsApiService.getProgramDocuments(programId);
      } else {
        docs = await TrainingDocumentsApiService.getAllDocuments();
      }
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading training documents:', err);
      setError(err.message || 'Failed to load documents');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, [programId]);

  const uploadDocument = async (documentData: {
    program_id: string;
    program_name: string;
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    version?: string;
    files: File[];
  }) => {
    const result = await TrainingDocumentsApiService.uploadDocument(documentData);
    if (result.success) {
      await loadDocuments();
    }
    return result;
  };

  const deleteDocument = async (documentId: string) => {
    const result = await TrainingDocumentsApiService.deleteDocument(documentId);
    if (result.success) {
      await loadDocuments();
    }
    return result;
  };

  const downloadDocument = (documentId: string) => {
    TrainingDocumentsApiService.downloadDocument(documentId);
  };

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    refreshDocuments: loadDocuments
  };
};

// Hook for document statistics (admin only)
export const useTrainingDocumentStats = () => {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalDownloads: 0,
    documentsByProgram: {},
    documentsByCategory: {},
    popularDocuments: []
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const statistics = await TrainingDocumentsApiService.getDocumentStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading document statistics:', error);
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