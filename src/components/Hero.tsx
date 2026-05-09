import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Shield, CheckCircle2,
  Laptop, BookOpen, Zap, Trophy, ExternalLink, Award,
  X, Lightbulb, Euro
} from 'lucide-react';
import WhatsAppWidget from 'react-whatsapp-chat-widget';
import 'react-whatsapp-chat-widget/index.css';
import AIOrb from './AIOrb';

/* ============================================================
   CII Modal - Apple-style sheet
   ============================================================ */
const CIIModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-[680px] relative overflow-hidden"
      >
        <div className="px-7 pt-6 pb-5 border-b border-[var(--ink-100)] flex justify-between items-center">
          <h3 className="display-3 text-[22px] text-[var(--ink-900)]">
            Crédit Impôt Innovation
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--ink-500)] hover:text-[var(--ink-900)] -mr-1"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-7 py-7 space-y-7">
          <p className="text-[17px] text-[var(--ink-700)] leading-relaxed">
            Le CII vous permet de récupérer 20% de vos dépenses d'innovation.
            <br />Si vous payez des impôts : déduction directe de 20%.
            <br />Si vous ne payez pas d'impôts : remboursement de 20% par l'État.
          </p>

          <div className="grid gap-6">
            <CIIRow icon={Euro} title="Exemple concret">
              Pour un projet de 20 000€, vous récupérez 4 000€ (20%). Coût final : 16 000€.
            </CIIRow>
            <CIIRow icon={Lightbulb} title="Projets éligibles">
              Applications web et mobiles · logiciels sur mesure · intelligence artificielle · solutions innovantes pour votre entreprise.
            </CIIRow>
            <CIIRow icon={CheckCircle2} title="Comment en bénéficier">
              Vous investissez avec nous · nous fournissons tous les justificatifs · vous recevez votre crédit ou remboursement.
            </CIIRow>
          </div>
        </div>

        <div className="px-7 py-5 bg-[var(--ink-50)] flex justify-end">
          <button onClick={onClose} className="btn-pill">Fermer</button>
        </div>
      </motion.div>
    </div>
  );
};

const CIIRow = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-4">
    <div className="bg-[var(--ink-50)] p-3 rounded-2xl flex-shrink-0">
      <Icon className="h-5 w-5 text-[var(--ink-900)]" strokeWidth={1.5} />
    </div>
    <div>
      <h4 className="font-semibold text-[var(--ink-900)] text-[16px] mb-1">{title}</h4>
      <p className="text-[15px] text-[var(--ink-700)] leading-relaxed">{children}</p>
    </div>
  </div>
);

/* ============================================================
   Main Hero - Apple-style stacked tiles
   ============================================================ */
