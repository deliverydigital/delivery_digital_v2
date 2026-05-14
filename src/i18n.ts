import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationFR from './locales/fr.json';
import translationEN from './locales/en.json';
import translationES from './locales/es.json';
import translationDE from './locales/de.json';
import translationIT from './locales/it.json';
import translationPT from './locales/pt.json';
import translationNL from './locales/nl.json';
import translationSV from './locales/sv.json';
import translationDA from './locales/da.json';
import translationNO from './locales/no.json';
import translationFI from './locales/fi.json';
import translationPL from './locales/pl.json';
import translationCS from './locales/cs.json';
import translationHU from './locales/hu.json';
import translationEL from './locales/el.json';
import translationTR from './locales/tr.json';
import translationRU from './locales/ru.json';
import translationAR from './locales/ar.json';
import translationZH from './locales/zh.json';
import translationJA from './locales/ja.json';
import translationKO from './locales/ko.json';

const resources = {
  fr: { translation: translationFR },
  en: { translation: translationEN },
  es: { translation: translationES },
  de: { translation: translationDE },
  it: { translation: translationIT },
  pt: { translation: translationPT },
  nl: { translation: translationNL },
  sv: { translation: translationSV },
  da: { translation: translationDA },
  no: { translation: translationNO },
  fi: { translation: translationFI },
  pl: { translation: translationPL },
  cs: { translation: translationCS },
  hu: { translation: translationHU },
  el: { translation: translationEL },
  tr: { translation: translationTR },
  ru: { translation: translationRU },
  ar: { translation: translationAR },
  zh: { translation: translationZH },
  ja: { translation: translationJA },
  ko: { translation: translationKO },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: Object.keys(resources),
    nonExplicitSupportedLngs: true, // ex: 'fr-FR' matche 'fr'
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

// Met a jour les attributs HTML (lang + dir) au changement de langue, pour RTL.
const RTL_LANGS = new Set(['ar']);
const applyHtmlAttrs = (lng: string) => {
  const code = (lng || 'en').split('-')[0];
  document.documentElement.lang = code;
  document.documentElement.dir = RTL_LANGS.has(code) ? 'rtl' : 'ltr';
};
applyHtmlAttrs(i18n.language);
i18n.on('languageChanged', applyHtmlAttrs);

// =====================================================================
// Geo-IP detection : combo IP + navigator
// Si localStorage absent (1re visite), on tente le pays via IP en arriere
// plan. Si la langue mappee du pays differe de celle deja active (navigator),
// on change. Timeout court (800ms) pour eviter un flash trop long.
// L'utilisateur peut toujours changer manuellement -> localStorage prime ensuite.
// @author Rabah Ziane - 2026-05-11
// =====================================================================
const COUNTRY_TO_LANG: Record<string, string> = {
  // French
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', ML: 'fr', BF: 'fr', NE: 'fr', GA: 'fr', CG: 'fr', MG: 'fr',
  // English
  GB: 'en', US: 'en', AU: 'en', NZ: 'en', IE: 'en', ZA: 'en', NG: 'en', KE: 'en', GH: 'en', PH: 'en', SG: 'en', MY: 'en', CA: 'en', IN: 'en',
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', UY: 'es', PY: 'es', BO: 'es', CR: 'es', DO: 'es', GT: 'es', HN: 'es', NI: 'es', PA: 'es', PR: 'es', SV: 'es', CU: 'es',
  // German
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  // Italian
  IT: 'it', SM: 'it', VA: 'it',
  // Portuguese
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt',
  // Dutch
  NL: 'nl', SR: 'nl', AW: 'nl',
  // Swedish
  SE: 'sv',
  // Danish
  DK: 'da', FO: 'da', GL: 'da',
  // Norwegian
  NO: 'no', SJ: 'no',
  // Finnish
  FI: 'fi', AX: 'fi',
  // Polish
  PL: 'pl',
  // Czech / Slovak (proches)
  CZ: 'cs', SK: 'cs',
  // Hungarian
  HU: 'hu',
  // Greek
  GR: 'el', CY: 'el',
  // Turkish
  TR: 'tr',
  // Russian
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', UA: 'ru',
  // Arabic
  SA: 'ar', EG: 'ar', MA: 'ar', DZ: 'ar', TN: 'ar', KW: 'ar', BH: 'ar', OM: 'ar', JO: 'ar', LB: 'ar', SY: 'ar', IQ: 'ar', YE: 'ar', LY: 'ar', SD: 'ar', PS: 'ar',
  AE: 'ar-AE', // Emirats = variant arabe regional (fallback ar via nonExplicitSupportedLngs)
  QA: 'ar-QA', // Qatar = variant arabe regional
  // Chinese
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
  // Japanese
  JP: 'ja',
  // Korean
  KR: 'ko', KP: 'ko',
};

async function detectCountryLang(timeoutMs = 800): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    // api.country.is : gratuit, sans rate limit declare, JSON { ip, country }
    const r = await fetch('https://api.country.is/', { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const data = await r.json();
    const country = String(data?.country || '').toUpperCase();
    return COUNTRY_TO_LANG[country] || null;
  } catch {
    return null;
  }
}

// On ne tente la geoloc que si l'utilisateur n'a pas deja choisi une langue
// (sinon son choix manuel doit primer, c'est l'objet du localStorage).
const hasManualChoice = (() => {
  try { return !!localStorage.getItem('i18nextLng'); } catch { return false; }
})();

if (!hasManualChoice) {
  detectCountryLang().then((lang) => {
    if (!lang) return;
    const current = (i18n.language || '').split('-')[0];
    if (lang === current) return;
    if (!Object.keys(resources).includes(lang)) return;
    i18n.changeLanguage(lang);
  });
}

export default i18n;
