import { useState, useEffect } from 'react';
import { Menu, X, Globe, LogIn, GraduationCap, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Logo from './Logo';
import TrainingClientSpace from './TrainingClientSpace';

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showClientMenu, setShowClientMenu] = useState(false);
  const [showTrainingClientSpace, setShowTrainingClientSpace] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  
  const changeLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr');
  };

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const navItems = [
    { name: t('header.home'), href: '#home' },
    { name: t('header.services'), href: '#services' },
    { name: t('header.training'), href: '#training' },
    { name: t('header.contact'), href: '#contact' },
  ];

  return (
    <>
      <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Logo className={scrolled ? 'h-16' : 'h-20'} />
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <a 
                  key={item.name} 
                  href={item.href}
                  className={`font-medium text-sm ${scrolled ? 'text-gray-800' : 'text-white'} hover:text-primary-600 transition-colors`}
                >
                  {item.name}
                </a>
              ))}
              <button
                onClick={changeLanguage}
                className={`flex items-center text-sm ${scrolled ? 'text-gray-800' : 'text-white'} hover:text-primary-600 transition-colors`}
              >
                <Globe size={18} className="mr-1" />
                {i18n.language === 'fr' ? 'EN' : 'FR'}
              </button>
              
              {/* Client Space Dropdown */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowClientMenu(true)}
                  onMouseLeave={() => setShowClientMenu(false)}
                  className="btn btn-primary flex items-center"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Espace Client
                </button>
                
                {showClientMenu && (
                  <div 
                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                    onMouseEnter={() => setShowClientMenu(true)}
                    onMouseLeave={() => setShowClientMenu(false)}
                  >
                    <button
                      onClick={() => {
                        setShowClientMenu(false);
                        setShowTrainingClientSpace(true);
                      }}
                      className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <GraduationCap className="h-5 w-5 mr-3 text-green-600" />
                      <div>
                        <div className="font-medium">Formation Professionnelle</div>
                        <div className="text-sm text-gray-500">Accès aux formations</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowClientMenu(false);
                        // Trigger project submission modal
                        const event = new CustomEvent('openDigitalClientSpace');
                        window.dispatchEvent(event);
                      }}
                      className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Code className="h-5 w-5 mr-3 text-blue-600" />
                      <div>
                        <div className="font-medium">Solutions Digitales</div>
                        <div className="text-sm text-gray-500">Gérer vos projets</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* Mobile Navigation Toggle */}
            <div className="md:hidden">
              <button 
                onClick={toggleMenu} 
                className={`${scrolled ? 'text-gray-800' : 'text-white'} hover:text-primary-600 transition-colors`}
                aria-label="Toggle menu"
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden"
            >
              <div className="py-4 space-y-4">
                {navItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={toggleMenu}
                    className={`block py-2 ${scrolled ? 'text-gray-800' : 'text-white'} hover:text-primary-600 transition-colors`}
                  >
                    {item.name}
                  </a>
                ))}
                <button
                  onClick={() => {
                    changeLanguage();
                    toggleMenu();
                  }}
                  className={`flex items-center py-2 ${scrolled ? 'text-gray-800' : 'text-white'} hover:text-primary-600 transition-colors`}
                >
                  <Globe size={18} className="mr-1" />
                  {i18n.language === 'fr' ? 'English' : 'Français'}
                </button>
                
                {/* Mobile Client Spaces */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <button
                    onClick={() => {
                      toggleMenu();
                      setShowTrainingClientSpace(true);
                    }}
                    className="flex items-center py-2 text-green-600 hover:text-green-700 transition-colors"
                  >
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Formation Professionnelle
                  </button>
                  <button
                    onClick={() => {
                      toggleMenu();
                      const event = new CustomEvent('openDigitalClientSpace');
                      window.dispatchEvent(event);
                    }}
                    className="flex items-center py-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Code className="h-5 w-5 mr-2" />
                    Solutions Digitales
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* Training Client Space */}
      <TrainingClientSpace
        isOpen={showTrainingClientSpace}
        onClose={() => setShowTrainingClientSpace(false)}
      />
    </>
  );
};

export default Header;