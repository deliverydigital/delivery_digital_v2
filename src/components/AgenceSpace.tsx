import { useEffect, useState, useCallback, Fragment } from 'react';
import { Building2, Loader2, LogOut, Copy, Eye, EyeOff, KeyRound, Plus, FileText, ShieldCheck, Users, FolderCheck, Search, Wallet, X, Stamp, PenLine, Download, ExternalLink, Clock, Mail, Send, CheckCircle2, ArrowRight, Inbox, Trash2, Cpu } from 'lucide-react';
import FormationWizardModal from './FormationWizardModal';
import type { TransmitPayload, WizardEmployer } from './FormationWizardModal';
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
type Lead = { _id: string; email?: string; accountantEmail?: string; managerEmail?: string; denom?: string; siret?: string; opco?: string; addr?: string; status: string; createdAt?: string; commercialId?: string; commercialName?: string; waitingNote?: string; reminderAt?: string | null; formationDoneThisYear?: boolean; companyEmployees?: number };
type DossierSalarie = { firstname?: string; lastname?: string; email?: string; poste?: string; type_contrat?: string; date_naissance?: string; num_secu?: string; telephone?: string };
type Dossier = { _id: string; leadId?: string; mountedByAdmin?: boolean; denom?: string; siret?: string; opco?: string; addr?: string; formationTitle?: string; sessionName?: string; sessionStart?: string; sessionEnd?: string; amountHT?: number; status: string; createdAt?: string; updatedAt?: string; opcoPaid?: boolean; opcoPaidAt?: string | null; encashRequestedAt?: string | null; invoiceNumber?: string; signedBy?: string; signedFunction?: string; salaries?: DossierSalarie[] };
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

