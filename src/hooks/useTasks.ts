const loadTasks = async () => {
    // Don't make API calls if not authenticated or no project selected
    const token = localStorage.getItem('authToken');
    if (!token || !projectId) {
      console.log('🔒 No auth token or project ID, skipping task loading');
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const projectTasks = await TasksApiService.getProjectTasks(projectId);
      setTasks(projectTasks);
    } catch (err) {
      setError('Erreur lors du chargement des tâches');
      console.error('Erreur lors du chargement des tâches:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (projectId && token) {
      loadTasks();
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [projectId]);