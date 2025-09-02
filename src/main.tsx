import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { initializeDemoData } from './services/api';
import { initializeDemoTasks } from './hooks/useTasks';

// Initialize demo data
initializeDemoData();
initializeDemoTasks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);