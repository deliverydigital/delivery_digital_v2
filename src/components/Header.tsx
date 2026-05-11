import { useState, useEffect, useRef } from 'react';
import { Menu, X, Globe, ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import TrainingClientSpace from './TrainingClientSpace';
import Auth from './Auth';
import { useAuth } from '../hooks/useApi';

// Liste des langues supportees. L'ordre = ordre d'affichage dans le dropdown.
// L'auto-detection navigator.language (via i18next-browser-languagedetector) gere le defaut.
// @author Rabah Ziane - 2026-05-11
const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', label: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

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

  // Etat du dropdown langues
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  // Fermer dropdown quand on clic en dehors
  useEffect(() => {
    if (!langOpen) return;
    const onClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [langOpen]);
  const currentLangCode = (i18n.language || 'fr').split('-')[0];
  const currentLang = LANGUAGES.find((l) => l.code === currentLangCode) || LANGUAGES[0];
  const pickLanguage = (code: string) => {
    i18n.changeLanguage(code);
    try { localStorage.setItem('i18nextLng', code); } catch {}
    setLangOpen(false);
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

            {/* Right tools - language switcher + primary CTA */}
            <div className="hidden md:flex items-center gap-2.5">
              {/* Language switcher (desktop) */}
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangOpen((o) => !o)}
                  className="px-2.5 py-1 rounded-full text-[12px] text-white/85 hover:text-white inline-flex items-center gap-1.5 hover:bg-white/10 transition-colors"
                  aria-label={t("common.chooseLanguage")}
                >
                  <Globe size={13} />
                  <span>{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                  <ChevronDown size={11} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-[220px] max-h-[420px] overflow-y-auto rounded-[14px] bg-[rgba(20,20,22,0.96)] backdrop-blur-xl ring-1 ring-white/10 shadow-2xl py-2"
                    >
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => pickLanguage(l.code)}
                          className={`w-full text-left px-3.5 py-2 text-[13px] flex items-center gap-2.5 hover:bg-white/10 transition-colors ${l.code === currentLangCode ? 'text-white font-semibold bg-white/5' : 'text-white/85'}`}
                        >
                          <span className="text-[15px]">{l.flag}</span>
                          <span className="flex-1">{l.label}</span>
                          {l.code === currentLangCode && <span className="text-[#0066CC]">●</span>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <a
                href="/discutons"
                className="px-3.5 py-1 rounded-full text-[12px] font-medium text-white bg-[#0066CC] hover:bg-[#0077ED] transition-colors inline-flex items-center"
              >
                Discutons
              </a>
            </div>

            {/* Mobile : language picker visible + menu toggle */}
            <div className="md:hidden flex items-center gap-2 relative" ref={langRef}>
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="px-2 py-1 rounded-full text-[12px] text-white/85 hover:text-white inline-flex items-center gap-1 hover:bg-white/10 transition-colors"
                aria-label="Choisir la langue"
              >
                <Globe size={13} />
                <span className="text-[11px] font-semibold">{currentLang.flag} {currentLangCode.toUpperCase()}</span>
              </button>
              <button
                onClick={toggleMenu}
                className="text-[#F5F5F7]/85 hover:text-white"
                aria-label="Toggle menu"
              >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              {/* Sheet mobile : dropdown ancre sur le bouton globe, scrollable */}
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-[200px] max-h-[60vh] overflow-y-auto rounded-[14px] bg-[rgba(20,20,22,0.98)] backdrop-blur-xl ring-1 ring-white/10 shadow-2xl py-2 z-50"
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { pickLanguage(l.code); setLangOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[12.5px] flex items-center gap-2 hover:bg-white/10 transition-colors ${l.code === currentLangCode ? 'text-white font-semibold bg-white/5' : 'text-white/85'}`}
                      >
                        <span className="text-[14px]">{l.flag}</span>
                        <span className="flex-1 truncate">{l.label}</span>
                        {l.code === currentLangCode && <span className="text-[#0066CC] text-[10px]">●</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
              {/* Pas de language picker dans le drawer mobile : on garde uniquement le bouton Globe + dropdown du header (toujours visible). @author Rabah Ziane - 2026-05-11 */}
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
