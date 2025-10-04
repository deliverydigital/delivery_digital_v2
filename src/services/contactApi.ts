import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  budget?: string;
  timeline?: string;
  message: string;
}

export interface ContactSubmission extends ContactFormData {
  id: string;
  status: string;
  created_at: string;
}

export const contactApi = {
  async submitContact(formData: ContactFormData): Promise<{ success: boolean; data?: ContactSubmission; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .insert([formData])
        .select()
        .single();

      if (error) {
        console.error('Error submitting contact:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception submitting contact:', error);
      return { success: false, error: 'Failed to submit contact form' };
    }
  },

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching contacts:', error);
      return [];
    }
  },

  async updateContactStatus(id: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('Error updating contact status:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception updating contact status:', error);
      return { success: false, error: 'Failed to update status' };
    }
  }
};
