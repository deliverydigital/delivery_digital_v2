import { useState, useEffect } from 'react';
import { CategoriesApiService, Category } from '../services/categoriesApi';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CategoriesApiService.getAllCategories({ active_only: true });
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      // Set fallback data on error
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (categoryData: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    order?: number;
  }) => {
    const result = await CategoriesApiService.createCategory(categoryData);
    if (result.success) {
      await loadCategories();
    }
    return result;
  };

  const updateCategory = async (categoryId: string, updates: Partial<Category>) => {
    const result = await CategoriesApiService.updateCategory(categoryId, updates);
    if (result.success) {
      await loadCategories();
    }
    return result;
  };

  const deleteCategory = async (categoryId: string) => {
    const result = await CategoriesApiService.deleteCategory(categoryId);
    if (result.success) {
      await loadCategories();
    }
    return result;
  };

  const getCategoriesByType = (type: string) => {
    return CategoriesApiService.getCategoriesByType(categories, type);
  };

  const getActiveCategories = () => {
    return CategoriesApiService.getActiveCategories(categories);
  };

  const searchCategories = (query: string) => {
    return CategoriesApiService.searchCategories(categories, query);
  };

  const getCategoryById = (id: string) => {
    return categories.find(category => category.id === id);
  };

  const getCategoryBySlug = (slug: string) => {
    return categories.find(category => category.slug === slug);
  };

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByType,
    getActiveCategories,
    searchCategories,
    getCategoryById,
    getCategoryBySlug,
    refetch: loadCategories
  };
};