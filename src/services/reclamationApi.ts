export interface ReclamationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  description: string;
  orderNumber?: string;
  category: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const reclamationApi = {
  async submitReclamation(formData: ReclamationFormData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reclamation/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        return { success: false, error: errorData.message || 'Failed to submit reclamation' };
      }

      const data = await response.json();
      return { success: data.success, data };
    } catch (error) {
      console.error('Exception submitting reclamation:', error);
      return { success: false, error: 'Failed to submit reclamation. Please ensure the server is running.' };
    }
  }
};
