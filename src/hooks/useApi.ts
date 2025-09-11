// Hook pour les projets
export const useProjects = (clientId?: string, page: number = 1, limit: number = 10) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const loadProjects = async () => {
    // Don't make API calls if not authenticated
    const token = ApiService.getAuthToken();
    if (!token) {
      console.log('🔒 No auth token, skipping API call for projects');
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let data;
      let paginationData;
      if (clientId) {
        data = await ApiService.getClientProjects(clientId, page, limit);
      } else {
        // For admin view, load all projects
        const response = await ApiService.getAllProjects(page, limit);
        data = response.projects || response;
        paginationData = response.pagination;
      }
      setProjects(data);
      if (paginationData) {
        setPagination(paginationData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
      // Set empty array on error to prevent infinite loading
      setProjects([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Only load projects if we have authentication
    const token = ApiService.getAuthToken();
    if (token && (clientId !== undefined || clientId === undefined)) {
      loadProjects();
    } else {
      setProjects([]);
      setLoading(false);
    }

    const handleRefreshProjects = () => loadProjects();

    window.addEventListener('refreshProjects', handleRefreshProjects);
    return () => window.removeEventListener('refreshProjects', handleRefreshProjects);
  }, [clientId, page, limit]);
};