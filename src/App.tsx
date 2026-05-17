import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Simulator from './components/Simulator';
import ProjectChat from './components/ProjectChat';
import SeoAdmin from './components/SeoAdmin';
import PublicSeoPage from './components/PublicSeoPage';
import ServicesHub from './components/ServicesHub';
import CountryHub from './components/CountryHub';
import StickyDiscutonsBar from './components/StickyDiscutonsBar';
import ProspectAdmin from './components/ProspectAdmin';
import AdminPanel from './components/AdminPanel';
import Contact from './components/Contact';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ConsentBanner from './components/ConsentBanner';
import { initAnalytics } from './lib/analytics';
import TechnologyGuide from './components/TechnologyGuide';
import Training from './components/Training';
import ProjectSubmission from './components/ProjectSubmission';
import AdminDashboard from './components/AdminDashboard';
import ClientDashboard from './components/ClientDashboard';
import LegalModals from './components/LegalModals';
import Reclamation from './components/Reclamation';
import ResetPassword from './components/ResetPassword';
import LocationsPage from './components/LocationsPage';
import Auth from './components/Auth';
import { useAuth } from './hooks/useApi';

function App() {
  const { i18n } = useTranslation();
  const { user, isAuthenticated, isAdmin, isProjectManager } = useAuth();
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const [currentPage, setCurrentPage] = useState('home');
  const [seoSlug, setSeoSlug] = useState<{ type: 'services' | 'blog'; slug: string } | null>(null);
  const [countryHubCode, setCountryHubCode] = useState<string | null>(null);

  useEffect(() => {
    document.title = i18n.language === 'fr'
      ? 'DELIVERY Digital Technology | Expertise Informatique'
      : 'DELIVERY Digital Technology | IT Expertise';
  }, [i18n.language]);

  // Init analytics au boot (auto-trackers pour tel:/mailto: + chargement gtag si deja consent).
  // @author Rabah Ziane - 2026-05-13
  useEffect(() => { initAnalytics(); }, []);

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
      setCurrentPage('formation');
    } else if (pathname === '/devis' || pathname === '/simulator') {
      // Simulator hidden temporarily - redirect to home
      window.history.replaceState({}, '', '/');
      setCurrentPage('home');
    } else if (pathname === '/locations' || pathname === '/villes') {
      setCurrentPage('locations');
    } else if (pathname === '/discutons' || pathname === '/projet') {
      setCurrentPage('chat');
    } else if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      setCurrentPage('admin-panel');
    } else if (pathname === '/services' || pathname === '/services/') {
      setCurrentPage('services-hub');
    } else if (pathname.startsWith('/services/country/')) {
      // Country hub route - intentional fall-through to next block
      const code = pathname.slice('/services/country/'.length).replace(/\/$/, '');
      setCountryHubCode(code);
      setCurrentPage('country-hub');
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
      // Pas connecté : ouvrir directement le modal Auth pour ne pas bloquer sur Access Denied.
      // @author Rabah Ziane · 2026-05-14
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <Auth
            isOpen={true}
            onClose={() => setShowAdminDashboard(false)}
            onSuccess={() => { /* Le useEffect authStateChanged va rafraîchir et afficher AdminDashboard */ }}
          />
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
      <ConsentBanner />
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
      <ConsentBanner />
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
      <ConsentBanner />
        <ScrollToTop />
        <LegalModals />
      </div>
    );
  }

  // Admin Panel unifie (Prospects + SEO + Overview)
  if (currentPage === 'admin-panel') {
    return <AdminPanel />;
  }

  // Services hub - liste pays
  if (currentPage === 'services-hub') {
    return (
      <div className="flex flex-col min-h-screen">
        <ServicesHub />
        <ConsentBanner />
        <ScrollToTop />
        <LegalModals />
        <StickyDiscutonsBar source="services-hub" />
      </div>
    );
  }

  // Country hub - liste villes/services d'un pays
  if (currentPage === 'country-hub' && countryHubCode) {
    return (
      <div className="flex flex-col min-h-screen">
        <CountryHub code={countryHubCode} />
        <ConsentBanner />
        <ScrollToTop />
        <LegalModals />
        <StickyDiscutonsBar source="country-hub" />
      </div>
    );
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
        <ConsentBanner />
        <ScrollToTop />
        <LegalModals />
        <StickyDiscutonsBar source={seoSlug.type === 'article' ? 'blog' : 'service'} />
      </div>
    );
  }

  // Locations : hub interne avec toutes les pages SEO par ville
  // @author Rabah Ziane - 2026-05-13
  if (currentPage === 'locations') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <LocationsPage />
        </main>
        <Footer />
        <ConsentBanner />
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
      <ConsentBanner />
      <ScrollToTop />
      <LegalModals />
      <StickyDiscutonsBar source="home" />
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