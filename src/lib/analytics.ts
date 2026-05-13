/**
 * Analytics : suivi des conversions Google Ads + Google Analytics + DB interne.
 *
 * Architecture :
 *  - Tant que le visiteur n'a pas accepte le bandeau RGPD, AUCUN script GA/Ads
 *    n'est charge. L'API DB recoit toujours l'evenement (sans IP claire).
 *  - Une fois consenti, on charge gtag.js puis on relaie les events vers
 *    GA4 (gtag event) + Google Ads (conversion send_to AW-...).
 *  - Toujours, POST /api/conversions pour le dashboard interne.
 *
 * Variables d'env (VITE_*) : voir .env.example
 *
 * @author Rabah Ziane - 2026-05-13
 */

export type ConversionType = 'contact_submit' | 'phone_click' | 'email_click' | 'quote_click';

const CONSENT_KEY = 'dd_consent';

const GA_ID = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_GA_ID || '';
const GADS_ID = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_GADS_ID || '';
const GADS_LABELS: Record<ConversionType, string> = {
  contact_submit: (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_GADS_LABEL_CONTACT || '',
  phone_click:    (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_GADS_LABEL_PHONE || '',
  email_click:    (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_GADS_LABEL_EMAIL || '',
  quote_click:    (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_GADS_LABEL_QUOTE || '',
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { dataLayer: any[]; gtag: (...args: any[]) => void; }
}

let scriptsLoaded = false;
let listenersInstalled = false;

export function hasConsent(): boolean {
  try { return localStorage.getItem(CONSENT_KEY) === 'granted'; } catch { return false; }
}

export function setConsent(value: 'granted' | 'denied'): void {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* */ }
  if (value === 'granted') ensureScriptsLoaded();
  // Notifie le bandeau (event custom) pour qu'il se cache.
  window.dispatchEvent(new Event('dd-consent-changed'));
}

/** Charge gtag.js si pas deja fait et si on a un GA_ID OU GADS_ID. */
function ensureScriptsLoaded(): void {
  if (scriptsLoaded) return;
  if (!GA_ID && !GADS_ID) return;
  scriptsLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());

  // Consent Mode v2 : par defaut tout granted (l'utilisateur a cliquer accepter).
  window.gtag('consent', 'default', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  });

  // Initialise GA4 et Google Ads (mesure indep si l'un manque).
  if (GA_ID) window.gtag('config', GA_ID, { anonymize_ip: true });
  if (GADS_ID) window.gtag('config', GADS_ID);

  // Inject script tag (l'ID priorise GA pour le script - les 2 cohabitent via dataLayer).
  const id = GA_ID || GADS_ID;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
}

/** Initialise les listeners "implicites" sur les liens tel/mailto presents dans le DOM.
 *  A appeler 1 seule fois au boot. */
export function installAutoTrackers(): void {
  if (listenersInstalled) return;
  listenersInstalled = true;
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const a = target.closest('a') as HTMLAnchorElement | null;
    if (!a || !a.href) return;
    if (a.href.startsWith('tel:')) {
      trackEvent('phone_click', { target: a.href.replace('tel:', '') });
    } else if (a.href.startsWith('mailto:')) {
      trackEvent('email_click', { target: a.href.replace('mailto:', '').split('?')[0] });
    } else {
      // Quote click : tout lien vers /discutons (Hero, Header, Services tiles, Footer CTA)
      try {
        const u = new URL(a.href, window.location.origin);
        if (u.pathname === '/discutons' || u.pathname.startsWith('/discutons')) {
          trackEvent('quote_click', { target: a.textContent?.trim().slice(0, 60) || '' });
        }
      } catch { /* noop : href invalide */ }
    }
  }, true);
}

/** Parse les utm_* + page actuelle. */
function getContext() {
  const params = new URLSearchParams(window.location.search);
  return {
    page: window.location.pathname + (window.location.search || ''),
    referrer: document.referrer || '',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_term: params.get('utm_term') || '',
    utm_content: params.get('utm_content') || '',
  };
}

/** Envoie un evenement de conversion.
 *  - Si consent : gtag GA + gtag Ads conversion
 *  - Toujours : POST /api/conversions pour le dashboard interne. */
export function trackEvent(type: ConversionType, metadata: Record<string, unknown> = {}): void {
  const ctx = getContext();
  const payload = { type, ...ctx, metadata };

  // 1. DB interne (toujours, meme sans consent - aucune donnee PII en clair)
  fetch('/api/conversions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => { /* silent */ });

  // 2. GA + Google Ads (uniquement si consent)
  if (!hasConsent()) return;
  ensureScriptsLoaded();
  if (typeof window.gtag !== 'function') return;

  // GA4 event nomme conversion_<type> (visible dans GA4)
  if (GA_ID) {
    window.gtag('event', `conversion_${type}`, {
      page_location: window.location.href,
      page_path: ctx.page,
      ...metadata,
    });
  }
  // Google Ads conversion (send_to label specifique au type)
  if (GADS_ID && GADS_LABELS[type]) {
    window.gtag('event', 'conversion', {
      send_to: `${GADS_ID}/${GADS_LABELS[type]}`,
      value: 1.0,
      currency: 'EUR',
    });
  }
}

/** Helpers semantiques. */
export const trackContactSubmit = (metadata?: Record<string, unknown>) => trackEvent('contact_submit', metadata);
export const trackPhoneClick = (metadata?: Record<string, unknown>) => trackEvent('phone_click', metadata);
export const trackEmailClick = (metadata?: Record<string, unknown>) => trackEvent('email_click', metadata);
export const trackQuoteClick = (metadata?: Record<string, unknown>) => trackEvent('quote_click', metadata);

/** Boot : a appeler 1x au start de l'app. */
export function initAnalytics(): void {
  if (hasConsent()) ensureScriptsLoaded();
  installAutoTrackers();
}
