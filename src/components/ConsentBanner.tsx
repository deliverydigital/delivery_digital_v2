/**
 * Bandeau de consentement cookies RGPD.
 *
 * Couleurs brand : primary #59C7DD, ink-dark #002731, accent #1F5865.
 * S'affiche bas de page tant que l'utilisateur n'a ni accepte ni refuse.
 * Persistance : localStorage `dd_consent` = 'granted' | 'denied'.
 *
 * @author Rabah Ziane - 2026-05-13
 */
import { useState, useEffect } from 'react';
import { setConsent } from '../lib/analytics';

const CONSENT_KEY = 'dd_consent';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    try {
      const value = localStorage.getItem(CONSENT_KEY);
      if (value !== 'granted' && value !== 'denied') setVisible(true);
    } catch { /* */ }
    const onChange = () => setVisible(false);
    window.addEventListener('dd-consent-changed', onChange);
    return () => window.removeEventListener('dd-consent-changed', onChange);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="dd-consent-title"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 md:p-5"
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl shadow-2xl border"
        style={{
          background: '#002731',
          borderColor: 'rgba(89, 199, 221, 0.35)',
          color: '#F6FAFA',
        }}
      >
        <div className="p-4 sm:p-5 md:p-6">
          <div className="flex items-start gap-3 mb-3">
            <span
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(89,199,221,0.18)', color: '#59C7DD' }}
              aria-hidden
            >
              🍪
            </span>
            <div className="flex-1 min-w-0">
              <p
                id="dd-consent-title"
                className="text-[15px] font-semibold mb-1"
                style={{ color: '#F6FAFA' }}
              >
                Cookies & confidentialité
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(246,250,250,0.85)' }}>
                Nous utilisons des cookies pour mesurer l&apos;audience (Google Analytics) et
                l&apos;efficacité de nos campagnes publicitaires (Google Ads). Vos données sont
                anonymisées (IP hachée). Vous pouvez accepter, refuser, ou modifier ce choix
                plus tard.
              </p>
              {showDetails && (
                <ul className="mt-3 space-y-1.5 text-[12.5px] list-disc pl-5" style={{ color: 'rgba(246,250,250,0.78)' }}>
                  <li><strong>Mesure d&apos;audience</strong> : Google Analytics 4 (pages vues, durée de visite).</li>
                  <li><strong>Suivi des conversions</strong> : Google Ads (formulaire, clic téléphone/email).</li>
                  <li><strong>Anonymisation</strong> : IP hachée avec un secret serveur, jamais stockée en clair.</li>
                  <li><strong>Durée</strong> : 13 mois max (recommandation CNIL).</li>
                  <li><strong>Refuser</strong> : aucun cookie GA/Ads chargé, le site fonctionne normalement.</li>
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              onClick={() => setConsent('granted')}
              className="px-4 py-2 rounded-full text-[13px] font-semibold transition active:scale-[0.98] hover:opacity-90"
              style={{ background: '#59C7DD', color: '#002731' }}
            >
              Accepter tout
            </button>
            <button
              onClick={() => setConsent('denied')}
              className="px-4 py-2 rounded-full text-[13px] font-medium transition active:scale-[0.98] hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#F6FAFA', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Refuser
            </button>
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="ml-auto text-[12px] underline transition hover:opacity-80"
              style={{ color: '#A2DDE9' }}
            >
              {showDetails ? 'Masquer les détails' : 'Personnaliser'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
