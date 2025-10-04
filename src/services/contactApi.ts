export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  budget?: string;
  timeline?: string;
  message: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const contactApi = {
  async submitContact(formData: ContactFormData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contact/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        return { success: false, error: errorData.message || 'Failed to submit form' };
      }

      const data = await response.json();
      return { success: data.success, data };
    } catch (error) {
      console.error('Exception submitting contact:', error);
      return { success: false, error: 'Failed to submit contact form. Please ensure the server is running.' };
    }
  }
};