export default function AgenceSpace() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  if (!token) return <Login onAuth={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;
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

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dossierByLead, setDossierByLead] = useState<Record<string, Dossier>>({});
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([]);
  const [coName, setCoName] = useState('');
  const [coEmail, setCoEmail] = useState('');
  const [coBusy, setCoBusy] = useState(false);
  const [coCreated, setCoCreated] = useState<{ email: string; password: string } | null>(null);
  const [accessByEmail, setAccessByEmail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
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
  const [reminderLead, setReminderLead] = useState<Lead | null>(null); // édition du rappel / suivi d'un client
  const [argKey, setArgKey] = useState<'hygiene' | 'nutrition'>('hygiene'); // formation affichée dans les arguments de vente
  const [assigningLead, setAssigningLead] = useState<string | null>(null); // reaffectation commercial en cours
  const [sendingSignLink, setSendingSignLink] = useState(false); // envoi du lien de signature convention au client
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);  // envoi du lien de signature via WhatsApp
  const [editDossier, setEditDossier] = useState<{ lead: Lead; dossier: Dossier } | null>(null); // correction d'un dossier transmis

  const auth = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const authJson = useCallback(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetch('/api/agency/self/profile', { headers: auth() });
      if (p.status === 401 || p.status === 403) { onLogout(); return; }
      const pj = await p.json(); if (pj.ok) setAgency(pj.agency);
      const lj = await fetch('/api/agency/self/leads', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
      if (lj.ok) setLeads(lj.leads || []);
      const dj = await fetch('/api/agency/self/dossiers', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
      if (dj.ok) { const all: Dossier[] = dj.dossiers || []; setDossiers(all); const m: Record<string, Dossier> = {}; all.forEach((d) => { if (d.leadId && !m[d.leadId]) m[d.leadId] = d; }); setDossierByLead(m); }
      const aj = await fetch('/api/agency/self/access-requests', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
      if (aj.ok) { const m: Record<string, string> = {}; (aj.requests || []).forEach((r: { clientEmail: string; status: string }) => { m[r.clientEmail] = r.status; }); setAccessByEmail(m); }
      if (pj.ok && pj.agency?.isOwner) {
        const cj = await fetch('/api/agency/self/commerciaux', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
        if (cj.ok) setCommerciaux(cj.commerciaux || []);
      }
    } finally { setLoading(false); }
  }, [auth, onLogout]);

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
      const r = await fetch('/api/agency/self/sign-link', { method: 'POST', headers: authJson(), body: JSON.stringify({ channel: 'whatsapp', noEmail: true, dossierId: editDossier?.dossier._id, leadId: lead._id, denom: lead.denom, siret: lead.siret, opco: lead.opco, addr: lead.addr, clientEmail: lead.email, managerEmail: lead.managerEmail, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, amountHT: p.amountHT }) });
      const j = await r.json();
      if (!j.ok || !j.link) { alert('Erreur : ' + (j.error === 'salaries_required' ? 'ajoutez au moins un stagiaire' : j.error || 'lien impossible')); return; }
      const phone = (window.prompt('Numéro WhatsApp du client (format international, ex. 33612345678).\nLaissez vide pour choisir le contact dans WhatsApp :', '') || '').replace(/\D/g, '');
      const msg = `Bonjour, voici votre convention de formation ${lead.denom ? `(${lead.denom}) ` : ''}à lire et signer au doigt depuis votre téléphone : ${j.link}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
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

  if (loading) return <main className="min-h-screen bg-[#0E0F13] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></main>;

  return (
    <main className="min-h-screen text-white" style={DOTTED_BG}>
      {/* Topbar */}
      <header className="border-b border-black/10 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Delivery Digital" className="h-10 w-auto" />
            <span className="text-[15px] font-bold text-[#1D1D1F] leading-tight">{agency?.name || 'Agence'}</span>
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] text-[11.5px] border border-black/10"><LogOut className="h-3.5 w-3.5" /> Déconnexion</button>
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
          {isOwner && <Kpi icon={<ShieldCheck className="h-4 w-4" />} label={`Gains acquis · ${PERIOD_LABEL[period]}`} value={kpi.acquis} suffix=" €" accent="#3DD68C" onClick={() => gotoSection('sec-historique')} />}
        </div>

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

        {/* Services informatiques : devis IT (revente prestations Delivery Digital). @Rabah 2026-06-21 */}
        <DevisITSection auth={auth} authJson={authJson} isOwner={isOwner} fix={fix} pct={pct} />

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
                                {l.companyEmployees != null && <span className="inline-flex items-center gap-1 text-[10.5px] text-white/50"><Users className="h-3 w-3" /> {l.companyEmployees} salarié{l.companyEmployees > 1 ? 's' : ''}</span>}
                                {l.formationDoneThisYear
                                  ? <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] border border-[#E5B567]/30 text-[#E5B567] bg-[#E5B567]/10">Formation faite cette année</span>
                                  : <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] border border-[#3DD68C]/30 text-[#3DD68C] bg-[#3DD68C]/10">Budget OPCO 100% dispo</span>}
                              </div>
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
                              : <span className="text-[11.5px] text-white/40 group-hover:text-white/70">+ Suivi / rappel</span>}
                            {l.reminderAt && <span className="block mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-[#4da3ff]"><Clock className="h-3 w-3" /> Rappel {new Date(l.reminderAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            {dos && <button onClick={() => setOpenTimeline((v) => v === l._id ? null : l._id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] whitespace-nowrap ${openTimeline === l._id ? 'bg-[#0066CC]/15 border-[#0066CC]/40 text-[#4da3ff]' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}><Clock className="h-3.5 w-3.5" /> Suivi</button>}
                            {dos && dos.status !== 'paid' && dos.status !== 'invoiced' && <button onClick={() => setEditDossier({ lead: l, dossier: dos })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px] whitespace-nowrap" title="Corriger ce dossier déjà transmis et le renvoyer"><PenLine className="h-3.5 w-3.5" /> Modifier</button>}
                            <button onClick={() => setDossierLead(l)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px] whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> {dos ? 'Nouveau dossier' : 'Dossier OPCO'}</button>
                            {acc !== 'received' && <button onClick={() => setAccessLead(l)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px] whitespace-nowrap"><KeyRound className="h-3.5 w-3.5" /> {acc === 'pending' ? 'Accès OPCO · en cours' : 'Accès OPCO'}</button>}
                          </div>
                        </td>
                      </tr>
                      {openTimeline === l._id && dos && (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={isOwner ? 6 : 4} className="px-5 pb-4 pt-1">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Suivi du dossier · {l.denom || 'Client'}</p>
                            <DossierTimeline d={dos} accessStatus={l.email ? accessByEmail[l.email] : undefined} onAccess={() => setAccessLead(l)} />
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
          onClose={() => setDossierLead(null)}
          onTransmit={async (p: TransmitPayload) => {
            if (!dossierLead) return;
            setTransmitting(true);
            try {
              const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
              const r = await fetch('/api/agency/self/transmit-dossier', { method: 'POST', headers: authJson(), body: JSON.stringify({ leadId: dossierLead._id, denom: dossierLead.denom, siret: dossierLead.siret, opco: dossierLead.opco, addr: dossierLead.addr, clientEmail: dossierLead.email, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, signedBy: p.signedBy, signedFunction: p.signedFunction, signatureDataUrl: p.signatureDataUrl, amountHT: p.amountHT }) });
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
              if (!dossierLead.email) { alert("Ce client n'a pas d'email - renseignez-le pour envoyer le lien de signature."); return; }
              setSendingSignLink(true);
              try {
                const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
                const r = await fetch('/api/agency/self/sign-link', { method: 'POST', headers: authJson(), body: JSON.stringify({ leadId: dossierLead._id, denom: dossierLead.denom, siret: dossierLead.siret, opco: dossierLead.opco, addr: dossierLead.addr, clientEmail: dossierLead.email, managerEmail: dossierLead.managerEmail, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, amountHT: p.amountHT }) });
                const j = await r.json();
                if (j.ok) { setDossierLead(null); load(); alert(`✓ Lien de signature envoyé à ${dossierLead.email}. Le client lit la convention et signe au doigt depuis son téléphone ; le dossier sera transmis automatiquement à sa signature.`); }
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
              const r = await fetch(`/api/agency/self/dossiers/${editDossier.dossier._id}`, { method: 'PATCH', headers: authJson(), body: JSON.stringify({ sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, signedBy: p.signedBy, signedFunction: p.signedFunction, signatureDataUrl: p.signatureDataUrl, amountHT: p.amountHT }) });
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
              if (!editDossier.lead.email) { alert("Ce client n'a pas d'email - renseignez-le pour envoyer le lien de signature."); return; }
              setSendingSignLink(true);
              try {
                const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
                // dossierId : la signature à distance mettra à jour CE dossier (pas de doublon).
                const r = await fetch('/api/agency/self/sign-link', { method: 'POST', headers: authJson(), body: JSON.stringify({ dossierId: editDossier.dossier._id, leadId: editDossier.lead._id, denom: editDossier.dossier.denom || editDossier.lead.denom, siret: editDossier.dossier.siret || editDossier.lead.siret, opco: editDossier.dossier.opco || editDossier.lead.opco, addr: editDossier.dossier.addr || editDossier.lead.addr, clientEmail: editDossier.lead.email, managerEmail: editDossier.lead.managerEmail, sessionName, startAt: p.startAt, endAt: p.endAt, formationTitle: p.formationTitle, salaries: p.salaries, amountHT: p.amountHT }) });
                const j = await r.json();
                if (j.ok) { setEditDossier(null); load(); alert(`✓ Lien de signature envoyé à ${editDossier.lead.email}. À sa signature, ce dossier sera mis à jour avec la convention corrigée.`); }
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
          onAsk={async (label) => { const ok = await askOpco(accessLead, label); if (ok) alert(`Lien sécurisé envoyé à ${accessLead.email}. Le client saisit ses informations, reçues directement par Delivery Digital.`); }}
          onReminder={() => { const l = accessLead; setAccessLead(null); setReminderLead(l); }}
          onClose={() => setAccessLead(null)}
        />
      )}

      {reminderLead && (
        <ReminderModal lead={reminderLead} onSave={(note, when, extra) => saveReminder(reminderLead._id, note, when, extra)} onClose={() => setReminderLead(null)} />
      )}
    </main>
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
  const [mode, setMode] = useState<'choice' | 'have' | 'akto'>('choice');
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
      <div className="w-full max-w-2xl my-6 rounded-2xl bg-[#181A20] border border-white/10 shadow-2xl text-white" onClick={(e) => e.stopPropagation()}>

        {/* 1) Choix : a-t-il deja un compte OPCO ? */}
        {mode === 'choice' && (
          <>
            <Header title="Le client a-t-il déjà un compte OPCO ?" sub="Deux cas de figure. Choisissez celui du client pour lancer la bonne procédure." />
            <div className="px-6 py-5 grid sm:grid-cols-2 gap-3">
              <button onClick={() => setMode('have')} className="text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#0066CC]/40 p-4 transition">
                <span className="inline-flex h-10 w-10 rounded-xl bg-[#3DD68C]/15 items-center justify-center"><ShieldCheck className="h-5 w-5 text-[#3DD68C]" /></span>
                <p className="text-[13.5px] font-bold mt-3">Oui, il a déjà un compte OPCO</p>
                <p className="text-[12px] text-white/50 mt-1 leading-relaxed">Il possède ses identifiants (email + mot de passe). On lui envoie un lien sécurisé pour les transmettre à Delivery Digital.</p>
                <span className="inline-flex items-center gap-1 text-[12px] text-[#4da3ff] font-semibold mt-3">Transmettre les identifiants <ArrowRight className="h-3.5 w-3.5" /></span>
              </button>
              <button onClick={() => setMode('akto')} className="text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#0066CC]/40 p-4 transition">
                <span className="inline-flex h-10 w-10 rounded-xl bg-[#0066CC]/15 items-center justify-center"><Building2 className="h-5 w-5 text-[#4da3ff]" /></span>
                <p className="text-[13.5px] font-bold mt-3">Non, pas encore de compte</p>
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
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#86868B] font-bold">Delivery Digital</p><h1 className="text-[18px] font-extrabold mt-1">Contrat de partenariat</h1><p className="text-[11.5px] text-[#86868B]">Apporteur d&apos;affaires - dispositifs de formation financés (OPCO)</p></div>
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
function DossierTimeline({ d, accessStatus, onAccess }: { d: Dossier; accessStatus?: string; onAccess?: () => void }) {
  const cur = DOSSIER_META[d.status]?.step ?? 1;
  const fmt = (s?: string) => s ? new Date(s).toLocaleDateString('fr-FR') : '';
  const depot = fmt(d.createdAt);
  const maj = fmt(d.updatedAt);
  const start = fmt(d.sessionStart);
  const end = fmt(d.sessionEnd);
  const accessDone = accessStatus === 'received';
  type Node = { label: string; resp: 'Agence' | 'DDN'; sub?: string; done: boolean; active: boolean; action?: () => void };
  const nodes: Node[] = [
    { label: 'Transmis', resp: 'Agence', sub: depot, done: cur >= 1, active: cur === 1 },
    // Action agence cliquable : ouvre la procédure "Accès OPCO" pour ce client tant que non reçu.
    { label: 'Accès OPCO', resp: 'Agence', sub: accessDone ? 'Reçus par DD' : accessStatus === 'pending' ? 'Demandés…' : 'À demander au client', done: accessDone, active: !accessDone && cur >= 1, action: !accessDone ? onAccess : undefined },
    ...(['instruction', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid'] as const).map((k) => {
      const m = DOSSIER_META[k];
      const sub = k === 'scheduled' ? (start ? 'Début : ' + start : (d.sessionName || '')) : k === 'completed' ? (end ? 'Fin : ' + end : '') : (k === 'paid' && d.status === 'paid') ? maj : '';
      return { label: m.label, resp: 'DDN' as const, sub, done: m.step <= cur, active: m.step === cur };
    }),
  ];
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-start min-w-[760px] px-1">
        {nodes.map((n, i) => {
          const clickable = !!n.action;
          const Inner = (
            <>
              <span className={`relative z-10 h-[18px] w-[18px] rounded-full border-2 grid place-items-center ${n.active ? 'bg-[#0066CC] border-[#0066CC]' : n.done ? 'bg-[#3DD68C] border-[#3DD68C]' : 'bg-[#181A20] border-white/25'} ${clickable ? 'ring-2 ring-[#0066CC]/40' : ''}`}>{n.done && !n.active && <span className="text-black text-[9px] leading-none">✓</span>}</span>
              <p className={`text-[10px] mt-1.5 leading-tight ${n.active ? 'text-white font-bold' : n.done ? 'text-white/75' : 'text-white/35'}`}>{n.label}</p>
              <span className={`mt-1 inline-block px-1.5 py-[1px] rounded text-[8.5px] font-semibold ${n.resp === 'Agence' ? 'bg-[#0066CC]/15 text-[#4da3ff]' : 'bg-white/10 text-white/55'}`}>{n.resp === 'Agence' ? 'Action agence' : 'Action DDN'}</span>
              {n.sub && <span className={`mt-1 inline-block px-2 py-0.5 rounded-full border text-[9.5px] whitespace-nowrap ${clickable ? 'bg-[#0066CC] border-[#0066CC] text-white font-semibold' : 'bg-white/5 border-white/10 text-white/55'}`}>{clickable ? n.sub + ' ›' : n.sub}</span>}
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
  client?: { name?: string; email?: string; company?: string; phone?: string; address?: string };
  lines?: QuoteLine[]; total?: number; totalTTC?: number; taxRate?: number; currency?: string;
  commercialName?: string; createdAt?: string; sentAt?: string; acceptedAt?: string;
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
  // Commission estimée sur un devis accepté (même barème que les dossiers OPCO).
  const commissionOf = (q: ITQuote) => Math.round((fix || 0) + ((pct || 0) / 100) * (q.total || 0));

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

      {isOwner && <div className="px-5 py-2.5 bg-[#3DD68C]/[0.06] border-b border-white/10 text-[12px] text-[#3DD68C]">Commission services IT : <strong>{(fix || 0).toLocaleString('fr-FR')} € + {pct || 0}%</strong> du montant HT, versée quand le client accepte et règle (même barème que les dossiers).</div>}

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
                    <td className="px-5 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] ${sm.cls}`}>{sm.label}</span></td>
                    {isOwner && <td className="px-5 py-3">{q.status === 'accepted' ? <span className="text-[#3DD68C] font-semibold">{euro(commissionOf(q))}</span> : <span className="text-white/30">-</span>}</td>}
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
  const [client, setClient] = useState({ name: '', email: '', company: '', phone: '', address: '', ...(initial?.client || {}) });
  const [title, setTitle] = useState(initial?.title || 'Devis services informatiques');
  const [taxRate, setTaxRate] = useState(initial?.taxRate != null ? initial.taxRate : 20);
  const [lines, setLines] = useState<QuoteLine[]>(initial?.lines?.length ? initial.lines.map((l) => ({ description: l.description, details: l.details || '', quantity: l.quantity || 1, unit: l.unit || 'forfait', unitPrice: l.unitPrice || 0 })) : []);
  const [autoSendInvoice, setAutoSendInvoice] = useState(initial ? (initial as any).autoSendInvoice !== false : true);
  const [pickCat, setPickCat] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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
  const tax = Math.round(subtotal * (taxRate / 100));
  const ttc = subtotal + tax;
  const euro = (n: number) => (n || 0).toLocaleString('fr-FR') + ' €';

  const save = async (thenSend: boolean) => {
    setErr('');
    if (!client.name?.trim() || !client.email?.trim()) { setErr('Nom et email du client requis.'); return; }
    if (lines.length === 0 || lines.some((l) => !l.description?.trim())) { setErr('Ajoutez au moins une ligne (avec une description).'); return; }
    setBusy(true);
    try {
      const body = { client, title, taxRate, lines, autoSendInvoice };
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

          {/* Totaux + TVA */}
          <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-[#0E0F13] border border-white/10 p-3.5">
            <label className="text-[12px] text-white/60 inline-flex items-center gap-2">TVA % <input type="number" className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white focus:outline-none" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} /></label>
            <div className="text-right text-[13px]"><p className="text-white/60">Total HT : <strong className="text-white">{euro(subtotal)}</strong></p><p className="text-white/40 text-[12px]">TVA : {euro(tax)} · <strong className="text-white">TTC {euro(ttc)}</strong></p></div>
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
