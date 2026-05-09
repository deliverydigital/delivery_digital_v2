import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { contactApi } from '../services/contactApi';
import {
  Globe, Smartphone, ShoppingCart, Database, Cloud, Layers, Workflow,
  Palette, Sparkles, Lock, KeyRound, Shield, Smartphone as SmartphoneIcon,
  CreditCard, RefreshCw, FileText, Languages, Bot, Brain, Camera, Mic,
  BarChart3, Activity, Bell, Mail, Zap, Headphones, BookOpen,
  CalendarDays, Send, Check, X, Server, ArrowDown,
  Users, Settings, Search, TrendingUp,
} from 'lucide-react';

/**
 * Apple-style interactive quote simulator.
 * - Project base type selection (cards)
 * - Categories of features as toggles
 * - Live total computation, smoothly animated
 * - "Recevoir ce devis" CTA prefills the project submission space
 */

type ProjectType = {
  id: string;
  Icon: any;
  name: string;
  desc: string;
  base: number;     // EUR HT
  baseDays: number; // jours-homme
};

type Feature = {
  id: string;
  Icon: any;
  name: string;
  desc?: string;
  price: number;
  days?: number;
  recommended?: boolean;
};

type Category = {
  id: string;
  name: string;
  desc: string;
  features: Feature[];
};

const PROJECT_TYPES: ProjectType[] = [
  { id: 'vitrine', Icon: Globe, name: 'Site vitrine', desc: 'Pages institutionnelles + SEO.', base: 990, baseDays: 6 },
  { id: 'webapp', Icon: Layers, name: 'Application web', desc: 'SaaS, dashboards, back-offices.', base: 3900, baseDays: 22 },
  { id: 'ecommerce', Icon: ShoppingCart, name: 'E-commerce', desc: 'Catalogue, panier, paiement.', base: 2900, baseDays: 18 },
  { id: 'mobile', Icon: Smartphone, name: 'Application mobile', desc: 'iOS et Android, design natif.', base: 5900, baseDays: 32 },
  { id: 'crm', Icon: Database, name: 'CRM / ERP sur mesure', desc: 'Pipeline, devis, gestion clients.', base: 4900, baseDays: 28 },
  { id: 'marketplace', Icon: Workflow, name: 'Marketplace', desc: 'Multi-vendeurs, paiements split.', base: 9900, baseDays: 55 },
];

