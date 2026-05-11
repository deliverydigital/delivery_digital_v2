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
import translationRO from './locales/ro.json';
import translationEL from './locales/el.json';
import translationTR from './locales/tr.json';
import translationRU from './locales/ru.json';
import translationAR from './locales/ar.json';
import translationHE from './locales/he.json';
import translationFA from './locales/fa.json';
import translationHI from './locales/hi.json';
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
  ro: { translation: translationRO },
  el: { translation: translationEL },
  tr: { translation: translationTR },
  ru: { translation: translationRU },
  ar: { translation: translationAR },
  he: { translation: translationHE },
  fa: { translation: translationFA },
  hi: { translation: translationHI },
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
const RTL_LANGS = new Set(['ar', 'he', 'fa']);
const applyHtmlAttrs = (lng: string) => {
  const code = (lng || 'en').split('-')[0];
  document.documentElement.lang = code;
  document.documentElement.dir = RTL_LANGS.has(code) ? 'rtl' : 'ltr';
};
applyHtmlAttrs(i18n.language);
i18n.on('languageChanged', applyHtmlAttrs);

export default i18n;
