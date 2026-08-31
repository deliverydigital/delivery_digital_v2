import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { Building2, Loader2, LogOut, Copy, Eye, EyeOff, KeyRound, Plus, FileText, ShieldCheck, Users, FolderCheck, Search, Wallet, X, Stamp, PenLine, Download, ExternalLink, Clock, Mail, Send, CheckCircle2, ArrowRight, Inbox, Trash2, Cpu, ChevronDown, Calculator } from 'lucide-react';
import FormationWizardModal from './FormationWizardModal';
import type { TransmitPayload, WizardEmployer } from './FormationWizardModal';
import DossierTasks, { type DossierTask } from './DossierTasks';
import { FORMATIONS } from '../lib/formationCatalog';
import type { Formation } from '../lib/formationCatalog';
import { FORMATION_TARIFS, BRANCHES_2026, getBranche, couvertureLigne, meilleurFinancement } from '../lib/opcoRates';

/**
 * Espace Agence partenaire (deliverydigital.fr/agence) - dashboard pro, organise
 * par client. 1 lead = 1 client -> montage dossier OPCO (wizard 6 onglets) +
 * demande identifiants OPCO (recus cote superadmin DD). @author Rabah Ziane - 2026-06-02
 */
const TOKEN_KEY = 'dd_agence_token';
const LOGO_URL = '/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png';
// Fond sombre a pois (comme l'admin Delivery Digital).
const DOTTED_BG: React.CSSProperties = { backgroundColor: '#0E0F13', backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' };
// AKTO : creation de compte + espace adherent (utilise quand le client n'a pas encore de compte OPCO).
// Le lien de creation est le flux "Creer mon compte" du portail AKTO ; l'espace sert au rattachement entreprise.
// @author Rabah Ziane - 2026-06-04
const AKTO_SIGNUP_URL = 'https://aktoext.ciamlogin.com/7395201a-5dfb-4ccf-9922-1550adf159ab/oauth2/v2.0/authorize?client_id=5f1c2efd-f550-452a-8985-134cd4447182&scope=api%3A%2F%2Fapi-extranet-prod%2F.default%20openid%20profile%20offline_access&redirect_uri=https%3A%2F%2Fmonespace.akto.fr%2F&response_mode=fragment&client_info=1&clidata=1&prompt=create&response_type=code';
const AKTO_ESPACE_URL = 'https://monespace.akto.fr/';
// Commission services informatiques : frais fixes identiques à la formation + 20 % (la formation est à 15 %).
// @Rabah 2026-06-23
const IT_COMMISSION_PCT = 20;

// Arguments de vente de la formation "Hygiène, Sécurité et Développement Durable" :
// pitch a reprendre tel quel par l'agence / le commercial face au restaurateur.
// @author Rabah Ziane - 2026-06-04
const VENTE_RESUME = [
  'Formation 100 % prise en charge chaque année par les OPCO.',
  'Mise en conformité des pratiques d’hygiène réglementaires.',
  'Valorisation lors des contrôles de la DDPP (direction départementale de la protection des populations).',
  'Valorisation auprès de la clientèle en affichant l’attestation collective de réussite.',
];
const VENTE_PILIERS: { titre: string; points: string[] }[] = [
  { titre: 'Conformité réglementaire', points: [
    'Formation alignée avec les réglementations en vigueur (HACCP, hygiène alimentaire, sécurité sanitaire).',
    'Réduction des risques de sanctions, d’amendes et de fermetures administratives en cas de contrôle.',
    'Mise en conformité avec les exigences des services d’hygiène et de sécurité.',
  ] },
  { titre: 'Sécurité des clients et du personnel', points: [
    'Prévention des intoxications alimentaires et autres risques sanitaires.',
    'Sensibilisation aux bonnes pratiques pour éviter les contaminations.',
    'Formation aux gestes de prévention des accidents du travail (chutes, brûlures, coupures, etc.).',
  ] },
  { titre: 'Qualité et réputation', points: [
    'Mise en place de protocoles assurant une meilleure qualité des produits et du service.',
    'Valorisation de l’image de l’établissement auprès des clients et des autorités sanitaires.',
    'Meilleure gestion des produits périssables pour éviter le gaspillage et garantir la fraîcheur.',
  ] },
  { titre: 'Optimisation des coûts et réduction des pertes', points: [
    'Meilleure gestion des stocks et des matières premières pour limiter le gaspillage alimentaire.',
    'Réduction des pertes grâce à des pratiques d’hygiène rigoureuses et une meilleure conservation.',
    'Économie sur le long terme : moins de déchets, moins d’erreurs, moins de pertes financières.',
  ] },
  { titre: 'Engagement écoresponsable et développement durable', points: [
    'Formation aux pratiques écoresponsables : gestion des déchets, recyclage, réduction des emballages plastiques.',
    'Sensibilisation à l’utilisation de produits locaux et de saison pour une démarche plus durable.',
    'Réduction de l’empreinte carbone de l’établissement grâce à une meilleure gestion des ressources.',
  ] },
  { titre: 'Différenciation et attractivité commerciale', points: [
    'Opportunité de communiquer sur des valeurs fortes (qualité, sécurité, écologie).',
    'Réponse aux attentes des consommateurs de plus en plus sensibles à l’hygiène et à l’environnement.',
    'Un avantage concurrentiel face aux établissements qui ne mettent pas en place ces bonnes pratiques.',
  ] },
];
// Arguments de la 2e formation : Bases de la nutrition et sensibilisation aux allergènes (21h).
const VENTE_NUTRITION_RESUME = [
  'Formation 100 % prise en charge chaque année par les OPCO.',
  'Maîtrise de l’information obligatoire sur les 14 allergènes (règlement INCO n°1169/2011).',
  'Réduction du risque d’accident allergique et de la responsabilité de l’établissement.',
  'Valorisation auprès d’une clientèle attentive à son alimentation (allergies, intolérances, équilibre).',
];
const VENTE_NUTRITION_PILIERS: { titre: string; points: string[] }[] = [
  { titre: 'Conformité réglementaire (allergènes)', points: [
    'Maîtrise de l’information obligatoire sur les 14 allergènes majeurs (règlement INCO n°1169/2011).',
    'Affichage et traçabilité des allergènes conformes, en salle comme en cuisine.',
    'Réduction du risque de sanction lors des contrôles (DDPP).',
  ] },
  { titre: 'Sécurité des clients', points: [
    'Prévention des réactions allergiques et des chocs anaphylactiques.',
    'Bonnes pratiques contre la contamination croisée des allergènes.',
    'Réponses fiables aux questions des clients sur la composition des plats.',
  ] },
  { titre: 'Qualité nutritionnelle de l’offre', points: [
    'Bases de l’équilibre alimentaire (macronutriments, portions, fraîcheur).',
    'Construction de menus plus sains, plus lisibles et mieux valorisés.',
    'Meilleure conservation et mise en valeur des produits.',
  ] },
  { titre: 'Réduction des risques et des coûts', points: [
    'Moins d’incidents clients et de litiges liés aux allergènes.',
    'Moins de gaspillage grâce à une meilleure gestion des produits.',
    'Protection de la responsabilité juridique de l’établissement.',
  ] },
  { titre: 'Engagement durable et local', points: [
    'Sensibilisation aux produits de saison et locaux.',
    'Réduction du gaspillage alimentaire.',
    'Démarche responsable valorisée auprès des clients.',
  ] },
  { titre: 'Différenciation et attractivité commerciale', points: [
    'Communication sur une offre « allergènes maîtrisés » et équilibrée.',
    'Réponse aux attentes d’une clientèle de plus en plus soucieuse de son alimentation.',
    'Un avantage concurrentiel face aux établissements non formés.',
  ] },
];
// Les 2 formations proposées, avec leurs arguments de vente. @author Rabah Ziane - 2026-06-05
const VENTE_ARGS = [
  {
    key: 'hygiene', tag: 'Hygiène, Sécurité & Développement Durable',
    copyTitle: 'Formation Hygiène, Sécurité & Développement Durable',
    mention: 'Beaucoup de clients répondent « c’est bon, on a déjà fait la formation ». Il ne s’agit PAS de la formation hygiène obligatoire (type HACCP) déjà suivie par le gérant. C’est une formation destinée aux salariés pour appliquer au quotidien les règles d’hygiène, de sécurité et de développement durable, et valoriser l’établissement - financée chaque année par l’OPCO.',
    resume: VENTE_RESUME, piliers: VENTE_PILIERS,
  },
  {
    key: 'nutrition', tag: 'Bases de la nutrition & sensibilisation aux allergènes',
    copyTitle: 'Formation Bases de la nutrition et sensibilisation aux allergènes',
    mention: 'Il ne s’agit pas d’une formation de diététicien : c’est une sensibilisation des salariés aux bases de la nutrition et aux 14 allergènes (règlement INCO 1169/2011) pour sécuriser la clientèle et valoriser l’offre - financée chaque année par l’OPCO.',
    resume: VENTE_NUTRITION_RESUME, piliers: VENTE_NUTRITION_PILIERS,
  },
] as const;
type CompanyInfo = { legalName?: string; regNumber?: string; vatNumber?: string; address?: string; city?: string; postalCode?: string; country?: string; repName?: string; repFunction?: string };
type Contract = { signed?: boolean; signedBy?: string; signedFunction?: string; signedAt?: string | null; validated?: boolean };
type Agency = { id: string; name: string; email: string; role?: string; isOwner?: boolean; apiKey?: string | null; commissionFix?: number; commissionPercent?: number; iban?: string; bic?: string; accountHolder?: string; bankCountry?: string; bankData?: Record<string, string>; ribPdfUrl?: string; bankValidated?: boolean; companyInfo?: CompanyInfo; contract?: Contract; onboardingValidated?: boolean };

// Champs RIB par pays (l'UI s'adapte au pays selectionne). accountHolder est toujours demande a part.
const COUNTRIES = [
  { code: 'FR', label: 'France' }, { code: 'BE', label: 'Belgique' }, { code: 'CH', label: 'Suisse' },
  { code: 'DE', label: 'Allemagne' }, { code: 'ES', label: 'Espagne' }, { code: 'IT', label: 'Italie' },
  { code: 'PT', label: 'Portugal' }, { code: 'NL', label: 'Pays-Bas' }, { code: 'LU', label: 'Luxembourg' },
  { code: 'GB', label: 'Royaume-Uni' }, { code: 'US', label: 'États-Unis' }, { code: 'CA', label: 'Canada' },
  { code: 'MA', label: 'Maroc' }, { code: 'DZ', label: 'Algérie' }, { code: 'TN', label: 'Tunisie' },
  { code: 'AE', label: 'Émirats arabes unis' }, { code: 'SA', label: 'Arabie saoudite' }, { code: 'QA', label: 'Qatar' },
];
// Liste complète de pays (FR) pour le sélecteur avec drapeaux. @author Rabah Ziane - 2026-06-06
const COUNTRIES_FULL: { code: string; name: string }[] = [
  { code: 'FR', name: 'France' }, { code: 'BE', name: 'Belgique' }, { code: 'CH', name: 'Suisse' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MC', name: 'Monaco' }, { code: 'DE', name: 'Allemagne' }, { code: 'AT', name: 'Autriche' }, { code: 'ES', name: 'Espagne' },
  { code: 'PT', name: 'Portugal' }, { code: 'IT', name: 'Italie' }, { code: 'NL', name: 'Pays-Bas' }, { code: 'GB', name: 'Royaume-Uni' },
  { code: 'IE', name: 'Irlande' }, { code: 'DK', name: 'Danemark' }, { code: 'SE', name: 'Suède' }, { code: 'NO', name: 'Norvège' },
  { code: 'FI', name: 'Finlande' }, { code: 'IS', name: 'Islande' }, { code: 'PL', name: 'Pologne' }, { code: 'CZ', name: 'Tchéquie' },
  { code: 'SK', name: 'Slovaquie' }, { code: 'HU', name: 'Hongrie' }, { code: 'RO', name: 'Roumanie' }, { code: 'BG', name: 'Bulgarie' },
  { code: 'GR', name: 'Grèce' }, { code: 'HR', name: 'Croatie' }, { code: 'SI', name: 'Slovénie' }, { code: 'RS', name: 'Serbie' },
  { code: 'BA', name: 'Bosnie-Herzégovine' }, { code: 'AL', name: 'Albanie' }, { code: 'MK', name: 'Macédoine du Nord' }, { code: 'ME', name: 'Monténégro' },
  { code: 'EE', name: 'Estonie' }, { code: 'LV', name: 'Lettonie' }, { code: 'LT', name: 'Lituanie' }, { code: 'UA', name: 'Ukraine' },
  { code: 'BY', name: 'Biélorussie' }, { code: 'RU', name: 'Russie' }, { code: 'MD', name: 'Moldavie' }, { code: 'CY', name: 'Chypre' },
  { code: 'MT', name: 'Malte' }, { code: 'TR', name: 'Turquie' },
  { code: 'MA', name: 'Maroc' }, { code: 'DZ', name: 'Algérie' }, { code: 'TN', name: 'Tunisie' }, { code: 'LY', name: 'Libye' },
  { code: 'EG', name: 'Égypte' }, { code: 'MR', name: 'Mauritanie' }, { code: 'SN', name: 'Sénégal' }, { code: 'ML', name: 'Mali' },
  { code: 'CI', name: "Côte d'Ivoire" }, { code: 'BF', name: 'Burkina Faso' }, { code: 'NE', name: 'Niger' }, { code: 'GN', name: 'Guinée' },
  { code: 'TG', name: 'Togo' }, { code: 'BJ', name: 'Bénin' }, { code: 'GH', name: 'Ghana' }, { code: 'NG', name: 'Nigéria' },
  { code: 'CM', name: 'Cameroun' }, { code: 'GA', name: 'Gabon' }, { code: 'CG', name: 'Congo' }, { code: 'CD', name: 'RD Congo' },
  { code: 'TD', name: 'Tchad' }, { code: 'CF', name: 'Centrafrique' }, { code: 'ET', name: 'Éthiopie' }, { code: 'KE', name: 'Kenya' },
  { code: 'TZ', name: 'Tanzanie' }, { code: 'UG', name: 'Ouganda' }, { code: 'RW', name: 'Rwanda' }, { code: 'ZA', name: 'Afrique du Sud' },
  { code: 'AO', name: 'Angola' }, { code: 'MZ', name: 'Mozambique' }, { code: 'MG', name: 'Madagascar' }, { code: 'MU', name: 'Maurice' },
  { code: 'SA', name: 'Arabie saoudite' }, { code: 'AE', name: 'Émirats arabes unis' }, { code: 'QA', name: 'Qatar' }, { code: 'KW', name: 'Koweït' },
  { code: 'BH', name: 'Bahreïn' }, { code: 'OM', name: 'Oman' }, { code: 'JO', name: 'Jordanie' }, { code: 'LB', name: 'Liban' },
  { code: 'IL', name: 'Israël' }, { code: 'PS', name: 'Palestine' }, { code: 'IQ', name: 'Irak' }, { code: 'IR', name: 'Iran' },
  { code: 'SY', name: 'Syrie' }, { code: 'YE', name: 'Yémen' },
  { code: 'US', name: 'États-Unis' }, { code: 'CA', name: 'Canada' }, { code: 'MX', name: 'Mexique' }, { code: 'BR', name: 'Brésil' },
  { code: 'AR', name: 'Argentine' }, { code: 'CL', name: 'Chili' }, { code: 'CO', name: 'Colombie' }, { code: 'PE', name: 'Pérou' },
  { code: 'VE', name: 'Venezuela' }, { code: 'UY', name: 'Uruguay' }, { code: 'EC', name: 'Équateur' }, { code: 'BO', name: 'Bolivie' },
  { code: 'PY', name: 'Paraguay' }, { code: 'HT', name: 'Haïti' }, { code: 'DO', name: 'République dominicaine' }, { code: 'CU', name: 'Cuba' },
  { code: 'CN', name: 'Chine' }, { code: 'JP', name: 'Japon' }, { code: 'KR', name: 'Corée du Sud' }, { code: 'IN', name: 'Inde' },
  { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' }, { code: 'ID', name: 'Indonésie' }, { code: 'MY', name: 'Malaisie' },
  { code: 'SG', name: 'Singapour' }, { code: 'TH', name: 'Thaïlande' }, { code: 'VN', name: 'Viêt Nam' }, { code: 'PH', name: 'Philippines' },
  { code: 'AF', name: 'Afghanistan' }, { code: 'KZ', name: 'Kazakhstan' }, { code: 'UZ', name: 'Ouzbékistan' }, { code: 'AZ', name: 'Azerbaïdjan' },
  { code: 'GE', name: 'Géorgie' }, { code: 'AM', name: 'Arménie' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'NP', name: 'Népal' },
  { code: 'AU', name: 'Australie' }, { code: 'NZ', name: 'Nouvelle-Zélande' },
];
// Indicatifs téléphoniques (E.164) par code ISO-2, pour le sélecteur WhatsApp. @author Rabah Ziane - 2026-06-24
const DIAL_CODES: Record<string, string> = {
  FR: '33', BE: '32', CH: '41', LU: '352', MC: '377', DE: '49', AT: '43', ES: '34', PT: '351', IT: '39', NL: '31', GB: '44',
  IE: '353', DK: '45', SE: '46', NO: '47', FI: '358', IS: '354', PL: '48', CZ: '420', SK: '421', HU: '36', RO: '40', BG: '359',
  GR: '30', HR: '385', SI: '386', RS: '381', BA: '387', AL: '355', MK: '389', ME: '382', EE: '372', LV: '371', LT: '370',
  UA: '380', BY: '375', RU: '7', MD: '373', CY: '357', MT: '356', TR: '90',
  MA: '212', DZ: '213', TN: '216', LY: '218', EG: '20', MR: '222', SN: '221', ML: '223', CI: '225', BF: '226', NE: '227',
  GN: '224', TG: '228', BJ: '229', GH: '233', NG: '234', CM: '237', GA: '241', CG: '242', CD: '243', TD: '235', CF: '236',
  ET: '251', KE: '254', TZ: '255', UG: '256', RW: '250', ZA: '27', AO: '244', MZ: '258', MG: '261', MU: '230',
  SA: '966', AE: '971', QA: '974', KW: '965', BH: '973', OM: '968', JO: '962', LB: '961', IL: '972', PS: '970', IQ: '964',
  IR: '98', SY: '963', YE: '967',
  US: '1', CA: '1', MX: '52', BR: '55', AR: '54', CL: '56', CO: '57', PE: '51', VE: '58', UY: '598', EC: '593', BO: '591',
  PY: '595', HT: '509', DO: '1', CU: '53',
  CN: '86', JP: '81', KR: '82', IN: '91', PK: '92', BD: '880', ID: '62', MY: '60', SG: '65', TH: '66', VN: '84', PH: '63',
  AF: '93', KZ: '7', UZ: '998', AZ: '994', GE: '995', AM: '374', LK: '94', NP: '977', AU: '61', NZ: '64',
};
type WaCountry = { code: string; name: string; dial: string };
const WA_COUNTRIES: WaCountry[] = COUNTRIES_FULL.filter((c) => DIAL_CODES[c.code]).map((c) => ({ ...c, dial: DIAL_CODES[c.code] }));
// Drapeau emoji depuis le code ISO-2.
function flagEmoji(code: string) { return (code || '').toUpperCase().replace(/[A-Z]/g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0))); }

// Sélecteur de pays avec drapeaux + recherche (liste ou barre de recherche). @author Rabah Ziane - 2026-06-06
function CountrySelect({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sel = COUNTRIES_FULL.find((c) => c.name === value || c.code === (value || '').toUpperCase());
  const list = q ? COUNTRIES_FULL.filter((c) => norm(c.name).includes(norm(q)) || c.code.toLowerCase() === q.toLowerCase()) : COUNTRIES_FULL;
  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen((o) => !o); setQ(''); }} className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-left focus:outline-none focus:border-[#0066CC]">
        <span className={sel ? 'text-white' : 'text-white/30'}>{sel ? `${flagEmoji(sel.code)}  ${sel.name}` : (value || 'Pays (auto)')}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full rounded-lg bg-[#181A20] border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-white/10">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un pays…" className="w-full px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {list.length === 0 ? <p className="px-3 py-3 text-[12.5px] text-white/40">Aucun pays</p> : list.map((c) => (
                <button key={c.code} type="button" onClick={() => { onChange(c.name); setOpen(false); setQ(''); }} className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2.5 hover:bg-white/5 ${sel?.code === c.code ? 'text-[#4da3ff]' : 'text-white/80'}`}>
                  <span className="text-[15px]">{flagEmoji(c.code)}</span> {c.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
const IBAN_FIELDS = [{ key: 'iban', label: 'IBAN', mono: true }, { key: 'bic', label: 'BIC / SWIFT', mono: true }];
const BANK_FIELDS_BY_COUNTRY: Record<string, { key: string; label: string; mono?: boolean }[]> = {
  FR: IBAN_FIELDS, BE: IBAN_FIELDS, CH: IBAN_FIELDS, DE: IBAN_FIELDS, ES: IBAN_FIELDS, IT: IBAN_FIELDS,
  PT: IBAN_FIELDS, NL: IBAN_FIELDS, LU: IBAN_FIELDS,
  GB: [{ key: 'sortCode', label: 'Sort code', mono: true }, { key: 'accountNumber', label: 'Account number', mono: true }, { key: 'iban', label: 'IBAN (optionnel)', mono: true }],
  US: [{ key: 'routingNumber', label: 'Routing number (ABA)', mono: true }, { key: 'accountNumber', label: 'Account number', mono: true }, { key: 'bankName', label: 'Nom de la banque' }],
  CA: [{ key: 'institution', label: 'Institution number', mono: true }, { key: 'transit', label: 'Transit number', mono: true }, { key: 'accountNumber', label: 'Account number', mono: true }],
  MA: [{ key: 'rib', label: 'RIB (24 chiffres)', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  DZ: [{ key: 'rib', label: 'RIB (20 chiffres)', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  TN: [{ key: 'rib', label: 'RIB (20 chiffres)', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  AE: [{ key: 'iban', label: 'IBAN', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  SA: [{ key: 'iban', label: 'IBAN', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  QA: [{ key: 'iban', label: 'IBAN', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
};
function bankFieldsFor(country: string) { return BANK_FIELDS_BY_COUNTRY[country] || IBAN_FIELDS; }
type Commercial = { id: string; name: string; email: string; status?: string; clients: number; dossiers: number; gains: number };
type Lead = { _id: string; email?: string; accountantEmail?: string; managerEmail?: string; denom?: string; siret?: string; opco?: string; addr?: string; status: string; createdAt?: string; commercialId?: string; commercialName?: string; waitingNote?: string; reminderAt?: string | null; formationDoneThisYear?: boolean; companyEmployees?: number; rdvAt?: string | null; confirmationEmailSentAt?: string | null; tasks?: DossierTask[] };
type DossierSalarie = { firstname?: string; lastname?: string; email?: string; poste?: string; type_contrat?: string; date_naissance?: string; num_secu?: string; telephone?: string };
type Dossier = { _id: string; leadId?: string; mountedByAdmin?: boolean; denom?: string; siret?: string; opco?: string; addr?: string; formationTitle?: string; sessionName?: string; sessionStart?: string; sessionEnd?: string; amountHT?: number; status: string; createdAt?: string; updatedAt?: string; opcoPaid?: boolean; opcoPaidAt?: string | null; encashRequestedAt?: string | null; invoiceNumber?: string; signedBy?: string; signedFunction?: string; aktoAttached?: boolean; aktoAttachedAt?: string | null; rattachEmailSentAt?: string | null; rdvAt?: string | null; confirmationEmailSentAt?: string | null; salariesPending?: boolean; clientEmail?: string; salaries?: DossierSalarie[]; tasks?: DossierTask[] };
// Cible d'un email de confirmation : un dossier OPCO (monté) OU un client/lead (pas encore monté). @Rabah 2026-06-25
type ConfirmTarget = { kind: 'dossier' | 'lead'; id: string; clientEmail?: string; denom?: string; rdvAt?: string | null; confirmationEmailSentAt?: string | null };
type Period = 'day' | 'week' | 'month' | 'all';
const PERIOD_MS: Record<Period, number> = { day: 86400000, week: 7 * 86400000, month: 30 * 86400000, all: Infinity };
const PERIOD_LABEL: Record<Period, string> = { day: 'Jour', week: 'Semaine', month: 'Mois', all: 'Tout' };

// Pipeline du dossier OPCO jusqu'au paiement.
const DOSSIER_META: Record<string, { label: string; cls: string; step: number }> = {
  transmitted: { label: 'Transmis', cls: 'bg-white/10 text-white/70 border-white/15', step: 1 },
  instruction: { label: 'En instruction OPCO', cls: 'bg-[#0066CC]/15 text-[#2997FF] border-[#0066CC]/30', step: 2 },
  accepted: { label: 'Financement accepté', cls: 'bg-[#3DD68C]/15 text-[#3DD68C] border-[#3DD68C]/30', step: 3 },
  scheduled: { label: 'Programmé', cls: 'bg-[#3DD68C]/15 text-[#3DD68C] border-[#3DD68C]/30', step: 4 },
  completed: { label: 'Terminé', cls: 'bg-[#3DD68C]/15 text-[#3DD68C] border-[#3DD68C]/30', step: 5 },
  invoiced: { label: 'Facturé', cls: 'bg-[#E5B567]/15 text-[#E5B567] border-[#E5B567]/30', step: 6 },
  paid: { label: 'Payé ✓', cls: 'bg-[#3DD68C]/20 text-[#3DD68C] border-[#3DD68C]/40', step: 7 },
  rejected: { label: 'Refusé', cls: 'bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/30', step: 0 },
};
const DOSSIER_TOTAL_STEPS = 7;

// Detection OPCO. Source la plus FIABLE = l'IDCC (convention collective) declare a l'INSEE,
// mappe vers l'OPCO de rattachement (correspondance France Competences). A defaut d'IDCC,
// repli heuristique par code NAF/APE. @author Rabah Ziane - 2026-06-05
const IDCC_OPCO: Record<string, string> = {
  // AKTO (hôtellerie-restauration, organismes de formation, intermittents...)
  '1979': 'AKTO', '1980': 'AKTO',           // HCR (Hôtels, Cafés, Restaurants)
  '1501': 'AKTO',                            // Restauration rapide
  '2691': 'AKTO', '1516': 'AKTO',            // Organismes de formation
  '1266': 'AKTO',                            // Restauration de collectivités
  '2511': 'AKTO',                            // Sport
  '3168': 'AKTO',                            // Enseignement privé indépendant
  // OPCO EP (entreprises de proximité, artisanat alimentaire, services)
  '0843': 'OPCO EP', '843': 'OPCO EP',       // Boulangerie-pâtisserie artisanale
  '0992': 'OPCO EP', '992': 'OPCO EP',       // Boucherie
  '0953': 'OPCO EP', '953': 'OPCO EP',       // Charcuterie de détail
  '1267': 'OPCO EP',                         // Pâtisserie
  '1978': 'OPCO EP',                         // Fleuristes
  '1996': 'OPCO EP',                         // Pharmacie d'officine
  '1431': 'OPCO EP',                         // Optique-lunetterie de détail
  '2596': 'OPCO EP',                         // Coiffure
  // Autres OPCO courants
  '1486': 'Atlas', '1672': 'Atlas',          // Bureaux d'études / assurances
  '1090': 'ANFA', '1619': 'ANFA',            // Services de l'automobile
  '0016': 'OPCO Mobilités', '0018': 'OPCO Mobilités',
};
function detectOpco(ape: string, idccList?: string[]): { opco: string; idcc?: string; exact: boolean } {
  // 1) Par IDCC déclaré (exact)
  for (const raw of (idccList || [])) {
    const idcc = String(raw).replace(/[^0-9]/g, '');
    if (idcc && IDCC_OPCO[idcc]) return { opco: IDCC_OPCO[idcc], idcc, exact: true };
    if (idcc && IDCC_OPCO[idcc.padStart(4, '0')]) return { opco: IDCC_OPCO[idcc.padStart(4, '0')], idcc, exact: true };
  }
  // 2) Repli par code NAF/APE (heuristique)
  const code = (ape || '').replace(/[^0-9]/g, '').slice(0, 2);
  let opco = 'OPCO EP';
  if (['55', '56'].includes(code)) opco = 'AKTO';            // Hôtellerie-Café-Restauration
  else if (['85'].includes(code)) opco = 'AKTO';            // Enseignement / organismes de formation
  else if (['41', '42', '43'].includes(code)) opco = 'Constructys';
  else if (['45'].includes(code)) opco = 'ANFA';            // Auto
  else if (['86', '87', '88'].includes(code)) opco = 'OPCO Santé';
  else if (['49', '50', '51', '52', '53'].includes(code)) opco = 'OPCO Mobilités';
  const firstIdcc = (idccList || []).map((x) => String(x).replace(/[^0-9]/g, '')).find(Boolean);
  return { opco, idcc: firstIdcc, exact: false };
}


/**
 * Encadré des dates de formation dans la liste des clients : évite d'ouvrir le dossier
 * uniquement pour savoir quand la session est prévue. Version sombre du badge admin.
 * @author Rabah Ziane · 2026-07-20
 */
function SessionDatesBadge({ start, end }: { start?: string; end?: string }) {
  if (!start) return null;
  const d1 = new Date(start);
  const d2 = end ? new Date(end) : null;
  const dow = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase();
  const day = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const sameDay = d2 && d1.toDateString() === d2.toDateString();
  return (
    <span className="inline-flex flex-col px-2.5 py-1 rounded-lg border border-[#3DD68C]/35 bg-[#3DD68C]/10 leading-tight">
      <span className="text-[8.5px] font-bold tracking-wider text-[#3DD68C]/70 uppercase">Formation prévue</span>
      <span className="text-[9px] font-extrabold tracking-wider text-[#3DD68C] mt-0.5">{d2 && !sameDay ? `${dow(d1)} → ${dow(d2)}` : dow(d1)}</span>
      <span className="text-[11.5px] font-bold text-white whitespace-nowrap">{d2 && !sameDay ? `${day(d1)} → ${day(d2)} ${d2.getFullYear()}` : `${day(d1)} ${d1.getFullYear()}`}</span>
    </span>
  );
}

export default function AgenceSpace() {
  // Mode prévisualisation super admin : /agence#preview=<jwt> ouvre le tableau de bord de l'agence
  // tel qu'elle le voit. Le token n'est PAS persisté en localStorage (n'écrase aucune session
  // agence existante) et disparaît à la fermeture de l'onglet. @author Rabah Ziane - 2026-06-24
  const previewToken = (() => {
    if (typeof window === 'undefined') return null;
    const m = window.location.hash.match(/(?:^|[#&])preview=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  })();
  const [token, setToken] = useState<string | null>(() => previewToken || localStorage.getItem(TOKEN_KEY));
  if (!token) return <Login onAuth={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;
  if (previewToken) return <Dashboard token={token} preview onLogout={() => { try { window.close(); } catch { /* */ } }} />;
  return <Dashboard token={token} onLogout={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); }} />;
}

function Login({ onAuth }: { onAuth: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
      const j = await r.json();
      if (!r.ok || !j.token) { setError(/invalid email or password/i.test(j.error || j.message || '') ? 'Email ou mot de passe incorrect.' : (j.error || j.message || 'Identifiants invalides')); return; }
      if (j.user?.role !== 'agence' && j.user?.role !== 'agence_commercial') { setError("Ce compte n'est pas un compte agence partenaire."); return; }
      onAuth(j.token);
    } catch { setError('Erreur réseau'); } finally { setLoading(false); }
  }
  return (
    <main className="min-h-screen flex items-center justify-center px-5" style={DOTTED_BG}>
      <form onSubmit={submit} className="w-full max-w-sm bg-[#181A20] rounded-2xl border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-1"><span className="inline-flex h-7 px-2 rounded-lg bg-white items-center"><img src={LOGO_URL} alt="Delivery Digital" className="h-4 w-auto" /></span><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50">Espace Agence</p></div>
        <h1 className="text-xl font-bold text-white mb-4">Connexion partenaire</h1>
        <label className="block text-[12px] font-semibold text-white/80 mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-[14px] mb-3 focus:outline-none focus:border-[#0066CC]" />
        <label className="block text-[12px] font-semibold text-white/80 mb-1">Mot de passe</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-[14px] mb-4 focus:outline-none focus:border-[#0066CC]" />
        {error && <p className="text-[12.5px] text-[#FF6B6B] mb-3">{error}</p>}
        <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0066CC] text-white text-[13px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Se connecter</button>
        <p className="text-[11.5px] text-white/40 mt-3 text-center">Vos accès vous sont fournis par Delivery Digital. En cas de problème, contactez-nous pour recevoir vos accès.</p>
      </form>
    </main>
  );
}

function Dashboard({ token, onLogout, preview }: { token: string; onLogout: () => void; preview?: boolean }) {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dossierByLead, setDossierByLead] = useState<Record<string, Dossier>>({});
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  // Ordres de virement reçus (PDF) générés par Delivery Digital. @Rabah 2026-07-29
  const [payOrders, setPayOrders] = useState<{ _id: string; ref: string; totalCommission?: number; pdfUrl?: string; sentAt?: string; paidAt?: string; createdAt?: string; updatedAt?: string; lines?: { denom?: string; month?: string; total?: number }[] }[]>([]);
  const pdfHref = (o: { pdfUrl?: string; updatedAt?: string }) => `${o.pdfUrl || ''}?v=${o.updatedAt ? Date.parse(o.updatedAt) : ''}`;
  const [showGains, setShowGains] = useState(false); // détail des gains acquis (virements payés)
  // Revente Pyemes : ventes/commissions de l'agence + statut onboarding Stripe. @author Rabah Ziane - 2026-08-01
  const [pyemesData, setPyemesData] = useState<{ active?: boolean; code?: string; lien?: string; contract?: { signed?: boolean; signedAt?: string | null; signedBy?: string | null }; pitches?: { id: string; to: string; template: string; at: string; openedAt?: string | null; clientName?: string; siret?: string }[]; totaux?: { a_venir: number; disponible: number; paye: number }; clients?: { email: string; statut: string; depuis?: string }[]; commissions?: { id: string; client?: string; base: number; commission: number; etat: string; date?: string }[]; agence?: { commission_percent?: number } } | null>(null);
  const [pyemesConnect, setPyemesConnect] = useState<{ onboarde?: boolean; demarre?: boolean } | null>(null);
  const [pyemesBusy, setPyemesBusy] = useState(false);
  const [pyemesSign, setPyemesSign] = useState({ by: '', fn: '' }); // signature avenant
  const [pyemesSignBusy, setPyemesSignBusy] = useState(false);
  // Feuille de route Pyemes (avant mise en ligne) : taches partagees DD <-> agence, import d'une
  // checklist et fil de messages. @author Rabah Ziane - 2026-08-31
  type RoadTache = { id: string; from: 'dd' | 'agence'; titre: string; detail?: string; statut: 'a_faire' | 'en_cours' | 'fait'; source?: string; createdAt?: string; doneAt?: string | null };
  type RoadMsg = { id: string; from: 'dd' | 'agence'; auteur?: string; texte: string; image?: string; at?: string };
  const [roadTaches, setRoadTaches] = useState<RoadTache[]>([]);
  const [roadMsgs, setRoadMsgs] = useState<RoadMsg[]>([]);
  const [roadTitre, setRoadTitre] = useState('');
  const [roadMsg, setRoadMsg] = useState('');
  const [roadBusy, setRoadBusy] = useState(false);
  const [roadImport, setRoadImport] = useState(false); // lecture du fichier en cours
  const [roadInfo, setRoadInfo] = useState('');
  const roadFile = useRef<HTMLInputElement | null>(null);
  const roadChatFile = useRef<HTMLInputElement | null>(null);
  // Publications reseaux sociaux : l'agence depose sa video + le texte, Pyemes valide avant
  // publication. @author Rabah Ziane - 2026-08-31
  type Publication = { id: string; fichier: string; nomFichier?: string; taille?: number; reseaux: string[]; comptes?: string[]; datePrevue?: string | null; texte?: string; statut: 'a_valider' | 'validee' | 'a_revoir' | 'publiee'; retour?: string; decidePar?: string; createdAt?: string };
  const RESEAUX = [
    { id: 'instagram', nom: 'Instagram' }, { id: 'tiktok', nom: 'TikTok' }, { id: 'linkedin', nom: 'LinkedIn' },
    { id: 'facebook', nom: 'Facebook' }, { id: 'youtube', nom: 'YouTube' }, { id: 'x', nom: 'X' },
  ];
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [pubVideo, setPubVideo] = useState<File | null>(null);
  const [pubReseaux, setPubReseaux] = useState<string[]>([]);
  const [pubDate, setPubDate] = useState('');
  const [pubTexte, setPubTexte] = useState('');
  const [pubComptes, setPubComptes] = useState('');   // comptes de publication, reperes au @
  const [pubBusy, setPubBusy] = useState(false);
  const [pubInfo, setPubInfo] = useState('');
  const pubFile = useRef<HTMLInputElement | null>(null);
  // Apercu de la video AVANT envoi : on voit ce qu'on depose. L'URL locale est liberee des qu'on
  // change de fichier (sinon la memoire du navigateur la garde). @author Rabah Ziane - 2026-08-31
  const [pubApercu, setPubApercu] = useState<string>('');
  useEffect(() => {
    if (!pubVideo) { setPubApercu(''); return; }
    const url = URL.createObjectURL(pubVideo);
    setPubApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [pubVideo]);

  async function chargerPublications() {
    const r = await fetch('/api/agency/self/pyemes/publications', { headers: auth() }).then((x) => x.json()).catch(() => null);
    if (r?.ok) setPubs(r.publications || []);
  }
  async function envoyerPublication() {
    if (!pubVideo || pubReseaux.length === 0 || pubBusy) return;
    setPubBusy(true); setPubInfo('');
    const fd = new FormData();
    fd.append('video', pubVideo);
    fd.append('reseaux', pubReseaux.join(','));
    if (pubDate) fd.append('datePrevue', pubDate);
    fd.append('texte', pubTexte);
    fd.append('comptes', pubComptes);
    const r = await fetch('/api/agency/self/pyemes/publications', { method: 'POST', headers: auth(), body: fd }).then((x) => x.json()).catch(() => null);
    if (r?.ok) { setPubs(r.publications || []); setPubVideo(null); setPubReseaux([]); setPubDate(''); setPubTexte(''); setPubComptes(''); setPubInfo('Envoyé pour validation.'); }
    else setPubInfo(r?.error === 'video_requise' ? 'Ajoutez une vidéo.' : r?.error === 'reseau_requis' ? 'Choisissez au moins un réseau.' : "L'envoi n'a pas abouti (vidéo trop lourde ?).");
    setPubBusy(false);
  }
  async function marquerPubliee(id: string) {
    const r = await fetch(`/api/agency/self/pyemes/publications/${id}`, { method: 'PATCH', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: 'publiee' }) }).then((x) => x.json()).catch(() => null);
    if (r?.ok) setPubs(r.publications || []);
  }
  const [roadPiece, setRoadPiece] = useState<File | null>(null); // capture jointe au message

  // Bip discret a l'arrivee d'un message de Delivery Digital (l'agence peut etre sur un autre
  // onglet). Pas de fichier son : un WebAudio court. @Rabah 2026-08-31
  const nbMsgVus = useRef(-1);
  const bip = () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.05;
      o.connect(g); g.connect(ctx.destination); o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 160);
    } catch { /* le son n'est jamais bloquant */ }
  };

  async function chargerRoadmap() {
    const r = await fetch('/api/agency/self/pyemes/roadmap', { headers: auth() }).then((x) => x.json()).catch(() => null);
    if (r?.ok) {
      setRoadTaches(r.taches || []);
      const msgs = r.messages || [];
      const nbDD = msgs.filter((m: RoadMsg) => m.from === 'dd').length;
      if (nbMsgVus.current >= 0 && nbDD > nbMsgVus.current) bip();
      nbMsgVus.current = nbDD;
      setRoadMsgs(msgs);
    }
  }
  const appliquerRoadmap = (r: any) => { if (r?.ok) { setRoadTaches(r.taches || []); setRoadMsgs(r.messages || []); } };

  async function ajouterTache() {
    const titre = roadTitre.trim();
    if (!titre || roadBusy) return;
    setRoadBusy(true); setRoadInfo('');
    const r = await fetch('/api/agency/self/pyemes/roadmap', { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ titre }) }).then((x) => x.json()).catch(() => null);
    appliquerRoadmap(r); setRoadTitre(''); setRoadBusy(false);
  }
  async function changerStatutTache(id: string, statut: string) {
    const r = await fetch(`/api/agency/self/pyemes/roadmap/${id}`, { method: 'PATCH', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ statut }) }).then((x) => x.json()).catch(() => null);
    appliquerRoadmap(r);
  }
  async function supprimerTache(id: string) {
    const r = await fetch(`/api/agency/self/pyemes/roadmap/${id}`, { method: 'DELETE', headers: auth() }).then((x) => x.json()).catch(() => null);
    appliquerRoadmap(r);
  }
  async function importerChecklist(f: File) {
    setRoadBusy(true); setRoadImport(true); setRoadInfo('');
    const fd = new FormData(); fd.append('fichier', f);
    const r = await fetch('/api/agency/self/pyemes/roadmap/import', { method: 'POST', headers: auth(), body: fd }).then((x) => x.json()).catch(() => null);
    if (r?.ok) { appliquerRoadmap(r); setRoadInfo(`${r.ajoutees} tâche(s) importée(s) depuis ${f.name}`); }
    else setRoadInfo(r?.error === 'aucune_tache_trouvee' ? 'Aucune ligne exploitable dans ce fichier.' : "Impossible de lire ce fichier.");
    setRoadBusy(false); setRoadImport(false);
  }
  async function envoyerMessage() {
    const texte = roadMsg.trim();
    if ((!texte && !roadPiece) || roadBusy) return;
    setRoadBusy(true);
    // Multipart : le message peut porter une capture, comme sur l'espace client. @Rabah 2026-08-31
    const fd = new FormData();
    fd.append('texte', texte);
    if (roadPiece) fd.append('image', roadPiece);
    const r = await fetch('/api/agency/self/pyemes/messages', { method: 'POST', headers: auth(), body: fd }).then((x) => x.json()).catch(() => null);
    appliquerRoadmap(r); setRoadMsg(''); setRoadPiece(null); setRoadBusy(false);
  }
  // Projet actif (slider en haut) : on ne mélange pas Formation/Informatique et Pyemes. @Rabah 2026-08-01
  const [project, setProject] = useState<'formation' | 'informatique' | 'pyemes'>('formation');
  const [pitchTo, setPitchTo] = useState(''); // email client pour envoyer l'argumentaire Pyemes
  const [pitchName, setPitchName] = useState(''); // nom de l'entreprise du client (identification)
  const [pitchSiret, setPitchSiret] = useState(''); // SIRET du client (identification sûre)
  const [pitchSug, setPitchSug] = useState<{ nom: string; siret: string; ville?: string }[]>([]); // suggestions annuaire
  const [pitchSugOpen, setPitchSugOpen] = useState(false);
  const pitchPick = useRef(false); // évite de relancer la recherche juste après une sélection
  const [pitchAud, setPitchAud] = useState<'independant' | 'entreprise' | 'comptable'>('independant');
  const [simuOpen, setSimuOpen] = useState(false); // simulateur de commission par forfait (dépliant)
  const [pitchBusy, setPitchBusy] = useState(false);
  // Arguments par type de client : ils changent avec le sélecteur. @Rabah 2026-08-01
  const argsParAudience: Record<'independant' | 'entreprise' | 'comptable', string[]> = {
    independant: [
      'Connectez votre banque en 2 minutes (DSP2 sécurisé).',
      'Livre des recettes et suivi URSSAF automatiques.',
      'Aucune liasse ni TVA à gérer en franchise en base.',
      'À partir de 29 €/mois, données hébergées en France 🇫🇷.',
    ],
    entreprise: [
      'Banque synchronisée, écritures catégorisées automatiquement.',
      'TVA et liasses fiscales officielles (2033, 2065) générées.',
      'Export FEC conforme, prêt en cas de contrôle.',
      'À partir de 49 €/mois - rattrapage des exercices en retard possible.',
    ],
    comptable: [
      'Tableau de bord multi-clients : tous vos dossiers au même endroit.',
      'Catégorisation automatique en continu.',
      'TVA, liasses et export FEC par dossier.',
      'Tarif cabinet dégressif - 1 entreprise incluse par comptable.',
    ],
  };
  const argumentairePyemes = argsParAudience[pitchAud];
  // Détection auto : on interroge l'annuaire officiel (proxy backend) quand on tape le nom d'entreprise.
  // @author Rabah Ziane - 2026-08-01
  useEffect(() => {
    if (pitchPick.current) { pitchPick.current = false; return; }
    const q = pitchName.trim();
    if (q.length < 3) { setPitchSug([]); setPitchSugOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/agency/self/pyemes/recherche-entreprise?q=${encodeURIComponent(q)}`, { headers: auth() });
        const j = await r.json();
        if (j.ok) { setPitchSug(j.resultats || []); setPitchSugOpen((j.resultats || []).length > 0); }
      } catch { /* recherche silencieuse */ }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitchName]);
  // Suppression d'un envoi (ou de tout l'historique) : l'agence garde la main sur ses tests. @Rabah 2026-08-01
  // La feuille de route se charge avec l'onglet Pyemes. @Rabah 2026-08-31
  // Feuille de route en TEMPS REEL tant que l'onglet Pyemes est ouvert : les messages de Delivery
  // Digital arrivent tout seuls (avant, il fallait recharger la page). Meme cadence que le support
  // Pyemes. Les publications changent moins souvent : toutes les 10 s. @author Rabah Ziane - 2026-08-31
  useEffect(() => {
    if (project !== 'pyemes') return;
    chargerRoadmap(); chargerPublications();
    const t1 = setInterval(chargerRoadmap, 2000);
    const t2 = setInterval(chargerPublications, 10000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  async function rechargerPyemes() { const p = await fetch('/api/agency/self/pyemes', { headers: auth() }).then((x) => x.json()); if (p.ok) setPyemesData(p); }
  async function supprimerPitch(id: string) {
    try { await fetch(`/api/agency/self/pyemes/pitch/${id}`, { method: 'DELETE', headers: auth() }); await rechargerPyemes(); } catch { alert('Suppression impossible.'); }
  }
  async function viderPitches() {
    if (!confirm('Effacer tout l\'historique des envois ?')) return;
    try { await fetch('/api/agency/self/pyemes/pitches', { method: 'DELETE', headers: auth() }); await rechargerPyemes(); } catch { alert('Suppression impossible.'); }
  }
  async function envoyerPitch() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pitchTo.trim())) { alert('Email client invalide.'); return; }
    // SIRET = 14 chiffres (optionnel) : si saisi, on vérifie le format pour une identification sûre.
    const siret = pitchSiret.replace(/\s/g, '');
    if (siret && !/^\d{14}$/.test(siret)) { alert('SIRET invalide (14 chiffres).'); return; }
    setPitchBusy(true);
    try {
      const r = await fetch('/api/agency/self/pyemes/send-pitch', { method: 'POST', headers: authJson(), body: JSON.stringify({ clientEmail: pitchTo.trim(), audience: pitchAud, clientName: pitchName.trim(), siret }) });
      const j = await r.json();
      if (j.ok) { setPitchTo(''); setPitchName(''); setPitchSiret(''); const p = await fetch('/api/agency/self/pyemes', { headers: auth() }).then((x) => x.json()); if (p.ok) setPyemesData(p); alert('Argumentaire + PDF envoyés au client ✓'); }
      else alert('Erreur : ' + (j.error || ''));
    } catch { alert('Envoi impossible.'); } finally { setPitchBusy(false); }
  }
  const [period, setPeriod] = useState<Period>('month');
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([]);
  const [coName, setCoName] = useState('');
  const [coEmail, setCoEmail] = useState('');
  const [coBusy, setCoBusy] = useState(false);
  const [coCreated, setCoCreated] = useState<{ email: string; password: string } | null>(null);
  const [accessByEmail, setAccessByEmail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false); // token invalide/expiré (surtout en prévisualisation admin)
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [denom, setDenom] = useState('');
  const [email, setEmail] = useState('');
  const [accountantEmail, setAccountantEmail] = useState(''); // email comptable du client
  const [managerEmail, setManagerEmail] = useState(''); // email gérant (destinataire convention)
  const [siret, setSiret] = useState('');
  const [opco, setOpco] = useState('OPCO EP');
  const [companyEmployees, setCompanyEmployees] = useState(''); // nombre de salariés de l'entreprise cliente
  const [formationDoneThisYear, setFormationDoneThisYear] = useState(false); // formation déjà effectuée cette année ?
  const [detectedAddr, setDetectedAddr] = useState(''); // adresse établissement détectée (pour le tampon convention)
  const [creating, setCreating] = useState(false);
  const [detectMsg, setDetectMsg] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [bankCountry, setBankCountry] = useState('FR');
  const [bankFields, setBankFields] = useState<Record<string, string>>({});
  const [bankHolder, setBankHolder] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [uploadingRib, setUploadingRib] = useState(false);
  const [company, setCompany] = useState<CompanyInfo>({});
  const [savingCompany, setSavingCompany] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  const [companyDetectMsg, setCompanyDetectMsg] = useState('');
  const [companyDetecting, setCompanyDetecting] = useState(false);
  const [signFunction, setSignFunction] = useState('');
  const [signing, setSigning] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [detailFormation, setDetailFormation] = useState<Formation | null>(null);
  const [encashDossier, setEncashDossier] = useState<Dossier | null>(null);
  const [openTimeline, setOpenTimeline] = useState<string | null>(null);
  const [encashing, setEncashing] = useState(false);
  const [simBrancheId, setSimBrancheId] = useState(BRANCHES_2026[0].id);
  const [simCount, setSimCount] = useState(1);
  const [importing, setImporting] = useState(false);
  const [dossierLead, setDossierLead] = useState<Lead | null>(null);
  const [transmitting, setTransmitting] = useState(false);
  const [askingOpco, setAskingOpco] = useState<string | null>(null);
  const [accessLead, setAccessLead] = useState<Lead | null>(null); // client pour qui on ouvre "Accès OPCO" (2 choix)
  const [rattachInfo, setRattachInfo] = useState<Dossier | null>(null); // confirmation "demande de rattachement faite" (courrier envoyé)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null); // email de confirmation formation (déroulé + RDV) - dossier OU lead
  const [reminderLead, setReminderLead] = useState<Lead | null>(null); // édition du rappel / suivi d'un client
  const [editEmp, setEditEmp] = useState<string | null>(null); // édition inline du nb de salariés. @Rabah 2026-07-02
  const [empDraft, setEmpDraft] = useState('');
  const [argKey, setArgKey] = useState<'hygiene' | 'nutrition'>('hygiene'); // formation affichée dans les arguments de vente
  const [assigningLead, setAssigningLead] = useState<string | null>(null); // reaffectation commercial en cours
  const [sendingSignLink, setSendingSignLink] = useState(false); // envoi du lien de signature convention au client
  const [savingDossier, setSavingDossier] = useState(false); // enregistrement d'une modif (ex. email) sans renvoyer le dossier
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);  // envoi du lien de signature via WhatsApp
  const [waModal, setWaModal] = useState<{ link: string; denom: string } | null>(null); // saisie n° WhatsApp (drapeaux + recherche)
  const [editDossier, setEditDossier] = useState<{ lead: Lead; dossier: Dossier } | null>(null); // correction d'un dossier transmis

  const auth = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const authJson = useCallback(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);
  // Maj locale des tâches d'un CLIENT (lead) après une action (pas de reload). @Rabah 2026-07-02
  const updateLeadTasks = useCallback((leadId: string, tasks: DossierTask[]) => {
    setLeads((prev) => prev.map((x) => x._id === leadId ? { ...x, tasks } : x));
  }, []);
  // Enregistre le nombre de salariés d'un client en 1 clic, sans monter le dossier. @Rabah 2026-07-02
  const saveEmployees = useCallback(async (leadId: string, val: string) => {
    const n = val.trim() === '' ? null : Number(val);
    setLeads((prev) => prev.map((x) => x._id === leadId ? { ...x, companyEmployees: n == null ? undefined : n } : x));
    setEditEmp(null);
    try { await fetch(`/api/agency/self/leads/${leadId}`, { method: 'PATCH', headers: authJson(), body: JSON.stringify({ companyEmployees: n }) }); } catch { /* */ }
  }, [authJson]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetch('/api/agency/self/profile', { headers: auth() });
      // En prévisualisation admin, un token expiré ne doit PAS planter (window.close inopérant) :
      // on affiche un écran d'erreur propre. @author Rabah Ziane - 2026-06-25
      if (p.status === 401 || p.status === 403) { if (preview) { setAuthError(true); return; } onLogout(); return; }
      const pj = await p.json(); if (pj.ok) setAgency(pj.agency);
      const lj = await fetch('/api/agency/self/leads', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
      if (lj.ok) setLeads(lj.leads || []);
      const dj = await fetch('/api/agency/self/dossiers', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
      if (dj.ok) { const all: Dossier[] = dj.dossiers || []; setDossiers(all); const m: Record<string, Dossier> = {}; all.forEach((d) => { if (d.leadId && !m[d.leadId]) m[d.leadId] = d; }); setDossierByLead(m); }
      try { const po = await fetch('/api/agency/self/payment-orders', { headers: auth() }).then((r) => r.json()); if (po.ok) setPayOrders(po.orders || []); } catch { /* non-owner ou indispo */ }
      const aj = await fetch('/api/agency/self/access-requests', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
      if (aj.ok) { const m: Record<string, string> = {}; (aj.requests || []).forEach((r: { clientEmail: string; status: string }) => { m[r.clientEmail] = r.status; }); setAccessByEmail(m); }
      if (pj.ok && pj.agency?.isOwner) {
        const cj = await fetch('/api/agency/self/commerciaux', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
        if (cj.ok) setCommerciaux(cj.commerciaux || []);
        // Revente Pyemes (propriétaire uniquement).
        fetch('/api/agency/self/pyemes', { headers: auth() }).then((r) => r.json()).then((j) => { if (j.ok) setPyemesData(j); }).catch(() => {});
        fetch('/api/agency/self/pyemes/connect/status', { headers: auth() }).then((r) => r.json()).then((j) => setPyemesConnect(j)).catch(() => {});
      }
    } finally { setLoading(false); }
  }, [auth, onLogout]);

  // Signature de l'avenant Pyemes : débloque le lien de vente + l'activation Stripe.
  async function signerAvenantPyemes() {
    if (!pyemesSign.by.trim() || !pyemesSign.fn.trim()) { alert('Nom et fonction requis.'); return; }
    setPyemesSignBusy(true);
    try {
      const r = await fetch('/api/agency/self/pyemes/contract/sign', { method: 'POST', headers: authJson(), body: JSON.stringify({ signedBy: pyemesSign.by.trim(), signedFunction: pyemesSign.fn.trim() }) });
      const j = await r.json();
      if (j.ok) { const p = await fetch('/api/agency/self/pyemes', { headers: auth() }).then((x) => x.json()); if (p.ok) setPyemesData(p); }
      else alert('Erreur : ' + (j.error || ''));
    } catch { alert('Connexion impossible.'); } finally { setPyemesSignBusy(false); }
  }

  // Onboarding Stripe Connect de l'agence (KYC géré par Stripe) : on récupère l'URL et on redirige.
  async function connecterPyemes() {
    setPyemesBusy(true);
    try {
      const r = await fetch('/api/agency/self/pyemes/connect', { method: 'POST', headers: auth() });
      const j = await r.json();
      if (j.ok && j.url) { window.location.href = j.url; return; }
      alert('Connexion Stripe impossible : ' + (j.message || j.error || 'réessayez plus tard'));
    } catch { alert('Connexion impossible.'); } finally { setPyemesBusy(false); }
  }

  async function createCommercial() {
    if (!coName.trim() || !coEmail.trim()) { alert('Nom + email requis.'); return; }
    setCoBusy(true);
    try {
      const r = await fetch('/api/agency/self/commerciaux', { method: 'POST', headers: authJson(), body: JSON.stringify({ name: coName.trim(), email: coEmail.trim() }) });
      const j = await r.json();
      if (j.ok) { setCoCreated({ email: j.commercial.email, password: j.password }); setCoName(''); setCoEmail(''); load(); }
      else alert('Erreur : ' + (j.error === 'email_exists' ? 'email déjà utilisé' : j.error));
    } finally { setCoBusy(false); }
  }
  useEffect(() => { load(); }, [load]);

  // Detection auto OPCO + raison sociale a la saisie du SIRET (comme Pyemes).
  useEffect(() => {
    if (!showCreate) return;
    const raw = siret.replace(/\D/g, '');
    if (raw.length !== 14 && raw.length !== 9) { setDetectMsg(''); return; }
    const t = setTimeout(async () => {
      setDetecting(true);
      try {
        const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${raw}&limite=1`);
        const j = await r.json();
        const res = (j?.results || [])[0];
        if (!res) { setDetectMsg('SIRET introuvable'); return; }
        const m = (res.matching_etablissements || [])[0] || res.siege || {};
        const found = String(res.nom_complet || res.denomination || m.enseigne || '');
        const ape = String(res.activite_principale || m.activite_principale || '');
        const idccList: string[] = (m.liste_idcc || res.siege?.liste_idcc || res.complements?.liste_idcc || []).map(String);
        const det = detectOpco(ape, idccList);
        // Adresse de l'établissement (pour le tampon de la convention). @Rabah 2026-06-05
        const sg = res.siege || {};
        const cp = sg.code_postal || m.code_postal || '';
        const ville = sg.commune || sg.libelle_commune || m.libelle_commune || m.commune || '';
        const voie = String(sg.adresse || m.adresse || [m.numero_voie, m.type_voie, m.libelle_voie].filter(Boolean).join(' ') || '').replace(/\s+/g, ' ').trim();
        setDetectedAddr([voie, [cp, ville].filter(Boolean).join(' ')].filter(Boolean).join(', '));
        setDenom((d) => d.trim() ? d : found);
        setOpco(det.opco);
        // Exact = via IDCC déclaré ; sinon heuristique NAF à vérifier sur le site France Compétences.
        const addrPart = (voie || cp || ville) ? ` · ${[voie, [cp, ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')}` : '';
        setDetectMsg(det.exact
          ? `Détecté : ${found || 'établissement'} · IDCC ${det.idcc} → ${det.opco}${addrPart}`
          : `Détecté : ${found || 'établissement'} · OPCO ${det.opco} (à vérifier${det.idcc ? ` · IDCC ${det.idcc}` : ' · pas d’IDCC déclaré'})${addrPart}`);
      } catch { setDetectMsg(''); } finally { setDetecting(false); }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siret, showCreate]);

  // Auto-remplissage des infos entreprise (raison sociale, adresse, CP, ville, pays) depuis
  // le SIRET de l'agence. Les champs restent modifiables si l'API ne trouve rien. @Rabah 2026-06-03
  useEffect(() => {
    if (!showCompany) return;
    const raw = (company.regNumber || '').replace(/\D/g, '');
    if (raw.length !== 14 && raw.length !== 9) { setCompanyDetectMsg(''); return; }
    const t = setTimeout(async () => {
      setCompanyDetecting(true);
      try {
        const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${raw}&limite=1`);
        const j = await r.json();
        const res = (j?.results || [])[0];
        if (!res) { setCompanyDetectMsg('SIRET introuvable - saisie manuelle'); return; }
        const s = res.siege || {};
        const m = (res.matching_etablissements || [])[0] || {};
        const found = String(res.nom_complet || res.denomination || '');
        const cp = s.code_postal || m.code_postal || '';
        const ville = s.commune || s.libelle_commune || m.libelle_commune || m.commune || '';
        const addr = String(s.adresse || m.adresse || [m.numero_voie, m.type_voie, m.libelle_voie].filter(Boolean).join(' ') || '').replace(/\s+/g, ' ').trim();
        setCompany((c) => ({
          ...c,
          legalName: c.legalName?.trim() ? c.legalName : found,
          address: addr || c.address,
          postalCode: cp || c.postalCode,
          city: ville || c.city,
          country: c.country?.trim() ? c.country : 'France',
        }));
        setCompanyDetectMsg(`Détecté : ${found || 'établissement'}${ville ? ' · ' + (cp || '') + ' ' + ville : ''}`);
      } catch { setCompanyDetectMsg(''); } finally { setCompanyDetecting(false); }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.regNumber, showCompany]);

  useEffect(() => {
    if (!agency) return;
    setBankCountry(agency.bankCountry || 'FR');
    setBankHolder(agency.accountHolder || '');
    const bd = agency.bankData && Object.keys(agency.bankData).length ? agency.bankData : { iban: agency.iban || '', bic: agency.bic || '' };
    setBankFields(bd);
    setCompany(agency.companyInfo || {});
    setSignFunction(agency.contract?.signedFunction || '');
  }, [agency]);

  async function saveBank() {
    setSavingBank(true);
    try {
      const r = await fetch('/api/agency/self/bank', { method: 'POST', headers: authJson(), body: JSON.stringify({ country: bankCountry, fields: bankFields, accountHolder: bankHolder }) });
      const j = await r.json();
      if (j.ok) { setAgency((a) => a ? { ...a, bankCountry: j.bankCountry, bankData: j.bankData, iban: j.iban, bic: j.bic, accountHolder: j.accountHolder, bankValidated: false } : a); alert('Coordonnées bancaires enregistrées. Elles seront validées par Delivery Digital.'); }
    } finally { setSavingBank(false); }
  }

  async function uploadRib(file: File) {
    if (file.type !== 'application/pdf') { alert('Le RIB doit être un fichier PDF.'); return; }
    if (file.size > 6 * 1024 * 1024) { alert('Fichier trop lourd (max 6 Mo).'); return; }
    setUploadingRib(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result)); fr.onerror = reject; fr.readAsDataURL(file); });
      const r = await fetch('/api/agency/self/rib-pdf', { method: 'POST', headers: authJson(), body: JSON.stringify({ dataUrl }) });
      const j = await r.json();
      if (j.ok) { setAgency((a) => a ? { ...a, ribPdfUrl: j.ribPdfUrl, bankValidated: false } : a); alert('PDF du RIB envoyé.'); }
      else alert('Erreur : ' + (j.error === 'pdf_only' ? 'PDF uniquement' : j.error === 'too_large' ? 'fichier trop lourd' : j.error));
    } finally { setUploadingRib(false); }
  }

  async function saveCompany() {
    if (!company.legalName?.trim()) { alert('Raison sociale requise.'); return; }
    setSavingCompany(true);
    try {
      const r = await fetch('/api/agency/self/company', { method: 'POST', headers: authJson(), body: JSON.stringify(company) });
      const j = await r.json();
      if (j.ok) { setAgency((a) => a ? { ...a, companyInfo: j.companyInfo, onboardingValidated: false } : a); setShowCompany(false); alert('Informations enregistrées. Elles seront validées par Delivery Digital.'); }
    } finally { setSavingCompany(false); }
  }

  async function signContract() {
    if (!signFunction.trim()) { alert('Indiquez votre fonction (gérant, président…).'); return; }
    if (!confirm('En signant, vous acceptez le contrat de partenariat Delivery Digital. Continuer ?')) return;
    setSigning(true);
    try {
      const r = await fetch('/api/agency/self/contract/sign', { method: 'POST', headers: authJson(), body: JSON.stringify({ signedFunction: signFunction.trim() }) });
      const j = await r.json();
      if (j.ok) { setAgency((a) => a ? { ...a, contract: j.contract, onboardingValidated: false } : a); alert('Contrat signé. Il sera validé par Delivery Digital.'); }
    } finally { setSigning(false); }
  }

  async function importCsv(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      // Detecte un eventuel header (contient "nom"/"denom"/"email")
      if (rows.length && /nom|denom|email|siret/i.test(rows[0]) && !/@/.test(rows[0])) rows.shift();
      const sep = (rows[0] || '').includes(';') ? ';' : ',';
      const leadsToCreate = rows.map((r) => {
        const [denom, email, siret, opco] = r.split(sep).map((c) => (c || '').trim().replace(/^"|"$/g, ''));
        return { denom, email, siret, opco };
      }).filter((l) => l.denom);
      if (leadsToCreate.length === 0) { alert('Aucune ligne valide (format attendu : Nom;Email;SIRET;OPCO).'); return; }
      const r = await fetch('/api/agency/self/leads/bulk', { method: 'POST', headers: authJson(), body: JSON.stringify({ leads: leadsToCreate }) });
      const j = await r.json();
      if (j.ok) { alert(`${j.created} client(s) importé(s).`); load(); }
      else alert('Erreur import : ' + (j.error || ''));
    } finally { setImporting(false); }
  }

  async function createLead() {
    if (!denom.trim()) { alert('Nom du client requis.'); return; }
    setCreating(true);
    try {
      const r = await fetch('/api/agency/self/leads', { method: 'POST', headers: authJson(), body: JSON.stringify({ denom: denom.trim(), email: email.trim(), accountantEmail: accountantEmail.trim() || undefined, managerEmail: managerEmail.trim() || undefined, siret: siret.trim(), opco: opco.trim(), addr: detectedAddr.trim() || undefined, companyEmployees: companyEmployees.trim() || undefined, formationDoneThisYear }) });
      const j = await r.json();
      if (j.ok) { setDenom(''); setEmail(''); setAccountantEmail(''); setManagerEmail(''); setSiret(''); setCompanyEmployees(''); setFormationDoneThisYear(false); setShowCreate(false); load(); }
    } finally { setCreating(false); }
  }

  // Demande d'acces OPCO au client : envoie un lien securise par email. Le client saisit
  // ses identifiants (ou son code de rattachement AKTO) -> chiffres, recus cote superadmin DD.
  // `label` distingue le cas "deja un compte" du cas "rattachement AKTO". @author Rabah Ziane - 2026-06-04
  async function askOpco(lead: Lead, label = 'Identifiants OPCO'): Promise<boolean> {
    if (!lead.email) { alert("Ce client n'a pas d'email."); return false; }
    setAskingOpco(lead._id);
    try {
      const r = await fetch('/api/agency/self/access-requests', { method: 'POST', headers: authJson(), body: JSON.stringify({ clientEmail: lead.email, clientName: lead.denom, label }) });
      const j = await r.json();
      if (j.ok) { load(); return true; }
      alert('Erreur : ' + (j.error || 'envoi impossible'));
      return false;
    } finally { setAskingOpco(null); }
  }

  // Enregistre le suivi/rappel d'un client (note "ce qu'on attend" + date de rappel + suivi annuel
  // : effectif entreprise + formation déjà effectuée) ET les infos client modifiables (nom, emails,
  // SIRET, OPCO). @Rabah 2026-06-05 / maj 2026-06-18
  async function saveReminder(leadId: string, waitingNote: string, reminderAt: string | null, extra: { formationDoneThisYear: boolean; companyEmployees: string; denom: string; email: string; accountantEmail: string; managerEmail: string; siret: string; opco: string }) {
    const r = await fetch(`/api/agency/self/leads/${leadId}`, { method: 'PATCH', headers: authJson(), body: JSON.stringify({ waitingNote, reminderAt, formationDoneThisYear: extra.formationDoneThisYear, companyEmployees: extra.companyEmployees.trim() || null, denom: extra.denom, email: extra.email, accountantEmail: extra.accountantEmail, managerEmail: extra.managerEmail, siret: extra.siret, opco: extra.opco }) });
    const j = await r.json();
    if (j.ok) { setReminderLead(null); load(); }
    else alert('Erreur : ' + (j.error || 'enregistrement impossible'));
  }

  // Reaffecte un client (et ses dossiers) a un autre commercial (ou au proprietaire si vide). Owner only. @Rabah 2026-06-04
  async function assignLead(leadId: string, commercialId: string) {
    setAssigningLead(leadId);
    try {
      const r = await fetch(`/api/agency/self/leads/${leadId}/assign`, { method: 'PATCH', headers: authJson(), body: JSON.stringify({ commercialId }) });
      const j = await r.json();
      if (j.ok) load();
      else alert('Erreur : ' + (j.error || 'réaffectation impossible'));
    } finally { setAssigningLead(null); }
  }

  // Crée le lien de signature (sans email) et ouvre WhatsApp avec le message pré-rempli. @Rabah 2026-06-05
  async function sendSignLinkWhatsapp(lead: Lead, p: TransmitPayload) {
    setSendingWhatsapp(true);
    try {
      const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
      const r = await fetch('/api/agency/self/sign-link', { method: 'POST', headers: authJson(), body: JSON.stringify({ channel: 'whatsapp', noEmail: true, dossierId: editDossier?.dossier._id, leadId: lead._id, denom: lead.denom, siret: lead.siret, opco: lead.opco, addr: lead.addr, clientEmail: p.contactEmail || lead.email, managerEmail: lead.managerEmail, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, amountHT: p.amountHT }) });
      const j = await r.json();
      if (!j.ok || !j.link) { alert('Erreur : ' + (j.error === 'salaries_required' ? 'ajoutez au moins un stagiaire' : j.error || 'lien impossible')); return; }
      // Ouvre un sélecteur pro (drapeaux + recherche + champ numéro) au lieu du prompt natif. @Rabah 2026-06-24
      setWaModal({ link: j.link, denom: lead.denom || '' });
      setDossierLead(null); setEditDossier(null); load();
    } finally { setSendingWhatsapp(false); }
  }

  // Envoie au client le modèle CSV des stagiaires (à remplir et renvoyer). @Rabah 2026-06-04
  async function sendCsvTemplate(lead: Lead | null) {
    if (!lead?.email) { alert("Ce client n'a pas d'email - renseignez-le pour lui envoyer le modèle."); return; }
    const r = await fetch('/api/agency/self/send-csv-template', { method: 'POST', headers: authJson(), body: JSON.stringify({ clientEmail: lead.email, denom: lead.denom }) });
    const j = await r.json();
    if (j.ok) alert(`✓ Modèle CSV envoyé à ${lead.email}. Le client le remplit et vous le renvoie.`);
    else alert('Erreur : ' + (j.error || 'envoi impossible'));
  }

  // Envoie au client ET à l'agence l'email confirmant la demande de rattachement (courrier à
  // surveiller). Renvoyable. Renvoie la date d'envoi (ISO) ou null. @author Rabah Ziane - 2026-06-24
  async function sendRattachEmail(d: Dossier): Promise<string | null> {
    try {
      const r = await fetch(`/api/agency/self/dossiers/${d._id}/rattachement-email`, { method: 'POST', headers: auth() });
      const j = await r.json();
      if (!j.ok) { alert('Erreur : ' + (j.error === 'no_recipient' ? "aucun email (client/agence) renseigné" : j.error === 'rattachement_not_done' ? "le rattachement n'est pas encore marqué fait" : j.error || 'envoi impossible')); return null; }
      load();
      return j.rattachEmailSentAt || new Date().toISOString();
    } catch { alert('Erreur réseau'); return null; }
  }

  // Envoie l'email de confirmation de formation au client (copie agence) : RDV + déroulé + à
  // préparer + message. Renvoie la date d'envoi (ISO) ou null. @author Rabah Ziane - 2026-06-24
  async function sendConfirmationEmail(t: ConfirmTarget, payload: { rdvAt: string; message: string; prepText: string }): Promise<string | null> {
    try {
      const url = t.kind === 'dossier' ? `/api/agency/self/dossiers/${t.id}/confirmation-email` : `/api/agency/self/leads/${t.id}/confirmation-email`;
      const r = await fetch(url, { method: 'POST', headers: authJson(), body: JSON.stringify(payload) });
      const j = await r.json();
      if (!j.ok) { alert('Erreur : ' + (j.error === 'no_client_email' ? "ce client n'a pas d'email" : j.error === 'invalid_rdv' ? 'date de RDV invalide' : j.error || 'envoi impossible')); return null; }
      load();
      return j.confirmationEmailSentAt || new Date().toISOString();
    } catch { alert('Erreur réseau'); return null; }
  }

  async function sendEncash(d: Dossier) {
    setEncashing(true);
    try {
      const r = await fetch(`/api/agency/self/dossiers/${d._id}/encash`, { method: 'POST', headers: auth() });
      const j = await r.json();
      if (j.ok) { setEncashDossier(null); alert("Ordre d'encaissement envoyé à Delivery Digital avec votre facture. Vous serez payé après virement."); load(); }
      else alert('Erreur : ' + (j.error === 'not_available' ? "fonds pas encore disponibles" : j.error === 'already_paid' ? 'déjà payé' : j.error));
    } finally { setEncashing(false); }
  }

  async function regenKey() {
    if (!confirm("Régénérer la clé API ? L'ancienne ne fonctionnera plus.")) return;
    setBusy(true);
    try { const r = await fetch('/api/agency/self/api-key', { method: 'POST', headers: auth() }); const j = await r.json(); if (j.ok) { setAgency((a) => a ? { ...a, apiKey: j.apiKey } : a); setShowKey(true); } } finally { setBusy(false); }
  }

  const isOwner = !!agency?.isOwner;
  const fix = agency?.commissionFix != null ? agency.commissionFix : 120;
  const pct = agency?.commissionPercent != null ? agency.commissionPercent : 15;
  // Le fixe (120 €) est dû UNE SEULE FOIS par client et par an : il s'applique au 1er
  // dossier d'un client dans l'année ; les dossiers suivants du même client ne touchent
  // que le pourcentage. @author Rabah Ziane - 2026-06-02
  const fixDossierIds = (() => {
    const sorted = [...dossiers].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const seen = new Set<string>(); const ids = new Set<string>();
    sorted.forEach((d) => {
      const year = new Date(d.createdAt || Date.now()).getFullYear();
      const key = `${d.leadId || d._id}_${year}`;
      if (!seen.has(key)) { seen.add(key); ids.add(d._id); }
    });
    return ids;
  })();
  const earn = (d?: Dossier) => d ? Math.round((fixDossierIds.has(d._id) ? fix : 0) + (pct / 100) * (d.amountHT || 0)) : 0;
  const nowMs = Date.now();
  const inPeriod = (iso?: string) => period === 'all' || (!!iso && nowMs - new Date(iso).getTime() <= PERIOD_MS[period]);
  const periodDossiers = dossiers.filter((d) => inPeriod(d.createdAt));
  const paidDossiers = dossiers.filter((d) => d.status === 'paid').sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  // Fonds disponibles : OPCO a payé DD, l'agence peut demander l'encaissement de sa commission.
  const fondsDispo = dossiers.filter((d) => d.opcoPaid && d.status !== 'paid');
  // Gains acquis = somme des ordres de virement CONFIRMÉS payés par Delivery Digital. @Rabah 2026-07-29
  const paidOrders = payOrders.filter((o) => o.paidAt);
  const gainsAcquisVir = paidOrders.reduce((s, o) => s + (o.totalCommission || 0), 0);
  const fondsTotal = fondsDispo.reduce((s, d) => s + earn(d), 0);
  const dossierRef = (d: Dossier) => d.invoiceNumber || ('DOS-' + new Date(d.createdAt || Date.now()).getFullYear() + '-' + d._id.slice(-5).toUpperCase());
  const gotoSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const kpi = {
    clients: leads.length,
    dossiers: dossiers.length,
    gains: periodDossiers.reduce((s, d) => s + earn(d), 0),
    acquis: paidDossiers.filter((d) => inPeriod(d.updatedAt || d.createdAt)).reduce((s, d) => s + earn(d), 0),
  };
  const q = search.trim().toLowerCase();
  const filtered = q ? leads.filter((l) => `${l.denom || ''} ${l.email || ''} ${l.siret || ''}`.toLowerCase().includes(q)) : leads;
  // Simulateur de prise en charge OPCO 2026 par branche (IDCC) + modalité.
  const simBranche = getBranche(simBrancheId) || BRANCHES_2026[0];
  const simHours = FORMATION_TARIFS.hours;          // 21h
  const simDays = Math.max(1, Math.ceil(simHours / 7)); // 3 jours
  const simCostPer = FORMATION_TARIFS.unitPriceHT;  // 525 € HT / stagiaire (tarif max)
  const simNb = Math.max(1, simCount || 1);
  // Montant finançable par branche = ce que l'agence facture (0 reste à charge client).
  const brancheFinance: Record<string, number> = {};
  BRANCHES_2026.forEach((b) => { brancheFinance[b.id] = meilleurFinancement(b, simCostPer, simHours, simDays); });
  const meilleurBudget = Math.max(...Object.values(brancheFinance));
  // Une SEULE branche recommandée. En cas d'égalité de budget finançable, on privilégie
  // la branche au plafond annuel le plus élevé (Restauration rapide 4000/9000 € > HCR 3000 €). @Rabah 2026-06-05
  const RECO_PRIORITY = ['akto-resto-rapide', 'akto-hcr', 'opco-ep-boulangerie', 'opco-ep-boucherie'];
  const tiedBest = BRANCHES_2026.filter((b) => brancheFinance[b.id] >= meilleurBudget).map((b) => b.id);
  const recommendedId = RECO_PRIORITY.find((id) => tiedBest.includes(id)) || tiedBest[0];
  const estRecommandee = (id: string) => id === recommendedId;
  const simFinancePer = brancheFinance[simBranche.id] || 0; // facturé par stagiaire pour la branche choisie

  // Prévisualisation admin avec token expiré/invalide : écran clair plutôt qu'une page blanche.
  if (preview && authError) return (
    <main className="min-h-screen flex items-center justify-center px-5" style={DOTTED_BG}>
      <div className="max-w-sm text-center bg-[#181A20] border border-white/10 rounded-2xl p-7">
        <span className="inline-flex h-12 w-12 rounded-full bg-[#E5A000]/15 items-center justify-center"><Clock className="h-6 w-6 text-[#E5A000]" /></span>
        <h1 className="text-[17px] font-bold text-white mt-4">Prévisualisation expirée</h1>
        <p className="text-[13px] text-white/55 mt-2 leading-relaxed">Ce lien de prévisualisation de l&apos;espace agence n&apos;est plus valide (il expire après quelques heures). Revenez à l&apos;admin et cliquez de nouveau sur « Visualiser l&apos;espace ».</p>
        <button onClick={() => { try { window.close(); } catch { /* */ } }} className="mt-5 px-4 py-2.5 rounded-lg bg-[#0066CC] text-white text-[13px] font-semibold hover:bg-[#0077ED]">Fermer cet onglet</button>
      </div>
    </main>
  );
  if (loading) return <main className="min-h-screen bg-[#0E0F13] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></main>;

  return (
    <main className="min-h-screen text-white" style={DOTTED_BG}>
      {/* Bandeau "prévisualisation admin" : visible uniquement quand un super admin ouvre l'espace
          d'une agence via /agence#preview=<jwt>. @author Rabah Ziane - 2026-06-24 */}
      {preview && (
        <div className="bg-[#E5A000] text-[#1D1D1F] text-center text-[12px] font-semibold px-4 py-2 flex items-center justify-center gap-2">
          <Eye className="h-3.5 w-3.5" /> Prévisualisation super admin · vous voyez le tableau de bord de l'agence « {agency?.name || '…'} » tel qu'elle le voit.
        </div>
      )}
      {/* Topbar */}
      <header className="border-b border-black/10 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Delivery Digital" className="h-10 w-auto" />
            <span className="text-[15px] font-bold text-[#1D1D1F] leading-tight">{agency?.name || 'Agence'}</span>
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] text-[11.5px] border border-black/10"><LogOut className="h-3.5 w-3.5" /> {preview ? 'Fermer' : 'Déconnexion'}</button>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-7 space-y-7">
        {/* Bandeau infos entreprise + statut de validation superadmin (owner uniquement) */}
        {isOwner && (
          agency?.onboardingValidated ? (
            <div className="rounded-2xl border border-[#3DD68C]/30 bg-[#3DD68C]/[0.07] px-5 py-3.5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#3DD68C] flex-shrink-0" />
              <div className="min-w-0"><p className="text-[13px] font-semibold text-[#3DD68C]">Compte partenaire validé par Delivery Digital</p><p className="text-[11.5px] text-white/50 truncate">{agency.companyInfo?.legalName || agency.name} · contrat signé · RIB validé.</p></div>
              <button onClick={() => setShowCompany((v) => !v)} className="ml-auto text-[11.5px] text-white/50 underline whitespace-nowrap">Modifier mes infos</button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 rounded-[12px] bg-[#0066CC]/15 text-[#0066CC] items-center justify-center flex-shrink-0"><Building2 className="h-[18px] w-[18px]" /></span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white">Activez votre compte partenaire</p>
                  <p className="text-[11.5px] text-white/55">Renseignez vos informations d&apos;entreprise, votre RIB et signez le contrat. Le tout sera validé par Delivery Digital.</p>
                </div>
                <button onClick={() => setShowCompany((v) => !v)} className="ml-auto px-4 py-2 rounded-full bg-[#0066CC] text-white text-[12px] font-semibold hover:bg-[#0077ED] whitespace-nowrap transition">{showCompany ? 'Masquer' : (agency?.companyInfo?.legalName ? 'Modifier mes infos' : 'Renseigner mes infos')}</button>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 pl-12 text-[11.5px]">
                <span className={agency?.companyInfo?.legalName ? 'text-[#3DD68C]' : 'text-white/40'}>{agency?.companyInfo?.legalName ? '✓' : '○'} Infos entreprise</span>
                <span className={agency?.ribPdfUrl ? 'text-[#3DD68C]' : 'text-white/40'}>{agency?.ribPdfUrl ? '✓' : '○'} RIB + PDF</span>
                <span className={agency?.contract?.signed ? 'text-[#3DD68C]' : 'text-white/40'}>{agency?.contract?.signed ? '✓' : '○'} Contrat signé</span>
                <span className="text-white/35">· en attente de validation Delivery Digital</span>
              </div>
            </div>
          )
        )}
        {isOwner && showCompany && (
          <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
            <h2 className="text-[15px] font-bold">Informations de l&apos;entreprise</h2>
            <p className="text-[12.5px] text-white/50 mt-1">Saisissez le <strong className="text-white/70">SIRET</strong> : raison sociale, adresse, code postal et ville se remplissent <strong className="text-white/70">automatiquement</strong> (modifiables si besoin). Ces informations figureront sur le contrat de partenariat.</p>
            {(companyDetecting || companyDetectMsg) && <p className="text-[11.5px] text-[#3DD68C] mt-2">{companyDetecting ? 'Recherche de l’entreprise…' : companyDetectMsg}</p>}
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <input value={company.legalName || ''} onChange={(e) => setCompany((c) => ({ ...c, legalName: e.target.value }))} placeholder="Raison sociale *" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              <input value={company.regNumber || ''} onChange={(e) => setCompany((c) => ({ ...c, regNumber: e.target.value }))} inputMode="numeric" placeholder="N° SIRET (remplit le reste auto)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 font-mono focus:outline-none focus:border-[#0066CC]" />
              <input value={company.vatNumber || ''} onChange={(e) => setCompany((c) => ({ ...c, vatNumber: e.target.value }))} placeholder="N° TVA (optionnel)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              <CountrySelect value={company.country || ''} onChange={(name) => setCompany((c) => ({ ...c, country: name }))} />
              <input value={company.address || ''} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} placeholder="Adresse (auto)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              <div className="grid grid-cols-2 gap-3">
                <input value={company.postalCode || ''} onChange={(e) => setCompany((c) => ({ ...c, postalCode: e.target.value }))} placeholder="Code postal (auto)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
                <input value={company.city || ''} onChange={(e) => setCompany((c) => ({ ...c, city: e.target.value }))} placeholder="Ville (auto)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              </div>
              <input value={company.repName || ''} onChange={(e) => setCompany((c) => ({ ...c, repName: e.target.value }))} placeholder="Représentant légal (nom)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              <input value={company.repFunction || ''} onChange={(e) => setCompany((c) => ({ ...c, repFunction: e.target.value }))} placeholder="Fonction (gérant, président…)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
            </div>
            <button onClick={saveCompany} disabled={savingCompany} className="mt-3 px-4 py-2 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{savingCompany ? 'Enregistrement…' : 'Enregistrer mes informations'}</button>
          </section>
        )}

        {/* Slider de projet : 3 activités jamais mélangées (Formation / Informatique / Pyemes). @Rabah 2026-08-01 */}
        {isOwner && (
          <div className="inline-flex self-start rounded-xl border border-white/10 bg-white/5 p-1">
            <button onClick={() => setProject('formation')} className={`px-4 py-2 rounded-lg text-[12.5px] font-semibold transition ${project === 'formation' ? 'bg-[#0066CC] text-white' : 'text-white/60 hover:text-white'}`}>Formation</button>
            <button onClick={() => setProject('informatique')} className={`px-4 py-2 rounded-lg text-[12.5px] font-semibold transition ${project === 'informatique' ? 'bg-[#3DD68C] text-[#0B0B0F]' : 'text-white/60 hover:text-white'}`}>Informatique</button>
            {pyemesData?.active && <button onClick={() => setProject('pyemes')} className={`px-4 py-2 rounded-lg text-[12.5px] font-semibold transition inline-flex items-center gap-1.5 ${project === 'pyemes' ? 'bg-[#635BFF] text-white' : 'text-white/60 hover:text-white'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://pyemes.com/logo/pyemes-mark.svg" alt="" className="h-4 w-4 animate-[spin_6s_linear_infinite]" style={{ filter: 'brightness(0) invert(1)' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://pyemes.com/icon-192.png'; }} />
              Pyemes
            </button>}
          </div>
        )}

        {project === 'formation' && (<>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-bold">Tableau de bord</h1>
            <p className="text-[13px] text-white/50 mt-0.5">Gérez vos clients, montez leurs dossiers OPCO et demandez leurs identifiants.</p>
            {isOwner && <p className="text-[12px] text-[#3DD68C] mt-1">Votre commission : <strong>{fix.toLocaleString('fr-FR')} € TTC</strong> + <strong>{pct}% TTC</strong> par dossier - <span className="text-white/60">versée à la réception du paiement OPCO</span>.</p>}
          </div>
          {/* Filtre periode */}
          {isOwner && <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(['day', 'week', 'month', 'all'] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-md text-[11.5px] font-medium transition ${period === p ? 'bg-[#0066CC] text-white' : 'text-white/60 hover:text-white'}`}>{PERIOD_LABEL[p]}</button>
            ))}
          </div>}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={<Users className="h-4 w-4" />} label="Clients" value={kpi.clients} accent="#0066CC" onClick={() => gotoSection('sec-clients')} />
          <Kpi icon={<FolderCheck className="h-4 w-4" />} label="Dossiers" value={kpi.dossiers} accent="#0066CC" onClick={() => gotoSection('sec-clients')} />
          {isOwner && <Kpi icon={<Wallet className="h-4 w-4" />} label={`Gains estimés · ${PERIOD_LABEL[period]}`} value={kpi.gains} suffix=" €" accent="#3DD68C" onClick={() => gotoSection(fondsDispo.length ? 'sec-fonds' : 'sec-historique')} />}
          {isOwner && <Kpi icon={<ShieldCheck className="h-4 w-4" />} label="Gains acquis (versés)" value={gainsAcquisVir} suffix=" €" accent="#3DD68C" onClick={() => setShowGains(true)} />}
        </div>

        {/* Détail des gains acquis : virements confirmés payés par Delivery Digital. @Rabah 2026-07-29 */}
        {showGains && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowGains(false)}>
            <div className="bg-[#181A20] border border-white/10 rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between"><h3 className="text-[16px] font-bold">Gains acquis</h3><span className="text-[#3DD68C] font-extrabold text-[18px]">{gainsAcquisVir.toLocaleString('fr-FR')} €</span></div>
              <p className="text-[12px] text-white/50 mt-1">Détail des virements confirmés payés par Delivery Digital.</p>
              {paidOrders.length === 0 ? (
                <p className="mt-4 text-[13px] text-white/40 text-center py-6">Aucun virement confirmé pour l&apos;instant.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {paidOrders.map((o) => (
                    <div key={o._id} className="rounded-xl border border-white/10 p-3">
                      <div className="flex items-center justify-between"><span className="font-semibold text-[#3DD68C]">{o.ref}</span><span className="font-bold">{(o.totalCommission || 0).toLocaleString('fr-FR')} €</span></div>
                      <p className="text-[11.5px] text-white/40">Payé le {o.paidAt ? new Date(o.paidAt).toLocaleDateString('fr-FR') : ''}</p>
                      {(o.lines || []).length > 0 && (
                        <div className="mt-2 divide-y divide-white/5 text-[12px]">
                          {(o.lines || []).map((l, i) => (
                            <div key={i} className="py-1.5 flex items-center justify-between"><span className="text-white/70">{l.denom}</span><span className="font-semibold">{(l.total || 0).toLocaleString('fr-FR')} €</span></div>
                          ))}
                        </div>
                      )}
                      {o.pdfUrl && <a href={pdfHref(o)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11.5px] text-[#0A84FF] hover:underline">Télécharger le PDF</a>}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-end"><button onClick={() => setShowGains(false)} className="px-4 py-2 rounded-full border border-white/15 text-[13px]">Fermer</button></div>
            </div>
          </div>
        )}

        {/* Nos formations (catalogue) - cliquables, detail + programme telechargeable */}
        <section>
          <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
            <div><h2 className="text-[15px] font-bold">Nos formations</h2><p className="text-[12.5px] text-white/50">Les formations que vous proposez à vos clients. Cliquez pour le détail et télécharger le programme.</p></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {FORMATIONS.map((f) => (
              <button key={f.id} onClick={() => setDetailFormation(f)} className="group text-left rounded-2xl bg-white overflow-hidden border border-white/10 shadow-lg hover:shadow-xl transition">
                <div className="relative h-[120px] bg-gradient-to-br from-[#d7f5e3] to-[#eef8f1] px-5 pt-4">
                  <div className="flex items-center justify-between">
                    {f.flagship && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1D1D1F] text-white text-[10px] font-bold">★ Phare</span>}
                    <span className="ml-auto inline-flex px-2.5 py-1 rounded-full bg-white text-[#1D1D1F] text-[10px] font-bold shadow-sm">{f.rating}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#3a8a5a] mt-2">{f.category}</p>
                  <p className="text-[34px] font-extrabold text-[#1D1D1F] leading-none mt-0.5">{f.hours}h</p>
                  <ShieldCheck className="absolute bottom-3 right-4 h-12 w-12 text-[#1D1D1F]/15" strokeWidth={1.4} />
                </div>
                <div className="p-5 bg-white text-[#1D1D1F]">
                  <p className="font-bold text-[15px] leading-snug min-h-[44px]">{f.title}</p>
                  <p className="text-[12.5px] text-[#6e6e73] mt-1.5 line-clamp-2">{f.summary}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {[`${f.hours}h`, `${f.priceHT}€`, f.level, f.funding].map((c) => <span key={c} className="px-2.5 py-1 rounded-lg bg-black/[0.04] text-[11.5px] text-[#3a3a3c]">{c}</span>)}
                  </div>
                  <p className="mt-4 pt-3 border-t border-black/5 text-[13px] font-semibold text-[#0A84FF] inline-flex items-center gap-1">Voir le programme <span className="group-hover:translate-x-0.5 transition">›</span></p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Arguments de vente - 2 formations (toggle), à reprendre face au client */}
        {(() => {
          const arg = VENTE_ARGS.find((a) => a.key === argKey) || VENTE_ARGS[0];
          const pitch = `${arg.copyTitle}\n\nIMPORTANT : ${arg.mention}\n\nL'essentiel :\n${arg.resume.map((r) => '- ' + r).join('\n')}\n\n${arg.piliers.map((p, i) => `${i + 1}. ${p.titre}\n${p.points.map((pt) => '   ✅ ' + pt).join('\n')}`).join('\n\n')}`;
          return (
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 rounded-xl bg-[#3DD68C]/15 items-center justify-center"><ShieldCheck className="h-5 w-5 text-[#3DD68C]" /></span>
              <div>
                <h2 className="text-[15px] font-bold">Arguments de vente</h2>
                <p className="text-[12.5px] text-white/50">{arg.tag} - à reprendre tel quel face au restaurateur.</p>
              </div>
            </div>
            <button
              onClick={() => { navigator.clipboard?.writeText(pitch); alert('Pitch copié - prêt à coller dans un email ou un message au client.'); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12px] font-semibold"><Copy className="h-3.5 w-3.5" /> Copier le pitch</button>
          </div>

          {/* Sélecteur de formation */}
          <div className="mt-3 inline-flex rounded-lg bg-white/5 border border-white/10 p-0.5">
            {VENTE_ARGS.map((a) => (
              <button key={a.key} onClick={() => setArgKey(a.key)} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${argKey === a.key ? 'bg-[#0066CC] text-white' : 'text-white/60 hover:text-white/90'}`}>{a.key === 'hygiene' ? 'Hygiène & Sécurité' : 'Nutrition & allergènes'}</button>
            ))}
          </div>

          {/* Mention IMPORTANTE (lever l'objection "on a déjà fait la formation") */}
          <div className="mt-4 rounded-xl border-2 border-[#E5B567]/50 bg-[#E5B567]/[0.10] p-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-[#E5B567] inline-flex items-center gap-1.5">⚠️ À bien préciser au client</p>
            <p className="text-[13px] text-white/85 leading-relaxed mt-1.5">{arg.mention}</p>
          </div>

          {/* L'essentiel (resume) */}
          <div className="mt-4 rounded-xl border border-[#3DD68C]/25 bg-[#3DD68C]/[0.06] p-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-[#3DD68C]">L&apos;essentiel</p>
            <ul className="mt-2 grid sm:grid-cols-2 gap-x-5 gap-y-1.5">
              {arg.resume.map((r) => (
                <li key={r} className="flex gap-2 text-[12.5px] text-white/75 leading-relaxed"><CheckCircle2 className="h-4 w-4 text-[#3DD68C] flex-shrink-0 mt-[1px]" /><span>{r}</span></li>
              ))}
            </ul>
          </div>

          {/* 6 piliers detailles */}
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {arg.piliers.map((p, i) => (
              <div key={p.titre} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 rounded-full bg-[#0066CC] items-center justify-center text-[11px] font-bold text-white flex-shrink-0">{i + 1}</span>
                  <p className="text-[13px] font-bold leading-tight">{p.titre}</p>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-2 text-[12px] text-white/55 leading-relaxed"><span className="text-[#3DD68C] flex-shrink-0">✓</span><span>{pt}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
          );
        })()}

        {/* Argument n°1 : le cadre de fin de formation à afficher dans le restaurant */}
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-start gap-5 flex-wrap">
            <a href="/uploads/assets/attestation-reussite.pdf" target="_blank" rel="noreferrer" className="block w-[150px] flex-shrink-0 mx-auto sm:mx-0">
              <img src="/uploads/assets/attestation-reussite.png" alt="Attestation de réussite" className="w-full rounded-md shadow-xl bg-white" onError={(e) => { e.currentTarget.outerHTML = '<div class=\'w-full aspect-[1.414/1] rounded-md bg-white/5 border border-white/10 grid place-items-center text-white/30 text-[10px] text-center px-2\'>Visuel officiel<br/>(PDF à fournir)</div>'; }} />
            </a>
            <div className="flex-1 min-w-[240px]">
              <span className="inline-flex px-2 py-0.5 rounded-full bg-[#0066CC]/15 text-[#4da3ff] text-[10px] font-bold uppercase tracking-wider">Argument n°1</span>
              <h2 className="text-[15px] font-bold mt-2">L&apos;attestation de réussite à afficher</h2>
              <p className="text-[12.5px] text-white/55 mt-1">En fin de formation, Delivery Digital délivre une <strong className="text-white/80">attestation de réussite (PDF imprimable)</strong> au nom des <strong className="text-white/80">salariés formés</strong>, pour la formation suivie. Le restaurateur l&apos;imprime, l&apos;encadre et l&apos;affiche en salle pour valoriser son sérieux auprès de ses clients et lors des contrôles.</p>
              <ul className="text-[11.5px] text-white/45 mt-2 space-y-0.5">
                <li>✓ Format A4 imprimable, prêt à encadrer</li>
                <li>✓ Nom de l&apos;établissement + salariés formés + formation effectuée</li>
                <li>✓ Millésime 2026 · certifié QUALIOPI · Delivery Digital</li>
              </ul>
              <a href="/uploads/assets/attestation-reussite.pdf" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED]"><Download className="h-3.5 w-3.5" /> Ouvrir / imprimer l&apos;attestation (PDF)</a>
            </div>
          </div>
        </section>

        {/* Argument n°2 : l'étiquette de vitrine extérieure (vitrophanie) - vrai PDF de marque */}
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-start gap-5 flex-wrap">
            <a href="/uploads/assets/etiquette-vitrine.pdf" target="_blank" rel="noreferrer" className="block w-[150px] flex-shrink-0 mx-auto sm:mx-0">
              <img src="/uploads/assets/etiquette-vitrine.png" alt="Étiquette de vitrine" className="w-full rounded-md shadow-xl" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </a>
            <div className="flex-1 min-w-[240px]">
              <span className="inline-flex px-2 py-0.5 rounded-full bg-[#0066CC]/15 text-[#4da3ff] text-[10px] font-bold uppercase tracking-wider">Argument n°2</span>
              <h2 className="text-[15px] font-bold mt-2">L&apos;étiquette de vitrine extérieure</h2>
              <p className="text-[12.5px] text-white/55 mt-1">Delivery Digital fournit aussi une <strong className="text-white/80">vitrophanie « Restaurant engagé &amp; formé »</strong> (PDF imprimable) à coller sur la <strong className="text-white/80">vitrine extérieure</strong> du restaurant. Elle indique aux passants que l&apos;établissement a formé ses équipes en hygiène, sécurité et développement durable, avec un <strong className="text-white/80">QR code</strong> de vérification, validée <strong className="text-white/80">2026</strong>.</p>
              <ul className="text-[11.5px] text-white/45 mt-2 space-y-0.5">
                <li>✓ Visible de la rue · attire et rassure les clients</li>
                <li>✓ 3 piliers : hygiène · sécurité · développement durable</li>
                <li>✓ QR code + « validée par Delivery Digital »</li>
              </ul>
              <a href="/uploads/assets/etiquette-vitrine.pdf" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED]"><Download className="h-3.5 w-3.5" /> Ouvrir / imprimer l&apos;étiquette (PDF)</a>
            </div>
          </div>
        </section>

        {/* Simulateur de prise en charge OPCO 2026 - par branche (IDCC) et modalité */}
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-[#0066CC]" /><h2 className="text-[15px] font-bold">Simulateur de prise en charge OPCO 2026</h2></div>
          <p className="text-[12.5px] text-white/50 mt-1">Les conditions varient selon l&apos;<strong className="text-white/70">OPCO et la branche (IDCC)</strong> du client, et selon la modalité (inter/intra, présentiel/distanciel). Choisissez la branche pour voir tous les barèmes 2026 (formation {FORMATION_TARIFS.unitPriceHT} € HT · {FORMATION_TARIFS.hours}h).</p>
          <a href="https://quel-est-mon-opco.francecompetences.fr/" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0066CC]/10 border border-[#0066CC]/25 text-[#4da3ff] text-[12.5px] font-semibold hover:bg-[#0066CC]/15 transition">
            <Search className="h-3.5 w-3.5" /> Vérifier l&apos;OPCO du client <span className="text-white/40 font-normal">· outil officiel France Compétences</span> <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <div className="sm:col-span-2">
              <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">Branche du client (IDCC)</label>
              <select value={simBrancheId} onChange={(e) => setSimBrancheId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white focus:outline-none focus:border-[#0066CC]">
                {BRANCHES_2026.map((b) => <option key={b.id} value={b.id} className="bg-[#181A20]">{b.opco} · {b.label} (IDCC {b.idcc}) · {brancheFinance[b.id].toLocaleString('fr-FR')} € finançable{estRecommandee(b.id) ? ' · Recommandé' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">Nombre de stagiaires</label>
              <input type="number" min={1} value={simCount} onChange={(e) => setSimCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white focus:outline-none focus:border-[#0066CC]" />
            </div>
          </div>
          {/* Reco commerciaux : privilegier les branches au meilleur budget finançable */}
          {isOwner && (
            <div className="mt-3 rounded-lg border border-[#3DD68C]/30 bg-[#3DD68C]/[0.07] px-3.5 py-2.5 text-[12px] text-[#3DD68C]">
              <strong>Recommandé · à vendre en priorité</strong> : {BRANCHES_2026.filter((b) => estRecommandee(b.id)).map((b) => b.label).join(', ')} - meilleur budget finançable (<strong>{meilleurBudget.toLocaleString('fr-FR')} € / stagiaire</strong>), donc la commission la plus élevée.
            </div>
          )}
          {/* Tableau des modalites de la branche selectionnee */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-[12.5px]">
              <thead className="text-white/40 text-[10px] uppercase tracking-wider bg-white/[0.02]">
                <tr><th className="text-left px-3 py-2">Modalité</th><th className="text-left px-3 py-2">Barème 2026</th><th className="text-left px-3 py-2">Montant finançable / stagiaire</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {simBranche.lignes.map((l, i) => {
                  const hUsed = l.maxHours ? Math.min(simHours, l.maxHours) : simHours;
                  const cov = couvertureLigne(l, simCostPer, simHours, simDays);
                  const bareme = l.kind === 'full' ? '100 % des coûts pédagogiques' : l.kind === 'hour' ? `${l.value} €/h × ${hUsed} h` : `${l.value} €/jour × ${simDays} j`;
                  return (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5"><p className="text-white/90">{l.modalite}</p><p className="text-white/40 text-[10.5px]">{l.capText}</p>{l.note && <p className="text-white/35 text-[10.5px] mt-0.5">{l.note}</p>}</td>
                      <td className="px-3 py-2.5 text-white/70">{bareme}</td>
                      <td className="px-3 py-2.5"><span className="font-semibold text-[#3DD68C]">{cov.toLocaleString('fr-FR')} €</span> <span className="text-white/40 text-[10.5px]">facturé → 0 reste à charge</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {simBranche.remarque && <p className="text-[11.5px] text-[#E5B567]/90 mt-2">{simBranche.remarque}</p>}
          <p className="text-[11.5px] text-white/45 mt-2">On facture le <strong className="text-white/70">montant finançable</strong> → le client n&apos;a <strong className="text-white/70">rien à payer</strong>. Pour {simNb} stagiaire{simNb > 1 ? 's' : ''} : {(simFinancePer * simNb).toLocaleString('fr-FR')} € facturés (100 % OPCO). Source : {simBranche.source}. <span className="text-white/30">Montants indicatifs - financement définitif soumis à l&apos;accord de l&apos;OPCO.</span></p>

          {/* Combien gagne l'agence selon le nombre de stagiaires (proprietaire uniquement) */}
          {isOwner && (
            <div className="mt-4 rounded-xl border border-[#3DD68C]/25 bg-[#3DD68C]/[0.06] p-4">
              <p className="text-[12.5px] font-semibold text-[#3DD68C]">Votre commission selon le nombre de stagiaires</p>
              <p className="text-[11.5px] text-white/50 mt-0.5">Branche <strong className="text-white/70">{simBranche.label}</strong> : {simFinancePer.toLocaleString('fr-FR')} € facturés / stagiaire. Commission {fix.toLocaleString('fr-FR')} € TTC par client/an (1er dossier) + {pct}% TTC sur chaque dossier.</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                {[1, 2, 3, 4, 5].map((n) => {
                  const ht = simFinancePer * n;
                  const com = Math.round(fix + (pct / 100) * ht);
                  const active = n === simCount;
                  return (
                    <button key={n} onClick={() => setSimCount(n)} className={`text-left rounded-lg border p-2.5 transition ${active ? 'border-[#3DD68C]/60 bg-[#3DD68C]/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                      <p className="text-[11px] text-white/50">{n} stagiaire{n > 1 ? 's' : ''}</p>
                      <p className="text-[10px] text-white/40">{ht.toLocaleString('fr-FR')} € TTC</p>
                      <p className="text-[16px] font-bold text-[#3DD68C] mt-0.5">+ {com.toLocaleString('fr-FR')} €</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-white/35 mt-2">1er dossier d&apos;un client : 120 € + {pct}%. Dossiers suivants du <strong>même client la même année</strong> : {pct}% seulement (le fixe n&apos;est compté qu&apos;une fois par client et par an).</p>
            </div>
          )}
        </section>

        {/* Rappels dus / à venir (notification in-app des clients à rappeler) */}
        {(() => {
          const now = Date.now();
          const withRem = leads.filter((l) => l.reminderAt).sort((a, b) => new Date(a.reminderAt!).getTime() - new Date(b.reminderAt!).getTime());
          const due = withRem.filter((l) => new Date(l.reminderAt!).getTime() <= now);
          const upcoming = withRem.filter((l) => new Date(l.reminderAt!).getTime() > now).slice(0, 3);
          if (!withRem.length) return null;
          return (
            <section className="rounded-2xl bg-[#181A20] border border-[#E5B567]/30 p-4">
              <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-[#E5B567]" /><h2 className="text-[14px] font-bold">Rappels {due.length > 0 && <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full bg-[#E5B567] text-black text-[11px] font-bold">{due.length} à faire</span>}</h2></div>
              <div className="flex flex-wrap gap-2">
                {[...due, ...upcoming].map((l) => {
                  const overdue = new Date(l.reminderAt!).getTime() <= now;
                  return (
                    <button key={l._id} onClick={() => setReminderLead(l)} className={`text-left px-3 py-2 rounded-lg border text-[12px] ${overdue ? 'bg-[#E5B567]/15 border-[#E5B567]/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                      <p className="font-semibold">{l.denom || 'Client'}</p>
                      <p className={overdue ? 'text-[#E5B567]' : 'text-white/50'}>{new Date(l.reminderAt!).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}{l.waitingNote ? ` · ${l.waitingNote}` : ''}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Clients */}
        <section id="sec-clients" className="scroll-mt-4 rounded-2xl bg-[#181A20] border border-white/10">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[15px] font-bold">Mes clients</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-8 pr-3 py-1.5 w-44 rounded-lg bg-white/5 border border-white/10 text-[12.5px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              </div>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12.5px] cursor-pointer" title="Format : Nom;Email;SIRET;OPCO (1 client par ligne)">
                {importing ? 'Import…' : 'Importer CSV'}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.currentTarget.value = ''; }} />
              </label>
              <button onClick={() => setShowCreate((v) => !v)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED]"><Plus className="h-3.5 w-3.5" /> Nouveau client</button>
            </div>
          </div>

          {showCreate && (
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="grid sm:grid-cols-4 gap-3">
                <input value={denom} onChange={(e) => setDenom(e.target.value)} placeholder="Nom du client *" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email client" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
                <input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="SIRET (détection auto OPCO)" inputMode="numeric" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 font-mono focus:outline-none focus:border-[#0066CC]" />
                <input value={opco} onChange={(e) => setOpco(e.target.value)} placeholder="OPCO" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              </div>
              {/* Emails dédiés : comptable + gérant (signataire de la convention). @Rabah 2026-06-18 */}
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <input type="email" value={accountantEmail} onChange={(e) => setAccountantEmail(e.target.value)} placeholder="Email comptable (optionnel)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
                <input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} placeholder="Email gérant - signature convention (optionnel)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              </div>
              {/* Suivi : effectif entreprise + formation déjà effectuée cette année (sinon budget OPCO dispo 100%). @Rabah 2026-06-18 */}
              <div className="grid sm:grid-cols-4 gap-3 mt-3">
                <input value={companyEmployees} onChange={(e) => setCompanyEmployees(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Nombre de salariés" inputMode="numeric" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
                <label className="sm:col-span-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white/80 cursor-pointer">
                  <input type="checkbox" checked={formationDoneThisYear} onChange={(e) => setFormationDoneThisYear(e.target.checked)} className="accent-[#0066CC]" />
                  Formation déjà effectuée cette année <span className="text-white/40">(sinon budget OPCO disponible à 100%)</span>
                </label>
              </div>
              {(detecting || detectMsg) && <p className="text-[11.5px] text-[#3DD68C] mt-2">{detecting ? 'Détection en cours…' : detectMsg}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={createLead} disabled={creating} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{creating ? 'Ajout…' : 'Créer le client'}</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[12.5px]">Annuler</button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-white/40">{leads.length === 0 ? "Aucun client. Cliquez sur « Nouveau client » pour démarrer." : 'Aucun résultat.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="text-white/40 text-[10px] uppercase tracking-wider">
                  <tr className="border-b border-white/5"><th className="text-left px-5 py-2.5">Client</th>{isOwner && <th className="text-left px-5 py-2.5">Commercial</th>}<th className="text-left px-5 py-2.5">Dossier OPCO</th>{isOwner && <th className="text-left px-5 py-2.5">Vous gagnez</th>}<th className="text-left px-5 py-2.5">Accès OPCO</th><th className="text-right px-5 py-2.5">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((l) => {
                    const acc = l.email ? accessByEmail[l.email] : undefined;
                    const initial = (l.denom || 'C').trim().charAt(0).toUpperCase();
                    const dos = dossierByLead[l._id];
                    const dm = dos ? (DOSSIER_META[dos.status] || DOSSIER_META.transmitted) : null;
                    return (
                      <Fragment key={l._id}>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 rounded-full bg-gradient-to-br from-[#0066CC] to-[#2997FF] items-center justify-center text-[12px] font-bold flex-shrink-0">{initial}</span>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{l.denom || 'Client'}</p>
                              <p className="text-white/40 text-[11.5px] truncate">{[l.email, l.opco && `OPCO ${l.opco}`].filter(Boolean).join(' · ') || l.siret || '-'}</p>
                              {/* Suivi : effectif + budget OPCO de l'année (100% dispo si aucune formation faite). @Rabah 2026-06-18 */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {/* Nombre de salariés éditable en 1 clic, sans monter le dossier. @Rabah 2026-07-02 */}
                                {editEmp === l._id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <input value={empDraft} autoFocus inputMode="numeric" onChange={(e) => setEmpDraft(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') saveEmployees(l._id, empDraft); if (e.key === 'Escape') setEditEmp(null); }} placeholder="Nb" className="w-12 px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[10.5px] text-white focus:outline-none" />
                                    <button onClick={() => saveEmployees(l._id, empDraft)} className="text-[10px] text-[#4da3ff] font-semibold">OK</button>
                                  </span>
                                ) : (
                                  <button onClick={() => { setEditEmp(l._id); setEmpDraft(l.companyEmployees != null ? String(l.companyEmployees) : ''); }} title="Indiquer le nombre de salariés (sans monter le dossier)" className="inline-flex items-center gap-1 text-[10.5px] text-white/50 hover:text-white/80">
                                    <Users className="h-3 w-3" /> {l.companyEmployees != null ? `${l.companyEmployees} salarié${l.companyEmployees > 1 ? 's' : ''}` : '+ salariés'}
                                  </button>
                                )}
                                {/* Badge basculable en 1 clic : budget dispo <-> formation faite cette année. @Rabah 2026-07-02 */}
                                <button
                                  onClick={async () => {
                                    // Maj optimiste du seul badge (pas de reload de toute la page). Rollback si l'API échoue. @Rabah 2026-07-02
                                    const next = !l.formationDoneThisYear;
                                    setLeads((prev) => prev.map((x) => x._id === l._id ? { ...x, formationDoneThisYear: next } : x));
                                    try { await fetch(`/api/agency/self/leads/${l._id}`, { method: 'PATCH', headers: authJson(), body: JSON.stringify({ formationDoneThisYear: next }) }); }
                                    catch { setLeads((prev) => prev.map((x) => x._id === l._id ? { ...x, formationDoneThisYear: !next } : x)); }
                                  }}
                                  title="Cliquer pour basculer : Budget OPCO 100% dispo ↔ Formation faite cette année"
                                  className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] border transition hover:brightness-125 cursor-pointer ${l.formationDoneThisYear ? 'border-[#E5B567]/30 text-[#E5B567] bg-[#E5B567]/10' : 'border-[#3DD68C]/30 text-[#3DD68C] bg-[#3DD68C]/10'}`}
                                >{l.formationDoneThisYear ? 'Formation faite cette année' : 'Budget OPCO 100% dispo'}</button>
                              </div>
                              {/* Dates de la formation, visibles sans ouvrir le dossier. @Rabah 2026-07-20 */}
                              {dos?.sessionStart && (
                                <div className="mt-1.5"><SessionDatesBadge start={dos.sessionStart} end={dos.sessionEnd} /></div>
                              )}
                              {/* Emails dédiés comptable / gérant si renseignés. @Rabah 2026-06-18 */}
                              {(l.accountantEmail || l.managerEmail) && (
                                <div className="flex flex-col gap-0.5 mt-1">
                                  {l.accountantEmail && <span className="inline-flex items-center gap-1 text-[10.5px] text-white/45 truncate"><Mail className="h-3 w-3 flex-shrink-0" /> Compta : {l.accountantEmail}</span>}
                                  {l.managerEmail && <span className="inline-flex items-center gap-1 text-[10.5px] text-white/45 truncate"><Mail className="h-3 w-3 flex-shrink-0" /> Gérant : {l.managerEmail}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {isOwner && (
                          <td className="px-5 py-3">
                            {/* Commercial rattaché + réaffectation (proprietaire uniquement) */}
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                              <select
                                value={l.commercialId || ''}
                                disabled={assigningLead === l._id}
                                onChange={(e) => assignLead(l._id, e.target.value)}
                                title="Réaffecter ce client à un commercial"
                                className="max-w-[150px] bg-transparent text-[12px] text-white/80 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-[#0066CC] disabled:opacity-50 hover:bg-white/5 cursor-pointer">
                                <option value="" className="bg-[#181A20]">Agence (moi)</option>
                                {commerciaux.map((co) => <option key={co.id} value={co.id} className="bg-[#181A20]">{co.name}</option>)}
                              </select>
                            </div>
                          </td>
                        )}
                        <td className="px-5 py-3">
                          {dos && dm ? (
                            <div className="min-w-[140px]">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] border ${dm.cls}`}>{dm.label}</span>
                              {dos.mountedByAdmin && <span className="ml-1 inline-flex px-1.5 py-0.5 rounded-full text-[9.5px] border border-[#2997FF]/30 text-[#2997FF] bg-[#2997FF]/10" title="Dossier monté par Delivery Digital">Monté par DD</span>}
                              <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#3DD68C]" style={{ width: `${Math.round((dm.step / DOSSIER_TOTAL_STEPS) * 100)}%` }} /></div>
                              <p className="text-white/40 text-[10.5px] mt-1">{(dos.amountHT || 0).toLocaleString('fr-FR')} € HT</p>
                            </div>
                          ) : <span className="text-white/30 text-[11.5px]">Non monté</span>}
                        </td>
                        {isOwner && (
                          <td className="px-5 py-3">
                            {dos ? (
                              <div>
                                <span className="font-semibold text-[#3DD68C]">{earn(dos).toLocaleString('fr-FR')} €</span>
                                <p className={`text-[10.5px] mt-0.5 ${dos.status === 'paid' ? 'text-[#3DD68C]' : 'text-white/40'}`}>{dos.status === 'paid' ? 'Acquis ✓ (OPCO payé)' : 'À la réception OPCO'}</p>
                              </div>
                            ) : <span className="text-white/30 text-[11.5px]">-</span>}
                          </td>
                        )}
                        <td className="px-5 py-3">
                          {/* Statut + suivi/rappel éditable (ce qu'on attend : courrier, rappel client). */}
                          <button onClick={() => setReminderLead(l)} className="text-left group" title="Modifier le suivi / programmer un rappel">
                            {acc === 'received' ? <span className="inline-flex items-center gap-1 text-[11.5px] text-[#3DD68C]"><ShieldCheck className="h-3.5 w-3.5" /> Reçus par Delivery Digital</span>
                              : l.waitingNote ? <span className="text-[11.5px] text-[#E5B567]">{l.waitingNote}</span>
                              : acc === 'pending' ? <span className="text-[11.5px] text-[#E5B567]">Demandés…</span>
                              : <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#4da3ff] bg-[#0066CC]/15 border border-[#0066CC]/45 rounded-full px-2.5 py-1 group-hover:bg-[#0066CC]/30 transition"><Clock className="h-3.5 w-3.5" /> + Suivi / rappel</span>}
                            {l.reminderAt && <span className="block mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-[#4da3ff]"><Clock className="h-3 w-3" /> Rappel {new Date(l.reminderAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            {/* Suivi visible même sans dossier monté : ouvre la timeline "à venir". @Rabah 2026-07-02 */}
                            <button onClick={() => setOpenTimeline((v) => v === l._id ? null : l._id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] whitespace-nowrap ${openTimeline === l._id ? 'bg-[#0066CC]/15 border-[#0066CC]/40 text-[#4da3ff]' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}><Clock className="h-3.5 w-3.5" /> Suivi</button>
                            {dos && dos.status !== 'paid' && dos.status !== 'invoiced' && <button onClick={() => setEditDossier({ lead: l, dossier: dos })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px] whitespace-nowrap" title="Corriger ce dossier déjà transmis et le renvoyer"><PenLine className="h-3.5 w-3.5" /> Modifier</button>}
                            {/* Email d'information visible qu'un dossier OPCO existe ou non : on doit
                                pouvoir (re)prévenir le client à tout moment, avant comme après le montage
                                du dossier. Cible le dossier s'il existe (le « envoyé le » y est rattaché),
                                sinon le lead. @Rabah 2026-07-22 */}
                            <button onClick={() => setConfirmTarget(dos
                              ? { kind: 'dossier', id: dos._id, clientEmail: dos.clientEmail || l.email, denom: dos.denom || l.denom, rdvAt: dos.rdvAt, confirmationEmailSentAt: dos.confirmationEmailSentAt }
                              : { kind: 'lead', id: l._id, clientEmail: l.email, denom: l.denom, rdvAt: l.rdvAt, confirmationEmailSentAt: l.confirmationEmailSentAt })} title="Envoyer au client l'email d'information (déroulé + RDV)" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0066CC]/10 hover:bg-[#0066CC]/20 border border-[#0066CC]/25 text-[#4da3ff] text-[11.5px] whitespace-nowrap"><Mail className="h-3.5 w-3.5" /> Email d&apos;information{(dos ? dos.confirmationEmailSentAt : l.confirmationEmailSentAt) ? ' ✓' : ''}</button>
                            <button onClick={() => setDossierLead(l)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px] whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> {dos ? 'Nouveau dossier' : 'Dossier OPCO'}</button>
                            {acc !== 'received' && <button onClick={() => setAccessLead(l)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px] whitespace-nowrap"><KeyRound className="h-3.5 w-3.5" /> {acc === 'pending' ? 'Accès OPCO · en cours' : 'Accès OPCO'}</button>}
                          </div>
                        </td>
                      </tr>
                      {openTimeline === l._id && (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={isOwner ? 6 : 4} className="px-5 pb-4 pt-1">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Suivi du dossier · {l.denom || 'Client'}{!dos && <span className="ml-2 normal-case tracking-normal text-white/30">— dossier pas encore monté</span>}</p>
                            <DossierTimeline d={dos ?? null} accessStatus={l.email ? accessByEmail[l.email] : undefined} onAccess={() => setAccessLead(l)} onRattachInfo={() => dos && setRattachInfo(dos)} />
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              {dos ? (
                                <>
                                  <button onClick={() => setConfirmTarget({ kind: 'dossier', id: dos._id, clientEmail: dos.clientEmail || l.email, denom: dos.denom || l.denom, rdvAt: dos.rdvAt, confirmationEmailSentAt: dos.confirmationEmailSentAt })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0066CC]/15 hover:bg-[#0066CC]/25 border border-[#0066CC]/30 text-[#4da3ff] text-[11.5px] font-semibold"><Mail className="h-3.5 w-3.5" /> Email d&apos;information (déroulé + RDV)</button>
                                  {dos.confirmationEmailSentAt && <span className="text-[11px] text-[#3DD68C]">✓ Envoyé le {new Date(dos.confirmationEmailSentAt).toLocaleDateString('fr-FR')}{dos.rdvAt ? ` · RDV le ${new Date(dos.rdvAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</span>}
                                </>
                              ) : (
                                // Dossier pas encore monté : on propose de le monter + l'email de confirmation client. @Rabah 2026-07-02
                                <>
                                  <button onClick={() => setDossierLead(l)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0066CC]/15 hover:bg-[#0066CC]/25 border border-[#0066CC]/30 text-[#4da3ff] text-[11.5px] font-semibold"><FileText className="h-3.5 w-3.5" /> Monter le dossier OPCO</button>
                                  <button onClick={() => setConfirmTarget({ kind: 'lead', id: l._id, clientEmail: l.email, denom: l.denom, rdvAt: l.rdvAt, confirmationEmailSentAt: l.confirmationEmailSentAt })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px]"><Mail className="h-3.5 w-3.5" /> Email d&apos;information{l.confirmationEmailSentAt ? ' ✓' : ''}</button>
                                </>
                              )}
                            </div>
                            {/* Tâches collaboratives agence <-> DDN sur TOUS les clients : portées par le
                                client (lead), pas besoin qu'un dossier OPCO existe. @Rabah 2026-07-02 */}
                            <DossierTasks
                              tasks={l.tasks || []}
                              dark
                              emailSuggestions={[agency?.email, 'contact@deliverydigital.fr'].filter(Boolean) as string[]}
                              onAdd={async (tk) => { const r = await fetch(`/api/agency/self/leads/${l._id}/tasks`, { method: 'POST', headers: authJson(), body: JSON.stringify(tk) }); const j = await r.json(); if (j.ok) updateLeadTasks(l._id, j.tasks); }}
                              onToggle={async (taskId, done) => { const r = await fetch(`/api/agency/self/leads/${l._id}/tasks/${taskId}`, { method: 'PATCH', headers: authJson(), body: JSON.stringify({ done }) }); const j = await r.json(); if (j.ok) updateLeadTasks(l._id, j.tasks); }}
                              onEditComment={async (taskId, comment) => { const r = await fetch(`/api/agency/self/leads/${l._id}/tasks/${taskId}`, { method: 'PATCH', headers: authJson(), body: JSON.stringify({ comment }) }); const j = await r.json(); if (j.ok) updateLeadTasks(l._id, j.tasks); }}
                              onDelete={async (taskId) => { const r = await fetch(`/api/agency/self/leads/${l._id}/tasks/${taskId}`, { method: 'DELETE', headers: authJson() }); const j = await r.json(); if (j.ok) updateLeadTasks(l._id, j.tasks); }}
                            />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Mes commerciaux (sous-comptes) - proprietaire d'agence uniquement */}
        {isOwner && (
          <section className="rounded-2xl bg-[#181A20] border border-white/10">
            <div className="px-5 py-4 border-b border-white/10"><h2 className="text-[15px] font-bold">Mes commerciaux</h2><p className="text-[12px] text-white/50 mt-0.5">Créez des comptes commerciaux : ils montent des dossiers pour vos clients (sans voir vos commissions).</p></div>
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="Nom du commercial" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
                <input type="email" value={coEmail} onChange={(e) => setCoEmail(e.target.value)} placeholder="Email du commercial" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              </div>
              <button onClick={createCommercial} disabled={coBusy} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED] disabled:opacity-60"><Plus className="h-3.5 w-3.5" /> {coBusy ? 'Création…' : 'Créer un commercial'}</button>
              {coCreated && (
                <div className="mt-3 rounded-lg border border-[#3DD68C]/40 bg-[#3DD68C]/5 p-3 text-[12.5px]">
                  <p className="text-[#3DD68C] font-semibold">Commercial créé - transmettez-lui ses accès (login sur /agence) :</p>
                  <p className="font-mono mt-1">Login : <strong className="select-all">{coCreated.email}</strong> · Mot de passe : <strong className="select-all">{coCreated.password}</strong></p>
                  <button onClick={() => setCoCreated(null)} className="mt-1 text-white/50 underline text-[11.5px]">Fermer</button>
                </div>
              )}
            </div>
            {commerciaux.length > 0 && (
              <table className="w-full text-[12.5px]">
                <thead className="text-white/40 text-[10px] uppercase tracking-wider"><tr className="border-b border-white/5"><th className="text-left px-5 py-2.5">Commercial</th><th className="text-left px-5 py-2.5">Clients</th><th className="text-left px-5 py-2.5">Dossiers</th><th className="text-right px-5 py-2.5">Gains générés</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {commerciaux.map((co) => (
                    <tr key={co.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5"><p className="font-semibold">{co.name}</p><p className="text-white/40 text-[11.5px]">{co.email}</p></td>
                      <td className="px-5 py-2.5 text-white/70">{co.clients}</td>
                      <td className="px-5 py-2.5 text-white/70">{co.dossiers}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-[#3DD68C]">{co.gains.toLocaleString('fr-FR')} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Coordonnees bancaires (pour recevoir les commissions) - champs selon le pays */}
        {isOwner && (
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[15px] font-bold">Coordonnées bancaires</h2>
            {agency?.bankValidated ? <span className="inline-flex items-center gap-1 text-[11.5px] text-[#3DD68C]"><ShieldCheck className="h-3.5 w-3.5" /> Compte validé</span>
              : <span className="text-[11.5px] text-[#E5B567]">En attente de validation Delivery Digital</span>}
          </div>
          <p className="text-[12.5px] text-white/50 mt-1">Vos commissions sont versées sur ce compte à la réception du paiement OPCO. Le PDF du RIB est obligatoire pour valider le compte.</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">Pays</label>
              <select value={bankCountry} onChange={(e) => { setBankCountry(e.target.value); setBankFields({}); }} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white focus:outline-none focus:border-[#0066CC]">
                {COUNTRIES.map((c) => <option key={c.code} value={c.code} className="bg-[#181A20]">{c.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">Titulaire du compte</label>
              <input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} placeholder="Titulaire du compte" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
            </div>
            {bankFieldsFor(bankCountry).map((f) => (
              <div key={f.key}>
                <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">{f.label}</label>
                <input value={bankFields[f.key] || ''} onChange={(e) => setBankFields((b) => ({ ...b, [f.key]: e.target.value }))} placeholder={f.label} className={`w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC] ${f.mono ? 'font-mono' : ''}`} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button onClick={saveBank} disabled={savingBank} className="px-4 py-2 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{savingBank ? 'Enregistrement…' : 'Enregistrer mon RIB'}</button>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12.5px] cursor-pointer">
              <FileText className="h-3.5 w-3.5" /> {uploadingRib ? 'Envoi…' : (agency?.ribPdfUrl ? 'Remplacer le PDF du RIB' : 'Téléverser le PDF du RIB *')}
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRib(f); e.currentTarget.value = ''; }} />
            </label>
            {agency?.ribPdfUrl && <a href={agency.ribPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-[#3DD68C] underline"><ShieldCheck className="h-3.5 w-3.5" /> PDF reçu</a>}
          </div>
          {!agency?.ribPdfUrl && <p className="text-[11.5px] text-[#E5B567] mt-2">Le PDF du RIB est obligatoire pour que Delivery Digital valide votre compte bancaire.</p>}
        </section>
        )}

        {/* Contrat de partenariat (apercu ouvrable + signature + tampon auto) */}
        {isOwner && (
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[15px] font-bold">Contrat de partenariat</h2>
            {agency?.contract?.validated ? <span className="inline-flex items-center gap-1 text-[11.5px] text-[#3DD68C]"><ShieldCheck className="h-3.5 w-3.5" /> Validé par Delivery Digital</span>
              : agency?.contract?.signed ? <span className="text-[11.5px] text-[#E5B567]">Signé - en attente de validation</span>
              : <span className="text-[11.5px] text-white/40">Non signé</span>}
          </div>
          <p className="text-[12.5px] text-white/50 mt-1">Commission {fix.toLocaleString('fr-FR')} € + {pct}% versée à la réception du paiement OPCO. Ouvrez le contrat pour le lire et le signer - votre tampon est généré automatiquement à partir des informations de votre entreprise.</p>
          {/* Apercu cliquable du document */}
          <div className="mt-3 flex items-stretch gap-4 flex-wrap">
            <button onClick={() => setShowContract(true)} className="group relative w-[150px] h-[200px] rounded-lg bg-white overflow-hidden border border-white/10 shadow-lg flex-shrink-0 text-left">
              <div className="p-3 text-[#1D1D1F] scale-100">
                <div className="h-1.5 w-10 bg-[#0066CC] rounded mb-2" />
                <p className="text-[7px] uppercase tracking-wider text-[#86868B]">Delivery Digital</p>
                <p className="text-[8.5px] font-bold leading-tight mt-1">Contrat de partenariat - Apporteur d&apos;affaires OPCO</p>
                <div className="mt-2 space-y-[3px]">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-[2.5px] rounded bg-black/10" style={{ width: `${88 - (i % 3) * 14}%` }} />)}</div>
                {agency?.contract?.signed && <div className="absolute bottom-3 right-2"><div className="text-[#1d4ed8]/80 border-2 border-[#1d4ed8]/70 rounded px-1.5 py-0.5 text-[5.5px] font-bold uppercase -rotate-6">Signé</div></div>}
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition flex items-end justify-center pb-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1D1D1F] text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition"><Eye className="h-3 w-3" /> Ouvrir</span>
              </div>
            </button>
            <div className="flex-1 min-w-[200px] flex flex-col justify-center gap-2">
              {!agency?.companyInfo?.legalName && <p className="text-[11.5px] text-[#E5B567]">Renseignez d&apos;abord vos informations d&apos;entreprise (bandeau en haut) pour générer votre tampon.</p>}
              {agency?.contract?.signed ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[12.5px]">
                  <p className="inline-flex items-center gap-1.5 text-[#3DD68C] font-semibold"><PenLine className="h-3.5 w-3.5" /> Contrat signé</p>
                  <p className="text-white/60 mt-1">Par <strong className="text-white/80">{agency.contract.signedBy}</strong>{agency.contract.signedFunction ? ` (${agency.contract.signedFunction})` : ''}{agency.contract.signedAt ? ` le ${new Date(agency.contract.signedAt).toLocaleDateString('fr-FR')}` : ''}.</p>
                </div>
              ) : (
                <button onClick={() => setShowContract(true)} className="self-start inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3DD68C] text-black text-[12.5px] font-semibold hover:brightness-110"><PenLine className="h-3.5 w-3.5" /> Lire et signer le contrat</button>
              )}
            </div>
          </div>
        </section>
        )}

        {/* Fonds disponibles : encaissement de la commission (owner uniquement) */}
        {isOwner && fondsDispo.length > 0 && (
        <section id="sec-fonds" className="scroll-mt-4 rounded-2xl bg-[#181A20] border border-[#3DD68C]/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <div><h2 className="text-[15px] font-bold inline-flex items-center gap-1.5"><Wallet className="h-4 w-4 text-[#3DD68C]" /> Fonds disponibles</h2><p className="text-[12px] text-white/50 mt-0.5">L&apos;OPCO a payé Delivery Digital. Demandez l&apos;encaissement de votre commission.</p></div>
            <span className="text-[12px] text-white/50">À encaisser : <strong className="text-[#3DD68C]">{fondsTotal.toLocaleString('fr-FR')} €</strong></span>
          </div>
          <table className="w-full text-[12.5px]">
            <thead className="text-white/40 text-[10px] uppercase tracking-wider"><tr className="border-b border-white/5"><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Référence dossier</th><th className="text-left px-5 py-2.5">Déposé le</th><th className="text-left px-5 py-2.5">Votre commission</th><th className="text-right px-5 py-2.5">Action</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {fondsDispo.map((d) => (
                <tr key={d._id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3"><p className="font-semibold">{d.denom || 'Client'}</p><p className="text-white/40 text-[11.5px]">{d.formationTitle}</p></td>
                  <td className="px-5 py-3 font-mono text-[11.5px] text-white/70">{dossierRef(d)}</td>
                  <td className="px-5 py-3 text-white/60">{d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
                  <td className="px-5 py-3 font-semibold text-[#3DD68C]">{earn(d).toLocaleString('fr-FR')} €</td>
                  <td className="px-5 py-3 text-right">
                    {d.encashRequestedAt
                      ? <span className="inline-flex items-center gap-1 text-[11.5px] text-[#E5B567]">Ordre envoyé · en attente du virement</span>
                      : <button onClick={() => setEncashDossier(d)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#3DD68C] text-black text-[12px] font-semibold hover:brightness-110"><Wallet className="h-3.5 w-3.5" /> Encaisser</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        )}

        {/* Historique des paiements (owner uniquement) */}
        {isOwner && (
        <section id="sec-historique" className="scroll-mt-4 rounded-2xl bg-[#181A20] border border-white/10">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Historique des paiements</h2>
            <span className="text-[12px] text-white/50">Total acquis : <strong className="text-[#3DD68C]">{paidDossiers.reduce((s, d) => s + earn(d), 0).toLocaleString('fr-FR')} €</strong></span>
          </div>
          {/* Ordres de virement (PDF) reçus de Delivery Digital. @Rabah 2026-07-29 */}
          {payOrders.length > 0 && (
            <div className="px-5 py-3 border-b border-white/10">
              <p className="text-[11px] uppercase tracking-wider font-bold text-white/40 mb-2">Ordres de virement reçus</p>
              <div className="flex flex-wrap gap-2">
                {payOrders.map((o) => (
                  <a key={o._id} href={pdfHref(o)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11.5px] text-white/80 hover:bg-white/10">
                    <span className="font-semibold text-[#3DD68C]">{o.ref}</span> · {(o.totalCommission || 0).toLocaleString('fr-FR')} €{o.createdAt ? ` · ${new Date(o.createdAt).toLocaleDateString('fr-FR')}` : ''} · PDF
                  </a>
                ))}
              </div>
            </div>
          )}
          {paidDossiers.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-white/40">Aucun paiement OPCO reçu pour l&apos;instant. La commission est versée dès que le dossier passe au statut « Payé ».</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="text-white/40 text-[10px] uppercase tracking-wider"><tr className="border-b border-white/5"><th className="text-left px-5 py-2.5">Date</th><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Montant HT</th><th className="text-right px-5 py-2.5">Votre commission</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {paidDossiers.map((d) => (
                    <tr key={d._id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-white/60">{new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleDateString('fr-FR')}</td>
                      <td className="px-5 py-3"><p className="font-semibold">{d.denom || 'Client'}</p><p className="text-white/40 text-[11.5px]">{d.formationTitle}</p></td>
                      <td className="px-5 py-3 text-white/70">{(d.amountHT || 0).toLocaleString('fr-FR')} €</td>
                      <td className="px-5 py-3 text-right font-semibold text-[#3DD68C]">+ {earn(d).toLocaleString('fr-FR')} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}

        </>)}

        {/* Onglet Informatique : devis IT (prestations Delivery Digital). @Rabah 2026-08-01 */}
        {project === 'informatique' && (
          <DevisITSection auth={auth} authJson={authJson} isOwner={isOwner} fix={fix} pct={pct} />
        )}

        {/* Vente Pyemes : affiché quand le projet Pyemes est sélectionné. @Rabah 2026-08-01 */}
        {project === 'pyemes' && isOwner && pyemesData?.active && (
        <section id="sec-pyemes" className="scroll-mt-4 rounded-2xl bg-[#181A20] border border-[#635BFF]/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://pyemes.com/logo/pyemes-mark.svg" alt="Pyemes" className="h-8 w-8 animate-[spin_6s_linear_infinite]" style={{ filter: 'brightness(0) invert(1)' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://pyemes.com/icon-192.png'; }} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-bold">Vente Pyemes</h2>
              <p className="text-[12px] text-white/50">Revendez la solution comptable Pyemes et touchez <strong className="text-[#635BFF]">{pyemesData.agence?.commission_percent ?? ''}%</strong> sur chaque paiement de vos clients.</p>
            </div>
            {/* Date de lancement officiel de Pyemes. @author Rabah Ziane - 2026-08-01 */}
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#635BFF]/15 border border-[#635BFF]/30 px-3 py-1.5 text-[11.5px] font-semibold text-[#b3abff]">
              🚀 Lancement officiel le 1er septembre 2026
            </span>
          </div>

          {/* Mini-dashboard animé (barres qui montent/descendent) - façon page d'accueil, pour le côté pro. @Rabah 2026-08-01 */}
          <div className="px-5 pt-4 pb-1 flex items-end gap-[5px] h-20 overflow-hidden" aria-hidden>
            <style>{'@keyframes pymBar{0%,100%{transform:scaleY(.42)}50%{transform:scaleY(1)}}'}</style>
            {[62, 50, 71, 66, 82, 91, 100, 74, 86, 92, 66, 58, 78, 68].map((h, i) => (
              <span key={i} style={{ height: `${h}%`, flex: 1, maxWidth: 12, background: '#5FA88C', borderRadius: 3, transformOrigin: 'bottom', animation: `pymBar ${2.1 + (i % 4) * 0.35}s ease-in-out ${(i * 0.11).toFixed(2)}s infinite` }} />
            ))}
          </div>

          <div className="p-5 pt-3 space-y-4">
            {!pyemesData.contract?.signed && (
              /* Avenant à signer - affiché en bandeau, l'interface reste visible pour vérification. @Rabah 2026-08-01 */
              <div className="rounded-xl border border-[#635BFF]/30 bg-[#635BFF]/[0.06] p-4">
                <p className="text-[13px] font-bold text-white">Avenant au contrat - Revente Pyemes</p>
                <div className="mt-2 text-[12.5px] text-white/70 leading-[1.6] space-y-1.5">
                  <p>En signant, l&apos;Agence est autorisée à revendre la solution comptable <strong className="text-white">Pyemes</strong> et accepte les conditions suivantes :</p>
                  <p>• <strong className="text-white">Commission de 30% du montant TTC</strong> de chaque paiement des clients qu&apos;elle apporte (via son lien de parrainage), pendant toute la durée de leur abonnement.</p>
                  <p>• <strong className="text-white">Attribution</strong> par lien de parrainage unique ; Delivery Digital peut corriger une attribution erronée.</p>
                  <p>• <strong className="text-white">Versement automatique via Stripe Connect</strong> dès que les fonds sont disponibles ; l&apos;Agence complète son onboarding Stripe (identité + coordonnées bancaires).</p>
                  <p>• Avenant valable tant que le contrat de partenariat est en vigueur.</p>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-2">
                  <input value={pyemesSign.by} onChange={(e) => setPyemesSign((s) => ({ ...s, by: e.target.value }))} placeholder="Nom et prénom du signataire" className="h-10 px-3 rounded-lg bg-black/30 border border-white/15 text-[13px] text-white" />
                  <input value={pyemesSign.fn} onChange={(e) => setPyemesSign((s) => ({ ...s, fn: e.target.value }))} placeholder="Fonction (ex. Gérant)" className="h-10 px-3 rounded-lg bg-black/30 border border-white/15 text-[13px] text-white" />
                </div>
                <button onClick={signerAvenantPyemes} disabled={pyemesSignBusy} className="mt-3 px-4 py-2.5 rounded-lg bg-black text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-60">{pyemesSignBusy ? 'Signature…' : 'Je signe l’avenant et commence à vendre'}</button>
                <p className="text-[11px] text-white/40 mt-2">Signature électronique valant acceptation (nom, fonction, date et IP enregistrés).</p>
              </div>
            )}
            {/* Action à faire : onboarding Stripe (Stripe vérifie les documents, sans intervention DD) */}
            {!pyemesConnect?.onboarde ? (
              <div className="rounded-2xl border border-[#635BFF]/30 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,91,255,0.14), rgba(99,91,255,0.03))' }}>
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-white/50">
                    <ShieldCheck className="h-4 w-4 text-[#3DD68C]" /> Paiements sécurisés par
                    {/* Logo Stripe (wordmark officiel, blanc) */}
                    <span className="inline-flex items-center gap-1.5"><span className="inline-flex items-center justify-center rounded-[5px]" style={{ background: '#635BFF', width: 18, height: 18 }}><svg width="11" height="11" viewBox="0 0 32 32"><polygon points="6,12 26,8 26,21 6,25" fill="#fff" /></svg></span><span className="text-[12px] font-bold text-white normal-case tracking-normal">Stripe</span></span>
                  </div>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full text-[#F5A623] bg-[#F5A623]/15">Action requise</span>
                </div>
                <div className="p-4">
                  <p className="text-[13.5px] font-bold text-white">Activez vos paiements pour recevoir vos commissions</p>
                  <p className="text-[12.5px] text-white/60 mt-1 leading-[1.55]">Stripe vérifie votre <strong className="text-white/80">identité</strong> et vos <strong className="text-white/80">coordonnées bancaires</strong> en ligne, en quelques minutes. Vous suivez simplement les étapes - nous n&apos;avons rien à faire de notre côté.</p>
                  <button onClick={connecterPyemes} disabled={pyemesBusy} className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-70 transition" style={{ background: '#635BFF' }}>
                    {pyemesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="inline-flex items-center justify-center rounded-[4px]" style={{ background: '#fff', width: 16, height: 16 }}><svg width="10" height="10" viewBox="0 0 32 32"><polygon points="6,12 26,8 26,21 6,25" fill="#635BFF" /></svg></span>}
                    {pyemesBusy ? 'Ouverture de Stripe…' : (pyemesConnect?.demarre ? 'Terminer ma vérification' : 'Activer mes paiements')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#3DD68C]/30 bg-[#3DD68C]/10 px-4 py-3 text-[12.5px] text-[#3DD68C] font-semibold inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Paiements activés - vos commissions sont versées automatiquement dès qu&apos;elles sont disponibles.</div>
            )}

            {/* Lien de vente */}
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-white/40 mb-1.5">Votre lien de vente</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-[12.5px] font-mono break-all">{pyemesData.lien}</code>
                <button onClick={() => { navigator.clipboard?.writeText(pyemesData.lien || ''); }} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 inline-flex items-center gap-1.5 text-[12px]"><Copy className="h-3.5 w-3.5" /> Copier</button>
              </div>
              <p className="text-[11.5px] text-white/40 mt-1.5">Partagez ce lien : tout client qui s&apos;inscrit via lui vous est attribué automatiquement.</p>
            </div>

            {/* Totaux */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-black/20 border border-white/10 p-3"><p className="text-[11px] text-white/40">À venir</p><p className="text-[17px] font-bold text-white/80">{(pyemesData.totaux?.a_venir || 0).toLocaleString('fr-FR')} €</p></div>
              <div className="rounded-xl bg-black/20 border border-[#3DD68C]/30 p-3"><p className="text-[11px] text-white/40">Disponible</p><p className="text-[17px] font-bold text-[#3DD68C]">{(pyemesData.totaux?.disponible || 0).toLocaleString('fr-FR')} €</p></div>
              <div className="rounded-xl bg-black/20 border border-white/10 p-3"><p className="text-[11px] text-white/40">Payé</p><p className="text-[17px] font-bold text-white/60">{(pyemesData.totaux?.paye || 0).toLocaleString('fr-FR')} €</p></div>
            </div>

            {/* Commissions détaillées */}
            {(pyemesData.commissions?.length || 0) > 0 ? (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead className="text-white/40 text-[10px] uppercase tracking-wider"><tr className="border-b border-white/5"><th className="text-left px-4 py-2.5">Client</th><th className="text-left px-4 py-2.5">Vente TTC</th><th className="text-left px-4 py-2.5">Commission</th><th className="text-right px-4 py-2.5">État</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {pyemesData.commissions!.map((c) => {
                        const lib = c.etat === 'paye' ? { t: 'Payé', c: '#8A93A6' } : c.etat === 'disponible' ? { t: 'Disponible', c: '#3DD68C' } : { t: 'À venir', c: '#F5A623' };
                        return (
                          <tr key={c.id} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3">{c.client || 'Client'}{c.date ? <span className="block text-white/40 text-[11px]">{new Date(c.date).toLocaleDateString('fr-FR')}</span> : null}</td>
                            <td className="px-4 py-3 text-white/60">{(c.base || 0).toLocaleString('fr-FR')} €</td>
                            <td className="px-4 py-3 font-semibold text-[#635BFF]">+ {(c.commission || 0).toLocaleString('fr-FR')} €</td>
                            <td className="px-4 py-3 text-right"><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: lib.c, background: lib.c + '22' }}>{lib.t}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] text-white/40">Aucune commission pour l&apos;instant. {(pyemesData.clients?.length || 0)} client(s) apporté(s) - la commission apparaît dès leur premier paiement.</p>
            )}

            {/* Simulateur de commission par forfait (dépliant) : donne une idée du gain selon l'offre
                que l'agence vend, au pourcentage réglé pour elle. @author Rabah Ziane - 2026-08-01 */}
            {(() => {
              const pct = (pyemesData.agence?.commission_percent ?? 30) / 100;
              const eur = (n: number) => (Number.isInteger(n) ? `${n}` : n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' €';
              const forfaits = [
                { nom: 'Micro', pour: 'Indépendant', m: 29 },
                { nom: 'Cabinet', pour: 'Comptable', m: 39 },
                { nom: 'Standard', pour: 'TPE-PME', m: 49 },
                { nom: 'Premium', pour: 'TPE-PME', m: 79 },
                { nom: 'Par entreprise', pour: 'Dossier en +', m: 11.9 },
              ];
              return (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <button onClick={() => setSimuOpen((v) => !v)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.02]">
                    <Calculator className="h-4 w-4 text-[#635BFF]" />
                    <span className="flex-1">
                      <span className="block text-[13px] font-semibold">Combien vous gagnez par forfait</span>
                      <span className="block text-[11.5px] text-white/45">Votre commission : {pyemesData.agence?.commission_percent ?? 30}% du montant TTC, à chaque paiement du client.</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${simuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {simuOpen && (
                    <div className="border-t border-white/10 overflow-x-auto">
                      <table className="w-full text-[12.5px]">
                        <thead className="text-white/40 text-[10px] uppercase tracking-wider"><tr className="border-b border-white/5"><th className="text-left px-4 py-2.5">Forfait</th><th className="text-right px-4 py-2.5">Prix / mois</th><th className="text-right px-4 py-2.5">Vous touchez / mois</th><th className="text-right px-4 py-2.5">Sur 12 mois</th></tr></thead>
                        <tbody className="divide-y divide-white/5">
                          {forfaits.map((f) => (
                            <tr key={f.nom} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-2.5">{f.nom}<span className="block text-white/40 text-[11px]">{f.pour}</span></td>
                              <td className="px-4 py-2.5 text-right text-white/60 tabular-nums">{eur(f.m)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-[#635BFF] tabular-nums">+ {eur(Math.round(f.m * pct * 100) / 100)}</td>
                              <td className="px-4 py-2.5 text-right text-white/50 tabular-nums">+ {eur(Math.round(f.m * pct * 12 * 100) / 100)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[11px] text-white/35 px-4 py-2.5">Estimation indicative : « sur 12 mois » = 12 × la commission mensuelle. Elle est versée tant que le client paie son abonnement.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Étape 2 : suivi des clients apportés (cycle de vie de l'abonnement). @Rabah 2026-08-01 */}
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-white/40 mb-2">Vos clients Pyemes ({pyemesData.clients?.length || 0})</p>
              {/* Alerte rétention : votre commission dure tant que le client paie -> relancez ceux à risque. @Rabah 2026-08-01 */}
              {(() => {
                const risque = (pyemesData.clients || []).filter((x) => x.statut === 'impaye' || x.statut === 'resilie');
                return risque.length > 0 ? (
                  <div className="mb-2 rounded-xl border border-[#F5A623]/40 bg-[#F5A623]/10 px-3.5 py-2.5 text-[12.5px] text-white/80">
                    <strong className="text-[#F5A623]">{risque.length} client(s) à risque</strong> (paiement en attente ou résilié). Votre commission s&apos;arrête s&apos;ils partent - <strong>contactez-les pour les retenir</strong> : {risque.map((x) => x.email).slice(0, 4).join(', ')}{risque.length > 4 ? '…' : ''}
                  </div>
                ) : null;
              })()}
              {(pyemesData.clients?.length || 0) === 0 ? (
                <p className="text-[12.5px] text-white/40">Aucun client pour l&apos;instant. Partagez votre lien de vente pour commencer.</p>
              ) : (
                <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead className="text-white/40 text-[10px] uppercase tracking-wider"><tr className="border-b border-white/5"><th className="text-left px-4 py-2.5">Client</th><th className="text-left px-4 py-2.5">Statut</th><th className="text-right px-4 py-2.5">Paiements</th><th className="text-right px-4 py-2.5">Encaissé TTC</th><th className="text-right px-4 py-2.5">Votre commission</th><th className="text-right px-4 py-2.5">Dernier · depuis</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {pyemesData.clients!.map((cl) => {
                        const st = cl.statut === 'actif' || cl.statut === 'en_essai' ? { t: 'Abonné', c: '#3DD68C' } : cl.statut === 'resilie' ? { t: 'Résilié', c: '#FF6B6B' } : cl.statut === 'impaye' ? { t: 'Paiement en attente', c: '#F5A623' } : { t: 'Inscrit', c: '#8A93A6' };
                        // A-t-il ouvert le lien d'argumentaire qu'on lui a envoyé ? @Rabah 2026-08-01
                        const ouvert = (pyemesData.pitches || []).find((p) => p.to === cl.email && p.openedAt)?.openedAt;
                        // Transparence : on agrège les paiements de CE client (commissions liées). @Rabah 2026-08-01
                        const paie = (pyemesData.commissions || []).filter((x) => x.client === cl.email);
                        const encaisse = paie.reduce((s, x) => s + (x.base || 0), 0);
                        const commis = paie.reduce((s, x) => s + (x.commission || 0), 0);
                        const dernier = paie.map((x) => x.date).filter(Boolean).sort().slice(-1)[0];
                        return (
                          <tr key={cl.email} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3 text-white/80">{cl.email}</td>
                            <td className="px-4 py-3"><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: st.c, background: st.c + '22' }}>{st.t}</span>{ouvert && <span className="block text-[10px] text-[#3DD68C] mt-1">Lien ouvert · {new Date(ouvert).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}</td>
                            <td className="px-4 py-3 text-right text-white/60 tabular-nums">{paie.length}</td>
                            <td className="px-4 py-3 text-right text-white/70 tabular-nums">{encaisse.toLocaleString('fr-FR')} €</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: '#635BFF' }}>{commis.toLocaleString('fr-FR')} €</td>
                            <td className="px-4 py-3 text-right text-white/50 tabular-nums">{dernier ? new Date(dernier).toLocaleDateString('fr-FR') : (cl.depuis ? new Date(cl.depuis).toLocaleDateString('fr-FR') : '-')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] text-white/35 mt-2">Suivi transparent : chaque paiement de vos clients et votre commission correspondante (30 % TTC).</p>
            </div>

            {/* Feuille de route AVANT mise en ligne : ce qui reste a faire de chaque cote, l'import
                d'une checklist existante, et un fil de discussion avec Delivery Digital.
                @author Rabah Ziane - 2026-08-31 */}
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-[13px] font-bold text-white">Feuille de route · avant mise en ligne</p>
                <span className="text-[11px] text-white/40">
                  {roadTaches.filter((t) => t.statut === 'fait').length}/{roadTaches.length} fait
                </span>
              </div>
              <p className="text-[12px] text-white/50">
                Ce qui reste à faire avant l'ouverture au public. Vous pouvez demander une tâche à Delivery Digital,
                et Delivery Digital peut vous en demander une : tout le monde voit la même liste.
              </p>

              {/* Ajout d'une tache + import d'une checklist */}
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  value={roadTitre}
                  onChange={(e) => setRoadTitre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') ajouterTache(); }}
                  placeholder="Ajouter une tâche…"
                  className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-[12.5px] text-white placeholder:text-white/30"
                />
                <button onClick={ajouterTache} disabled={roadBusy || !roadTitre.trim()} className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-40" style={{ background: '#635BFF' }}>
                  Ajouter
                </button>
                <button onClick={() => roadFile.current?.click()} disabled={roadBusy} className="h-9 px-4 rounded-lg text-[12.5px] font-semibold border border-white/15 text-white/80 disabled:opacity-40 inline-flex items-center gap-2">
                  {roadImport && <span className="inline-block h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                  {roadImport ? 'Lecture du fichier…' : 'Importer une checklist'}
                </button>
                <input
                  ref={roadFile}
                  type="file"
                  accept=".pdf,.txt,.csv,.md,application/pdf,text/plain,text/csv,text/markdown"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importerChecklist(f); e.currentTarget.value = ''; }}
                />
              </div>
              {roadInfo && <p className="text-[11.5px] text-white/60 mt-2">{roadInfo}</p>}
              <p className="text-[11px] text-white/30 mt-1">PDF, texte, CSV ou Markdown - une ligne = une tâche (les cases déjà cochées arrivent en « fait »).</p>

              {/* Liste des taches */}
              {roadTaches.length === 0 ? (
                <p className="text-[12.5px] text-white/40 mt-3">Aucune tâche pour l'instant.</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {roadTaches.map((t) => {
                    const fait = t.statut === 'fait';
                    return (
                      <li key={t.id} className="flex items-start gap-3 rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                        <button
                          onClick={() => changerStatutTache(t.id, fait ? 'a_faire' : 'fait')}
                          aria-label={fait ? 'Marquer à faire' : 'Marquer fait'}
                          className="mt-0.5 h-4 w-4 rounded border shrink-0"
                          style={{ borderColor: fait ? '#3DD68C' : 'rgba(255,255,255,0.25)', background: fait ? '#3DD68C' : 'transparent' }}
                        />
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[12.5px] ${fait ? 'text-white/40 line-through' : 'text-white/85'}`}>{t.titre}</span>
                          <span className="block text-[10.5px] text-white/35 mt-0.5">
                            {t.from === 'dd' ? 'Demandé par Delivery Digital' : 'Demandé par vous'}
                            {t.source && t.source.startsWith('import') ? ` · ${t.source}` : ''}
                          </span>
                        </span>
                        {t.from === 'agence' && (
                          <button onClick={() => supprimerTache(t.id)} aria-label="Retirer" className="text-[11px] text-white/30 hover:text-white/60">✕</button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Fil de discussion avec Delivery Digital */}
              <div className="mt-4 pt-3 border-t border-white/8">
                <p className="text-[12.5px] font-semibold text-white/80 mb-2">Discussion avec Delivery Digital</p>
                {roadMsgs.length === 0 ? (
                  <p className="text-[12px] text-white/35">Aucun message. Posez votre question ici, on répond au même endroit.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {roadMsgs.map((m) => (
                      <div key={m.id} className={`flex ${m.from === 'agence' ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[80%] rounded-xl px-3 py-2" style={{ background: m.from === 'agence' ? 'rgba(99,91,255,0.18)' : 'rgba(255,255,255,0.07)' }}>
                          <p className="text-[10.5px] text-white/40 mb-0.5">{m.from === 'agence' ? (m.auteur || 'Vous') : 'Delivery Digital'}{m.at ? ` · ${new Date(m.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                          {m.texte && <p className="text-[12.5px] text-white/85 whitespace-pre-line">{m.texte}</p>}
                          {m.image && (
                            <a href={m.image} target="_blank" rel="noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={m.image} alt="" className="mt-1 rounded-lg max-h-44 border border-white/10" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Barre d'ecriture COLLEE en bas : on garde le champ sous la main pendant qu'on
                    fait defiler le fil. @author Rabah Ziane - 2026-08-31 */}
                <div className="mt-2 flex gap-2 items-center sticky bottom-0 z-10 py-2 -mx-4 px-4 border-t border-white/8" style={{ background: 'rgba(12,12,16,0.96)', backdropFilter: 'blur(6px)' }}>
                  <input
                    value={roadMsg}
                    onChange={(e) => setRoadMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') envoyerMessage(); }}
                    placeholder="Écrire un message…"
                    className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-[12.5px] text-white placeholder:text-white/30"
                  />
                  {/* Capture jointe : meme confort que le fil de l'espace client. @Rabah 2026-08-31 */}
                  <button onClick={() => roadChatFile.current?.click()} title="Joindre une capture" className="h-9 w-9 rounded-lg border border-white/15 text-white/70">📎</button>
                  <input ref={roadChatFile} type="file" accept="image/*" className="hidden" onChange={(e) => { setRoadPiece(e.target.files?.[0] || null); e.currentTarget.value = ''; }} />
                  <button onClick={envoyerMessage} disabled={roadBusy || (!roadMsg.trim() && !roadPiece)} className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-40" style={{ background: '#635BFF' }}>
                    {roadBusy ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
                {roadPiece && (
                  <p className="text-[11px] text-white/50 mt-1">
                    Capture jointe : {roadPiece.name} <button onClick={() => setRoadPiece(null)} className="underline ml-1">retirer</button>
                  </p>
                )}
              </div>
            </div>

            {/* Publications reseaux sociaux : l'agence depose sa video, dit ou elle sera publiee et
                avec quel texte ; Pyemes valide AVANT publication. @author Rabah Ziane - 2026-08-31 */}
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-[13px] font-bold text-white">Publications réseaux sociaux</p>
              <p className="text-[12px] text-white/50 mt-0.5">
                Déposez la vidéo, dites où elle sera publiée et avec quel texte. Pyemes valide avant la mise en ligne.
              </p>

              <div className="mt-3 grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => pubFile.current?.click()} disabled={pubBusy} className="h-9 px-4 rounded-lg text-[12.5px] font-semibold border border-white/15 text-white/80 disabled:opacity-40">
                    {pubVideo ? 'Changer la vidéo' : 'Choisir une vidéo'}
                  </button>
                  <input ref={pubFile} type="file" accept="video/*" className="hidden" onChange={(e) => { setPubVideo(e.target.files?.[0] || null); e.currentTarget.value = ''; }} />
                  {pubVideo && <span className="text-[11.5px] text-white/60">{pubVideo.name} · {(pubVideo.size / (1024 * 1024)).toFixed(1)} Mo</span>}
                </div>

                {pubApercu && (
                  <video
                    src={pubApercu}
                    controls
                    playsInline
                    className="rounded-lg border border-white/10 max-h-64 w-auto"
                    style={{ maxWidth: '100%' }}
                  />
                )}

                <div className="flex flex-wrap gap-1.5">
                  {RESEAUX.map((r) => {
                    const on = pubReseaux.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => setPubReseaux((p) => on ? p.filter((x) => x !== r.id) : [...p, r.id])}
                        className="h-8 px-3 rounded-full text-[12px] font-semibold border"
                        style={{ borderColor: on ? '#635BFF' : 'rgba(255,255,255,0.15)', background: on ? 'rgba(99,91,255,0.18)' : 'transparent', color: on ? '#FFFFFF' : 'rgba(255,255,255,0.65)' }}
                      >
                        {r.nom}
                      </button>
                    );
                  })}
                </div>

                {/* Compte(s) de publication : on repere les identifiants au « @ » (ici et dans le
                    texte de la publication). @author Rabah Ziane - 2026-08-31 */}
                <div className="flex flex-col gap-1">
                  <input
                    value={pubComptes}
                    onChange={(e) => setPubComptes(e.target.value)}
                    placeholder="Sur quel compte ? ex. @pyemes, @nova.agence"
                    className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-[12.5px] text-white placeholder:text-white/30"
                  />
                  {(() => {
                    const trouves = [...`${pubComptes} ${pubTexte}`.matchAll(/@([A-Za-z0-9._-]{2,30})/g)]
                      .map((m) => `@${m[1]}`)
                      .filter((v, i, a) => a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i)
                      .slice(0, 10);
                    return trouves.length > 0 ? (
                      <span className="text-[11px] text-white/45">Compte(s) détecté(s) : {trouves.join(' · ')}</span>
                    ) : (
                      <span className="text-[11px] text-white/30">Écrivez le compte avec un @ : il est détecté automatiquement.</span>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-[12px] text-white/50">Publication prévue le</label>
                  <input type="date" value={pubDate} onChange={(e) => setPubDate(e.target.value)} className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-[12.5px] text-white" />
                </div>

                <textarea
                  value={pubTexte}
                  onChange={(e) => setPubTexte(e.target.value)}
                  rows={3}
                  placeholder="Texte de la publication (légende, hashtags, lien…)"
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-[12.5px] text-white placeholder:text-white/30 resize-y"
                />

                <div className="flex items-center gap-3">
                  <button onClick={envoyerPublication} disabled={pubBusy || !pubVideo || pubReseaux.length === 0} className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-40" style={{ background: '#635BFF' }}>
                    {pubBusy ? 'Envoi en cours…' : 'Envoyer pour validation'}
                  </button>
                  {pubInfo && <span className="text-[11.5px] text-white/60">{pubInfo}</span>}
                </div>
              </div>

              {/* Historique */}
              {pubs.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {pubs.map((p) => {
                    const tons: Record<string, { t: string; c: string }> = {
                      a_valider: { t: 'En attente de validation', c: '#E0A800' },
                      validee: { t: 'Validée - publiez quand vous voulez', c: '#3DD68C' },
                      a_revoir: { t: 'À revoir', c: '#e5484d' },
                      publiee: { t: 'Publiée', c: 'rgba(255,255,255,0.45)' },
                    };
                    const ton = tons[p.statut] || tons.a_valider;
                    return (
                      <li key={p.id} className="rounded-lg border border-white/8 bg-black/20 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <span className="text-[12.5px] text-white/85">
                            {p.reseaux.map((r) => RESEAUX.find((x) => x.id === r)?.nom || r).join(' · ')}
                            {p.comptes && p.comptes.length > 0 ? ` · ${p.comptes.join(' ')}` : ''}
                            {p.datePrevue ? ` · prévue le ${new Date(p.datePrevue).toLocaleDateString('fr-FR')}` : ''}
                          </span>
                          <span className="text-[11.5px] font-semibold" style={{ color: ton.c }}>{ton.t}</span>
                        </div>
                        {p.texte && <p className="text-[12px] text-white/55 mt-1 whitespace-pre-line">{p.texte}</p>}
                        {/* Lecteur direct : on revoit la video sans quitter la page. @Rabah 2026-08-31 */}
                        <video src={p.fichier} controls playsInline preload="metadata" className="mt-2 rounded-lg border border-white/10 max-h-56 w-auto" style={{ maxWidth: '100%' }} />
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <a href={p.fichier} target="_blank" rel="noreferrer" className="text-[11.5px] text-[#635BFF] underline underline-offset-2">Ouvrir dans un onglet</a>
                          {p.statut === 'validee' && (
                            <button onClick={() => marquerPubliee(p.id)} className="text-[11.5px] text-white/60 underline underline-offset-2">Marquer comme publiée</button>
                          )}
                        </div>
                        {p.statut === 'a_revoir' && p.retour && (
                          <p className="text-[12px] mt-1.5 rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(229,72,77,0.12)', color: '#ffb4b4' }}>
                            Retour {p.decidePar ? `de ${p.decidePar}` : ''} : {p.retour}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Étape 3 : supports de vente (arguments + envoi au client). @Rabah 2026-08-01 */}
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://pyemes.com/logo/pyemes-mark.svg" alt="" className="h-5 w-5" style={{ filter: 'brightness(0) invert(1)' }} />
                <p className="text-[13px] font-bold text-white">Supports de vente</p>
              </div>
              <p className="text-[12.5px] text-white/55">Arguments clés pour présenter Pyemes à vos clients :</p>
              <ul className="mt-2 space-y-1.5">
                {argumentairePyemes.map((a, i) => <li key={i} className="text-[12.5px] text-white/75 flex gap-2"><span className="text-[#3DD68C]">✓</span> {a}</li>)}
              </ul>
              {/* Choix de l'audience : email + PDF adaptés au destinataire. */}
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wider font-bold text-white/40 mb-1.5">Type de client</p>
                <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5 flex-wrap">
                  {([['independant', 'Indépendant'], ['entreprise', 'Entreprise'], ['comptable', 'Comptable']] as const).map(([k, lab]) => (
                    <button key={k} onClick={() => setPitchAud(k)} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${pitchAud === k ? 'bg-[#635BFF] text-white' : 'text-white/60 hover:text-white'}`}>{lab}</button>
                  ))}
                </div>
              </div>
              {/* Identification du client : email + nom d'entreprise + SIRET, pour être sûr de qui on
                  démarche et fiabiliser l'attribution. @author Rabah Ziane - 2026-08-01 */}
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <input value={pitchTo} onChange={(e) => setPitchTo(e.target.value)} placeholder="Email du client *" className="h-9 px-3 rounded-lg bg-black/30 border border-white/15 text-[12.5px] text-white" />
                <div className="relative">
                  <input value={pitchName} onChange={(e) => setPitchName(e.target.value)} onFocus={() => pitchSug.length && setPitchSugOpen(true)} onBlur={() => setTimeout(() => setPitchSugOpen(false), 150)} placeholder="Nom de l'entreprise" autoComplete="off" className="w-full h-9 px-3 rounded-lg bg-black/30 border border-white/15 text-[12.5px] text-white" />
                  {pitchSugOpen && pitchSug.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-white/15 bg-[#1b1d24] shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                      {pitchSug.map((s, k) => (
                        <button
                          key={k}
                          onMouseDown={(e) => { e.preventDefault(); pitchPick.current = true; setPitchName(s.nom); if (s.siret) setPitchSiret(s.siret); setPitchSugOpen(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0"
                        >
                          <div className="text-[12.5px] text-white/90 truncate">{s.nom}</div>
                          <div className="text-[11px] text-white/45">{s.siret ? `SIRET ${s.siret}` : 'SIRET indisponible'}{s.ville ? ` · ${s.ville}` : ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input value={pitchSiret} onChange={(e) => setPitchSiret(e.target.value)} inputMode="numeric" maxLength={17} placeholder="SIRET (14 chiffres)" className="h-9 px-3 rounded-lg bg-black/30 border border-white/15 text-[12.5px] text-white" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => { navigator.clipboard?.writeText(`Découvrez Pyemes :\n\n${argumentairePyemes.map((a) => '• ' + a).join('\n')}\n\nInscription : ${pyemesData.lien}`); }} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 inline-flex items-center gap-1.5 text-[12px]"><Copy className="h-3.5 w-3.5" /> Copier l&apos;argumentaire</button>
                <div className="flex-1" />
                <button onClick={envoyerPitch} disabled={pitchBusy} className="px-4 h-9 rounded-lg bg-[#635BFF] text-white text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1.5">{pitchBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{pitchBusy ? 'Envoi…' : 'Envoyer au client'}</button>
              </div>
              <p className="text-[11px] text-white/35 mt-2">Email adapté au type de client + <strong className="text-white/50">présentation PDF</strong> en pièce jointe, avec votre lien de vente (attribution automatique).</p>

              {/* Historique des envois */}
              {(pyemesData.pitches?.length || 0) > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-white/40">Historique des envois ({pyemesData.pitches!.length})</p>
                    <button onClick={viderPitches} className="text-[11px] text-white/40 hover:text-[#FF6B6B] inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Tout effacer</button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {pyemesData.pitches!.map((p, i) => {
                      const lab = p.template === 'entreprise' ? 'Entreprise' : p.template === 'comptable' ? 'Comptable' : 'Indépendant';
                      // Statut du lien : « Lien ouvert » (vert) dès que le client a cliqué, sinon « Envoyé ».
                      // @author Rabah Ziane - 2026-08-01
                      return (
                        <div key={i} className="flex items-center justify-between gap-2 text-[12px] text-white/60">
                          <span className="truncate">{p.clientName ? <span className="text-white/80">{p.clientName} · </span> : null}{p.to} <span className="text-white/30">·</span> <span className="text-[#635BFF]">{lab}</span>{p.siret ? <span className="text-white/30"> · SIRET {p.siret}</span> : null}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            {p.openedAt
                              ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: '#3DD68C', background: '#3DD68C22' }}>Lien ouvert · {new Date(p.openedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: '#8A93A6', background: '#8A93A622' }}>Envoyé</span>}
                            <span className="text-white/35">{p.at ? new Date(p.at).toLocaleDateString('fr-FR') : ''}</span>
                            <button onClick={() => supprimerPitch(p.id)} title="Supprimer cet envoi" className="text-white/30 hover:text-[#FF6B6B]"><Trash2 className="h-3 w-3" /></button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {/* API (owner uniquement) */}
        {isOwner && (
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#0066CC]" /><h2 className="text-[15px] font-bold">API d&apos;intégration</h2></div>
          <p className="text-[12.5px] text-white/50 mt-1">Branchez votre système (lecture seule) : <code className="font-mono text-white/70">/api/agency/v1</code> · auth <code className="font-mono text-white/70">Bearer</code>. Endpoints : /me · /catalog · /devis.</p>
          <div className="mt-3">
            {agency?.apiKey ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-[12.5px] font-mono break-all">{showKey ? agency.apiKey : 'dd_agc_' + '•'.repeat(18)}</code>
                <button onClick={() => setShowKey((v) => !v)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">{showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                <button onClick={() => navigator.clipboard?.writeText(agency.apiKey || '')} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"><Copy className="h-3.5 w-3.5" /></button>
                <button onClick={regenKey} disabled={busy} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12px] disabled:opacity-60">{busy ? '…' : 'Régénérer'}</button>
              </div>
            ) : (
              <button onClick={regenKey} disabled={busy} className="px-4 py-2 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold disabled:opacity-60">{busy ? 'Génération…' : 'Générer ma clé API'}</button>
            )}
          </div>
        </section>
        )}

        <p className="text-center text-[11px] text-white/30">© {new Date().getFullYear()} Delivery Digital · Espace Agence partenaire</p>
      </div>

      {dossierLead && (
        <FormationWizardModal
          employer={{ siret: dossierLead.siret || '', denom: dossierLead.denom || 'Client', opco: dossierLead.opco || 'OPCO EP', email: dossierLead.email, address: dossierLead.addr } as WizardEmployer}
          submitting={transmitting}
          onSendCsvTemplate={() => sendCsvTemplate(dossierLead)}
          saveAction={{
            busy: savingDossier,
            onClick: async (p: TransmitPayload) => {
              if (!dossierLead) return;
              setSavingDossier(true);
              try {
                // Nouveau dossier : "Enregistrer" crée un BROUILLON (même incomplet) qui apparaît dans
                // "Dossiers OPCO reçus" côté DD, sans convention ni notification. On complètera puis
                // transmettra plus tard via "Modifier". @Rabah 2026-07-02
                const sessionName = p.startAt ? `Formation · ${new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}` : 'À confirmer';
                const r = await fetch('/api/agency/self/transmit-dossier', { method: 'POST', headers: authJson(), body: JSON.stringify({ draft: true, leadId: dossierLead._id, denom: dossierLead.denom, siret: dossierLead.siret, opco: dossierLead.opco, addr: dossierLead.addr, clientEmail: p.contactEmail || dossierLead.email, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, signedBy: p.signedBy, signedFunction: p.signedFunction, signatureDataUrl: p.signatureDataUrl, amountHT: p.amountHT }) });
                const j = await r.json();
                if (j.ok) { setDossierLead(null); load(); alert('✓ Brouillon enregistré. Le dossier apparaît dans « Dossiers OPCO reçus » (à compléter puis transmettre via « Modifier »).'); }
                else alert('Erreur : ' + (j.error || 'enregistrement impossible'));
              } finally { setSavingDossier(false); }
            },
          }}
          onClose={() => setDossierLead(null)}
          onTransmit={async (p: TransmitPayload) => {
            if (!dossierLead) return;
            setTransmitting(true);
            try {
              const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
              const r = await fetch('/api/agency/self/transmit-dossier', { method: 'POST', headers: authJson(), body: JSON.stringify({ leadId: dossierLead._id, denom: dossierLead.denom, siret: dossierLead.siret, opco: dossierLead.opco, addr: dossierLead.addr, clientEmail: p.contactEmail || dossierLead.email, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, signedBy: p.signedBy, signedFunction: p.signedFunction, signatureDataUrl: p.signatureDataUrl, amountHT: p.amountHT }) });
              const j = await r.json();
              if (j.ok) { setDossierLead(null); load(); alert('✓ Dossier transmis à Delivery Digital (convention signée par le client).'); }
              else alert('Erreur : ' + (j.error || 'transmission impossible'));
            } finally { setTransmitting(false); }
          }}
          whatsappAction={{ label: 'WhatsApp', busy: sendingWhatsapp, onClick: (p) => { if (dossierLead) sendSignLinkWhatsapp(dossierLead, p as TransmitPayload); } }}
          secondaryAction={{
            label: 'Envoyer le lien au client pour signer (au doigt)',
            busy: sendingSignLink,
            onClick: async (p) => {
              if (!dossierLead) return;
              const ce = (p.contactEmail || dossierLead.email || '').trim();
              if (!ce) { alert("Ce client n'a pas d'email - renseignez-le (onglet Employeur) pour envoyer le lien de signature."); return; }
              setSendingSignLink(true);
              try {
                const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
                const r = await fetch('/api/agency/self/sign-link', { method: 'POST', headers: authJson(), body: JSON.stringify({ leadId: dossierLead._id, denom: dossierLead.denom, siret: dossierLead.siret, opco: dossierLead.opco, addr: dossierLead.addr, clientEmail: ce, managerEmail: dossierLead.managerEmail, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, amountHT: p.amountHT }) });
                const j = await r.json();
                if (j.ok) { setDossierLead(null); load(); alert(`✓ Lien de signature envoyé à ${ce}. Le client lit la convention et signe au doigt depuis son téléphone ; le dossier sera transmis automatiquement à sa signature.`); }
                else alert('Erreur : ' + (j.error === 'salaries_required' ? 'ajoutez au moins un stagiaire' : j.error || 'envoi impossible'));
              } finally { setSendingSignLink(false); }
            },
          }}
        />
      )}

      {/* Correction d'un dossier déjà transmis : wizard pré-rempli + renvoi (PATCH). @Rabah 2026-06-04 */}
      {editDossier && (
        <FormationWizardModal
          employer={{ siret: editDossier.dossier.siret || editDossier.lead.siret || '', denom: editDossier.dossier.denom || editDossier.lead.denom || 'Client', opco: editDossier.dossier.opco || editDossier.lead.opco || 'OPCO EP', email: editDossier.lead.email, address: editDossier.dossier.addr || editDossier.lead.addr } as WizardEmployer}
          submitting={transmitting}
          submitLabel="Renvoyer le dossier corrigé"
          onSendCsvTemplate={() => sendCsvTemplate(editDossier.lead)}
          whatsappAction={{ label: 'WhatsApp', busy: sendingWhatsapp, onClick: (p) => { if (editDossier) sendSignLinkWhatsapp(editDossier.lead, p as TransmitPayload); } }}
          saveAction={{
            busy: savingDossier,
            onClick: async (p: TransmitPayload) => {
              if (!editDossier) return;
              setSavingDossier(true);
              try {
                const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
                // silent: enregistre les champs sans notifier Delivery Digital (simple sauvegarde). @Rabah 2026-06-24
                const newEmail = (p.contactEmail || editDossier.lead.email || '').trim();
                const r = await fetch(`/api/agency/self/dossiers/${editDossier.dossier._id}`, { method: 'PATCH', headers: authJson(), body: JSON.stringify({ silent: true, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, signedBy: p.signedBy, signedFunction: p.signedFunction, signatureDataUrl: p.signatureDataUrl, amountHT: p.amountHT, clientEmail: newEmail }) });
                const j = await r.json();
                if (j.ok) {
                  // Met à jour l'état local (lead source d'affichage du wizard + dossier) pour refléter la modif.
                  // On répercute aussi la SESSION (dates), la formation, les stagiaires et le montant : sans ça,
                  // rouvrir le wizard réaffichait l'ancienne date (seul l'email était rafraîchi) -> la modif de
                  // date "ne se prenait pas en compte" à l'écran. @author Rabah Ziane - 2026-07-17
                  setEditDossier((ed) => ed ? { ...ed, lead: { ...ed.lead, email: newEmail || ed.lead.email }, dossier: { ...ed.dossier, clientEmail: newEmail || ed.dossier.clientEmail, sessionName, sessionStart: p.startAt, sessionEnd: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, amountHT: p.amountHT } } : ed);
                  load();
                  alert('✓ Modifications enregistrées.');
                }
                else alert('Erreur : ' + (j.error === 'locked' ? 'ce dossier est déjà facturé/payé, il ne peut plus être modifié' : j.error || 'enregistrement impossible'));
              } finally { setSavingDossier(false); }
            },
          }}
          initial={{
            salaries: (editDossier.dossier.salaries || []).map((s) => ({ id: 's_' + Math.random().toString(36).slice(2, 9), firstname: s.firstname || '', lastname: s.lastname || '', email: s.email || '', poste: s.poste || '', type_contrat: s.type_contrat || 'CDI', date_naissance: s.date_naissance || '', num_secu: s.num_secu || '', telephone: s.telephone || '' })),
            formationId: FORMATIONS.find((f) => f.title === editDossier.dossier.formationTitle)?.id,
            signedBy: editDossier.dossier.signedBy,
            signedFunction: editDossier.dossier.signedFunction,
            session: editDossier.dossier.sessionStart && editDossier.dossier.sessionEnd ? { startAt: editDossier.dossier.sessionStart, endAt: editDossier.dossier.sessionEnd, title: editDossier.dossier.sessionName } : undefined,
          }}
          onClose={() => setEditDossier(null)}
          onTransmit={async (p: TransmitPayload) => {
            if (!editDossier) return;
            setTransmitting(true);
            try {
              const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
              const r = await fetch(`/api/agency/self/dossiers/${editDossier.dossier._id}`, { method: 'PATCH', headers: authJson(), body: JSON.stringify({ sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, signedBy: p.signedBy, signedFunction: p.signedFunction, signatureDataUrl: p.signatureDataUrl, amountHT: p.amountHT, clientEmail: p.contactEmail || editDossier.lead.email }) });
              const j = await r.json();
              if (j.ok) { setEditDossier(null); load(); alert('✓ Dossier corrigé et renvoyé à Delivery Digital.'); }
              else alert('Erreur : ' + (j.error === 'locked' ? 'ce dossier est déjà facturé/payé, il ne peut plus être modifié' : j.error === 'salaries_required' ? 'ajoutez au moins un stagiaire' : j.error || 'modification impossible'));
            } finally { setTransmitting(false); }
          }}
          secondaryAction={{
            label: 'Envoyer le lien au client pour signer (au doigt)',
            busy: sendingSignLink,
            onClick: async (p) => {
              if (!editDossier) return;
              const ce = (p.contactEmail || editDossier.lead.email || '').trim();
              if (!ce) { alert("Ce client n'a pas d'email - renseignez-le (onglet Employeur) pour envoyer le lien de signature."); return; }
              setSendingSignLink(true);
              try {
                const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
                // dossierId : la signature à distance mettra à jour CE dossier (pas de doublon).
                const r = await fetch('/api/agency/self/sign-link', { method: 'POST', headers: authJson(), body: JSON.stringify({ dossierId: editDossier.dossier._id, leadId: editDossier.lead._id, denom: editDossier.dossier.denom || editDossier.lead.denom, siret: editDossier.dossier.siret || editDossier.lead.siret, opco: editDossier.dossier.opco || editDossier.lead.opco, addr: editDossier.dossier.addr || editDossier.lead.addr, clientEmail: ce, managerEmail: editDossier.lead.managerEmail, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, amountHT: p.amountHT }) });
                const j = await r.json();
                if (j.ok) { setEditDossier(null); load(); alert(`✓ Lien de signature envoyé à ${ce}. À sa signature, ce dossier sera mis à jour avec la convention corrigée.`); }
                else alert('Erreur : ' + (j.error === 'salaries_required' ? 'ajoutez au moins un stagiaire' : j.error || 'envoi impossible'));
              } finally { setSendingSignLink(false); }
            },
          }}
        />
      )}

      {showContract && agency && (
        <ContractModal
          agency={agency}
          fix={fix}
          pct={pct}
          signFunction={signFunction}
          setSignFunction={setSignFunction}
          signing={signing}
          onSign={signContract}
          onClose={() => setShowContract(false)}
        />
      )}

      {detailFormation && <FormationDetailModal formation={detailFormation} onClose={() => setDetailFormation(null)} />}

      {encashDossier && agency && (
        <FactureModal agency={agency} dossier={encashDossier} commission={earn(encashDossier)} fix={fix} pct={pct} sending={encashing} onSend={() => sendEncash(encashDossier)} onClose={() => setEncashDossier(null)} />
      )}

      {accessLead && (
        <OpcoAccessModal
          lead={accessLead}
          status={accessLead.email ? accessByEmail[accessLead.email] : undefined}
          busy={askingOpco === accessLead._id}
          onAsk={async (label) => { const ok = await askOpco(accessLead, label); if (ok) alert(label.startsWith('Validation dossier AKTO') ? `Rappel envoyé à ${accessLead.email}. Le client valide le dossier depuis son espace AKTO ; le suivi passe à « en attente de validation ».` : `Lien sécurisé envoyé à ${accessLead.email}. Le client saisit ses informations, reçues directement par Delivery Digital.`); }}
          onReminder={() => { const l = accessLead; setAccessLead(null); setReminderLead(l); }}
          onClose={() => setAccessLead(null)}
        />
      )}

      {reminderLead && (
        <ReminderModal lead={reminderLead} onSave={(note, when, extra) => saveReminder(reminderLead._id, note, when, extra)} onClose={() => setReminderLead(null)} />
      )}

      {rattachInfo && (
        <RattachementDoneModal dossier={rattachInfo} onSend={sendRattachEmail} onClose={() => setRattachInfo(null)} />
      )}

      {confirmTarget && (
        <ConfirmationEmailModal target={confirmTarget} onSend={sendConfirmationEmail} onClose={() => setConfirmTarget(null)} />
      )}

      {waModal && (
        <WhatsAppPhoneModal
          denom={waModal.denom}
          onSend={(phone) => {
            const msg = `Bonjour, voici votre convention de formation ${waModal.denom ? `(${waModal.denom}) ` : ''}à lire et signer au doigt depuis votre téléphone : ${waModal.link}`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
            setWaModal(null);
          }}
          onClose={() => setWaModal(null)}
        />
      )}
    </main>
  );
}

// Confirmation "Demande de rattachement terminée" affichée à l'agence quand Delivery Digital a fait
// la demande de rattachement OPCO du client (le client n'avait pas ses identifiants) : un courrier
// d'activation part à l'adresse de l'entreprise. @author Rabah Ziane - 2026-06-24
function RattachementDoneModal({ dossier, onSend, onClose }: { dossier: Dossier; onSend: (d: Dossier) => Promise<string | null>; onClose: () => void }) {
  const fmt = (s?: string | null) => s ? new Date(s).toLocaleDateString('fr-FR') : '';
  const [sentAt, setSentAt] = useState<string | null>(dossier.rattachEmailSentAt || null);
  const [sending, setSending] = useState(false);
  const doSend = async () => {
    setSending(true);
    try { const res = await onSend(dossier); if (res) setSentAt(res); } finally { setSending(false); }
  };
  // Adresse du courrier : on retire les lignes purement numériques (ex. code INSEE parasite).
  const addrLines = (dossier.addr || '').split(',').map((s) => s.trim()).filter((s) => s && !/^\d[\d\s]*$/.test(s));
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end px-4 pt-4">
          <button onClick={onClose} className="h-8 w-8 rounded-lg border border-black/10 inline-flex items-center justify-center text-[#86868B] hover:bg-black/[0.04]"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-7 pb-7 -mt-2 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-[#3DD68C] flex items-center justify-center"><CheckCircle2 className="h-9 w-9 text-white" /></div>
          <h3 className="text-[24px] font-extrabold text-[#3DD68C] mt-4">Demande de rattachement terminée</h3>
          <p className="text-[14px] text-[#1D1D1F] mt-4 text-left">Un courrier d&apos;activation va être envoyé à votre entreprise.</p>
          <p className="text-[13px] text-[#1D1D1F] mt-5 text-left font-semibold underline">Adresse du courrier :</p>
          <div className="text-left mt-2 text-[15px] text-[#1D1D1F] leading-relaxed">
            <p className="font-extrabold">{dossier.denom || 'Votre entreprise'}</p>
            {addrLines.map((line, i) => <p key={i}>{line}</p>)}
          </div>
          {dossier.aktoAttachedAt && <p className="text-[12px] text-[#86868B] mt-3 text-left">Demande effectuée le {fmt(dossier.aktoAttachedAt)}.</p>}

          {/* Email de confirmation au client + à l'agence (courrier à surveiller). Renvoyable. */}
          <button onClick={doSend} disabled={sending} className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold transition disabled:opacity-60 ${sentAt ? 'bg-[#3DD68C] text-white hover:bg-[#34c07e]' : 'bg-[#0066CC] text-white hover:bg-[#0077ED]'}`}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : sentAt ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {sending ? 'Envoi…' : sentAt ? 'Email envoyé · Renvoyer' : 'Envoyer l\'email de confirmation'}
          </button>
          {sentAt && <p className="text-[11.5px] text-[#86868B] mt-1.5">Confirmation envoyée au client et à l&apos;agence le {fmt(sentAt)}.</p>}
          {!sentAt && <p className="text-[11.5px] text-[#86868B] mt-1.5">Le client et l&apos;agence recevront un email pour surveiller l&apos;arrivée du courrier.</p>}

          <button onClick={onClose} className="mt-4 w-full px-4 py-3 rounded-xl border-2 border-[#1D1D1F] text-[#1D1D1F] text-[15px] font-semibold hover:bg-black/[0.03]">Ok</button>
        </div>
      </div>
    </div>
  );
}

// Saisie du numéro WhatsApp du client : sélecteur de pays avec drapeaux + barre de recherche
// (indicatif auto) puis numéro local. Remplace le prompt natif. @author Rabah Ziane - 2026-06-24
function WhatsAppPhoneModal({ denom, onSend, onClose }: { denom?: string; onSend: (phone: string) => void; onClose: () => void }) {
  const [country, setCountry] = useState<WaCountry>(() => WA_COUNTRIES.find((c) => c.code === 'FR') || WA_COUNTRIES[0]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [num, setNum] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const list = q ? WA_COUNTRIES.filter((c) => norm(c.name).includes(norm(q)) || c.dial.includes(q.replace(/\D/g, '')) || c.code.toLowerCase() === norm(q)) : WA_COUNTRIES;
  const localDigits = num.replace(/\D/g, '').replace(/^0+/, ''); // on retire le 0 initial (format national)
  const full = country.dial + localDigits;
  const canSend = localDigits.length >= 5;
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#181A20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 rounded-xl bg-[#25D366]/15 items-center justify-center"><Send className="h-4 w-4 text-[#25D366]" /></span>
            <div><p className="text-[14px] font-bold text-white leading-tight">Envoyer par WhatsApp</p><p className="text-[11.5px] text-white/45">{denom ? `Convention · ${denom}` : 'Lien de signature de la convention'}</p></div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg border border-white/10 inline-flex items-center justify-center text-white/50 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-6 py-5">
          <label className="block text-[12px] font-semibold text-white/70 mb-1.5">Pays du client</label>
          <div className="relative">
            <button type="button" onClick={() => { setOpen((o) => !o); setQ(''); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[14px] text-left text-white focus:outline-none focus:border-[#25D366]">
              <span className="flex items-center gap-2.5"><span className="text-[18px]">{flagEmoji(country.code)}</span> {country.name}</span>
              <span className="text-white/50 font-semibold">+{country.dial}</span>
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute z-50 mt-1 w-full rounded-lg bg-[#1E2128] border border-white/10 shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-white/10 relative">
                    <Search className="h-3.5 w-3.5 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un pays ou un indicatif…" className="w-full pl-8 pr-2.5 py-2 rounded-md bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#25D366]" />
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {list.length === 0 ? <p className="px-3 py-3 text-[12.5px] text-white/40">Aucun pays</p> : list.map((c) => (
                      <button key={c.code} type="button" onClick={() => { setCountry(c); setOpen(false); setQ(''); }} className={`w-full text-left px-3 py-2 text-[13.5px] flex items-center justify-between gap-2.5 hover:bg-white/5 ${country.code === c.code ? 'text-[#25D366]' : 'text-white/85'}`}>
                        <span className="flex items-center gap-2.5"><span className="text-[17px]">{flagEmoji(c.code)}</span> {c.name}</span>
                        <span className="text-white/40">+{c.dial}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <label className="block text-[12px] font-semibold text-white/70 mb-1.5 mt-4">Numéro de téléphone</label>
          <div className="flex items-stretch rounded-lg bg-white/5 border border-white/10 focus-within:border-[#25D366] overflow-hidden">
            <span className="flex items-center gap-1.5 px-3 text-[14px] text-white/70 bg-white/5 border-r border-white/10"><span className="text-[16px]">{flagEmoji(country.code)}</span> +{country.dial}</span>
            <input autoFocus value={num} onChange={(e) => setNum(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && canSend) onSend(full); }} inputMode="tel" placeholder="6 12 34 56 78" className="flex-1 px-3 py-2.5 bg-transparent text-[14px] text-white placeholder-white/30 focus:outline-none" />
          </div>
          <p className="text-[11.5px] text-white/40 mt-1.5">Saisissez le numéro sans le 0 initial. Sera envoyé à <span className="text-white/70 font-mono">+{full || country.dial}</span>.</p>

          <button onClick={() => onSend(full)} disabled={!canSend} className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] text-[#0a3d24] text-[14px] font-bold hover:bg-[#28e070] disabled:opacity-40 disabled:cursor-not-allowed transition"><Send className="h-4 w-4" /> Ouvrir WhatsApp</button>
          <button onClick={() => onSend('')} className="mt-2 w-full px-4 py-2.5 rounded-xl border border-white/10 text-white/60 text-[12.5px] hover:bg-white/5">Je n&apos;ai pas le numéro - choisir le contact dans WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

// Email de confirmation de formation au client (copie agence) : confirme le RDV de finalisation du
// dossier, rappelle le déroulé de la formation, ce que le client doit préparer + un message libre.
// Bouton bleu -> vert (renvoyable). @author Rabah Ziane - 2026-06-24
const PREP_DEFAULT = [
  "Une pièce d'identité du dirigeant",
  'Vos identifiants OPCO (ou le code reçu par courrier)',
  'La liste des salariés à former',
  'Un ordinateur ou téléphone avec connexion internet pour la visioconférence',
].join('\n');
function ConfirmationEmailModal({ target, onSend, onClose }: { target: ConfirmTarget; onSend: (t: ConfirmTarget, p: { rdvAt: string; message: string; prepText: string }) => Promise<string | null>; onClose: () => void }) {
  // Pré-remplit la date du RDV avec celle déjà enregistrée le cas échéant (format datetime-local).
  const toLocalInput = (iso?: string | null) => { if (!iso) return ''; const dt = new Date(iso); return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  // Proposition par defaut : demain 10 h, heure de Paris (Europe/Paris), quel que soit le
  // fuseau du poste. Le champ reste modifiable - simple avance de saisie. @Rabah 2026-07-22
  const defautParis = () => {
    const demain = new Date(Date.now() + 24 * 3600 * 1000);
    const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(demain);
    return `${jour}T10:00`;
  };
  const [rdv, setRdv] = useState(toLocalInput(target.rdvAt) || defautParis());
  const [message, setMessage] = useState('');
  const [prep, setPrep] = useState(PREP_DEFAULT);
  const [sentAt, setSentAt] = useState<string | null>(target.confirmationEmailSentAt || null);
  const [sending, setSending] = useState(false);
  const doSend = async () => {
    setSending(true);
    try {
      const res = await onSend(target, { rdvAt: rdv ? new Date(rdv).toISOString() : '', message: message.trim(), prepText: prep.trim() });
      if (res) setSentAt(res);
    } finally { setSending(false); }
  };
  const lbl = 'block text-[11px] uppercase tracking-wider font-bold text-white/45 mb-1.5';
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg my-6 bg-[#181A20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 rounded-xl bg-[#0066CC]/15 items-center justify-center"><Mail className="h-4 w-4 text-[#4da3ff]" /></span>
            <div><p className="text-[14px] font-bold text-white leading-tight">Email d&apos;information</p><p className="text-[11.5px] text-white/45">Au client{target.clientEmail ? ` (${target.clientEmail})` : ''} · copie à l&apos;agence</p></div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg border border-white/10 inline-flex items-center justify-center text-white/50 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!target.clientEmail && <p className="text-[12px] text-[#FF9F0A] bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 rounded-lg px-3 py-2">Ce client n&apos;a pas d&apos;email. Renseignez-le (fiche client / onglet Employeur) avant d&apos;envoyer.</p>}
          <div>
            <label className={lbl}>Date du rendez-vous de finalisation</label>
            <input type="datetime-local" value={rdv} onChange={(e) => setRdv(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[14px] text-white focus:outline-none focus:border-[#0066CC] [color-scheme:dark]" />
            <p className="text-[11px] text-white/35 mt-1">Heure de Paris. Proposé par défaut, modifiable, puis indiqué au client dans l&apos;email.</p>
          </div>
          <div>
            <label className={lbl}>Message / réponse à une question (optionnel)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Ex. Suite à votre question sur les horaires : la visio dure 1h par jour…" className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[13.5px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC] resize-none" />
          </div>
          <div>
            <label className={lbl}>À préparer pour le RDV (1 par ligne, modifiable)</label>
            <textarea value={prep} onChange={(e) => setPrep(e.target.value)} rows={4} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[13.5px] text-white focus:outline-none focus:border-[#0066CC] resize-none" />
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/10 px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-wider font-bold text-white/45 mb-1.5">Inclus automatiquement dans l&apos;email</p>
            <ul className="text-[12.5px] text-white/65 space-y-0.5 list-disc pl-4">
              <li>21 heures sur 3 jours</li>
              <li>Chaque jour : 1h en visioconférence avec le formateur + 6h en situation de travail</li>
              <li>Financement OPCO - aucun reste à charge</li>
              <li>Convocations officielles + 2 questionnaires à remplir avant la formation (attentes &amp; positionnement de l&apos;apprenant)</li>
            </ul>
          </div>

          <button onClick={doSend} disabled={sending || !target.clientEmail} className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold transition disabled:opacity-50 ${sentAt ? 'bg-[#3DD68C] text-[#0a3d24] hover:bg-[#34c07e]' : 'bg-[#0066CC] text-white hover:bg-[#0077ED]'}`}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : sentAt ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {sending ? 'Envoi…' : sentAt ? 'Confirmation envoyée · Renvoyer' : 'Envoyer la confirmation au client'}
          </button>
          {sentAt && <p className="text-[11.5px] text-white/45 text-center">Envoyée au client (copie agence) le {new Date(sentAt).toLocaleDateString('fr-FR')}.</p>}
        </div>
      </div>
    </div>
  );
}

// Modal de suivi / rappel d'un client : infos client modifiables (nom, emails, SIRET, OPCO) +
// "ce qu'on attend" + date de rappel (heure française) + suivi annuel. @author Rabah Ziane - 2026-06-05
function ReminderModal({ lead, onSave, onClose }: { lead: Lead; onSave: (note: string, when: string | null, extra: { formationDoneThisYear: boolean; companyEmployees: string; denom: string; email: string; accountantEmail: string; managerEmail: string; siret: string; opco: string }) => void; onClose: () => void }) {
  const toLocalInput = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const [note, setNote] = useState(lead.waitingNote || '');
  const [when, setWhen] = useState(toLocalInput(lead.reminderAt));
  const [formationDone, setFormationDone] = useState(!!lead.formationDoneThisYear); // formation déjà faite cette année ?
  const [employees, setEmployees] = useState(lead.companyEmployees != null ? String(lead.companyEmployees) : ''); // effectif entreprise
  // Infos client modifiables après création (nom, emails, SIRET, OPCO). @Rabah 2026-06-18
  const [denom, setDenom] = useState(lead.denom || '');
  const [email, setEmail] = useState(lead.email || '');
  const [accountantEmail, setAccountantEmail] = useState(lead.accountantEmail || '');
  const [managerEmail, setManagerEmail] = useState(lead.managerEmail || '');
  const [siret, setSiret] = useState(lead.siret || '');
  const [opco, setOpco] = useState(lead.opco || '');
  const PRESETS = ['En attente du courrier AKTO', 'En attente du code OPCO', 'Rappeler le client', 'En attente création compte OPCO'];
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md my-10 rounded-2xl bg-[#181A20] border border-white/10 shadow-2xl text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div><p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-bold">Suivi · {lead.denom || 'Client'}</p><h2 className="text-[15px] font-bold mt-0.5">Statut & rappel</h2></div>
          <button onClick={onClose} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {/* Infos client modifiables (nom, emails, SIRET, OPCO). @Rabah 2026-06-18 */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
            <p className="text-[11px] uppercase tracking-wider font-bold text-white/40">Informations client</p>
            <input value={denom} onChange={(e) => setDenom(e.target.value)} placeholder="Nom du client" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email principal" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
            <input type="email" value={accountantEmail} onChange={(e) => setAccountantEmail(e.target.value)} placeholder="Email comptable (optionnel)" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
            <input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} placeholder="Email gérant - signature convention (optionnel)" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
            <p className="text-[10.5px] text-white/35">La convention est envoyée au gérant si renseigné, sinon à l&apos;email principal.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="SIRET" inputMode="numeric" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 font-mono focus:outline-none focus:border-[#0066CC]" />
              <input value={opco} onChange={(e) => setOpco(e.target.value)} placeholder="OPCO" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-white/40 mb-1.5">Ce que l&apos;on attend</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. En attente du courrier AKTO" className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
            <div className="flex flex-wrap gap-1.5 mt-2">{PRESETS.map((p) => <button key={p} onClick={() => setNote(p)} className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/70">{p}</button>)}</div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-white/40 mb-1.5">Me notifier · rappeler le client <span className="text-white/30 normal-case font-normal">(heure française)</span></label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white focus:outline-none focus:border-[#0066CC] [color-scheme:dark]" />
            {when && <button onClick={() => setWhen('')} className="mt-1.5 text-[11.5px] text-white/50 hover:text-white/80 underline">Retirer le rappel</button>}
          </div>
          {/* Suivi annuel : effectif entreprise + formation déjà effectuée cette année (sinon budget OPCO 100%). @Rabah 2026-06-18 */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-white/40 mb-1.5">Nombre de salariés de l&apos;entreprise</label>
            <input value={employees} onChange={(e) => setEmployees(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Ex. 12" className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-[13px] text-white/80 cursor-pointer">
              <input type="checkbox" checked={formationDone} onChange={(e) => setFormationDone(e.target.checked)} className="accent-[#0066CC]" />
              Formation déjà effectuée cette année
            </label>
            <p className={`text-[11.5px] mt-1.5 ${formationDone ? 'text-[#E5B567]' : 'text-[#3DD68C]'}`}>{formationDone ? 'Budget OPCO de l’année déjà entamé.' : 'Budget OPCO disponible à 100% pour l’année en cours.'}</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12.5px]">Annuler</button>
            <button onClick={() => onSave(note.trim(), when ? new Date(when).toISOString() : null, { formationDoneThisYear: formationDone, companyEmployees: employees, denom: denom.trim(), email: email.trim(), accountantEmail: accountantEmail.trim(), managerEmail: managerEmail.trim(), siret: siret.trim(), opco: opco.trim() })} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066CC] hover:bg-[#0077ED] text-white text-[12.5px] font-semibold"><Clock className="h-4 w-4" /> Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal "Accès OPCO" : 2 choix pour le client.
//  1) Il a deja un compte OPCO -> on lui envoie un lien securise (email + mot de passe).
//  2) Il n'a pas encore de compte -> parcours guide AKTO (creation compte -> rattachement
//     entreprise -> code recu par courrier) que l'agence/le commercial suit avec le client,
//     puis espace dedie pour transmettre le code de rattachement. @author Rabah Ziane - 2026-06-04
function OpcoAccessModal({ lead, status, busy, onAsk, onReminder, onClose }: { lead: Lead; status?: string; busy: boolean; onAsk: (label: string) => void | Promise<void>; onReminder?: () => void; onClose: () => void }) {
  const [mode, setMode] = useState<'choice' | 'have' | 'akto' | 'mount'>('choice');
  const Header = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-bold">Accès OPCO · {lead.denom || 'Client'}</p>
        <h2 className="text-[16px] font-bold text-white mt-0.5">{title}</h2>
        {sub && <p className="text-[12px] text-white/50 mt-1">{sub}</p>}
      </div>
      <button onClick={onClose} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex-shrink-0"><X className="h-4 w-4" /></button>
    </div>
  );
  // Etape numerotee (guide AKTO)
  const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <div className="flex gap-3">
      <span className="flex-shrink-0 inline-flex h-7 w-7 rounded-full bg-[#0066CC] items-center justify-center text-[12px] font-bold text-white">{n}</span>
      <div className="min-w-0 pb-1"><p className="text-[13px] font-semibold text-white">{title}</p><div className="text-[12.5px] text-white/55 leading-relaxed mt-0.5">{children}</div></div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-3xl my-6 rounded-2xl bg-[#181A20] border border-white/10 shadow-2xl text-white" onClick={(e) => e.stopPropagation()}>

        {/* 1) Choix : a-t-il deja un compte OPCO ? */}
        {mode === 'choice' && (
          <>
            <Header title="Le client a-t-il déjà un compte OPCO ?" sub="Trois cas de figure. Choisissez celui du client pour lancer la bonne procédure." />
            <div className="px-6 py-5 grid sm:grid-cols-3 gap-3">
              <button onClick={() => setMode('have')} className="text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#0066CC]/40 p-4 transition">
                <span className="inline-flex h-10 w-10 rounded-xl bg-[#3DD68C]/15 items-center justify-center"><ShieldCheck className="h-5 w-5 text-[#3DD68C]" /></span>
                <p className="text-[13.5px] font-bold mt-3">Compte OPCO + identifiants</p>
                <p className="text-[12px] text-white/50 mt-1 leading-relaxed">Il a un compte et accepte de partager ses identifiants. On lui envoie un lien sécurisé pour les transmettre à Delivery Digital.</p>
                <span className="inline-flex items-center gap-1 text-[12px] text-[#4da3ff] font-semibold mt-3">Transmettre les identifiants <ArrowRight className="h-3.5 w-3.5" /></span>
              </button>
              <button onClick={() => setMode('mount')} className="text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#0066CC]/40 p-4 transition">
                <span className="inline-flex h-10 w-10 rounded-xl bg-[#BF5AF2]/15 items-center justify-center"><Stamp className="h-5 w-5 text-[#BF5AF2]" /></span>
                <p className="text-[13.5px] font-bold mt-3">Compte OPCO, sans partage</p>
                <p className="text-[12px] text-white/50 mt-1 leading-relaxed">Il a un compte mais ne veut pas donner ses identifiants. Delivery Digital monte le dossier sur AKTO ; le client le <strong className="text-white/70">valide depuis son espace</strong>.</p>
                <span className="inline-flex items-center gap-1 text-[12px] text-[#4da3ff] font-semibold mt-3">Monter le dossier sur AKTO <ArrowRight className="h-3.5 w-3.5" /></span>
              </button>
              <button onClick={() => setMode('akto')} className="text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#0066CC]/40 p-4 transition">
                <span className="inline-flex h-10 w-10 rounded-xl bg-[#0066CC]/15 items-center justify-center"><Building2 className="h-5 w-5 text-[#4da3ff]" /></span>
                <p className="text-[13.5px] font-bold mt-3">Pas encore de compte</p>
                <p className="text-[12px] text-white/50 mt-1 leading-relaxed">On l&apos;accompagne : création du compte AKTO, rattachement de son entreprise, puis transmission du code reçu par courrier.</p>
                <span className="inline-flex items-center gap-1 text-[12px] text-[#4da3ff] font-semibold mt-3">Lancer l&apos;accompagnement AKTO <ArrowRight className="h-3.5 w-3.5" /></span>
              </button>
            </div>
            <p className="px-6 pb-5 text-[11.5px] text-white/35">AKTO couvre la branche restauration (HCR / restauration rapide). Les autres OPCO seront ajoutés ici prochainement.</p>
          </>
        )}

        {/* 2a) Deja un compte : envoi du lien securise */}
        {mode === 'have' && (
          <>
            <Header title="Le client a déjà son compte OPCO" sub="Email + mot de passe, transmis de façon sécurisée à Delivery Digital." />
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 rounded-lg bg-[#0066CC]/15 items-center justify-center flex-shrink-0"><Mail className="h-4 w-4 text-[#4da3ff]" /></span>
                  <div>
                    <p className="text-[13px] font-semibold">Un lien sécurisé est envoyé à <span className="text-[#4da3ff]">{lead.email || '—'}</span></p>
                    <p className="text-[12px] text-white/55 mt-1 leading-relaxed">Le client saisit son <strong className="text-white/80">identifiant</strong> et son <strong className="text-white/80">mot de passe OPCO</strong> sur une page chiffrée. Personne d&apos;autre que Delivery Digital ne peut les lire (chiffrement au repos).</p>
                  </div>
                </div>
              </div>
              {status === 'received'
                ? <p className="inline-flex items-center gap-1.5 text-[12.5px] text-[#3DD68C] font-semibold"><CheckCircle2 className="h-4 w-4" /> Identifiants déjà reçus par Delivery Digital.</p>
                : status === 'pending'
                ? <p className="inline-flex items-center gap-1.5 text-[12.5px] text-[#E5B567]"><Clock className="h-4 w-4" /> Demande déjà envoyée, en attente de la réponse du client. Vous pouvez relancer.</p>
                : null}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button onClick={() => setMode('choice')} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12.5px]">Retour</button>
                <button onClick={() => onAsk('Identifiants OPCO')} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0066CC] hover:bg-[#0077ED] text-white text-[12.5px] font-semibold disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {status === 'pending' ? 'Renvoyer le lien' : 'Envoyer le lien au client'}</button>
              </div>
            </div>
          </>
        )}

        {/* 2b) Parcours guide AKTO (creation compte + rattachement entreprise) */}
        {mode === 'akto' && (
          <>
            <Header title="Accompagnement AKTO" sub="Suivez ces étapes avec le client (par téléphone ou en visio) pour créer son compte et rattacher son entreprise." />
            <div className="px-6 py-5 space-y-5">
              <Step n={1} title="Créer le compte AKTO">
                Ouvrez le portail AKTO et saisissez l&apos;email du client. AKTO lui envoie un <strong className="text-white/80">code de vérification par email</strong> ; il définit son mot de passe et arrive sur son tableau de bord.
                <a href={AKTO_SIGNUP_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0066CC]/15 border border-[#0066CC]/30 text-[#4da3ff] text-[12px] font-semibold hover:bg-[#0066CC]/25 transition"><ExternalLink className="h-3.5 w-3.5" /> Créer mon compte AKTO</a>
              </Step>
              <Step n={2} title="Se rattacher à l'entreprise">
                Sur le tableau de bord, le client clique sur <strong className="text-white/80">« Se rattacher à une entreprise »</strong>, puis suit ces écrans :
                <ul className="mt-2 space-y-1.5 text-[12px] text-white/55">
                  <li className="flex gap-2"><span className="text-white/30">•</span><span><strong className="text-white/75">Contexte</strong> : « Effectuer une nouvelle demande avec le SIREN de mon entreprise » (sauf s&apos;il dispose déjà d&apos;un code d&apos;activation).</span></li>
                  <li className="flex gap-2"><span className="text-white/30">•</span><span><strong className="text-white/75">Périmètre</strong> : « Toute l&apos;entreprise » (recommandé pour les TPE/PME).</span></li>
                  <li className="flex gap-2"><span className="text-white/30">•</span><span><strong className="text-white/75">SIREN</strong> : renseigner le SIREN à 9 chiffres{lead.siret ? ` (ici : ${lead.siret.replace(/\s/g, '').slice(0, 9)})` : ''}.</span></li>
                </ul>
                <a href={AKTO_ESPACE_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-[12px] font-semibold hover:bg-white/10 transition"><ExternalLink className="h-3.5 w-3.5" /> Ouvrir l&apos;espace AKTO (rattachement)</a>
              </Step>
              <Step n={3} title="Recevoir le courrier de rattachement">
                AKTO envoie un <strong className="text-white/80">courrier postal</strong> contenant un <strong className="text-white/80">code d&apos;activation</strong> à l&apos;adresse de l&apos;entreprise. Ce code valide définitivement le rattachement (comptez quelques jours).
                {onReminder && <div className="mt-2.5"><button onClick={onReminder} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0066CC]/15 border border-[#0066CC]/30 text-[#4da3ff] text-[12px] font-semibold hover:bg-[#0066CC]/25"><Clock className="h-3.5 w-3.5" /> Me notifier pour rappeler le client</button><p className="text-[11px] text-white/40 mt-1">Programmez un rappel (date + heure française) : « en attente du courrier », rappeler le client…</p></div>}
              </Step>
              <Step n={4} title="Transmettre le code (espace dédié)">
                Dès réception du courrier, on envoie au client un <strong className="text-white/80">lien sécurisé</strong> pour transmettre son code d&apos;activation à Delivery Digital, qui finalise le rattachement et monte le dossier.
                <div className="mt-3 rounded-xl border border-[#0066CC]/25 bg-[#0066CC]/[0.07] p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 rounded-lg bg-[#0066CC]/20 items-center justify-center flex-shrink-0"><Inbox className="h-4 w-4 text-[#4da3ff]" /></span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold">Espace dédié · code de rattachement</p>
                      <p className="text-[11.5px] text-white/55 mt-0.5 leading-relaxed">Lien envoyé à <span className="text-[#4da3ff]">{lead.email || '—'}</span>. Le client y saisit le code reçu par courrier.</p>
                      {status === 'received'
                        ? <p className="inline-flex items-center gap-1.5 text-[12px] text-[#3DD68C] font-semibold mt-2"><CheckCircle2 className="h-3.5 w-3.5" /> Code reçu par Delivery Digital.</p>
                        : status === 'pending'
                        ? <p className="inline-flex items-center gap-1.5 text-[12px] text-[#E5B567] mt-2"><Clock className="h-3.5 w-3.5" /> Lien déjà envoyé, en attente du code.</p>
                        : null}
                      <button onClick={() => onAsk('Code de rattachement OPCO (AKTO)')} disabled={busy} className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0066CC] hover:bg-[#0077ED] text-white text-[12px] font-semibold disabled:opacity-60">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} {status === 'pending' ? 'Renvoyer le lien' : 'Envoyer le lien de transmission'}</button>
                    </div>
                  </div>
                </div>
              </Step>
              <div className="pt-1"><button onClick={() => setMode('choice')} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12.5px]">Retour</button></div>
            </div>
          </>
        )}

        {/* 3) Le client a un compte AKTO mais ne veut pas partager ses identifiants :
            Delivery Digital monte la demande de prise en charge côté organisme de formation,
            le client la valide depuis son propre espace AKTO. Suivi via le statut pending/received
            (timeline : « En attente de validation » -> « Validé »). @author Rabah Ziane - 2026-06-23 */}
        {mode === 'mount' && (
          <>
            <Header title="DD monte le dossier sur AKTO" sub="Le client a un compte mais ne partage pas ses identifiants : Delivery Digital dépose la demande, le client la valide depuis son espace." />
            <div className="px-6 py-5 space-y-5">
              <Step n={1} title="Delivery Digital dépose la demande sur AKTO">
                Avec le SIREN{lead.siret ? ` (${lead.siret.replace(/\s/g, '').slice(0, 9)})` : ''} et les pièces du dossier, Delivery Digital crée la <strong className="text-white/80">demande de prise en charge</strong> sur son espace organisme de formation AKTO. Aucun identifiant du client n&apos;est nécessaire.
              </Step>
              <Step n={2} title="Le client valide depuis son espace AKTO">
                AKTO notifie l&apos;employeur : il se connecte à <strong className="text-white/80">son propre espace AKTO</strong> et <strong className="text-white/80">valide la demande</strong> en un clic. Il garde la main, sans jamais communiquer son mot de passe.
                <a href={AKTO_ESPACE_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-[12px] font-semibold hover:bg-white/10 transition"><ExternalLink className="h-3.5 w-3.5" /> Ouvrir l&apos;espace AKTO du client</a>
              </Step>
              <Step n={3} title="Suivi de la validation">
                On prévient le client qu&apos;il a une demande à valider, puis on suit l&apos;état directement dans la timeline du dossier.
                <div className="mt-3 rounded-xl border border-[#BF5AF2]/25 bg-[#BF5AF2]/[0.07] p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 rounded-lg bg-[#BF5AF2]/20 items-center justify-center flex-shrink-0"><Stamp className="h-4 w-4 text-[#BF5AF2]" /></span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold">Validation par le client · espace AKTO</p>
                      <p className="text-[11.5px] text-white/55 mt-0.5 leading-relaxed">Rappel envoyé à <span className="text-[#4da3ff]">{lead.email || '—'}</span> : « votre dossier est déposé sur AKTO, validez-le depuis votre espace ».</p>
                      {status === 'received'
                        ? <p className="inline-flex items-center gap-1.5 text-[12px] text-[#3DD68C] font-semibold mt-2"><CheckCircle2 className="h-3.5 w-3.5" /> Dossier validé par le client sur AKTO.</p>
                        : status === 'pending'
                        ? <p className="inline-flex items-center gap-1.5 text-[12px] text-[#E5B567] mt-2"><Clock className="h-3.5 w-3.5" /> En attente de la validation du client sur son espace AKTO.</p>
                        : null}
                      <button onClick={() => onAsk('Validation dossier AKTO (monté par DD)')} disabled={busy} className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0066CC] hover:bg-[#0077ED] text-white text-[12px] font-semibold disabled:opacity-60">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} {status === 'pending' ? 'Renvoyer le rappel au client' : 'Prévenir le client de valider'}</button>
                      {onReminder && <div className="mt-2.5"><button onClick={onReminder} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-[12px] font-semibold hover:bg-white/10"><Clock className="h-3.5 w-3.5" /> Programmer un rappel de relance</button></div>}
                    </div>
                  </div>
                </div>
              </Step>
              <div className="pt-1"><button onClick={() => setMode('choice')} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12.5px]">Retour</button></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Detail formation - identique a la page Formation de deliverydigital.fr (2 colonnes).
// Cadre de fin de formation : certificat A4 imprimable remis au restaurant (à afficher en salle).
// Liste les salariés formés du dernier dossier (ou un modèle si aucun). @author Rabah Ziane - 2026-06-03
function FormationDetailModal({ formation: f, onClose }: { formation: Formation; onClose: () => void }) {
  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <h3 className="text-[14px] font-bold text-[#1D1D1F]">{title}</h3>
      <div className="mt-2 text-[13px] text-[#3a3a3c] leading-relaxed">{children}</div>
    </div>
  );
  const Bullets = ({ items }: { items: string[] }) => (
    <ul className="space-y-1.5">{items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-[#86868B] mt-[1px]">•</span><span>{it}</span></li>)}</ul>
  );
  const meta: Array<[string, string]> = [
    ['Durée', `${f.hours}h`],
    ['Prix', `${f.priceHT} €`],
    ['Participants max', String(f.participantsMax)],
    ["Délai d'accès", f.delaiAcces],
    ['Certification', f.certification],
    ['Dernière maj', f.derniereMaj],
  ];
  const ind: Array<[string, number]> = [
    ['Satisfaction', f.indicateurs.satisfaction],
    ['Réussite', f.indicateurs.reussite],
    ['Recommandation', f.indicateurs.recommandation],
    ['Présence', f.indicateurs.presence],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-4xl my-6 bg-white text-[#1D1D1F] rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-black/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#86868B]">{f.category}</p>
              <h2 className="text-[22px] sm:text-[26px] font-extrabold leading-tight mt-1.5 pr-6">{f.title}</h2>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 rounded-full border border-black/10 text-[12px]">{f.level}</span>
                <span className="px-3 py-1 rounded-full border border-black/10 text-[12px]">{f.funding} Éligible</span>
              </div>
            </div>
            <button onClick={onClose} className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-black/[0.05] text-[#86868B]"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="px-6 sm:px-8 py-6 max-h-[72vh] overflow-y-auto grid lg:grid-cols-[1fr_300px] gap-6 bg-[#fbfbfd]">
          <div className="space-y-4 order-2 lg:order-1">
            <Card title="Description"><p>{f.description}</p></Card>
            <Card title="Public visé"><p>{f.publicVise}</p></Card>
            <Card title="Objectifs pédagogiques"><Bullets items={f.objectifs} /></Card>
            <Card title="Modalités de la formation"><Bullets items={f.modalites} /></Card>
            <Card title="Méthodes mobilisées"><Bullets items={f.methodesMobilisees} /></Card>
            <Card title="Méthodes d'évaluation"><Bullets items={f.methodesEvaluation} /></Card>
            <Card title="Modules de formation">
              <div className="space-y-2.5">
                {f.modules.map((m, i) => (
                  <div key={i} className="rounded-xl bg-black/[0.03] p-3.5">
                    <div className="flex items-center justify-between gap-2"><p className="font-semibold text-[13px] text-[#1D1D1F]">{m.title}</p><span className="text-[12px] text-[#86868B] flex-shrink-0">{m.hours}h</span></div>
                    <ul className="mt-1.5 space-y-1">{m.points.map((p, j) => <li key={j} className="flex gap-2 text-[12.5px]"><span className="text-[#86868B]">-</span><span>{p}</span></li>)}</ul>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Prérequis"><p>{f.prerequis}</p></Card>
            <Card title="Accessibilité"><p>{f.accessibilite}</p></Card>
            <Card title="Documents">
              <a href={f.programmePdfUrl} target="_blank" rel="noreferrer" download className="flex items-center gap-3 rounded-xl border border-black/[0.08] px-3.5 py-3 hover:bg-black/[0.02] transition">
                <span className="inline-flex h-9 w-9 rounded-lg bg-[#0066CC]/10 text-[#0066CC] items-center justify-center"><FileText className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold text-[13px] text-[#1D1D1F]">Programme détaillé</span><span className="block text-[11.5px] text-[#86868B]">PDF - Contenu complet</span></span>
                <Download className="h-4 w-4 text-[#86868B]" />
              </a>
            </Card>
          </div>
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-0 rounded-2xl border border-black/[0.06] bg-white p-5">
              <div className="divide-y divide-black/[0.06]">
                {meta.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2 text-[12.5px]"><span className="text-[#86868B]">{k}</span><span className="font-semibold text-[#1D1D1F] text-right">{v}</span></div>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#86868B] mt-4 mb-2">Indicateurs</p>
              <div className="space-y-2.5">
                {ind.map(([k, v]) => (
                  <div key={k}>
                    <div className="flex items-center justify-between text-[12px]"><span className="text-[#3a3a3c]">{k}</span><span className="font-semibold">{v}%</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden"><div className="h-full bg-[#0066CC]" style={{ width: `${v}%` }} /></div>
                  </div>
                ))}
              </div>
              <a href={f.programmePdfUrl} target="_blank" rel="noreferrer" download className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1D1D1F] text-white text-[13px] font-semibold hover:bg-black"><Download className="h-4 w-4" /> Télécharger le programme</a>
              <a href="mailto:contact@deliverydigital.fr" className="mt-2 block text-center w-full px-4 py-2.5 rounded-xl border border-black/10 text-[13px] font-semibold hover:bg-black/[0.03]">Nous contacter</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tampon (cachet) du partenaire genere automatiquement depuis les infos entreprise.
function PartnerStamp({ agency }: { agency: Agency }) {
  const ci = agency.companyInfo || {};
  const name = ci.legalName || agency.name;
  const loc = [ci.postalCode, ci.city].filter(Boolean).join(' ');
  const signedDate = agency.contract?.signedAt ? new Date(agency.contract.signedAt).toLocaleDateString('fr-FR') : null;
  return (
    <div className="inline-block -rotate-[7deg] select-none" style={{ color: '#1d4ed8' }}>
      <div className="rounded-md border-2 px-3 py-2 text-center" style={{ borderColor: '#1d4ed8', boxShadow: 'inset 0 0 0 1px rgba(29,78,216,0.25)' }}>
        <p className="text-[8px] font-bold uppercase tracking-[0.15em] opacity-70">Cachet de l&apos;entreprise</p>
        <p className="text-[12px] font-extrabold uppercase leading-tight mt-0.5">{name}</p>
        {ci.regNumber && <p className="text-[8px] font-semibold mt-0.5">SIRET / N° {ci.regNumber}</p>}
        {loc && <p className="text-[8px] font-medium">{loc}{ci.country ? ` · ${ci.country}` : ''}</p>}
        {agency.contract?.signed ? (
          <p className="text-[7.5px] font-bold uppercase tracking-wide mt-1 border-t border-[#1d4ed8]/40 pt-0.5">Signé électroniquement{signedDate ? ` le ${signedDate}` : ''}</p>
        ) : (
          <p className="text-[7.5px] font-bold uppercase tracking-wide mt-1 border-t border-[#1d4ed8]/40 pt-0.5 opacity-60">Aperçu - non signé</p>
        )}
      </div>
    </div>
  );
}

// Modal : contrat complet pre-rempli (sheet A4) + signature electronique + tampon auto.
function ContractModal({ agency, fix, pct, signFunction, setSignFunction, signing, onSign, onClose }: { agency: Agency; fix: number; pct: number; signFunction: string; setSignFunction: (v: string) => void; signing: boolean; onSign: () => void; onClose: () => void }) {
  const ci = agency.companyInfo || {};
  const partner = ci.legalName || agency.name;
  const addr = [ci.address, [ci.postalCode, ci.city].filter(Boolean).join(' '), ci.country].filter(Boolean).join(', ');
  const rep = [ci.repName, ci.repFunction].filter(Boolean).join(', ');
  const signed = !!agency.contract?.signed;
  const today = new Date().toLocaleDateString('fr-FR');
  const C = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <div className="mt-4"><p className="font-bold text-[12.5px]">Article {n} - {title}</p><p className="text-[12px] leading-relaxed text-[#3a3a3c] mt-1">{children}</p></div>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-3xl my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-[13px] font-semibold inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> Contrat de partenariat</p>
          <button onClick={onClose} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"><X className="h-4 w-4" /></button>
        </div>
        {/* Feuille du contrat */}
        <div className="bg-white text-[#1D1D1F] rounded-xl shadow-2xl px-8 py-8 sm:px-12 sm:py-10">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#86868B] font-bold">Delivery Digital</p><h1 className="text-[18px] font-extrabold mt-1">Contrat de partenariat</h1><p className="text-[11.5px] text-[#86868B]">Apporteur d&apos;affaires - formation financée (OPCO) &amp; prestations informatiques</p></div>
            <img src={LOGO_URL} alt="Delivery Digital" className="h-9 w-auto" />
          </div>

          <div className="mt-5 text-[12px] leading-relaxed text-[#3a3a3c]">
            <p className="font-bold text-[12.5px] text-[#1D1D1F]">Entre les soussignés :</p>
            <p className="mt-1.5"><strong>Delivery Digital</strong>, ci-après « la Société », d&apos;une part,</p>
            <p className="mt-1.5">Et <strong>{partner}</strong>{ci.regNumber ? `, immatriculée sous le n° ${ci.regNumber}` : ''}{addr ? `, dont le siège est situé ${addr}` : ''}{rep ? `, représentée par ${rep}` : ''}, ci-après « le Partenaire », d&apos;autre part.</p>
          </div>

          <C n={1} title="Objet">Le présent contrat définit les conditions dans lesquelles le Partenaire présente à la Société des clients en vue du montage de dossiers de formation financés par les OPCO, et perçoit une commission en contrepartie.</C>
          <C n={2} title="Rôle du Partenaire">Le Partenaire identifie les clients, renseigne leurs informations et monte les dossiers OPCO via l&apos;espace partenaire mis à sa disposition. Il s&apos;engage à transmettre des informations exactes et à respecter la réglementation applicable à la formation professionnelle.</C>
          <C n={3} title="Commission">Le Partenaire perçoit une commission de <strong>{fix.toLocaleString('fr-FR')} € TTC par client et par an</strong> (comptée une seule fois, au 1er dossier du client dans l&apos;année), majorée de <strong>{pct} % TTC</strong> du montant de chaque dossier. La commission est <strong>versée à la réception effective du paiement OPCO</strong> correspondant, sur le compte bancaire renseigné par le Partenaire. <strong>En cas de volumes importants gérés par le Partenaire, une mise à jour du contrat en exclusivité lui sera proposée.</strong></C>
          <C n={4} title="Versement">Les versements sont effectués par virement sur le RIB validé du Partenaire. La Société tient à jour, dans l&apos;espace partenaire, l&apos;état des dossiers et l&apos;historique des paiements.</C>
          <C n={5} title="Durée">Le contrat prend effet à sa signature électronique pour une durée d&apos;<strong>un (1) an</strong>, renouvelable par tacite reconduction par périodes successives d&apos;un an. Chaque partie peut y mettre fin à l&apos;échéance, ou à tout moment, moyennant un préavis écrit de <strong>trente (30) jours</strong>, sans incidence sur les commissions déjà acquises.</C>
          <C n={6} title="Confidentialité et données">Chaque partie s&apos;engage à préserver la confidentialité des informations échangées et à traiter les données personnelles des clients conformément au RGPD.</C>
          <C n={7} title="Non-concurrence et non-sollicitation">Pendant la durée du contrat et <strong>après son arrêt, quelle qu&apos;en soit la cause (terme, résiliation, non-reconduction), sans limitation de durée</strong>, le Partenaire n&apos;a <strong>pas le droit d&apos;exercer ni d&apos;orienter l&apos;activité d&apos;apport et de montage de dossiers de formation financés par les OPCO avec d&apos;autres organismes ou centres de formation</strong>. Il s&apos;interdit notamment : (a) de démarcher, reprendre ou réorienter vers un autre centre de formation les <strong>clients qu&apos;il a apportés dans le cadre du présent contrat</strong> ; (b) de poursuivre avec ces clients des prestations OPCO équivalentes par l&apos;intermédiaire d&apos;un tiers ; (c) de solliciter les clients, prospects, formateurs ou salariés de Delivery Digital, ni d&apos;exploiter ses méthodes, contenus, outils, fichiers ou données. Les clients apportés demeurent la clientèle de Delivery Digital. Tout manquement entraîne la perte des commissions non encore versées.</C>
          <C n={8} title="Indépendance">Le Partenaire agit en toute indépendance. Le présent contrat ne crée aucun lien de subordination ni société de fait entre les parties.</C>
          <C n={9} title="Validation">La signature électronique du Partenaire est soumise à la validation de Delivery Digital, qui vérifie les informations de l&apos;entreprise, le RIB et le présent contrat avant activation du compte.</C>

          {/* Avenant n°1 : extension du partenariat aux prestations de services informatiques.
              Mêmes conditions de commission que la formation ({fix} € + {pct} %), modalités de
              versement propres au cycle de paiement client (acompte / solde). @Rabah 2026-06-23 */}
          <div className="mt-6 rounded-lg border border-[#0066CC]/25 bg-[#0066CC]/[0.04] p-4">
            <p className="font-extrabold text-[12.5px] text-[#1D1D1F]">Avenant n°1 - Prestations de services informatiques</p>
            <p className="text-[12px] leading-relaxed text-[#3a3a3c] mt-1.5">Le présent avenant étend le partenariat à l&apos;apport et au montage de devis de <strong>prestations de services informatiques</strong> (sites web, applications, logiciels sur mesure, etc.) que le Partenaire présente à la Société via son espace partenaire. Pour cette activité, le Partenaire perçoit <strong>{fix.toLocaleString('fr-FR')} € TTC par client</strong> (frais fixes, mêmes conditions que la formation) majorés de <strong>{IT_COMMISSION_PCT} % TTC</strong> du montant de chaque devis (le taux propre aux prestations informatiques).</p>
            <p className="text-[12px] leading-relaxed text-[#3a3a3c] mt-1.5"><strong>Modalités de versement :</strong> les <strong>frais fixes</strong> sont versés au Partenaire <strong>à la signature du devis par le client</strong> (1er acompte), et le <strong>pourcentage</strong> est versé à l&apos;encaissement du <strong>2ème acompte du client</strong> (solde). Les versements s&apos;effectuent par virement sur le RIB validé du Partenaire.</p>
            <p className="text-[12px] leading-relaxed text-[#3a3a3c] mt-1.5">Les clauses de confidentialité, de durée, d&apos;indépendance et de validation du contrat s&apos;appliquent à l&apos;identique à cette activité. En revanche, <strong>l&apos;activité de prestations informatiques n&apos;est soumise à aucune exclusivité ni à la clause de non-concurrence</strong> : le Partenaire reste <strong>libre de travailler avec d&apos;autres sociétés ou prestataires</strong> pour le développement informatique. La clause de non-concurrence et de non-sollicitation (Article 7) demeure limitée à la seule activité de formation financée par les OPCO. La signature du présent contrat vaut acceptation de cet avenant.</p>
          </div>

          {/* Blocs de signature */}
          <div className="mt-8 grid sm:grid-cols-2 gap-6 border-t border-black/10 pt-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold">Pour Delivery Digital</p>
              <p className="text-[12px] mt-1">Fait à distance, le {today}</p>
              <div className="mt-3 min-h-[92px] flex items-center gap-3">
                <img src="/uploads/assets/signature-dd.png" alt="Signature Delivery Digital" className="h-[58px] w-auto mix-blend-multiply" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <div className="text-center leading-[1.25] text-[#1b1b1b] select-none">
                  <p className="text-[14px] font-extrabold">DELIVERY Digital Nice</p>
                  <p className="text-[11px] font-bold">470 promenade des Anglais</p>
                  <p className="text-[11px] font-bold">06200 Nice • France</p>
                  <p className="text-[9.5px] mt-1 text-[#3a3a3c]">SIRET 90294519500029 • APE 6201Z</p>
                  <p className="text-[9.5px] text-[#3a3a3c]">RCS 902 945 195</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold">Pour le Partenaire</p>
              <p className="text-[12px] mt-1">{partner}{rep ? ` - ${rep}` : ''}</p>
              <div className="mt-3 min-h-[88px] flex items-center">
                {ci.legalName ? <PartnerStamp agency={agency} /> : <span className="text-[11.5px] text-[#E5B567]">Renseignez vos informations d&apos;entreprise pour générer le tampon.</span>}
              </div>
              {signed && agency.contract?.signedBy && <p className="text-[11px] text-[#86868B] mt-1">Signataire : {agency.contract.signedBy}{agency.contract.signedFunction ? ` (${agency.contract.signedFunction})` : ''}</p>}
            </div>
          </div>
        </div>

        {/* Barre d'action signature */}
        <div className="mt-3 bg-[#181A20] border border-white/10 rounded-xl p-4">
          {signed ? (
            <p className="text-[12.5px] text-[#3DD68C] inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Contrat signé{agency.contract?.signedAt ? ` le ${new Date(agency.contract.signedAt).toLocaleDateString('fr-FR')}` : ''}. {agency.contract?.validated ? 'Validé par Delivery Digital.' : 'En attente de validation Delivery Digital.'}</p>
          ) : !ci.legalName ? (
            <p className="text-[12.5px] text-[#E5B567]">Renseignez d&apos;abord vos informations d&apos;entreprise (bandeau du tableau de bord) avant de signer.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">Votre fonction</label>
                <input value={signFunction} onChange={(e) => setSignFunction(e.target.value)} placeholder="Gérant, président…" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              </div>
              <button onClick={onSign} disabled={signing} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#3DD68C] text-black text-[12.5px] font-semibold hover:brightness-110 disabled:opacity-60"><Stamp className="h-3.5 w-3.5" /> {signing ? 'Signature…' : 'Signer et apposer mon tampon'}</button>
              <p className="text-[11px] text-white/40 self-center">Votre tampon est généré automatiquement.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Facture de commission (apport d'affaires) que l'agence envoie à Delivery Digital
// pour encaissement, une fois l'OPCO réglé. @author Rabah Ziane - 2026-06-02
function FactureModal({ agency, dossier, commission, fix, pct, sending, onSend, onClose }: { agency: Agency; dossier: Dossier; commission: number; fix: number; pct: number; sending: boolean; onSend: () => void; onClose: () => void }) {
  const ci = agency.companyInfo || {};
  const emetteur = ci.legalName || agency.name;
  const emetteurAddr = [ci.address, [ci.postalCode, ci.city].filter(Boolean).join(' '), ci.country].filter(Boolean).join(', ');
  const year = new Date(dossier.createdAt || Date.now()).getFullYear();
  const num = dossier.invoiceNumber || `AGC-${year}-${dossier._id.slice(-5).toUpperCase()}`;
  const refDossier = `DOS-${year}-${dossier._id.slice(-5).toUpperCase()}`;
  const depotDate = dossier.createdAt ? new Date(dossier.createdAt).toLocaleDateString('fr-FR') : '-';
  const today = new Date().toLocaleDateString('fr-FR');
  const pctPart = Math.round((pct / 100) * (dossier.amountHT || 0));
  const montant = commission.toLocaleString('fr-FR');

  function downloadPdf() {
    const w = window.open('', '_blank'); if (!w) { alert('Autorisez les pop-up pour télécharger la facture.'); return; }
    const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Facture ${esc(num)}</title>
    <style>
      @page{size:A4;margin:0} *{box-sizing:border-box}
      body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1D1D1F;margin:0}
      .sheet{width:210mm;min-height:297mm;padding:20mm 18mm;margin:0 auto;position:relative}
      .row{display:flex;justify-content:space-between;align-items:flex-start}
      .muted{color:#6e6e73} .lbl{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#86868B;font-weight:700}
      h1{font-size:26px;margin:2px 0 0;letter-spacing:-.5px} .brand{font-weight:800;font-size:16px}
      .meta{margin-top:6px;font-size:12px}
      .parties{display:flex;gap:24px;margin-top:28px;font-size:12.5px}
      .parties>div{flex:1} .parties .name{font-weight:700;margin-top:4px}
      table{width:100%;border-collapse:collapse;margin-top:28px;font-size:12.5px}
      th{text-align:left;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#86868B;border-bottom:1px solid #1D1D1F;padding:0 0 8px}
      th.r,td.r{text-align:right} td{padding:12px 0;border-bottom:1px solid #eee;vertical-align:top}
      .tot{display:flex;justify-content:flex-end;margin-top:14px}
      .tot table{width:auto;min-width:55%;margin:0} .tot td{border:none;padding:4px 0}
      .tot .grand td{border-top:2px solid #1D1D1F;padding-top:10px;font-weight:800;font-size:15px}
      .rib{margin-top:26px;border:1px solid #eee;border-radius:8px;padding:12px 14px;font-size:12px}
      .foot{position:absolute;left:18mm;right:18mm;bottom:14mm;border-top:1px solid #eee;padding-top:10px;font-size:9.5px;color:#86868B;text-align:center}
      @media print{.noprint{display:none}}
    </style></head><body>
    <div class="sheet">
      <div class="row">
        <div><p class="lbl">Facture</p><h1>${esc(num)}</h1><div class="meta muted">Date : ${esc(today)}<br>Réf. dossier : ${esc(refDossier)} · déposé le ${esc(depotDate)}</div></div>
        <div style="text-align:right"><div class="brand">DELIVERY Digital</div><div class="meta muted">Apport d'affaires · OPCO</div></div>
      </div>
      <div class="parties">
        <div><p class="lbl">Émetteur</p><p class="name">${esc(emetteur)}</p><p class="muted">${ci.regNumber ? 'SIRET ' + esc(ci.regNumber) : ''}</p><p class="muted">${esc(emetteurAddr)}</p></div>
        <div><p class="lbl">Destinataire</p><p class="name">Delivery Digital Nice</p><p class="muted">SIRET 90294519500029</p><p class="muted">470 promenade des Anglais, 06200 Nice</p></div>
      </div>
      <table>
        <thead><tr><th>Désignation</th><th class="r">Qté</th><th class="r">Montant</th></tr></thead>
        <tbody>
          <tr><td>Commission d'apport d'affaires - dossier <b>${esc(dossier.denom || 'Client')}</b><br><span class="muted">${esc(dossier.formationTitle || '')} · forfait ${fix} € + ${pct}% (${pctPart} €)</span></td><td class="r">1</td><td class="r">${montant} €</td></tr>
        </tbody>
      </table>
      <div class="tot"><table>
        <tr><td class="muted">Total HT</td><td class="r">${montant} €</td></tr>
        <tr><td class="muted">TVA (non applicable)</td><td class="r">0 €</td></tr>
        <tr class="grand"><td>Total à régler TTC</td><td class="r">${montant} €</td></tr>
      </table></div>
      <div class="rib"><p class="lbl">Coordonnées de virement</p><p>${esc(agency.accountHolder || emetteur)}</p><p style="font-family:monospace">${esc(agency.iban || '(IBAN non renseigné)')} ${agency.bic ? '· ' + esc(agency.bic) : ''}</p></div>
      <p style="margin-top:16px;font-size:11px" class="muted">TVA non applicable - art. 261-4-4° / 293 B du CGI. Règlement par virement à réception.</p>
      <div class="foot">${esc(emetteur)}${ci.regNumber ? ' · SIRET ' + esc(ci.regNumber) : ''}${emetteurAddr ? ' · ' + esc(emetteurAddr) : ''} - Facture générée via l'espace partenaire Delivery Digital.</div>
    </div>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
    </body></html>`);
    w.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-[820px] my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-[13px] font-semibold inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> Ordre d&apos;encaissement - votre facture</p>
          <button onClick={onClose} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"><X className="h-4 w-4" /></button>
        </div>
        {/* Feuille A4 (ratio 1:1.414) */}
        <div className="bg-white text-[#1D1D1F] rounded-md shadow-2xl mx-auto w-full max-w-[794px] aspect-[1/1.414] overflow-hidden relative">
          <div className="px-12 py-14 h-full flex flex-col">
            <div className="flex items-start justify-between">
              <div><p className="text-[9px] uppercase tracking-[0.18em] text-[#86868B] font-bold">Facture</p><h1 className="text-[26px] font-extrabold tracking-tight mt-0.5">{num}</h1><p className="text-[11.5px] text-[#6e6e73] mt-1.5">Date : {today}<br />Réf. dossier : <span className="font-mono">{refDossier}</span> · déposé le {depotDate}</p></div>
              <div className="text-right"><img src={LOGO_URL} alt="Delivery Digital" className="h-9 w-auto ml-auto" /><p className="text-[11px] text-[#86868B] mt-1">Apport d&apos;affaires · OPCO</p></div>
            </div>
            <div className="flex gap-6 mt-8 text-[12.5px]">
              <div className="flex-1"><p className="text-[9px] uppercase tracking-[0.16em] text-[#86868B] font-bold">Émetteur</p><p className="font-semibold mt-1">{emetteur}</p>{ci.regNumber && <p className="text-[#6e6e73]">SIRET {ci.regNumber}</p>}{emetteurAddr && <p className="text-[#6e6e73]">{emetteurAddr}</p>}</div>
              <div className="flex-1"><p className="text-[9px] uppercase tracking-[0.16em] text-[#86868B] font-bold">Destinataire</p><p className="font-semibold mt-1">Delivery Digital Nice</p><p className="text-[#6e6e73]">SIRET 90294519500029</p><p className="text-[#6e6e73]">470 promenade des Anglais, 06200 Nice</p></div>
            </div>
            <table className="w-full text-[12.5px] mt-8">
              <thead><tr className="text-[#86868B] text-[9px] uppercase tracking-[0.12em]"><th className="text-left border-b-2 border-[#1D1D1F] pb-2">Désignation</th><th className="text-right border-b-2 border-[#1D1D1F] pb-2">Qté</th><th className="text-right border-b-2 border-[#1D1D1F] pb-2">Montant</th></tr></thead>
              <tbody>
                <tr className="border-b border-black/[0.06]"><td className="py-3 align-top">Commission d&apos;apport d&apos;affaires - dossier <strong>{dossier.denom || 'Client'}</strong><br /><span className="text-[#86868B] text-[11px]">{dossier.formationTitle} · forfait {fix} € + {pct}% ({pctPart} €)</span></td><td className="py-3 text-right align-top">1</td><td className="py-3 text-right align-top font-semibold">{montant} €</td></tr>
              </tbody>
            </table>
            <div className="flex justify-end mt-3.5">
              <table className="text-[12.5px] min-w-[55%]">
                <tbody>
                  <tr><td className="text-[#6e6e73] py-1">Total HT</td><td className="text-right py-1">{montant} €</td></tr>
                  <tr><td className="text-[#6e6e73] py-1">TVA (non applicable)</td><td className="text-right py-1">0 €</td></tr>
                  <tr><td className="border-t-2 border-[#1D1D1F] pt-2.5 font-extrabold text-[15px]">Total à régler TTC</td><td className="border-t-2 border-[#1D1D1F] pt-2.5 text-right font-extrabold text-[15px]">{montant} €</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-7 rounded-lg border border-black/[0.08] p-3.5 text-[12px]">
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#86868B] font-bold">Coordonnées de virement</p>
              <p className="mt-1">{agency.accountHolder || emetteur}</p>
              <p className="font-mono">{agency.iban || '(IBAN non renseigné)'} {agency.bic ? `· ${agency.bic}` : ''}</p>
            </div>
            <p className="text-[11px] text-[#86868B] mt-3">TVA non applicable - art. 261-4-4° / 293 B du CGI. Règlement par virement à réception.</p>
            <div className="mt-auto pt-4 border-t border-black/[0.06] text-center text-[9.5px] text-[#86868B]">{emetteur}{ci.regNumber ? ` · SIRET ${ci.regNumber}` : ''}{emetteurAddr ? ` · ${emetteurAddr}` : ''} - Facture générée via l&apos;espace partenaire Delivery Digital.</div>
          </div>
        </div>
        <div className="mt-3 bg-[#181A20] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-white/50">Delivery Digital reçoit cette facture et procède au virement, puis marque le dossier « Payé ».</p>
          <div className="flex items-center gap-2">
            <button onClick={downloadPdf} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[12.5px] font-semibold"><Download className="h-3.5 w-3.5" /> Télécharger (PDF)</button>
            <button onClick={onSend} disabled={sending || !agency.iban} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#3DD68C] text-black text-[12.5px] font-semibold hover:brightness-110 disabled:opacity-60">{sending ? 'Envoi…' : "Envoyer l'ordre d'encaissement"}</button>
          </div>
        </div>
        {!agency.iban && <p className="text-[11.5px] text-[#E5B567] mt-2 text-right">Renseignez votre RIB (section Coordonnées bancaires) avant d&apos;envoyer.</p>}
      </div>
    </div>
  );
}

// Frise de suivi du dossier OPCO (pipeline) par client.
// d peut être null : client "Non monté" -> on affiche quand même la timeline (tout à venir,
// étape 0) pour que l'agence voie le parcours avant de monter le dossier. @Rabah 2026-07-02
function DossierTimeline({ d, accessStatus, onAccess, onRattachInfo }: { d: Dossier | null; accessStatus?: string; onAccess?: () => void; onRattachInfo?: () => void }) {
  const cur = d ? (DOSSIER_META[d.status]?.step ?? 1) : 0;
  const fmt = (s?: string) => s ? new Date(s).toLocaleDateString('fr-FR') : '';
  const depot = fmt(d?.createdAt);
  const maj = fmt(d?.updatedAt);
  const start = fmt(d?.sessionStart);
  const end = fmt(d?.sessionEnd);
  const accessDone = accessStatus === 'received';
  // Demande de rattachement OPCO effectuée par DD (courrier d'activation envoyé au client) : info
  // remontée sur l'étape "Accès OPCO" pour que l'agence voie que c'est pris en charge. @Rabah 2026-06-24
  const rattachSent = !!d?.aktoAttached;
  type Node = { label: string; resp: 'Agence' | 'DDN'; sub?: string; done: boolean; active: boolean; action?: () => void };
  const nodes: Node[] = [
    { label: 'Transmis', resp: 'Agence', sub: depot, done: cur >= 1, active: cur === 1 },
    // Accès OPCO : soit le client a ses identifiants (accès reçus par DD), soit DD a fait la
    // demande de rattachement -> courrier d'activation envoyé (cliquable pour voir la confirmation).
    {
      label: 'Accès OPCO', resp: 'Agence',
      sub: accessDone ? 'Reçus par DD' : rattachSent ? 'Rattachement · courrier envoyé' : accessStatus === 'pending' ? 'Validation demandée au client' : 'À faire valider par le client',
      done: accessDone, active: !accessDone && cur >= 1,
      action: rattachSent ? onRattachInfo : (!accessDone ? onAccess : undefined),
    },
    // Montage OPCO (DD) : montage du dossier par Delivery Digital + éventuelle attente du CSV des
    // salariés. Lecture seule côté agence. @author Rabah Ziane - 2026-06-24
    {
      label: 'Montage OPCO', resp: 'DDN',
      sub: cur >= 2 ? 'Dossier monté' : d?.salariesPending ? 'En attente CSV salariés' : cur === 0 ? 'À monter' : 'Pris en charge par DD',
      done: cur >= 2, active: cur < 2 && cur >= 1,
    },
    ...(['instruction', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid'] as const).map((k) => {
      const m = DOSSIER_META[k];
      const sub = k === 'scheduled' ? (start ? 'Début : ' + start : (d?.sessionName || '')) : k === 'completed' ? (end ? 'Fin : ' + end : '') : (k === 'paid' && d?.status === 'paid') ? maj : '';
      return { label: m.label, resp: 'DDN' as const, sub, done: m.step <= cur, active: m.step === cur };
    }),
  ];
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-start min-w-[920px] px-1">
        {nodes.map((n, i) => {
          const clickable = !!n.action;
          const Inner = (
            <>
              <span className={`relative z-10 h-[18px] w-[18px] rounded-full border-2 grid place-items-center ${n.active ? 'bg-[#0066CC] border-[#0066CC]' : n.done ? 'bg-[#3DD68C] border-[#3DD68C]' : 'bg-[#181A20] border-white/25'} ${clickable ? 'ring-2 ring-[#0066CC]/40' : ''}`}>{n.done && !n.active && <span className="text-black text-[9px] leading-none">✓</span>}</span>
              <p className={`text-[10px] mt-1.5 leading-tight ${n.active ? 'text-white font-bold' : n.done ? 'text-white/75' : 'text-white/35'}`}>{n.label}</p>
              <span className={`mt-1 inline-block px-1.5 py-[1px] rounded text-[8.5px] font-semibold ${n.resp === 'Agence' ? 'bg-[#0066CC]/15 text-[#4da3ff]' : 'bg-white/10 text-white/55'}`}>{n.resp === 'Agence' ? 'Action agence' : 'Action DDN'}</span>
              {n.sub && <span className={`mt-1 inline-block px-2 py-0.5 rounded-lg border text-[9.5px] leading-snug max-w-[108px] ${clickable ? 'bg-[#0066CC] border-[#0066CC] text-white font-semibold' : 'bg-white/5 border-white/10 text-white/55'}`}>{clickable ? n.sub + ' ›' : n.sub}</span>}
            </>
          );
          return (
            <div key={i} className="flex-1 flex flex-col items-center text-center relative px-1">
              {i < nodes.length - 1 && <span className={`absolute top-[8px] left-1/2 right-[-50%] border-t-2 border-dashed ${n.done ? 'border-[#3DD68C]/50' : 'border-white/15'}`} />}
              {clickable
                ? <button onClick={n.action} title="Cliquez pour lancer cette action" className="flex flex-col items-center text-center group cursor-pointer">{Inner}</button>
                : Inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent, suffix, onClick }: { icon: React.ReactNode; label: string; value: number; accent: string; suffix?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} className={`rounded-2xl bg-[#181A20] border border-white/10 p-4 transition ${onClick ? 'cursor-pointer hover:border-white/25 hover:bg-[#1d2027] active:scale-[0.99]' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider font-bold text-white/40">{label}</p>
        <span className="inline-flex h-9 w-9 rounded-[12px] items-center justify-center ring-1 ring-inset ring-white/10" style={{ background: `${accent}1f`, color: accent }}>{icon}</span>
      </div>
      <p className="text-[28px] font-bold leading-none mt-2">{value.toLocaleString('fr-FR')}{suffix || ''}</p>
      {onClick && <p className="text-[11px] text-white/30 mt-2 inline-flex items-center gap-1">Voir le détail ›</p>}
    </div>
  );
}

/* ============================================================================
 * Services informatiques : devis IT revendus par l'agence (moteur QuickQuote).
 * L'agence crée un devis depuis le catalogue, l'envoie au client (lien /devis/:token),
 * le client accepte/signe en ligne. Commission identique aux dossiers OPCO (fix + %).
 * @author Rabah Ziane · 2026-06-21
 * ========================================================================== */
type CatalogItem = { id: string; category: string; label: string; defaultPrice: number; unit: string; description?: string };
type QuoteLine = { description: string; details?: string; quantity: number; unit: string; unitPrice: number };
type ITQuote = {
  _id: string; ref?: string; status: string; title?: string; publicToken?: string;
  client?: { name?: string; email?: string; company?: string; phone?: string; address?: string; siret?: string };
  lines?: QuoteLine[]; total?: number; totalTTC?: number; taxRate?: number; currency?: string;
  discountType?: 'none' | 'percent' | 'amount'; discountValue?: number; discountAmount?: number;
  commercialName?: string; createdAt?: string; sentAt?: string; acceptedAt?: string;
  acceptance?: { signerName?: string; signerEmail?: string; signedAt?: string };
  invoice?: { ref?: string; sentAt?: string; amount?: number };
  agencyCommission?: { clientPaid?: boolean; clientPaidAt?: string; encashRequestedAt?: string; paidAt?: string; invoiceNumber?: string };
};
const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-white/10 text-white/60' },
  sent: { label: 'Envoyé', cls: 'bg-[#0066CC]/15 text-[#7FB3FF]' },
  viewed: { label: 'Vu par le client', cls: 'bg-[#A78BFA]/15 text-[#A78BFA]' },
  accepted: { label: 'Accepté ✓', cls: 'bg-[#3DD68C]/15 text-[#3DD68C]' },
  rejected: { label: 'Refusé', cls: 'bg-[#FF6B6B]/15 text-[#FF6B6B]' },
  expired: { label: 'Expiré', cls: 'bg-white/10 text-white/40' },
};

function DevisITSection({ auth, authJson, isOwner, fix, pct }: { auth: () => any; authJson: () => any; isOwner: boolean; fix: number; pct: number }) {
  const [quotes, setQuotes] = useState<ITQuote[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [builder, setBuilder] = useState<ITQuote | 'new' | null>(null);
  const [showArgs, setShowArgs] = useState(false);
  const load = useCallback(async () => {
    const j = await fetch('/api/agency/quotes', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
    setQuotes(j.items || []);
  }, [auth]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch('/api/agency/quotes/catalog', { headers: auth() }).then((r) => r.json()).then((j) => setCatalog(j.catalog || [])).catch(() => {}); }, [auth]);

  const euro = (n: number, c = 'EUR') => (n || 0).toLocaleString('fr-FR') + ' ' + (c === 'EUR' ? '€' : c);
  // Commission services informatiques : frais fixes + 20 % du HT (la formation est à 15 %).
  const commissionOf = (q: ITQuote) => Math.round((fix || 0) + (IT_COMMISSION_PCT / 100) * (q.total || 0));
  const [encashing, setEncashing] = useState<string | null>(null);
  // L'agence demande l'encaissement de sa commission une fois que DD a encaissé le client. @Rabah 2026-06-23
  const encash = async (q: ITQuote) => {
    if (!confirm(`Demander l'encaissement de votre commission (${euro(commissionOf(q))}) pour le devis ${q.ref} ?`)) return;
    setEncashing(q._id);
    try {
      const r = await fetch(`/api/agency/quotes/${q._id}/encash`, { method: 'POST', headers: authJson() }).then((x) => x.json());
      if (r.error) { alert('Erreur : ' + r.error); return; }
      alert("Demande d'encaissement envoyée à Delivery Digital ✓");
      load();
    } finally { setEncashing(null); }
  };

  return (
    <section className="rounded-2xl bg-[#181A20] border border-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 rounded-xl bg-[#0066CC]/15 items-center justify-center"><Cpu className="h-5 w-5 text-[#7FB3FF]" /></span>
          <div>
            <h2 className="text-[15px] font-bold">Services informatiques</h2>
            <p className="text-[12px] text-white/50">Revendez sites web, apps, logiciels, SEO, IA… Créez un devis et envoyez-le au client en un clic.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowArgs((v) => !v)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12.5px]">{showArgs ? 'Masquer' : 'Arguments de vente'}</button>
          <button onClick={() => setBuilder('new')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED]"><Plus className="h-3.5 w-3.5" /> Nouveau devis</button>
        </div>
      </div>

      {isOwner && <div className="px-5 py-2.5 bg-[#3DD68C]/[0.06] border-b border-white/10 text-[12px] text-[#3DD68C]">Commission services IT : <strong>{(fix || 0).toLocaleString('fr-FR')} € + {IT_COMMISSION_PCT}%</strong> du montant HT. Frais fixes versés à la signature, pourcentage au 2ème acompte du client.</div>}

      {showArgs && <ITSalesArguments />}

      {/* Liste des devis */}
      {!quotes ? (
        <div className="px-5 py-10 text-center text-white/40"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : quotes.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13px] text-white/40">Aucun devis pour l'instant. Cliquez sur « Nouveau devis » pour proposer un service informatique à un client.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-white/40 text-[10px] uppercase tracking-wider"><tr className="border-b border-white/5"><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Devis</th><th className="text-left px-5 py-2.5">Montant</th><th className="text-left px-5 py-2.5">Statut</th>{isOwner && <th className="text-left px-5 py-2.5">Commission</th>}<th className="text-right px-5 py-2.5">Actions</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {quotes.map((q) => {
                const sm = QUOTE_STATUS[q.status] || QUOTE_STATUS.draft;
                const link = q.publicToken ? `https://deliverydigital.fr/devis/${q.publicToken}` : '';
                return (
                  <tr key={q._id} className="hover:bg-white/[0.02] align-top">
                    <td className="px-5 py-3"><p className="font-semibold">{q.client?.name || 'Client'}</p><p className="text-white/40 text-[11.5px]">{q.client?.company || q.client?.email || ''}</p>{!isOwner && q.commercialName && <p className="text-white/30 text-[10.5px]">{q.commercialName}</p>}</td>
                    <td className="px-5 py-3"><p className="font-mono text-[11.5px] text-white/70">{q.ref || '-'}</p><p className="text-white/40 text-[11px]">{q.title}</p></td>
                    <td className="px-5 py-3"><p className="font-semibold">{euro(q.total || 0, q.currency)}</p><p className="text-white/40 text-[10.5px]">{euro(q.totalTTC || 0, q.currency)} TTC</p></td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] ${sm.cls}`}>{sm.label}</span>
                      {q.status === 'accepted' && q.acceptance?.signedAt && <p className="text-[10px] text-[#3DD68C] mt-1">✍ Signé le {new Date(q.acceptance.signedAt).toLocaleDateString('fr-FR')}{q.acceptance.signerName ? ` · ${q.acceptance.signerName}` : ''}</p>}
                      {q.invoice?.sentAt && <p className="text-[10px] text-white/45 mt-0.5">Facture d'acompte envoyée le {new Date(q.invoice.sentAt).toLocaleDateString('fr-FR')}</p>}
                    </td>
                    {isOwner && <td className="px-5 py-3">
                      {q.status === 'accepted' ? (
                        <div>
                          <span className="text-[#3DD68C] font-semibold">{euro(commissionOf(q))}</span>
                          {q.agencyCommission?.paidAt ? (
                            <p className="text-[10px] text-[#3DD68C] mt-1">✓ Versée le {new Date(q.agencyCommission.paidAt).toLocaleDateString('fr-FR')}</p>
                          ) : q.agencyCommission?.encashRequestedAt ? (
                            <p className="text-[10px] text-[#E5B567] mt-1">Encaissement demandé…</p>
                          ) : q.agencyCommission?.clientPaid ? (
                            <button onClick={() => encash(q)} disabled={encashing === q._id} className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#3DD68C] text-black text-[11px] font-semibold hover:brightness-110 disabled:opacity-60">{encashing === q._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />} Encaisser</button>
                          ) : (
                            <p className="text-[10px] text-white/35 mt-1">En attente du règlement client</p>
                          )}
                        </div>
                      ) : <span className="text-white/30">-</span>}
                    </td>}
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {(q.status === 'draft' || q.status === 'sent') && <button onClick={() => setBuilder(q)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] mr-1.5"><PenLine className="h-3 w-3" /> Modifier</button>}
                      {link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] mr-1.5"><ExternalLink className="h-3 w-3" /> Voir</a>}
                      {link && <button onClick={() => { navigator.clipboard?.writeText(link); alert('Lien du devis copié.'); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[11px]"><Copy className="h-3 w-3" /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {builder && <ITQuoteBuilder initial={builder === 'new' ? null : builder} catalog={catalog} authJson={authJson} onClose={() => setBuilder(null)} onSaved={() => { setBuilder(null); load(); }} />}
    </section>
  );
}

// Arguments de vente services informatiques (à reprendre face au client).
function ITSalesArguments() {
  const piliers = [
    { t: 'Sur mesure, pas de template', p: ['Code propriétaire 100% adapté au métier du client', 'Pas d\'abonnement SaaS bloquant, le client est propriétaire', 'Évolutif : on ajoute des fonctions au fil de l\'eau'] },
    { t: 'Stack moderne & rapide', p: ['React / Node / Cloud AWS, performances et SEO au top', 'Paiement en ligne (Stripe, Apple/Google Pay) intégré', 'Sécurité et sauvegardes incluses'] },
    { t: 'IA intégrée', p: ['Chatbot Claude, recherche documentaire (RAG), OCR/Vision', 'Automatisation de tâches répétitives', 'Avantage concurrentiel concret pour le client'] },
    { t: 'Financement & crédit d\'impôt', p: ['Projets innovants éligibles au Crédit Impôt Innovation (20%)', 'Paiement en plusieurs fois (acompte + solde)', 'Devis clair, facture d\'acompte automatique'] },
  ];
  const pitch = `Delivery Digital développe des solutions informatiques sur mesure : sites web, e-commerce, applications mobiles, logiciels métier (CRM/ERP), SEO, et intégrations IA.

Pourquoi nous :
- Sur mesure, code propriétaire, le client reste propriétaire (pas d'abonnement bloquant)
- Stack moderne (React/Node/Cloud), paiement en ligne intégré, sécurité incluse
- IA intégrée (chatbot, RAG, OCR) pour un vrai avantage concurrentiel
- Projets innovants éligibles au Crédit Impôt Innovation (20%), paiement en plusieurs fois`;
  return (
    <div className="px-5 py-4 bg-white/[0.02] border-b border-white/10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-bold inline-flex items-center gap-1.5"><Cpu className="h-4 w-4 text-[#7FB3FF]" /> Arguments de vente - services informatiques</h3>
        <button onClick={() => { navigator.clipboard?.writeText(pitch); alert('Pitch copié - prêt à coller dans un email ou un message au client.'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px]"><Copy className="h-3.5 w-3.5" /> Copier le pitch</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {piliers.map((pi) => (
          <div key={pi.t} className="rounded-xl bg-[#0E0F13] border border-white/10 p-3.5">
            <p className="text-[13px] font-semibold mb-1.5">{pi.t}</p>
            <ul className="space-y-1">{pi.p.map((x) => <li key={x} className="text-[12px] text-white/60 flex gap-1.5"><span className="text-[#3DD68C]">✓</span>{x}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// Constructeur de devis IT (création / édition) - réutilise le catalogue serveur.
function ITQuoteBuilder({ initial, catalog, authJson, onClose, onSaved }: { initial: ITQuote | null; catalog: CatalogItem[]; authJson: () => any; onClose: () => void; onSaved: () => void }) {
  const [client, setClient] = useState({ name: '', email: '', company: '', phone: '', address: '', siret: '', ...(initial?.client || {}) });
  const [title, setTitle] = useState(initial?.title || 'Devis services informatiques');
  const [taxRate, setTaxRate] = useState(initial?.taxRate != null ? initial.taxRate : 20);
  // Remise : pourcentage ou montant fixe, comme le super admin DD. @Rabah 2026-06-23
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'amount'>((initial as any)?.discountType || 'none');
  const [discountValue, setDiscountValue] = useState<number>((initial as any)?.discountValue || 0);
  const [lines, setLines] = useState<QuoteLine[]>(initial?.lines?.length ? initial.lines.map((l) => ({ description: l.description, details: l.details || '', quantity: l.quantity || 1, unit: l.unit || 'forfait', unitPrice: l.unitPrice || 0 })) : []);
  const [autoSendInvoice, setAutoSendInvoice] = useState(initial ? (initial as any).autoSendInvoice !== false : true);
  const [pickCat, setPickCat] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Assistance "retrouver un client par SIRET" : clients déjà connus de l'agence + annuaire entreprises. @Rabah 2026-06-23
  const [leads, setLeads] = useState<Lead[]>([]);
  const [siretMsg, setSiretMsg] = useState('');
  const [siretBusy, setSiretBusy] = useState(false);

  // Charge une fois la liste des clients de l'agence (pour reconnaître un SIRET déjà saisi).
  useEffect(() => {
    let on = true;
    fetch('/api/agency/self/leads', { headers: authJson() }).then((r) => r.json()).then((j) => { if (on) setLeads(j?.leads || []); }).catch(() => {});
    return () => { on = false; };
  }, []);

  // À la saisie d'un SIRET (9 ou 14 chiffres) : 1) si c'est un client déjà connu de l'agence on
  // pré-remplit depuis sa fiche ; 2) sinon on interroge l'annuaire des entreprises (raison sociale +
  // adresse). Les champs restent modifiables. Même API que la création de lead. @Rabah 2026-06-23
  useEffect(() => {
    const raw = (client.siret || '').replace(/\D/g, '');
    if (raw.length !== 9 && raw.length !== 14) { setSiretMsg(''); return; }
    const norm = (s?: string) => (s || '').replace(/\D/g, '');
    const t = setTimeout(async () => {
      setSiretBusy(true);
      try {
        const lead = leads.find((l) => norm(l.siret) && norm(l.siret).slice(0, 9) === raw.slice(0, 9));
        if (lead) {
          setClient((cl) => ({ ...cl, company: cl.company || lead.denom || '', email: cl.email || lead.email || '', address: cl.address || lead.addr || '' }));
          setSiretMsg(`Client existant : ${lead.denom || lead.email || 'trouvé'} - infos pré-remplies.`);
          return;
        }
        const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${raw}&limite=1`);
        const j = await r.json();
        const res = (j?.results || [])[0];
        if (!res) { setSiretMsg('SIRET introuvable - saisie manuelle.'); return; }
        const m = (res.matching_etablissements || [])[0] || res.siege || {};
        const found = String(res.nom_complet || res.denomination || '');
        const sg = res.siege || {};
        const cp = sg.code_postal || m.code_postal || '';
        const ville = sg.commune || sg.libelle_commune || m.libelle_commune || m.commune || '';
        const voie = String(sg.adresse || m.adresse || [m.numero_voie, m.type_voie, m.libelle_voie].filter(Boolean).join(' ') || '').replace(/\s+/g, ' ').trim();
        const addr = [voie, [cp, ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
        setClient((cl) => ({ ...cl, company: cl.company || found, address: cl.address || addr }));
        setSiretMsg(found ? `Entreprise trouvée : ${found}` : 'SIRET reconnu.');
      } catch { setSiretMsg(''); } finally { setSiretBusy(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [client.siret, leads]);

  const inp = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]';
  const setLine = (i: number, k: keyof QuoteLine, v: any) => setLines((arr) => arr.map((l, j) => j === i ? { ...l, [k]: v } : l));
  const rmLine = (i: number) => setLines((arr) => arr.filter((_, j) => j !== i));
  const addCustom = () => setLines((arr) => [...arr, { description: '', details: '', quantity: 1, unit: 'forfait', unitPrice: 0 }]);
  const addFromCatalog = (id: string) => {
    const it = catalog.find((c) => c.id === id); if (!it) return;
    setLines((arr) => [...arr, { description: it.label, details: it.description || '', quantity: 1, unit: it.unit || 'forfait', unitPrice: it.defaultPrice || 0 }]);
    setPickCat('');
  };
  const subtotal = lines.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0);
  const discountAmount = discountType === 'percent' ? Math.round(subtotal * ((discountValue || 0) / 100)) : discountType === 'amount' ? Math.min(discountValue || 0, subtotal) : 0;
  const afterDiscount = subtotal - discountAmount;
  const tax = Math.round(afterDiscount * (taxRate / 100));
  const ttc = afterDiscount + tax;
  const euro = (n: number) => (n || 0).toLocaleString('fr-FR') + ' €';

  const save = async (thenSend: boolean) => {
    setErr('');
    if (!client.name?.trim() || !client.email?.trim()) { setErr('Nom et email du client requis.'); return; }
    if (lines.length === 0 || lines.some((l) => !l.description?.trim())) { setErr('Ajoutez au moins une ligne (avec une description).'); return; }
    setBusy(true);
    try {
      const body = { client, title, taxRate, lines, autoSendInvoice, discountType, discountValue };
      let id = initial?._id;
      if (id) {
        await fetch(`/api/agency/quotes/${id}`, { method: 'PATCH', headers: authJson(), body: JSON.stringify(body) });
      } else {
        const j = await fetch('/api/agency/quotes', { method: 'POST', headers: authJson(), body: JSON.stringify(body) }).then((r) => r.json());
        if (j.error) { setErr(j.error); setBusy(false); return; }
        id = j.item?._id;
      }
      if (thenSend && id) {
        const s = await fetch(`/api/agency/quotes/${id}/send`, { method: 'POST', headers: authJson(), body: '{}' }).then((r) => r.json());
        if (s.error) { setErr('Devis enregistré mais envoi impossible : ' + s.error); setBusy(false); return; }
        alert('Devis envoyé au client ✓');
      }
      onSaved();
    } finally { setBusy(false); }
  };

  const cats = [...new Set(catalog.map((c) => c.category))];
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl my-8 bg-[#181A20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-[15px] font-bold">{initial ? 'Modifier le devis' : 'Nouveau devis - services informatiques'}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-white/10 inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Client */}
          <div>
            <input className={inp} inputMode="numeric" placeholder="SIRET du client (recherche auto : société + adresse)" value={client.siret || ''} onChange={(e) => setClient({ ...client, siret: e.target.value })} />
            {(siretBusy || siretMsg) && <p className={`text-[11px] mt-1 ${siretMsg.startsWith('Client existant') ? 'text-[#3DD68C]' : 'text-white/50'}`}>{siretBusy ? 'Recherche…' : siretMsg}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={inp} placeholder="Nom du client *" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
            <input className={inp} type="email" placeholder="Email du client *" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
            <input className={inp} placeholder="Société" value={client.company} onChange={(e) => setClient({ ...client, company: e.target.value })} />
            <input className={inp} placeholder="Téléphone" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
          </div>
          <input className={inp} placeholder="Titre du devis" value={title} onChange={(e) => setTitle(e.target.value)} />

          {/* Lignes */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <p className="text-[12px] font-bold uppercase tracking-wider text-white/45">Prestations</p>
              <div className="flex items-center gap-2">
                <select value={pickCat} onChange={(e) => addFromCatalog(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[12px] text-white focus:outline-none max-w-[260px]">
                  <option value="">+ Ajouter depuis le catalogue…</option>
                  {cats.map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {catalog.filter((c) => c.category === cat).map((c) => <option key={c.id} value={c.id}>{c.label} - {c.defaultPrice}€</option>)}
                    </optgroup>
                  ))}
                </select>
                <button onClick={addCustom} className="inline-flex items-center gap-1 text-[12px] text-[#7FB3FF] font-semibold"><Plus className="h-3.5 w-3.5" /> Ligne libre</button>
              </div>
            </div>
            {lines.length === 0 ? <p className="text-[12.5px] text-white/40 py-3">Ajoutez des prestations depuis le catalogue ou en lignes libres.</p> : (
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="rounded-xl bg-[#0E0F13] border border-white/10 p-2.5">
                    <div className="flex gap-2 items-start">
                      <input className={inp} placeholder="Description *" value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} />
                      <button onClick={() => rmLine(i)} className="text-[#FF6B6B] hover:bg-[#FF6B6B]/10 rounded p-2 mt-0.5" title="Retirer"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <input className={`${inp} mt-2`} placeholder="Détails (optionnel)" value={l.details} onChange={(e) => setLine(i, 'details', e.target.value)} />
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div><span className="text-[10px] text-white/40">Quantité</span><input type="number" className={inp} value={l.quantity} onChange={(e) => setLine(i, 'quantity', Number(e.target.value))} /></div>
                      <div><span className="text-[10px] text-white/40">Unité</span><input className={inp} value={l.unit} onChange={(e) => setLine(i, 'unit', e.target.value)} /></div>
                      <div><span className="text-[10px] text-white/40">Prix HT (€)</span><input type="number" className={inp} value={l.unitPrice} onChange={(e) => setLine(i, 'unitPrice', Number(e.target.value))} /></div>
                    </div>
                    <p className="text-[11px] text-white/45 mt-1.5 text-right">Sous-total ligne : {euro((l.quantity || 0) * (l.unitPrice || 0))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remise : pourcentage ou montant fixe (comme le super admin DD) */}
          <div className="rounded-xl bg-[#0E0F13] border border-white/10 p-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-white/60 mr-1">Remise</span>
              {([['none', 'Aucune'], ['percent', 'Pourcentage'], ['amount', 'Montant fixe']] as const).map(([v, lab]) => (
                <button key={v} type="button" onClick={() => { setDiscountType(v); if (v === 'none') setDiscountValue(0); }} className={`px-3 py-1.5 rounded-full text-[12px] font-medium ${discountType === v ? 'bg-white text-[#0E0F13]' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'}`}>{lab}</button>
              ))}
              {discountType !== 'none' && (
                <span className="inline-flex items-center gap-1.5 ml-1">
                  <input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} placeholder={discountType === 'percent' ? 'ex : 10' : 'ex : 500'} className="w-24 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white focus:outline-none focus:border-[#0066CC]" />
                  <span className="text-[12px] text-white/50">{discountType === 'percent' ? '%' : '€'}</span>
                </span>
              )}
            </div>
            {discountAmount > 0 && <p className="text-[11.5px] text-[#3DD68C] mt-2 text-right">Remise appliquée : -{euro(discountAmount)}{discountType === 'percent' ? ` (${discountValue}%)` : ''} → HT après remise : {euro(afterDiscount)}</p>}
          </div>

          {/* Totaux + TVA */}
          <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-[#0E0F13] border border-white/10 p-3.5">
            <label className="text-[12px] text-white/60 inline-flex items-center gap-2">TVA % <input type="number" className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white focus:outline-none" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} /></label>
            <div className="text-right text-[13px]">{discountAmount > 0 && <p className="text-white/35 text-[11.5px]">Sous-total : {euro(subtotal)}</p>}<p className="text-white/60">Total HT{discountAmount > 0 ? ' (après remise)' : ''} : <strong className="text-white">{euro(afterDiscount)}</strong></p><p className="text-white/40 text-[12px]">TVA : {euro(tax)} · <strong className="text-white">TTC {euro(ttc)}</strong></p></div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={autoSendInvoice} onChange={(e) => setAutoSendInvoice(e.target.checked)} className="w-4 h-4 accent-[#0066CC]" />
            <span className="text-[12.5px] text-white/70">Envoyer automatiquement la facture d'acompte au client après acceptation</span>
          </label>

          {err && <p className="text-[12.5px] text-[#FF6B6B]">{err}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-white/10 text-[12.5px] text-white/70">Annuler</button>
          <button onClick={() => save(false)} disabled={busy} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-[12.5px] font-semibold disabled:opacity-60">{busy ? '…' : 'Enregistrer'}</button>
          <button onClick={() => save(true)} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enregistrer & envoyer</button>
        </div>
      </div>
    </div>
  );
}
