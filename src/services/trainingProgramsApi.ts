// Get documents for a specific training program
  static async getProgramDocuments(programId: string): Promise<TrainingDocument[]> {
    try {
      const response = await makeRequest(`/training-programs/${programId}/documents`);
      
      if (response.success && response.data && response.data.documents) {
        return response.data.documents.map((doc: any) => ({
          ...doc,
          created_at: new Date(doc.uploaded_at || doc.created_at)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching program documents:', error);
      // Return fallback data for demo
      return this.getFallbackDocuments(programId);
    }
  }