const CATEGORIES: Category[] = [
  {
    id: 'design',
    name: 'Design & UX',
    desc: 'Identité visuelle et expérience utilisateur soignées.',
    features: [
      { id: 'mockup-figma', Icon: Palette, name: 'Maquettes Figma haute fidélité', price: 590, days: 4, recommended: true },
      { id: 'design-system', Icon: Layers, name: 'Système de design complet', price: 990, days: 6 },
      { id: 'animations', Icon: Sparkles, name: 'Animations & micro-interactions', price: 690, days: 4 },
      { id: 'accessibility', Icon: Shield, name: 'Accessibilité WCAG 2.2 AA', price: 490, days: 3 },
    ],
  },
  {
    id: 'auth',
    name: 'Authentification & sécurité',
    desc: 'Comptes utilisateurs, OAuth, conformité RGPD.',
    features: [
      { id: 'auth-email', Icon: Lock, name: 'Login email + mot de passe', price: 290, days: 2, recommended: true },
      { id: 'auth-oauth', Icon: KeyRound, name: 'Google / Apple / Microsoft', price: 390, days: 2 },
      { id: 'auth-2fa', Icon: SmartphoneIcon, name: 'Authentification 2FA', price: 390, days: 2 },
      { id: 'auth-sso', Icon: Shield, name: 'SSO entreprise (SAML/OIDC)', price: 1200, days: 6 },
      { id: 'auth-rgpd', Icon: Shield, name: 'Conformité RGPD complète', price: 690, days: 4 },
    ],
  },
  {
    id: 'payment',
    name: 'Paiements',
    desc: 'Stripe, abonnements, multi-devises, facturation.',
    features: [
      { id: 'pay-stripe', Icon: CreditCard, name: 'Paiement Stripe one-shot', price: 590, days: 3, recommended: true },
      { id: 'pay-subs', Icon: RefreshCw, name: 'Abonnements récurrents', price: 890, days: 5 },
      { id: 'pay-invoice', Icon: FileText, name: 'Facturation automatique PDF', price: 690, days: 4 },
      { id: 'pay-multi', Icon: Languages, name: 'Multi-devises', price: 390, days: 2 },
      { id: 'pay-marketplace', Icon: Workflow, name: 'Stripe Connect (split paiements)', price: 1490, days: 8 },
    ],
  },
  {
    id: 'ai',
    name: 'Intelligence artificielle',
    desc: 'Claude / GPT, vision, reconnaissance vocale.',
    features: [
      { id: 'ai-chat', Icon: Bot, name: 'Chatbot IA personnalisé', price: 1490, days: 8 },
      { id: 'ai-assistant', Icon: Brain, name: 'Assistant Claude / GPT intégré', price: 990, days: 6, recommended: true },
      { id: 'ai-vision', Icon: Camera, name: 'Vision IA (analyse images / OCR)', price: 1290, days: 7 },
      { id: 'ai-voice', Icon: Mic, name: 'Reconnaissance vocale', price: 890, days: 5 },
      { id: 'ai-recommend', Icon: Sparkles, name: 'Moteur de recommandations', price: 1690, days: 9 },
    ],
  },
  {
    id: 'data',
    name: 'Données & analytics',
    desc: 'Dashboards admin, BI, exports, rapports.',
    features: [
      { id: 'data-admin', Icon: BarChart3, name: 'Dashboard administrateur', price: 990, days: 6, recommended: true },
      { id: 'data-analytics', Icon: Activity, name: 'Analytics avancées', price: 690, days: 4 },
      { id: 'data-export', Icon: FileText, name: 'Exports Excel / CSV / PDF', price: 390, days: 2 },
      { id: 'data-reports', Icon: Mail, name: 'Rapports automatiques par email', price: 690, days: 4 },
    ],
  },
  {
    id: 'comm',
    name: 'Communication',
    desc: 'Emails, notifications push, chat live.',
    features: [
      { id: 'comm-email', Icon: Mail, name: 'Emails transactionnels', price: 290, days: 2, recommended: true },
      { id: 'comm-news', Icon: Send, name: 'Newsletter automatisée', price: 490, days: 3 },
      { id: 'comm-chat', Icon: Headphones, name: 'Chat en direct', price: 590, days: 4 },
      { id: 'comm-push', Icon: Bell, name: 'Notifications push natives', price: 590, days: 4 },
    ],
  },
  {
    id: 'infra',
    name: 'Infrastructure & cloud',
    desc: 'Hébergement, monitoring, scale automatique.',
    features: [
      { id: 'infra-host', Icon: Server, name: 'Hébergement haute dispo', price: 590, days: 3, recommended: true },
      { id: 'infra-cdn', Icon: Cloud, name: 'CDN global + cache', price: 290, days: 2 },
      { id: 'infra-mon', Icon: Activity, name: 'Monitoring 24/7', price: 590, days: 3 },
      { id: 'infra-bk', Icon: Shield, name: 'Sauvegardes automatiques', price: 290, days: 2 },
      { id: 'infra-cicd', Icon: Workflow, name: 'CI/CD automatisé', price: 690, days: 4 },
    ],
  },
  {
    id: 'i18n',
    name: 'International',
    desc: 'Sites multi-langues et multi-régions.',
    features: [
      { id: 'i18n-2', Icon: Languages, name: 'Multi-langue (FR + EN)', price: 590, days: 4 },
      { id: 'i18n-more', Icon: Languages, name: 'Langues supplémentaires (par langue)', price: 240, days: 1 },
      { id: 'i18n-region', Icon: Globe, name: 'Multi-régions (TVA, devises)', price: 790, days: 5 },
    ],
  },
  {
    id: 'support',
    name: 'Formation & support',
    desc: 'Documentation, accompagnement, support continu.',
    features: [
      { id: 'sup-train', Icon: BookOpen, name: 'Formation utilisateurs', price: 490, days: 3 },
      { id: 'sup-doc', Icon: FileText, name: 'Documentation complète', price: 290, days: 2 },
      { id: 'sup-6m', Icon: Headphones, name: 'Support 6 mois inclus', price: 990, days: 6 },
      { id: 'sup-12m', Icon: Headphones, name: 'Support 12 mois inclus', price: 1790, days: 10 },
    ],
  },
];

const TIMELINES = [
  { id: 'flexible', label: 'Flexible (4-8 mois)', mult: 0.95 },
  { id: 'normal', label: 'Standard (3-6 mois)', mult: 1, recommended: true },
  { id: 'fast', label: 'Rapide (2-3 mois)', mult: 1.25 },
  { id: 'urgent', label: 'Urgent (<2 mois)', mult: 1.5 },
];