const Hero = () => {
  const { t } = useTranslation();
  const [isCIIModalOpen, setIsCIIModalOpen] = useState(false);

  // Listen for global "openCIIModal" event so badges from other components can trigger it
  useEffect(() => {
    const open = () => setIsCIIModalOpen(true);
    window.addEventListener('openCIIModal', open);
    return () => window.removeEventListener('openCIIModal', open);
  }, []);

  return (
    <>
      {/* ============== TILE 1 : Headline (dark) ============== */}
      <section
        id="home"
        className="tile tile-dark pt-[88px] pb-16 sm:pb-20"
      >
        <div className="container text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="display-1 text-[34px] sm:text-[64px] lg:text-[80px] mb-5"
          >
            {t('hero.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[17px] sm:text-[24px] lg:text-[28px] font-normal text-white/90 max-w-3xl mx-auto leading-snug tracking-tight"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* Primary CTA: AI assistant */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex justify-center"
          >
            <a
              href="/discutons"
              className="group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-[16px] font-medium text-white bg-[#0066CC] hover:bg-[#0077ED] transition-colors"
              style={{ boxShadow: '0 12px 30px -10px rgba(10, 132, 255, 0.55)' }}
            >
              <AIOrb size={22} innerColor="#0066CC" />
              Discutons de votre projet
              <span className="text-[18px] transition-transform group-hover:translate-x-0.5">›</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-5 flex flex-wrap justify-center gap-x-7 gap-y-3"
          >
            <a
              href="#services"
              className="text-[17px] text-[#2997FF] hover:underline inline-flex items-center"
            >
              Voir nos services
              <span className="ml-1 text-[18px]">›</span>
            </a>
            <a
              href="/formation"
              className="text-[17px] text-[#2997FF] hover:underline inline-flex items-center"
            >
              Formation pro
              <span className="ml-1 text-[18px]">›</span>
            </a>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        <CIIModal isOpen={isCIIModalOpen} onClose={() => setIsCIIModalOpen(false)} />
      </AnimatePresence>

      <WhatsAppWidget
        phoneNo="33749707773"
        position="right"
        widgetWidth="300px"
        widgetWidthMobile="260px"
        autoOpen={false}
        autoOpenTimer={5000}
        messageBox={true}
        messageBoxTxt="Bonjour! Comment puis-je vous aider aujourd'hui?"
        iconSize="40"
        iconColor="white"
        iconBgColor="#0066CC"
        headerIcon="/favicon.png"
        headerIconColor="white"
        headerTxtColor="white"
        headerBgColor="#0066CC"
        headerTitle="DELIVERY Digital Support"
        headerCaption="En ligne"
        bodyBgColor="#F5F5F7"
        chatPersonName="Support"
        chatMessage={<>Bonjour 👋 <br /><br /> Comment pouvons-nous vous aider?</>}
        footerBgColor="#1D1D1F"
        placeholder="Tapez votre message"
        btnBgColor="#0066CC"
        btnTxt="Démarrer la discussion"
      />
    </>
  );
};

/* ============================================================
   ProductTile - Apple-style full-bleed product showcase
   ============================================================ */
type CTA = { label: string; href?: string; onClick?: () => void };

const ProductTile = ({
  id,
  tone,
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  body,
  primaryCta,
  secondaryCta,
  badge,
}: {
  id: string;
  tone: 'light' | 'dark';
  eyebrow?: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  body: string;
  primaryCta?: CTA;
  secondaryCta?: CTA;
  badge?: React.ReactNode;
}) => {
  const isDark = tone === 'dark';
  const handleCta = (cta?: CTA) => {
    if (!cta) return;
    if (cta.onClick) cta.onClick();
    else if (cta.href) window.location.href = cta.href;
  };

  return (
    <section
      id={id}
      className={`tile py-20 sm:py-24 ${isDark ? 'tile-night' : 'tile-light'}`}
    >
      <div className="container text-center">
        {eyebrow && (
          <span
            className={`inline-block text-[12px] font-semibold tracking-[0.06em] uppercase mb-4 ${
              isDark ? 'text-white/65' : 'text-[var(--ink-500)]'
            }`}
          >
            {eyebrow}
          </span>
        )}

        <Icon
          className={`mx-auto h-9 w-9 mb-5 ${isDark ? 'text-white/85' : 'text-[var(--ink-900)]'}`}
          strokeWidth={1.5}
        />

        <h2 className={`display-2 text-[34px] sm:text-[48px] lg:text-[56px] mb-3 ${isDark ? 'text-white' : 'text-[var(--ink-900)]'}`}>
          {title}
        </h2>
        <p className={`text-[20px] sm:text-[24px] lg:text-[28px] tracking-tight font-normal mb-5 ${isDark ? 'text-white/85' : 'text-[var(--ink-700)]'}`}>
          {subtitle}
        </p>
        <p className={`text-[16px] sm:text-[18px] max-w-2xl mx-auto leading-relaxed mb-7 ${isDark ? 'text-white/70' : 'text-[var(--ink-500)]'}`}>
          {body}
        </p>

        <div className="flex flex-wrap justify-center items-center gap-x-7 gap-y-3 mb-6">
          {primaryCta && (
            <button
              onClick={() => handleCta(primaryCta)}
              className={`inline-flex items-center text-[18px] sm:text-[19px] hover:underline ${
                isDark ? 'text-[#2997FF]' : 'text-[var(--link)]'
              }`}
            >
              {primaryCta.label}
              <span className="ml-1 text-[20px]">›</span>
            </button>
          )}
          {secondaryCta && (
            <button
              onClick={() => handleCta(secondaryCta)}
              className={`inline-flex items-center text-[18px] sm:text-[19px] hover:underline ${
                isDark ? 'text-[#2997FF]' : 'text-[var(--link)]'
              }`}
            >
              {secondaryCta.label}
              <span className="ml-1 text-[20px]">›</span>
            </button>
          )}
        </div>

        {badge && <div className="mt-2">{badge}</div>}
      </div>
    </section>
  );
};

export default Hero;
