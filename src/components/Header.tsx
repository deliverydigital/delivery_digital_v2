import { useState, useEffect } from 'react';
import { Menu, X, Globe, ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Logo from './Logo';
import TrainingClientSpace from './TrainingClientSpace';
import Auth from './Auth';
import { useAuth } from '../hooks/useApi';

/**
 * Apple.fr-style top nav:
 * - Thin 44px bar
 * - Translucent black background with backdrop-blur
 * - Light gray nav items, hover to white
 * - Item spacing follows Apple's 13px font, ~36-44px gap
 */
const Header = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showClientMenu, setShowClientMenu] = useState(false);
  const [showTrainingClientSpace, setShowTrainingClientSpace] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const toggleMenu = () => setIsOpen(!isOpen);

  const changeLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr');
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setShowClientMenu(false);
  };

  const handleLogout = () => {
    logout();
    setShowClientMenu(false);
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const navItems = [
    { name: t('header.home'), href: '/' },
    { name: t('header.services'), href: '/#services' },
    { name: 'Discutons', href: '/discutons' },
    // Formation cachee temporairement - on bascule sur un site dedie. Ne pas supprimer.
    // { name: t('header.training'), href: '/formation' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Apple-style translucent dark bar */}
        <div className="bg-[rgba(0,0,0,0.72)] backdrop-blur-[20px] supports-[backdrop-filter]:bg-[rgba(0,0,0,0.62)]">
          <div className="container-wide h-[44px] flex items-center justify-between text-[12px] text-[#F5F5F7]/85">
            {/* Logo (left) - small, white */}
            <a href="#home" className="flex items-center hover:opacity-100 opacity-90 transition-opacity" aria-label="DELIVERY Digital">
              <Logo className="h-7" white />
            </a>

            {/* Center nav (desktop) */}
            <nav className="hidden md:flex items-center gap-9">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-[12px] font-normal tracking-tight text-[#F5F5F7]/80 hover:text-white transition-colors"
                >
                  {item.name}
                </a>
              ))}
            </nav>

            {/* Right tools - one primary CTA */}
            <div className="hidden md:flex items-center gap-2.5">
              <a
                href="/discutons"
                className="px-3.5 py-1 rounded-full text-[12px] font-medium text-white bg-[#0066CC] hover:bg-[#0077ED] transition-colors inline-flex items-center"
              >
                Discutons
              </a>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={toggleMenu}
              className="md:hidden text-[#F5F5F7]/85 hover:text-white"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer (Apple opens a full overlay) */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden bg-black text-white absolute top-[44px] left-0 right-0 px-6 py-6 border-t border-white/10"
          >
            <div className="flex flex-col gap-1 max-w-[640px] mx-auto">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={toggleMenu}
                  className="block py-3 text-[20px] font-normal tracking-tight text-white/90 hover:text-white border-b border-white/10"
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-4">
                <a
                  href="/discutons"
                  onClick={toggleMenu}
                  className="block w-full text-center px-5 py-3 rounded-full text-[16px] font-semibold text-white bg-[#0066CC] hover:bg-[#0077ED] transition-colors"
                >
                  Discutons de votre projet ›
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </header>

      <TrainingClientSpace
        isOpen={showTrainingClientSpace}
        onClose={() => setShowTrainingClientSpace(false)}
      />
      <Auth
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

const ClientMenuItem = ({ title, subtitle, onClick, danger = false }: { title: string; subtitle?: string; onClick: () => void; danger?: boolean }) => (
  <button
    onClick={onClick}
    className="w-full flex flex-col items-start px-4 py-2.5 hover:bg-[var(--ink-50)] transition-colors text-left"
  >
    <span className={`font-semibold text-[14px] ${danger ? 'text-[#D70015]' : 'text-[var(--ink-900)]'}`}>{title}</span>
    {subtitle && <span className="text-[12px] text-[var(--ink-500)] mt-0.5">{subtitle}</span>}
  </button>
);

export default Header;
