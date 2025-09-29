// API Service for categories management

// Get API base URL from environment
const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || '';
};

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  is_active: boolean;
  order: number;
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

// Categories API Service
export class CategoriesApiService {
  // Get all categories
  static async getAllCategories(filters?: {
    active_only?: boolean;
  }): Promise<Category[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.active_only !== undefined) params.append('active_only', filters.active_only.toString());

      try {
        const response = await makeRequest(`/categories?${params.toString()}`);
        
        if (response.success && response.data && response.data.categories) {
          return response.data.categories.map((category: any) => ({
            ...category,
            created_at: new Date(category.created_at),
            updated_at: new Date(category.updated_at)
          }));
        }
        
        // Return fallback data
        return this.getFallbackCategories();
      } catch (apiError) {
        console.log('API endpoint not available, using fallback data');
        return this.getFallbackCategories();
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      return this.getFallbackCategories();
    }
  }

  // Fallback data when API is not available
  private static getFallbackCategories(): Category[] {
    return [
      { 
        id: 'web', 
        name: 'Développement Web', 
        slug: 'web', 
        description: 'Formation en développement web, frameworks modernes et technologies front-end/back-end',
        color: '#3b82f6', 
        icon: 'code', 
        is_active: true,
        order: 1,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        id: 'design', 
        name: 'Design & Création', 
        slug: 'design', 
        description: 'Formation en design graphique, retouche photo et outils de création visuelle',
        color: '#8b5cf6', 
        icon: 'palette', 
        is_active: true,
        order: 2,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        id: 'office', 
        name: 'Bureautique', 
        slug: 'office', 
        description: 'Formation aux outils bureautiques et de productivité',
        color: '#10b981', 
        icon: 'file-text', 
        is_active: true,
        order: 3,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        id: 'languages', 
        name: 'Langues', 
        slug: 'languages', 
        description: 'Formation en langues étrangères avec méthodes interactives',
        color: '#f59e0b', 
        icon: 'globe', 
        is_active: true,
        order: 4,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        id: 'safety', 
        name: 'Sécurité & Hygiène', 
        slug: 'safety', 
        description: 'Formation en sécurité au travail, hygiène alimentaire et développement durable',
        color: '#ef4444', 
        icon: 'shield', 
        is_active: true,
        order: 5,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        id: 'management', 
        name: 'Management', 
        slug: 'management', 
        description: 'Formation en management, leadership et gestion d\'équipe',
        color: '#6366f1', 
        icon: 'users', 
        is_active: true,
        order: 6,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        id: 'business', 
        name: 'Commerce & Vente', 
        slug: 'business', 
        description: 'Formation en techniques de vente, relation client et stratégies commerciales',
        color: '#ec4899', 
        icon: 'briefcase', 
        is_active: true,
        order: 7,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        id: 'health', 
        name: 'Santé & Nutrition', 
        slug: 'health', 
        description: 'Formation en nutrition, diététique et bien-être',
        color: '#14b8a6', 
        icon: 'heart', 
        is_active: true,
        order: 8,
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ];
  }

  // Create new category (admin only)
  static async createCategory(categoryData: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    order?: number;
  }): Promise<{ success: boolean; category?: Category; error?: string }> {
    try {
      const response = await makeRequest('/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });

      if (response.success) {
        return { 
          success: true, 
          category: {
            ...response.data.category,
            created_at: new Date(response.data.category.created_at),
            updated_at: new Date(response.data.category.updated_at)
          }
        };
      }
      
      return { success: false, error: 'Failed to create category' };
    } catch (error) {
      console.error('Create category error:', error);
      return { success: false, error: error.message || 'Failed to create category' };
    }
  }

  // Update category (admin only)
  static async updateCategory(categoryId: string, updates: Partial<Category>): Promise<{ success: boolean; category?: Category; error?: string }> {
    try {
      const response = await makeRequest(`/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (response.success) {
        return { 
          success: true, 
          category: {
            ...response.data.category,
            created_at: new Date(response.data.category.created_at),
            updated_at: new Date(response.data.category.updated_at)
          }
        };
      }
      
      return { success: false, error: 'Failed to update category' };
    } catch (error) {
      console.error('Update category error:', error);
      return { success: false, error: error.message || 'Failed to update category' };
    }
  }

  // Delete category (admin only)
  static async deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await makeRequest(`/categories/${categoryId}`, {
        method: 'DELETE',
      });
      
      return { success: true };
    } catch (error) {
      console.error('Delete category error:', error);
      return { success: false, error: error.message || 'Failed to delete category' };
    }
  }

  // Get categories by specific criteria
  static getCategoriesByType(categories: Category[], type: string): Category[] {
    return categories.filter(category => category.slug === type);
  }

  static getActiveCategories(categories: Category[]): Category[] {
    return categories.filter(category => category.is_active);
  }

  static searchCategories(categories: Category[], query: string): Category[] {
    if (!query.trim()) return categories;
    
    const lowercaseQuery = query.toLowerCase();
    return categories.filter(category => 
      category.name.toLowerCase().includes(lowercaseQuery) ||
      (category.description && category.description.toLowerCase().includes(lowercaseQuery))
    );
  }
}

export default CategoriesApiService;