/* ============================================================
   LiveMockup - Apple "macOS card" style:
   - Light gray rounded-[28] card with subtle blue ring
   - Eyebrow + big bold title at top
   - Tilted device showing the project being built inside
   - Floating black "+" button bottom-right to add a feature
   ============================================================ */
function LiveMockup({ project, selectedFeatures, onToggle }: {
  project: ProjectType;
  selectedFeatures: Set<string>;
  onToggle: (id: string) => void;
}) {
  const has = (id: string) => selectedFeatures.has(id);
  const isMobile = project.id === 'mobile';

  // Pick a recommended feature that's NOT yet selected to suggest as next
  const nextSuggestion: { id: string; name: string } | null = (() => {
    for (const cat of CATEGORIES) for (const f of cat.features) {
      if (f.recommended && !selectedFeatures.has(f.id)) return { id: f.id, name: f.name };
    }
    for (const cat of CATEGORIES) for (const f of cat.features) {
      if (!selectedFeatures.has(f.id)) return { id: f.id, name: f.name };
    }
    return null;
  })();

  const activeCount = (() => {
    let n = 0;
    for (const cat of CATEGORIES) for (const f of cat.features) if (has(f.id)) n++;
    return n;
  })();

  return (
    <div className="mb-4">
      <div
        className="relative rounded-[28px] overflow-hidden"
        style={{
          background: '#F5F5F7',
          boxShadow: '0 0 0 1px rgba(10, 132, 255, 0.18), 0 30px 60px -25px rgba(0,0,0,0.12)',
        }}
      >
        {/* Top: eyebrow + big title */}
        <div className="px-6 pt-6 pb-3">
          <p className="text-[12px] font-medium text-[var(--ink-700)] mb-1.5">
            {project.name} et {activeCount} module{activeCount > 1 ? 's' : ''}
          </p>
          <h3
            className="font-bold text-[var(--ink-900)] leading-[1.05] tracking-[-0.022em]"
            style={{ fontSize: 26, fontFamily: 'var(--font-display)' }}
          >
            Votre projet,<br />en construction.
          </h3>
        </div>

        {/* Tilted device preview - clipped at bottom (Apple "peek" style) */}
        <div className="relative overflow-hidden sm:overflow-visible" style={{ marginTop: 4, marginRight: -28, marginBottom: -28 }}>
          <div
            className="origin-top-right"
            style={{
              transform: 'perspective(1200px) rotateX(2deg) rotateY(-6deg) translateX(8px)',
            }}
          >
            {isMobile
              ? <MobilePreview project={project} has={has} />
              : <BrowserPreview project={project} has={has} />}
          </div>

          {/* Floating black "+" button bottom-right to add next suggestion */}
          {nextSuggestion && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onToggle(nextSuggestion.id)}
              className="absolute z-20 flex items-center justify-center"
              style={{
                bottom: 56,
                right: 72,
                width: 44,
                height: 44,
                borderRadius: 22,
                background: '#1D1D1F',
                color: 'white',
                boxShadow: '0 12px 24px -8px rgba(0,0,0,0.35), 0 4px 8px -2px rgba(0,0,0,0.2)',
              }}
              aria-label={`Ajouter ${nextSuggestion.name}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </motion.button>
          )}
        </div>
      </div>

      {/* Hint below */}
      {nextSuggestion ? (
        <motion.p
          key={nextSuggestion.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center text-[12px] text-[var(--ink-500)]"
        >
          Cliquez sur <span className="font-semibold text-[var(--ink-900)]">+</span> pour ajouter <span className="font-semibold text-[var(--ink-900)]">{nextSuggestion.name}</span>
        </motion.p>
      ) : (
        <p className="mt-3 text-center text-[12px] text-[var(--ink-500)]">
          Toutes les fonctionnalités sont activées.
        </p>
      )}

      {activeCount > 0 && (
        <div className="mt-2 text-center">
          <button
            onClick={() => {
              for (const cat of CATEGORIES) for (const f of cat.features) if (selectedFeatures.has(f.id)) onToggle(f.id);
            }}
            className="text-[11px] text-[var(--link)] hover:underline"
          >
            Tout retirer
          </button>
        </div>
      )}
    </div>
  );
}

/* ----- Browser-style preview - clean Apple product hero ----- */
function BrowserPreview({ project, has }: { project: ProjectType; has: (id: string) => boolean }) {
  const url = `${project.id === 'webapp' ? 'app' : project.id}.example.com`;

  // Active feature pills floating around (Apple-spec-sheet style)
  const featurePills: { Icon: any; label: string; tone?: 'accent' }[] = [];
  if (has('auth-email')) featurePills.push({ Icon: Lock, label: 'Connexion sécurisée' });
  if (has('pay-stripe')) featurePills.push({ Icon: CreditCard, label: 'Stripe', tone: 'accent' });
  if (has('ai-chat') || has('ai-assistant')) featurePills.push({ Icon: Brain, label: 'IA intégrée', tone: 'accent' });
  if (has('data-admin')) featurePills.push({ Icon: BarChart3, label: 'Analytics' });
  if (has('infra-host')) featurePills.push({ Icon: Cloud, label: 'Cloud · 99,99 %' });
  if (has('i18n-2')) featurePills.push({ Icon: Languages, label: 'Multi-langue' });
  if (has('comm-email')) featurePills.push({ Icon: Mail, label: 'Notifications' });
  if (has('mockup-figma')) featurePills.push({ Icon: Palette, label: 'Design soigné' });

  return (
    <div
      className="relative rounded-[18px] overflow-hidden"
      style={{
        background: '#FFFFFF',
        boxShadow: '0 40px 80px -25px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.05)',
      }}
    >
      {/* macOS Safari title bar */}
      <div
        className="relative flex items-center px-3.5 py-3 border-b border-[var(--ink-100)]"
        style={{ background: 'linear-gradient(180deg, #ECECF1 0%, #DEDEE3 100%)' }}
      >
        <div className="flex items-center gap-2 absolute left-3.5">
          <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.12) inset' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.12) inset' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#28C840', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.12) inset' }} />
        </div>
        <div className="mx-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 ring-1 ring-black/5 text-[10.5px] text-[var(--ink-700)] font-medium max-w-[58%]">
          <Lock className="h-2.5 w-2.5" strokeWidth={2.2} />
          <span className="truncate">{url}</span>
        </div>
      </div>

      {/* Hero - clean Apple product page */}
      <div className="relative px-7 py-8 sm:py-10 text-center bg-white min-h-[300px] flex flex-col items-center justify-center">
        {/* Tiny eyebrow */}
        <motion.span
          key={`eyebrow-${project.id}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[var(--ink-500)] mb-3"
        >
          {project.id === 'mobile' ? 'Application native' : project.id === 'ecommerce' ? 'E-commerce' : project.id === 'crm' ? 'Gestion métier' : project.id === 'marketplace' ? 'Multi-vendeurs' : 'Application web'}
        </motion.span>

        {/* Big hero title */}
        <motion.h4
          key={`title-${project.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.022em] leading-[1.05] text-[var(--ink-900)] mb-2"
        >
          {project.name}
        </motion.h4>

        {/* Subhead */}
        <motion.p
          key={`sub-${project.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-[13px] sm:text-[14px] text-[var(--ink-700)] max-w-[280px] tracking-tight leading-snug mb-6"
        >
          {project.desc}
        </motion.p>

        {/* Primary action */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3"
        >
          {has('pay-stripe') ? (
            <button className="px-4 py-2 rounded-full bg-[var(--ink-900)] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-sm">
              <CreditCard className="h-3 w-3" strokeWidth={2} />
              Démarrer
            </button>
          ) : (
            <button className="px-4 py-2 rounded-full bg-[var(--ink-900)] text-white text-[12px] font-semibold shadow-sm">
              Commencer
            </button>
          )}
          <button className="text-[12px] text-[var(--link)] font-medium hover:underline">En savoir plus ›</button>
        </motion.div>

        {/* Floating feature pills around the hero (Apple spec sheet style) */}
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence>
            {featurePills.map((p, i) => (
              <motion.div
                key={p.label}
                layout
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: -10 }}
                transition={{ type: 'spring', stiffness: 220, damping: 22, delay: i * 0.04 }}
                style={getPillPosition(i, featurePills.length)}
                className={`absolute inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold backdrop-blur-md ${
                  p.tone === 'accent'
                    ? 'bg-[var(--ink-900)] text-white'
                    : 'bg-white/85 text-[var(--ink-900)] ring-1 ring-black/5'
                }`}
              >
                <p.Icon className="h-2.5 w-2.5" strokeWidth={2} />
                {p.label}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Floating chat bubble bottom-right - subtle Apple Intelligence */}
        <AnimatePresence>
          {(has('ai-chat') || has('ai-assistant')) && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, scale: 0.5, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className="absolute bottom-4 right-4"
            >
              <div className="relative">
                <motion.div
                  className="absolute -inset-2 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(99,91,255,0.4), transparent 70%)' }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#1D1D1F] to-[#3C3C43] flex items-center justify-center shadow-lg ring-1 ring-white">
                  <Sparkles className="h-4 w-4 text-white" strokeWidth={1.7} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Distribute pills in a fan around the hero (left/right of center) */
function getPillPosition(i: number, total: number): React.CSSProperties {
  // Place pills along left and right edges, alternating
  const left = i % 2 === 0;
  const idxOnSide = Math.floor(i / 2);
  const totalOnSide = Math.ceil((total - (left ? 0 : 1)) / 2);
  const v = totalOnSide > 1 ? (idxOnSide / (totalOnSide - 1)) * 0.7 + 0.15 : 0.5;
  return {
    [left ? 'left' : 'right']: '4%',
    top: `${v * 100}%`,
    transform: 'translateY(-50%)',
  } as React.CSSProperties;
}

/* ----- Mobile preview ----- */
function MobilePreview({ project, has }: { project: ProjectType; has: (id: string) => boolean }) {
  return (
    <div className="relative bg-white rounded-[18px] ring-1 ring-[var(--ink-100)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.18)] p-5 mb-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--ink-500)]">Aperçu live</span>
        <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-[var(--ink-900)] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-900)] animate-pulse" />
          iOS · Android
        </span>
      </div>
      {/* iPhone 17 Pro frame */}
      <div
        className="relative mx-auto"
        style={{
          width: 230,
          aspectRatio: '9 / 19.5',
          background: 'linear-gradient(155deg, #2c2c2e 0%, #1a1a1c 50%, #2c2c2e 100%)',
          borderRadius: 38,
          padding: 5,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 0 1.5px rgba(0,0,0,0.4), 0 30px 60px -20px rgba(0,0,0,0.35)',
        }}
      >
        <div className="w-full h-full rounded-[33px] bg-white relative overflow-hidden">
          {/* Dynamic Island */}
          <div
            className="absolute top-[7px] left-1/2 -translate-x-1/2 z-30 rounded-[14px]"
            style={{ width: '30%', height: '17px', background: '#000' }}
          />
          {/* Status bar */}
          <div className="absolute top-[5px] left-0 right-0 px-4 flex items-center justify-between text-[8px] font-semibold text-[var(--ink-900)] z-10">
            <span>9:41</span>
            <span>•••</span>
          </div>
          {/* Header */}
          <div className="absolute top-[34px] left-3 right-3 flex items-center justify-between">
            <div>
              <div className="text-[7.5px] uppercase tracking-[0.12em] font-semibold text-[var(--ink-500)]">App</div>
              <div className="text-[12px] font-bold text-[var(--ink-900)] tracking-tight">{project.name.split(' ')[0]}</div>
            </div>
            {has('auth-email') ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#86868B] to-[#1D1D1F]" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[var(--ink-100)]" />
            )}
          </div>

          {/* Content */}
          <div className="absolute top-[78px] inset-x-3 bottom-[34px] space-y-1.5 overflow-hidden">
            {/* Hero card */}
            <div className="rounded-[8px] p-2 bg-gradient-to-br from-[#1D1D1F] to-[#3C3C43] text-white">
              <div className="text-[7px] uppercase tracking-[0.1em] font-semibold text-white/65">Bienvenue</div>
              <div className="text-[9.5px] font-bold leading-tight tracking-tight">Que voulez-vous faire ?</div>
              {has('pay-stripe') && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white text-[7.5px] font-semibold text-[var(--ink-900)]"
                >
                  <CreditCard className="h-2 w-2" strokeWidth={2} /> Acheter
                </motion.div>
              )}
            </div>

            {/* KPIs */}
            {has('data-admin') && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-1"
              >
                <div className="rounded-[6px] bg-[var(--bg-soft)] p-1">
                  <div className="text-[6.5px] text-[var(--ink-500)]">Activité</div>
                  <div className="text-[10px] font-bold text-[var(--ink-900)] tabular-nums">12,4K</div>
                </div>
                <div className="rounded-[6px] bg-[var(--bg-soft)] p-1">
                  <div className="text-[6.5px] text-[var(--ink-500)]">Total</div>
                  <div className="text-[10px] font-bold text-[var(--ink-900)] tabular-nums">48K€</div>
                </div>
              </motion.div>
            )}

            {/* List */}
            <div className="space-y-1">
              {[
                { Icon: Users, label: 'Utilisateurs' },
                { Icon: ShoppingCart, label: 'Commandes' },
                { Icon: Mail, label: 'Messages' },
              ].map((it, i) => (
                <div key={i} className="flex items-center gap-1.5 px-1.5 py-1 rounded-[6px] bg-[var(--bg-soft)]">
                  <div className="w-4 h-4 rounded-[4px] bg-[var(--ink-900)] flex items-center justify-center">
                    <it.Icon className="h-2 w-2 text-white" strokeWidth={1.8} />
                  </div>
                  <span className="text-[8px] font-medium text-[var(--ink-900)]">{it.label}</span>
                </div>
              ))}
            </div>

            {/* Floating chat */}
            {(has('ai-chat') || has('ai-assistant') || has('comm-chat')) && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[var(--ink-900)] flex items-center justify-center shadow-lg"
              >
                <Brain className="h-3 w-3 text-white" strokeWidth={1.7} />
              </motion.div>
            )}
          </div>

          {/* Bottom tab bar */}
          <div className="absolute bottom-0 inset-x-0 h-[28px] bg-white border-t border-[var(--ink-100)] flex items-center justify-around">
            {[BarChart3, Users, Bell, Settings].map((Icon, i) => (
              <Icon key={i} className={i === 0 ? 'h-3 w-3 text-[var(--ink-900)]' : 'h-3 w-3 text-[var(--ink-300)]'} strokeWidth={i === 0 ? 2 : 1.7} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Animated counter */
function MoneyCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = display;
    const t0 = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</>;
}

const Simulator = () => {
  const { t } = useTranslation();
  const [projectType, setProjectType] = useState<string>('webapp');
  const [selected, setSelected] = useState<Set<string>>(new Set(['mockup-figma', 'auth-email', 'pay-stripe', 'data-admin', 'comm-email', 'infra-host']));
  const [timeline, setTimeline] = useState<string>('normal');
  const summaryRef = useRef<HTMLDivElement>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const project = PROJECT_TYPES.find((p) => p.id === projectType)!;
  const tl = TIMELINES.find((t) => t.id === timeline)!;

  const { totalHT, totalDays, addonsHT, addonsDays } = useMemo(() => {
    let addonsHT = 0;
    let addonsDays = 0;
    for (const cat of CATEGORIES) {
      for (const f of cat.features) {
        if (selected.has(f.id)) {
          addonsHT += f.price;
          addonsDays += f.days || 0;
        }
      }
    }
    const subtotal = (project.base + addonsHT);
    const totalHT = Math.round(subtotal * tl.mult);
    const totalDays = Math.round((project.baseDays + addonsDays) * (tl.mult >= 1 ? 1 / tl.mult : 1));
    return { totalHT, totalDays, addonsHT, addonsDays };
  }, [project, selected, tl]);

  const totalTTC = Math.round(totalHT * 1.2);
  const cii = Math.round(totalHT * 0.2);

  const sendQuote = () => {
    const summary = `Type : ${project.name}\nDélai : ${tl.label}\nFonctionnalités sélectionnées :\n${
      [...selected].map((id) => {
        for (const cat of CATEGORIES) {
          const f = cat.features.find((x) => x.id === id);
          if (f) return `  - ${f.name} (${f.price.toLocaleString('fr-FR')} €)`;
        }
        return '';
      }).filter(Boolean).join('\n')
    }\n\nDevis estimé : ${totalHT.toLocaleString('fr-FR')} € HT (${totalTTC.toLocaleString('fr-FR')} € TTC)`;
    window.dispatchEvent(new CustomEvent('openDigitalClientSpace'));
    // Defer prefill to let modal mount
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('prefillProject', { detail: { title: `Projet ${project.name}`, description: summary, type: project.id, budget: totalHT > 50000 ? 'enterprise' : totalHT > 20000 ? 'large' : totalHT > 5000 ? 'medium' : 'small' } }));
    }, 200);
  };

  return (
    <>
      {/* Hero */}
      <section className="tile tile-pure pt-[100px] pb-12 sm:pt-[120px] sm:pb-16">
        <div className="container text-center">
          <span className="inline-block text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--ink-500)] mb-4">
            Devis interactif
          </span>
          <h1 className="display-1 text-[32px] sm:text-[64px] lg:text-[80px] text-[var(--ink-900)] mb-4">
            Simulez votre projet, <span className="accent-italic">en 1 minute.</span>
          </h1>
          <p className="subhead text-[17px] sm:text-[26px] text-[var(--ink-700)] max-w-[760px] mx-auto">
            Choisissez votre type de projet, ajoutez les fonctionnalités souhaitées. Le devis se met à jour en direct.
          </p>
          <a
            href="#simulator-form"
            className="mt-8 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--ink-900)] text-white shadow-lg"
            aria-label="Commencer"
          >
            <ArrowDown className="h-5 w-5" strokeWidth={1.7} />
          </a>
        </div>
      </section>

      {/* Simulator body */}
      <section id="simulator-form" className="tile tile-light py-16 sm:py-20">
        <div className="container">
          <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
            {/* LEFT - selectors */}
            <div className="space-y-10">
              {/* Project type */}
              <div>
                <h2 className="display-3 text-[22px] sm:text-[26px] text-[var(--ink-900)] mb-2">1. Type de projet</h2>
                <p className="text-[15px] text-[var(--ink-700)] mb-5">Sélectionnez la base. Vous pourrez ajuster les fonctionnalités après.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PROJECT_TYPES.map((p) => {
                    const active = projectType === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setProjectType(p.id)}
                        className={`text-left flex items-start gap-3 p-4 rounded-2xl transition-all ${
                          active
                            ? 'bg-white ring-2 ring-[var(--ink-900)] shadow-sm'
                            : 'bg-white ring-1 ring-[var(--ink-100)] hover:ring-[var(--ink-300)]'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-[var(--ink-900)]' : 'bg-[var(--ink-50)]'}`}>
                          <p.Icon className={active ? 'h-5 w-5 text-white' : 'h-5 w-5 text-[var(--ink-900)]'} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[15px] text-[var(--ink-900)]">{p.name}</span>
                            <span className="text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{p.base.toLocaleString('fr-FR')} €</span>
                          </div>
                          <p className="text-[13px] text-[var(--ink-500)] mt-0.5">{p.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Features by category */}
              <div>
                <h2 className="display-3 text-[22px] sm:text-[26px] text-[var(--ink-900)] mb-2">2. Fonctionnalités</h2>
                <p className="text-[15px] text-[var(--ink-700)] mb-6">Activez tout ce qui vous est utile. Le prix se met à jour en temps réel.</p>
                <div className="space-y-8">
                  {CATEGORIES.map((cat) => (
                    <div key={cat.id} className="bg-white rounded-[22px] ring-1 ring-[var(--ink-100)] p-5 sm:p-6">
                      <div className="mb-4">
                        <h3 className="display-3 text-[17px] text-[var(--ink-900)]">{cat.name}</h3>
                        <p className="text-[13.5px] text-[var(--ink-500)]">{cat.desc}</p>
                      </div>
                      <div className="space-y-1.5">
                        {cat.features.map((f) => {
                          const isOn = selected.has(f.id);
                          return (
                            <button
                              key={f.id}
                              onClick={() => toggle(f.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all ${
                                isOn ? 'bg-[var(--ink-50)]' : 'hover:bg-[var(--ink-50)]'
                              }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isOn ? 'bg-[var(--ink-900)]' : 'bg-white ring-1 ring-[var(--ink-100)]'}`}>
                                <f.Icon className={isOn ? 'h-4 w-4 text-white' : 'h-4 w-4 text-[var(--ink-900)]'} strokeWidth={1.5} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[14.5px] text-[var(--ink-900)]">{f.name}</span>
                                  {f.recommended && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--ink-900)] text-white font-semibold">Recommandé</span>
                                  )}
                                </div>
                                <span className="text-[12.5px] text-[var(--ink-500)] tabular-nums">+ {f.price.toLocaleString('fr-FR')} €{f.days ? ` · ${f.days}j` : ''}</span>
                              </div>
                              {/* Apple-style switch */}
                              <div
                                className={`relative w-[44px] h-[26px] rounded-full transition-colors flex-shrink-0 ${isOn ? 'bg-[var(--link)]' : 'bg-[var(--ink-100)]'}`}
                              >
                                <motion.span
                                  className="absolute top-[2px] w-[22px] h-[22px] rounded-full bg-white shadow-md"
                                  animate={{ left: isOn ? '20px' : '2px' }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h2 className="display-3 text-[22px] sm:text-[26px] text-[var(--ink-900)] mb-2">3. Délai de livraison</h2>
                <p className="text-[15px] text-[var(--ink-700)] mb-5">Plus c'est rapide, plus la priorité fait varier le coût.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TIMELINES.map((tlOpt) => {
                    const active = timeline === tlOpt.id;
                    const factor = tlOpt.mult === 1 ? '0%' : tlOpt.mult > 1 ? `+${Math.round((tlOpt.mult - 1) * 100)}%` : `−${Math.round((1 - tlOpt.mult) * 100)}%`;
                    return (
                      <button
                        key={tlOpt.id}
                        onClick={() => setTimeline(tlOpt.id)}
                        className={`p-4 rounded-2xl text-left transition-all ${
                          active
                            ? 'bg-white ring-2 ring-[var(--ink-900)] shadow-sm'
                            : 'bg-white ring-1 ring-[var(--ink-100)] hover:ring-[var(--ink-300)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-[var(--ink-900)]" strokeWidth={1.5} />
                            <span className="font-semibold text-[14.5px] text-[var(--ink-900)]">{tlOpt.label}</span>
                          </div>
                          <span className="text-[12px] font-bold tabular-nums text-[var(--ink-700)]">{factor}</span>
                        </div>
                        {tlOpt.recommended && <span className="mt-2 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--ink-900)] text-white font-semibold">Recommandé</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT - sticky mockup + summary */}
            <div className="lg:sticky lg:top-[80px]">
              <LiveMockup project={project} selectedFeatures={selected} onToggle={toggle} />
              <div ref={summaryRef} className="bg-white rounded-[22px] ring-1 ring-[var(--ink-100)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--ink-100)]">
                  <span className="inline-block text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--ink-500)] mb-1">Votre devis</span>
                  <h3 className="display-3 text-[22px] text-[var(--ink-900)]">{project.name}</h3>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Breakdown */}
                  <Row label="Base projet" value={`${project.base.toLocaleString('fr-FR')} €`} />
                  <Row label={`Fonctionnalités (×${selected.size})`} value={`+ ${addonsHT.toLocaleString('fr-FR')} €`} />
                  <Row label={`Multiplicateur ${tl.label}`} value={`×${tl.mult}`} />
                  <div className="border-t border-[var(--ink-100)] pt-4">
                    <div className="flex items-center justify-between text-[15px]">
                      <span className="text-[var(--ink-700)]">Total HT</span>
                      <span className="font-bold tabular-nums text-[var(--ink-900)]">
                        <MoneyCounter value={totalHT} /> €
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12.5px] mt-1">
                      <span className="text-[var(--ink-500)]">TVA 20 %</span>
                      <span className="text-[var(--ink-500)] tabular-nums">{Math.round(totalHT * 0.2).toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex items-center justify-between text-[18px] mt-2">
                      <span className="font-semibold text-[var(--ink-900)]">Total TTC</span>
                      <span className="font-bold tabular-nums text-[var(--ink-900)]">
                        <MoneyCounter value={totalTTC} /> €
                      </span>
                    </div>
                  </div>

                  {/* CII saving */}
                  <div className="rounded-2xl bg-[var(--bg-soft)] ring-1 ring-[var(--ink-100)] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--ink-900)]" strokeWidth={1.7} />
                      <span className="text-[12px] font-semibold text-[var(--ink-900)]">Crédit Impôt Innovation 20 %</span>
                    </div>
                    <p className="text-[12px] text-[var(--ink-700)] leading-snug">
                      Vous récupérez <strong className="tabular-nums">{cii.toLocaleString('fr-FR')} €</strong> grâce au CII. Coût réel : <strong className="tabular-nums">{(totalHT - cii).toLocaleString('fr-FR')} €</strong>.
                    </p>
                  </div>

                  {/* Timeline est */}
                  <div className="text-[12.5px] text-[var(--ink-500)] flex items-center justify-between">
                    <span>Estimation délai</span>
                    <span className="tabular-nums text-[var(--ink-900)] font-semibold">{totalDays} j-h · {tl.label}</span>
                  </div>
                </div>

                <div className="px-6 py-5 bg-[var(--ink-900)] text-white">
                  <button
                    onClick={sendQuote}
                    className="w-full py-3 rounded-full bg-white text-[var(--ink-900)] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[var(--ink-50)] transition-colors"
                  >
                    Recevoir ce devis
                    <Send className="h-4 w-4" strokeWidth={1.7} />
                  </button>
                  <p className="mt-2 text-[11px] text-white/55 text-center">
                    Devis indicatif. Un expert vous recontacte sous 24h.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span className="font-semibold tabular-nums text-[var(--ink-900)]">{value}</span>
    </div>
  );
}

export default Simulator;
