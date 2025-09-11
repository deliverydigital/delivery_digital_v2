@@ .. @@
   static async getClientProjects(clientId: string, page: number = 1, limit: number = 10): Promise<Project[]> {
     try {
+      // Check if user is authenticated before making API call
+      const token = this.getAuthToken();
+      if (!token) {
+        console.log('🔒 No auth token, returning empty projects array');
+        return [];
+      }
+
       // Try to fetch from API first
       try {
         const response = await this.makeRequest(`/projects?page=${page}&limit=${limit}`);
         if (response.success && response.data && response.data.projects) {
           return response.data.projects;
         }
       } catch (apiError) {
         console.log('API call failed, falling back to demo data:', apiError.message);
       }
       
       // Fallback to demo projects from localStorage
       const demoProjects = localStorage.getItem('demoProjects');
       if (demoProjects) {
         const projects = JSON.parse(demoProjects);
         const clientProjects = projects.filter((project: Project) => project.clientId === clientId);
         const startIndex = (page - 1) * limit;
         const endIndex = startIndex + limit;
         return clientProjects.slice(startIndex, endIndex);
       }
       
       return [];
     } catch (error) {
       console.error('Error fetching client projects:', error);
       return [];
     }
   }

   static async getAllProjects(page: number = 1, limit: number = 10): Promise<{ projects: Project[]; pagination?: any }> {
     try {
+      // Check if user is authenticated before making API call
+      const token = this.getAuthToken();
+      if (!token) {
+        console.log('🔒 No auth token, returning empty projects array');
+        return { projects: [] };
+      }
+
       // Try to fetch from API first
       try {
         const response = await this.makeRequest(`/projects?page=${page}&limit=${limit}`);
         if (response.success && response.data && response.data.projects) {
           return {
             projects: response.data.projects,
             pagination: response.data.pagination
           };
         }
       } catch (apiError) {
         console.log('API call failed, falling back to demo data:', apiError.message);
       }
     } catch (error) {
       console.error('Error fetching all projects:', error);
       return { projects: [] };
     }
   }