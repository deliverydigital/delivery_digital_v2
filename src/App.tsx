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
import LegalModals from './components/LegalModals';
import { useAuth } from './hooks/useApi';

function App() {
  const { i18n } = useTranslation();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  useEffect(() => {
    document.title = i18n.language === 'fr' 
      ? 'DELIVERY Digital Technology | Expertise Informatique'
      : 'DELIVERY Digital Technology | IT Expertise';
  }, [i18n.language]);

  // Check for admin access from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminRoute = urlParams.get('admin') === 'true';
    
    if (isAdminRoute) {
      setShowAdminDashboard(true);
    }
  }, []);

  // Admin Dashboard - only show if explicitly requested via URL
  if (showAdminDashboard) {
    return <AdminDashboard />;
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