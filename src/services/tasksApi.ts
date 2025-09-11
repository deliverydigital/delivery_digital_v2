@@ .. @@
   static async getProjectTasks(projectId: string): Promise<Task[]> {
     try {
+      // Check if user is authenticated before making API call
+      const token = localStorage.getItem('authToken');
+      if (!token) {
+        console.log('🔒 No auth token, returning fallback tasks');
+        return this.getFallbackTasks(projectId);
+      }
+
       const response = await makeRequest(`/tasks/project/${projectId}`);
       
       if (response.success && response.data.tasks) {
         return response.data.tasks.map((task: any) => this.transformTaskFromAPI(task));
       }
       
       return [];
     } catch (error) {
       console.error('Erreur lors du chargement des tâches:', error);
       // Fallback to localStorage for demo
       return this.getFallbackTasks(projectId);
     }
   }