import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Contact from './components/Contact';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import TechnologyGuide from './components/TechnologyGuide';
import Training from './components/Training';
import ProjectSubmission from './components/ProjectSubmission';
import AdminDashboard from './components/AdminDashboard';
import ClientDashboard from './components/ClientDashboard';
import LegalModals from './components/LegalModals';
import Reclamation from './components/Reclamation';
import ResetPassword from './components/ResetPassword';
import { useAuth } from './hooks/useApi';

function App() {
  const { i18n } = useTranslation();
  const { user, isAuthenticated, isAdmin, isProjectManager } = useAuth();
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    document.title = i18n.language === 'fr'
      ? 'DELIVERY Digital Technology | Expertise Informatique'
      : 'DELIVERY Digital Technology | IT Expertise';
  }, [i18n.language]);

  // Check for admin access or page route from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminRoute = urlParams.get('admin') === 'true';
    const pathname = window.location.pathname;

    if (isAdminRoute) {
      setShowAdminDashboard(true);
    } else if (pathname === '/reclamation') {
      setCurrentPage('reclamation');
    } else if (pathname === '/reset-password') {
      setCurrentPage('reset-password');
    } else {
      setCurrentPage('home');
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthStateChanged = () => {
      setAuthKey(prev => prev + 1);
    };

    window.addEventListener('authStateChanged', handleAuthStateChanged);
    return () => window.removeEventListener('authStateChanged', handleAuthStateChanged);
  }, []);
  // Admin Dashboard - only show if explicitly requested via URL
  if (showAdminDashboard) {
    if (isAuthenticated && (isAdmin || isProjectManager)) {
      return <AdminDashboard />;
    } else if (isAuthenticated && !isAdmin && !isProjectManager) {
      return <ClientDashboard />;
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You need to be logged in as an administrator to access this page.
            </p>
            <button
              onClick={() => setShowAdminDashboard(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Return to Main Site
            </button>
          </div>
        </div>
      );
    }
  }

  // Reset Password page
  if (currentPage === 'reset-password') {
    return <ResetPassword />;
  }

  // Reclamation page
  if (currentPage === 'reclamation') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Reclamation />
        </main>
        <Footer />
        <ScrollToTop />
      </div>
    );
  }

  // Regular website
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <Training />
        <TechnologyGuide />
        <Contact />
      </main>
      <Footer />
      <ScrollToTop />
      <ProjectSubmission />
      <LegalModals />
    </div>
  );
}

export default App;