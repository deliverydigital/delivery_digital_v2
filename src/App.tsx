import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Simulator from './components/Simulator';
import ProjectChat from './components/ProjectChat';
import SeoAdmin from './components/SeoAdmin';
import PublicSeoPage from './components/PublicSeoPage';
import ProspectAdmin from './components/ProspectAdmin';
import AdminPanel from './components/AdminPanel';
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
  const [seoSlug, setSeoSlug] = useState<{ type: 'services' | 'blog'; slug: string } | null>(null);

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
    } else if (pathname === '/formation') {
      // Formation cachee temporairement - le code reste, on bascule vers un site dedie. Redirige home.
      window.history.replaceState({}, '', '/');
      setCurrentPage('home');
    } else if (pathname === '/devis' || pathname === '/simulator') {
      // Simulator hidden temporarily - redirect to home
      window.history.replaceState({}, '', '/');
      setCurrentPage('home');
    } else if (pathname === '/discutons' || pathname === '/projet') {
      setCurrentPage('chat');
    } else if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      setCurrentPage('admin-panel');
    } else if (pathname.startsWith('/services/')) {
      setSeoSlug({ type: 'services', slug: pathname.slice('/services/'.length) });
      setCurrentPage('seo-public');
    } else if (pathname.startsWith('/blog/')) {
      setSeoSlug({ type: 'blog', slug: pathname.slice('/blog/'.length) });
      setCurrentPage('seo-public');
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

  // Formation dedicated page
  if (currentPage === 'formation') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <FormationHero />
          <Training />
        </main>
        <Footer />
        <ScrollToTop />
        <LegalModals />
      </div>
    );
  }

  // Quote simulator dedicated page
  if (currentPage === 'simulator') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Simulator />
        </main>
        <Footer />
        <ScrollToTop />
        <ProjectSubmission />
        <LegalModals />
      </div>
    );
  }

  // Admin Panel unifie (Prospects + SEO + Overview)
  if (currentPage === 'admin-panel') {
    return <AdminPanel />;
  }

  // SEO public page (city-service or article)
  if (currentPage === 'seo-public' && seoSlug) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <PublicSeoPage slug={seoSlug.slug} />
        </main>
        <Footer />
        <ScrollToTop />
        <LegalModals />
      </div>
    );
  }

  // AI project chat dedicated page
  if (currentPage === 'chat') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <ProjectChat />
        </main>
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
      </main>
      <Footer />
      <ScrollToTop />
      <ProjectSubmission />
      <LegalModals />
    </div>
  );
}

/* Formation page hero - small intro tile above Training section */
function FormationHero() {
  return (
    <section className="tile tile-peach pt-[100px] pb-12 sm:pt-[120px] sm:pb-16">
      <div className="container text-center">
        <span className="inline-block text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--ink-500)] mb-4">
          Centre certifié Qualiopi
        </span>
        <h1 className="display-1 text-[34px] sm:text-[64px] lg:text-[80px] text-[var(--ink-900)] mb-4">
          Formation <span className="accent-italic">pro.</span>
        </h1>
        <p className="subhead text-[17px] sm:text-[26px] text-[var(--ink-700)] max-w-[720px] mx-auto">
          Organisme certifié Qualiopi. Profitez du financement OPCO.
        </p>
      </div>
    </section>
  );
}

export default App;