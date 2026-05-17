/**
 * Sticky CTA bar -> /discutons.
 * Apparait apres scroll > 400px, persistante jusqu'a fermeture explicite (sessionStorage).
 *
 * Objectif : convertir le trafic SEO en visites /discutons.
 *
 * @author Rabah Ziane - 2026-05-17
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DISMISS_KEY = 'dd_sticky_discutons_dismissed';

export default function StickyDiscutonsBar({ source = 'sticky' }: { source?: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') { setDismissed(true); return; }
    const onScroll = () => {
      if (window.scrollY > 400) setVisible(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (dismissed) return null;

  const close = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  // Construire URL avec UTM pour tracking source
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const href = `/discutons?utm_source=site&utm_medium=stickybar&utm_campaign=${encodeURIComponent(source)}&from_path=${encodeURIComponent(path)}`;

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[60] transition-all duration-500 ease-out pointer-events-none w-[calc(100%-1.5rem)] sm:w-auto sm:max-w-[560px]`}
      style={{
        bottom: visible ? '1rem' : '-100%',
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="pointer-events-auto flex items-center gap-3 bg-[#1D1D1F] text-white rounded-full pl-4 pr-2 py-2 shadow-2xl ring-1 ring-white/10">
        <span className="text-[15px] sm:text-[14px] hidden xs:inline">💬</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] sm:text-[13.5px] font-semibold leading-tight truncate">
            {t('stickyDiscutons.title', 'Décrivez votre idée.')}
          </div>
        </div>
        <a
          href={href}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white text-[#1D1D1F] text-[12.5px] font-semibold hover:bg-[#F2EFE9] transition-colors whitespace-nowrap"
        >
          {t('stickyDiscutons.cta', 'Démarrer')}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="#1D1D1F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </a>
        <button onClick={close} aria-label="Fermer" className="text-white/40 hover:text-white p-1.5 -mr-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
}
