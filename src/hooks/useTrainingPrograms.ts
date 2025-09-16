@@ .. @@
   const downloadDocument = (documentId: string, programId: string) => {
-    TrainingProgramsApiService.downloadDocument(documentId);
+    TrainingProgramsApiService.downloadDocument(documentId, programId);
   };