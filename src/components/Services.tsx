import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useInView as useFmInView, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Award, Play, TrendingUp, ArrowUpRight,
  LayoutDashboard, Users, Wallet, BarChart3, Settings, Eye, Zap,
  Cpu, MemoryStick, Activity, Shield,
  Building2, Store, Briefcase, Stethoscope,
  Search, Bell, ShoppingBag, MessageSquare, Send,
  Code2, Layers, Boxes, Beaker,
  CheckCircle2 as CheckIcon, Lock, GraduationCap,
  Menu, FileText, Soup, Package, History, Bike, MapPin, Clock, Wifi, X,
  Phone as PhoneIcon, Database, CalendarDays, Sparkles,
  AlertTriangle, BookOpen,
} from 'lucide-react';
import { useRef } from 'react';
import {
  ReactLogo, ReactNativeLogo, TypeScriptLogo, NodeLogo, TailwindLogo,
  AWSLogo, PostgresLogo, StripeLogo, NextLogo, VercelLogo, DockerLogo, SwiftLogo,
  TechChip,
} from './TechLogos';

/**
 * Apple-style services with stacked full-bleed tiles
 * + heavily animated content inside each mockup illustration.
 * - Web: KPIs count up, bars grow staggered, "live" pulse on latest
 * - Mobile: 3 phones float, messages appear one by one, badge pulses
 * - Enterprise: Kanban with drag-simulated card moving + animated progress bars
 * - Cloud: live changing metrics + pulsing servers + scrolling logs
 * - Training: progress bar grows + chapters check off
 */

/* ============================================================
   Animated counter (counts up on view)
   ============================================================ */
function Counter({ to, duration = 1.2, suffix = '', prefix = '', decimals = 0 }: { to: number; duration?: number; suffix?: string; prefix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useFmInView(ref, { once: false, amount: 0.5 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) { setVal(0); return; }
    let raf = 0;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(eased * to);
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return <span ref={ref}>{prefix}{val.toFixed(decimals)}{suffix}</span>;
}

/* ============================================================
   1. Web mockup - Analytics dashboard, animated
   ============================================================ */
/* Illustrations papercraft Pyemes (HandSoap / TagLabel / ShieldCheck / WarningSign / PaperPlane) */
function Papercraft({ kind }: { kind: 'hand' | 'tag' | 'shield' | 'warn' | 'plane' }) {
  const sp = { stroke: '#0A0A0C', strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  if (kind === 'hand') return (
    <svg viewBox="0 0 120 100" style={{ width: 40, height: 30 }}>
      <circle cx="35" cy="30" r="8" fill="#DBEAFE" {...sp} />
      <circle cx="50" cy="20" r="5" fill="#DBEAFE" {...sp} />
      <circle cx="62" cy="32" r="4" fill="#DBEAFE" {...sp} />
      <path d="M40 50 L40 80 Q40 90 50 90 L78 90 Q88 90 88 80 L88 55 Q88 50 83 50 Q78 50 78 55 L78 65 L75 65 L75 50 Q75 45 70 45 Q65 45 65 50 L65 65 L62 65 L62 48 Q62 43 57 43 Q52 43 52 48 L52 65 L49 65 L49 52 Q49 47 44 47 Q40 47 40 50 Z" fill="#FFE5D9" {...sp} />
    </svg>
  );
  if (kind === 'tag') return (
    <svg viewBox="0 0 120 100" style={{ width: 40, height: 30 }}>
      <path d="M25 30 L75 30 L95 50 L75 70 L25 70 Z" fill="#FEF3C7" {...sp} />
      <circle cx="35" cy="50" r="4" fill="#fff" {...sp} />
      <line x1="50" y1="44" x2="78" y2="44" stroke="#0A0A0C" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="52" x2="72" y2="52" stroke="#0A0A0C" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="60" x2="76" y2="60" stroke="#0A0A0C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  if (kind === 'shield') return (
    <svg viewBox="0 0 120 100" style={{ width: 40, height: 30 }}>
      <path d="M60 12 L88 22 L88 50 Q88 74 60 90 Q32 74 32 50 L32 22 Z" fill="#E5DEFF" {...sp} />
      <path d="M45 50 L55 60 L75 40" fill="none" stroke="#0A0A0C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (kind === 'warn') return (
    <svg viewBox="0 0 120 100" style={{ width: 40, height: 30 }}>
      <path d="M60 15 L95 80 L25 80 Z" fill="#FFE5D9" {...sp} />
      <line x1="60" y1="35" x2="60" y2="58" stroke="#0A0A0C" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="68" r="2.5" fill="#0A0A0C" />
    </svg>
  );
  return (
    <svg viewBox="0 0 120 100" style={{ width: 40, height: 30 }}>
      <path d="M30 65 L100 25 L55 60 Z" fill="#D5F4E6" {...sp} />
      <path d="M55 60 L100 25 L60 80 Z" fill="#B8E8D2" {...sp} />
      <path d="M55 60 L60 80 L48 72 Z" fill="#D5F4E6" {...sp} />
    </svg>
  );
}

function WebMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useFmInView(ref, { once: false, amount: 0.4 });
  // Conformite progression (effet visuel : 0 -> 100 en 6s, pause 1.2s, reset)
  const [conformite, setConformite] = useState(0);
  useEffect(() => {
    if (!inView) { setConformite(0); return; }
    let raf = 0; let phase: 'count' | 'pause' = 'count'; let start = performance.now();
    const DURATION = 6000, PAUSE = 1200;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (phase === 'count') {
        if (elapsed >= DURATION) { setConformite(100); phase = 'pause'; start = now; }
        else setConformite(Math.round((elapsed / DURATION) * 100));
      } else if (elapsed >= PAUSE) { phase = 'count'; start = now; setConformite(0); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);
  // Etape progression
  const [etape] = useState(4);

  return (
    <div ref={ref} className="relative w-full max-w-[760px] mx-auto pb-2">
      {/* Cadre iPad TOUJOURS visible (desktop + mobile) */}
      <div
        className="absolute inset-0 -m-[8px] sm:-m-[12px] md:-m-[14px] rounded-[24px] sm:rounded-[30px] md:rounded-[34px] pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.06)',
        }}
        aria-hidden
      >
        <div className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#0B0E14] ring-1 ring-white/8" />
      </div>
    <div
      className="relative w-full aspect-[16/10] rounded-[18px] sm:rounded-[22px] mx-auto overflow-hidden"
      style={{
        background: '#F5F5F7',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.15)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* Browser chrome */}
      <div className="absolute top-0 inset-x-0 h-9 flex items-center px-4 gap-2 border-b border-[#E5E5EA] bg-white/95">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        <div className="ml-3 flex-1 h-4 rounded-full bg-[#F2F2F7]" />
      </div>

      <div className="absolute top-9 inset-x-0 bottom-0 flex bg-[#F8F8F7]">
        {/* SIDEBAR Pyemes : noir avec quadrillage + sections (Vue d'ensemble / PMS / Tarif / Support / User) */}
        <div
          className="w-[28%] flex-shrink-0 p-2 sm:p-2.5 text-white flex flex-col gap-1.5 overflow-hidden"
          style={{
            background: '#0F1216',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '10px 10px',
          }}
        >
          {/* Logo Pyemes : hub-and-spokes (4 cardinaux + 5 cercles) - identique pyemes.com */}
          <div className="flex items-center gap-1 mb-1">
            <svg viewBox="-50 -50 100 100" style={{ width: 13, height: 13, display: 'block' }} className="flex-shrink-0" aria-hidden>
              <g>
                <line x1="0" y1="0" x2="0" y2="-42" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="0" y2="42" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-42" y2="0" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="42" y2="0" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
                <circle cx="0" cy="0" r="11" fill="#fff" />
                <circle cx="0" cy="-42" r="7" fill="#fff" />
                <circle cx="0" cy="42" r="7" fill="#fff" />
                <circle cx="-42" cy="0" r="7" fill="#fff" />
                <circle cx="42" cy="0" r="7" fill="#fff" />
              </g>
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight">Pyemes</span>
          </div>

          {/* Vue d'ensemble - item actif */}
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex items-center gap-1 px-1.5 py-1 rounded-[4px] bg-white/8"
          >
            <LayoutDashboard className="text-white flex-shrink-0" style={{ width: 8, height: 8 }} strokeWidth={1.7} />
            <span className="text-[8px] font-semibold text-white whitespace-nowrap overflow-hidden">Vue d'ensemble</span>
          </motion.div>

          {/* Section PMS */}
          <div className="mt-1">
            <div className="text-[6.5px] sm:text-[7px] font-bold tracking-[0.1em] text-white/45 px-1 mb-0.5 leading-tight">PLAN DE MAÎTRISE SANITAIRE</div>
            {[
              { Icon: Sparkles, label: 'Bonnes pratiques' },
              { Icon: FileText, label: 'Traçabilités' },
              { Icon: Shield, label: 'Méthodes HACCP' },
              { Icon: AlertTriangle, label: 'Non-conformités' },
              { Icon: BookOpen, label: 'Documents' },
              { Icon: Send, label: 'Envoyer mon PMS' },
            ].map(({ Icon, label }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.04 }}
                className="flex items-center gap-1 px-1.5 py-[3px] rounded-[3px]"
              >
                <Icon className="text-white/55 flex-shrink-0" style={{ width: 7.5, height: 7.5 }} strokeWidth={1.6} />
                <span className="text-[7.5px] text-white/70 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
              </motion.div>
            ))}
          </div>

          {/* Card Tarif Pyemes complete (recommande + prix + economie + CTA + sous-mention) */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-auto rounded-[6px] bg-white/5 ring-1 ring-white/10 p-1.5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[5.5px] sm:text-[6px] font-bold tracking-[0.1em] text-white/50">PLAN · ANNUEL</span>
              <span className="text-[5.5px] sm:text-[6px] font-bold tracking-[0.08em] text-[#10B981]">RECOMMANDÉ</span>
            </div>
            <div className="text-[7px] sm:text-[7.5px] font-semibold text-white leading-tight">PMS Pyemes</div>
            <div className="text-[11px] sm:text-[13px] font-bold text-white leading-none tabular-nums">14 €<span className="text-[6px] text-white/55 font-normal ml-0.5">/mois HT</span></div>
            <div className="text-[5.5px] sm:text-[6px] text-white/55 leading-tight mt-0.5">Annuel · économie 60€/an · 9€/mois promo</div>
            <div className="mt-1 rounded-[4px] bg-white text-[#0F1216] text-[6.5px] sm:text-[7px] font-bold px-1.5 py-1 text-center">Choisir mon forfait</div>
            <div className="text-[5.5px] text-white/45 text-center mt-0.5">3 forfaits · Stripe</div>
          </motion.div>

          {/* Footer sidebar : Support + User + Logout (cache mobile pour densite) */}
          <div className="hidden sm:block space-y-1 pt-1">
            <div className="flex items-center gap-1 px-1">
              <div className="rounded-full bg-white/8 flex items-center justify-center" style={{ width: 11, height: 11 }}>
                <span className="text-white/70 text-[7px]">💡</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[6.5px] font-semibold text-white/85 leading-tight">Idée & support</div>
              </div>
            </div>
            <div className="flex items-center gap-1 px-1 pt-0.5 border-t border-white/8">
              <div className="rounded-full bg-[#10B981] flex items-center justify-center text-white text-[5.5px] font-bold" style={{ width: 11, height: 11 }}>NA</div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="text-[6px] font-semibold text-white/85 leading-tight truncate">NOVASKILL ACAD...</div>
                <div className="text-[5.5px] text-white/45 tabular-nums leading-tight">999 458 946 00012</div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 p-2 sm:p-3 min-w-0 overflow-hidden">
          {/* BANNER CONFORMITÉ + PROCHAINE ETAPE GUIDÉE */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-[8px] bg-white ring-1 ring-black/5 p-2 relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-[2px] bg-[#E5E5EA]">
              <div className="h-full transition-[width] duration-150" style={{ width: conformite + '%', background: 'linear-gradient(to right, #6B3D1F 0%, #1FB54E 33%, #F5A623 66%, #2BB7DE 100%)' }} />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-[6px] sm:text-[6.5px] font-bold tracking-[0.1em] uppercase text-[#86868B] leading-tight">Conformité</div>
              <div className="text-[12px] sm:text-[14px] font-bold text-[#1D1D1F] tabular-nums leading-none">{conformite} %</div>
            </div>
            <div className="mt-1.5 rounded-[5px] bg-[#F1F0EE] ring-1 ring-black/5 p-1.5 flex items-center gap-1.5">
              {/* IsoPms cube isometrique - identique a pyemes.com */}
              <svg viewBox="0 0 40 40" style={{ width: 22, height: 22 }} className="flex-shrink-0" aria-hidden>
                <path d="M6 17 L20 24 L34 17 L20 10 Z" fill="#D5C8FF" stroke="#0A0A0C" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M6 17 L20 24 L20 32 L6 25 Z" fill="#FFFFFF" stroke="#0A0A0C" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M20 24 L34 17 L34 25 L20 32 Z" fill="#F4EDE0" stroke="#0A0A0C" strokeWidth="1.2" strokeLinejoin="round"/>
                <rect x="22" y="20" width="6" height="2" fill="#FCD34D" stroke="#0A0A0C" strokeWidth="0.6"/>
              </svg>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="text-[5.5px] sm:text-[6px] font-bold tracking-[0.08em] uppercase text-[#86868B] leading-tight">Prochaine étape guidée</div>
                <div className="text-[7.5px] sm:text-[8px] font-semibold text-[#1D1D1F] leading-tight truncate">Choisissez votre forfait</div>
                <div className="text-[6px] sm:text-[6.5px] text-[#86868B] leading-tight truncate">Dès 9€/mois · Stripe · sans engagement</div>
              </div>
              <div className="rounded-full bg-[#1D1D1F] text-white text-[6.5px] sm:text-[7px] font-semibold px-1.5 sm:px-2 py-0.5 whitespace-nowrap flex-shrink-0">Choisir →</div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[6px] sm:text-[6.5px] text-[#1D1D1F] font-medium truncate">Voir les 19 actions à traiter →</span>
              <span className="text-[6px] sm:text-[6.5px] text-[#86868B] tabular-nums flex-shrink-0 ml-1">Étape {etape} / 22</span>
            </div>
          </motion.div>

          {/* TOOLBAR DARK */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-[8px] bg-[#0F1216] px-1.5 py-1 flex items-center gap-1 overflow-hidden whitespace-nowrap"
          >
            <span className="text-white/45 text-[8px] px-0.5 flex-shrink-0">←</span>
            <span className="text-white/45 text-[8px] px-0.5 flex-shrink-0">→</span>
            <span className="text-white/25 text-[8px] mx-0.5 flex-shrink-0">|</span>
            {[
              { Icon: Activity, label: 'Température' },
              { Icon: Database, label: 'Réception' },
              { Icon: FileText, label: 'Tracer un lot' },
            ].map(({ Icon, label }, i) => (
              <div key={i} className="flex-1 bg-white/10 rounded-full flex items-center justify-center gap-1 px-2 py-1 overflow-hidden">
                <Icon className="text-white/80 flex-shrink-0" style={{ width: 7, height: 7 }} strokeWidth={1.7} />
                <span className="text-[6.5px] sm:text-[7px] text-white/90 font-medium">{label}</span>
              </div>
            ))}
          </motion.div>

          {/* TABLEAU DE BORD - BIENVENUE */}
          <div className="px-0.5">
            <div className="text-[6.5px] sm:text-[7px] font-bold tracking-[0.1em] uppercase text-[#86868B] leading-tight">Tableau de bord</div>
            <div className="text-[12px] sm:text-[14px] font-bold text-[#1D1D1F] tracking-tight leading-tight">Bienvenue</div>
          </div>

          {/* PLAN DE MAÎTRISE SANITAIRE - 5 cards Pyemes avec illustrations papercraft */}
          <div>
            <div className="text-[6.5px] sm:text-[7px] font-bold tracking-[0.1em] uppercase text-[#86868B] px-0.5 mb-1">Plan de maîtrise sanitaire</div>
            <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
              {[
                { title: "Bonnes pratiques d'hygiène", sub: 'Procédures de nettoyage, désinfection, lavage des mains.', illu: 'hand' },
                { title: 'Traçabilités', sub: 'Réceptions, températures, lots, DLC.', illu: 'tag' },
                { title: 'Méthodes HACCP', sub: 'Tableau HACCP et 7 principes Codex Alimentarius.', illu: 'shield' },
                { title: 'Non-conformités', sub: 'Fiches NC + actions correctives.', illu: 'warn' },
                { title: 'Envoyer mon PMS', sub: 'Lien lecture seule pour la DDPP.', illu: 'plane' },
              ].map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.35, delay: 0.3 + i * 0.05 }}
                  className="rounded-[6px] sm:rounded-[8px] bg-white ring-1 ring-black/5 p-1.5 sm:p-2 flex flex-col gap-1 overflow-hidden relative"
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                >
                  <div className="text-[7px] sm:text-[8px] font-bold text-[#1D1D1F] leading-tight min-h-[20px]">{c.title}</div>
                  <div className="text-[5.5px] sm:text-[6.5px] text-[#86868B] leading-snug overflow-hidden min-h-[18px]" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.sub}</div>
                  <div className="mt-auto flex justify-center pt-1">
                    <Papercraft kind={c.illu as 'hand' | 'tag' | 'shield' | 'warn' | 'plane'} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

/* ============================================================
   2. Mobile mockup - 3 floating phones with animated content
   ============================================================ */
function MobileMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useFmInView(ref, { once: false, amount: 0.3 });

  return (
    <div ref={ref} className="relative w-full max-w-[680px] aspect-[10/9] sm:aspect-[16/10] mx-auto flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center scale-[0.72] sm:scale-100">
        {/* Left phone (back-left, gently floating) */}
        <motion.div
          className="absolute"
          style={{ filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.18))' }}
          initial={{ x: -120, y: 0, rotate: -8, opacity: 0 }}
          animate={inView ? {
            x: -150,
            y: [0, -12, 0],
            rotate: -8,
            opacity: 1,
          } : {}}
          transition={{
            x: { duration: 0.8, ease: 'easeOut' },
            opacity: { duration: 0.6 },
            rotate: { duration: 0.8 },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <Phone scale={0.85}><PhoneScreenMenu inView={inView} /></Phone>
        </motion.div>

        {/* Right phone (back-right) */}
        <motion.div
          className="absolute"
          style={{ filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.18))' }}
          initial={{ x: 120, y: 0, rotate: 8, opacity: 0 }}
          animate={inView ? {
            x: 150,
            y: [0, -10, 0],
            rotate: 8,
            opacity: 1,
          } : {}}
          transition={{
            x: { duration: 0.8, ease: 'easeOut', delay: 0.1 },
            opacity: { duration: 0.6, delay: 0.1 },
            rotate: { duration: 0.8 },
            y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
          }}
        >
          <Phone scale={0.85}><PhoneScreenNewOrder inView={inView} /></Phone>
        </motion.div>

        {/* Center phone (front, larger, floats) */}
        <motion.div
          className="relative z-10"
          style={{ filter: 'drop-shadow(0 40px 50px rgba(0,0,0,0.22))' }}
          initial={{ y: 0, opacity: 0, scale: 0.94 }}
          animate={inView ? {
            y: [0, -8, 0],
            opacity: 1,
            scale: 1,
          } : {}}
          transition={{
            opacity: { duration: 0.5 },
            scale: { duration: 0.6, ease: 'easeOut' },
            y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <Phone scale={1}><PhoneScreenDriver inView={inView} /></Phone>
        </motion.div>
      </div>
    </div>
  );
}

/* iPhone 17 Pro accurate frame: titanium gradient with edge highlights,
 * Dynamic Island pill, side buttons (volume up/down, action, power). */
function Phone({ children, scale = 1 }: { children: React.ReactNode; scale?: number }) {
  const W = 188 * scale;
  const H = 388 * scale;
  return (
    <div
      className="relative"
      style={{
        width: W,
        height: H,
        borderRadius: 42 * scale,
        padding: 4 * scale,
        background: 'linear-gradient(135deg, #4a4a4d 0%, #2c2c2e 12%, #1a1a1c 50%, #2c2c2e 88%, #4a4a4d 100%)',
        boxShadow: `
          0 0 0 1px rgba(255,255,255,0.08) inset,
          0 0 0 1.5px rgba(0,0,0,0.45),
          0 30px 50px -20px rgba(0,0,0,0.4),
          0 8px 16px -4px rgba(0,0,0,0.25)
        `,
      }}
    >
      {/* Inner bezel (deeper black) */}
      <div
        className="w-full h-full relative overflow-hidden bg-black"
        style={{
          borderRadius: 38 * scale,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.6) inset',
        }}
      >
        {/* Screen content */}
        <div className="absolute inset-0">{children}</div>

        {/* Dynamic Island - 17 Pro pill */}
        <div
          className="absolute z-30"
          style={{
            top: 6 * scale,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 60 * scale,
            height: 16 * scale,
            background: '#000',
            borderRadius: 10 * scale,
            boxShadow: '0 0 0 0.5px rgba(255,255,255,0.06) inset',
          }}
        />
      </div>

      {/* Left side buttons (mute, volume up, volume down) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: -1.5 * scale,
          top: 70 * scale,
          width: 2.5 * scale,
          height: 22 * scale,
          background: 'linear-gradient(90deg, #1a1a1c, #2c2c2e)',
          borderTopLeftRadius: 1.5 * scale,
          borderBottomLeftRadius: 1.5 * scale,
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: -1.5 * scale,
          top: 105 * scale,
          width: 2.5 * scale,
          height: 38 * scale,
          background: 'linear-gradient(90deg, #1a1a1c, #2c2c2e)',
          borderTopLeftRadius: 1.5 * scale,
          borderBottomLeftRadius: 1.5 * scale,
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: -1.5 * scale,
          top: 152 * scale,
          width: 2.5 * scale,
          height: 38 * scale,
          background: 'linear-gradient(90deg, #1a1a1c, #2c2c2e)',
          borderTopLeftRadius: 1.5 * scale,
          borderBottomLeftRadius: 1.5 * scale,
        }}
      />
      {/* Right side buttons (Action button, Power) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: -1.5 * scale,
          top: 95 * scale,
          width: 2.5 * scale,
          height: 28 * scale,
          background: 'linear-gradient(270deg, #1a1a1c, #2c2c2e)',
          borderTopRightRadius: 1.5 * scale,
          borderBottomRightRadius: 1.5 * scale,
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: -1.5 * scale,
          top: 138 * scale,
          width: 2.5 * scale,
          height: 56 * scale,
          background: 'linear-gradient(270deg, #1a1a1c, #2c2c2e)',
          borderTopRightRadius: 1.5 * scale,
          borderBottomRightRadius: 1.5 * scale,
        }}
      />

      {/* Subtle screen reflection sheen (top-left highlight) */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: 4 * scale,
          left: 4 * scale,
          right: 4 * scale,
          height: H * 0.45,
          borderTopLeftRadius: 38 * scale,
          borderTopRightRadius: 38 * scale,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 60%)',
        }}
      />
    </div>
  );
}

/* PhoneScreenMenu - exact reproduction of DrawerMenu.tsx from deliveryeat-restaurant.
 * White drawer with logo top + 9 items + 2 round action buttons + green accepting bar. */
function PhoneScreenMenu({ inView }: { inView: boolean }) {
  const items = [
    'Disponibilité des menus',
    'Demandes livreur',
    'Horaires',
    "Guide d'utilisation",
    'Aide',
    'Écran de test',
    'Parcours de simulation',
    'Imprimante Bluetooth',
    'Réglages',
  ];
  return (
    <div className="absolute inset-0 bg-white overflow-hidden flex flex-col">
      {/* Status bar */}
      <div className="absolute top-[5px] left-0 right-0 px-3 flex items-center justify-between text-[7px] font-semibold z-20 text-[#0A0A0A]">
        <span>18:46</span>
        <span className="flex items-center gap-0.5">
          <Wifi className="h-2 w-2" strokeWidth={2.4} />
          <span className="text-[6px]">25%</span>
        </span>
      </div>

      {/* Header: brand logo + close X (matches DrawerMenu paddingHorizontal:24, paddingTop:60, paddingBottom:24) */}
      <div className="absolute top-[28px] left-[12px] right-[12px] flex items-center justify-between">
        <img
          src="/de-logo.png"
          alt="DeliveryEat"
          className="object-contain"
          style={{ width: 70, height: 16 }}
          draggable={false}
        />
        <X className="h-3.5 w-3.5 text-[#0A0A0A]" strokeWidth={2} />
      </div>

      {/* Items list (paddingHorizontal: 28 in original) */}
      <div className="absolute top-[58px] left-[14px] right-[14px] bottom-[100px] overflow-hidden">
        {items.map((label, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.3, delay: 0.15 + i * 0.035 }}
            className="text-[#0A0A0A]"
            style={{
              paddingTop: 5,
              paddingBottom: 5,
              fontSize: 8.5,
              fontWeight: 500,
              letterSpacing: '-0.2px',
            }}
          >
            {label}
          </motion.div>
        ))}
      </div>

      {/* Round action buttons row (paddingHorizontal:16, paddingBottom:28, paddingTop:20) */}
      <div className="absolute bottom-[30px] left-0 right-0 flex items-start justify-around" style={{ padding: '8px 8px 0 8px' }}>
        <div className="flex flex-col items-center gap-1" style={{ width: 60 }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 26, height: 26, background: '#F2F2F2' }}
          >
            <PauseIcon size={12} />
          </div>
          <span className="text-[6.5px] font-medium text-[#0A0A0A] text-center leading-[1.2]">Mettre en pause</span>
        </div>
        <div className="flex flex-col items-center gap-1" style={{ width: 60 }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 26, height: 26, background: '#F2F2F2' }}
          >
            <PhoneIcon className="text-[#0A0A0A]" style={{ width: 12, height: 12 }} strokeWidth={1.8} />
          </div>
          <span className="text-[6.5px] font-medium text-[#0A0A0A] text-center leading-[1.2]">Contacter le support</span>
        </div>
      </div>

      {/* Bottom green bar #44A046 with ring-dot - matches DrawerMenu acceptingBar */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-3"
        style={{ background: '#44A046', padding: '8px 12px' }}
      >
        <span
          className="rounded-full border-[1.5px] border-white"
          style={{ width: 7, height: 7 }}
        />
        <span className="text-[7.5px] font-medium text-white">Acceptation des commandes</span>
      </div>
    </div>
  );
}

/* Pause icon (Feather "pause" replacement: 2 vertical bars) */
function PauseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

/* PhoneScreenNewOrder - exact reproduction of NewOrderOverlay.tsx fallback card.
 * Cyan card (#59C7DD = UE.green) inside dark navy padding, big number with pulse 1->1.08 loop. */
function PhoneScreenNewOrder({ inView }: { inView: boolean }) {
  const [count, setCount] = useState(1);

  // Cycle the count to simulate incoming orders
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setCount((c) => (c >= 5 ? 1 : c + 1)), 4500);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#101820' }}>
      {/* Status bar */}
      <div className="absolute top-[5px] left-0 right-0 px-3 flex items-center justify-between text-[7px] font-semibold z-20 text-white">
        <span>18:46</span>
        <span className="flex items-center gap-0.5">
          <Wifi className="h-2 w-2" strokeWidth={2.4} />
          <span className="text-[6px]">25%</span>
        </span>
      </div>

      {/* Cyan card with rounded-[20px] inside padding (16 in original, scaled to 8 here) */}
      <div
        className="absolute inset-2 top-[26px] flex flex-col items-center justify-center"
        style={{ background: '#59C7DD', borderRadius: 16 }}
      >
        {/* Big circle with darker overlay (rgba(0,0,0,0.18)) - 220px in original, ~110 here */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex items-center justify-center mb-3"
          style={{
            width: 110,
            height: 110,
            borderRadius: 55,
            background: 'rgba(0,0,0,0.18)',
          }}
        >
          <motion.span
            key={count}
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="text-white font-bold tabular-nums"
            style={{
              fontSize: 64,
              lineHeight: '70px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
              letterSpacing: '-0.03em',
            }}
          >
            {count}
          </motion.span>
        </motion.div>

        {/* Title - 36 in original, scaled to 14 */}
        <motion.div
          key={`title-${count}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="text-white font-bold text-center leading-[1.1]"
          style={{ fontSize: 13, letterSpacing: '-0.3px' }}
        >
          {count > 1 ? 'Nouvelles' : 'Nouvelle'}<br />
          commande{count > 1 ? 's' : ''}
        </motion.div>

        {/* Hint - 16 in original, scaled to 7 */}
        <p className="mt-2 text-white/85 text-center px-2" style={{ fontSize: 7 }}>
          Appuyez n'importe où pour fermer
        </p>
      </div>
    </div>
  );
}

/* PhoneScreenDriver - reproduces the deliveryeat-restaurant driver online screen.
 * Interactive: click "Tester en préparation" or "Tester nouvelle commande" to
 * see an animated incoming order card slide up. */
function PhoneScreenDriver({ inView }: { inView: boolean }) {
  const [demo, setDemo] = useState<null | 'new' | 'inprogress'>(null);

  // Auto-dismiss after 3.5s
  useEffect(() => {
    if (!demo) return;
    const id = setTimeout(() => setDemo(null), 3500);
    return () => clearTimeout(id);
  }, [demo]);

  const triggerNew = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    setDemo('new');
  };
  const triggerInProgress = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    setDemo('inprogress');
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#101820' }}>
      {/* Status bar */}
      <div className="absolute top-[5px] left-0 right-0 px-3 flex items-center justify-between text-[7px] font-semibold z-20 text-white">
        <span>18:26</span>
        <span className="flex items-center gap-0.5">
          <span className="text-[6px]">●●●●</span>
          <Wifi className="h-2 w-2" strokeWidth={2.4} />
          <span className="text-[6px]">25%</span>
        </span>
      </div>

      {/* Sidebar (matches SideNav.tsx: 88px wide, accepting strip 5px green on top, items 60x60) */}
      <div className="absolute top-[26px] left-0 bottom-0 w-[42px]" style={{ background: '#101820' }}>
        {/* Accepting strip (top 5px green) */}
        <div className="h-[3px]" style={{ background: '#59C7DD' }} />
        <div className="flex flex-col items-center gap-[6px] pt-[6px]">
          {[Menu, FileText, Soup, ShoppingBag, History].map((Icon, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
              className="w-[30px] h-[30px] flex items-center justify-center"
              style={{ background: i === 1 ? '#3E4147' : '#1C2026', borderRadius: 6 }}
            >
              <Icon className="h-[14px] w-[14px] text-white" strokeWidth={1.6} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Center content - flex column with gif center, buttons stacked right-aligned */}
      <div className="absolute top-[26px] left-[44px] right-0 bottom-0 flex flex-col px-2.5 pt-3">
        {/* Centered area: GIF + badge + sub */}
        <div className="flex-1 flex flex-col items-center justify-center w-full" style={{ gap: 10 }}>
          {/* GIF wrap with pulsing ring */}
          <div className="relative flex items-center justify-center" style={{ width: 84, height: 84 }}>
            <motion.div
              className="absolute rounded-full border-[1.5px]"
              style={{ width: 84, height: 84, borderColor: '#59C7DD' }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0.15, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />
            <div
              className="relative rounded-full flex items-center justify-center overflow-hidden"
              style={{ width: 84, height: 84, background: '#1C2026' }}
            >
              <img
                src="/livreur.gif"
                alt="Livreur"
                style={{ width: 58, height: 58, objectFit: 'contain' }}
                draggable={false}
              />
            </div>
          </div>

          {/* Online badge - bigger to match original 14/7 padding */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="inline-flex items-center rounded-full"
            style={{ background: 'rgba(68,160,70,0.15)', padding: '4px 10px', gap: 5 }}
          >
            <span className="rounded-full" style={{ width: 5, height: 5, background: '#44A046' }} />
            <span style={{ color: '#7FD180', fontSize: 8, fontWeight: 600 }}>Vous êtes en ligne</span>
          </motion.div>

          <p style={{ color: '#9CA0A5', fontSize: 8, fontWeight: 500 }}>En attente de commandes…</p>
        </div>

        {/* Bottom CTA - HapticButton variant="outline" exact specs */}
        <div className="w-full" style={{ paddingLeft: 4, paddingRight: 4, paddingBottom: 10, paddingTop: 6 }}>
          <button
            className="w-full text-white flex items-center justify-center"
            style={{
              borderRadius: 7,
              paddingTop: 6,
              paddingBottom: 6,
              border: '1px solid rgba(255,255,255,0.25)',
              fontSize: 8,
              fontWeight: 600,
              letterSpacing: '-0.1px',
              background: 'transparent',
            }}
          >
            Se mettre hors ligne
          </button>
        </div>
      </div>

      {/* Animated incoming order overlay */}
      <AnimatePresence>
        {demo && (
          <motion.div
            key={demo}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="absolute inset-x-2 bottom-2 rounded-[10px] bg-white text-[#1D1D1F] p-2 shadow-2xl ring-1 ring-black/5"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1 text-[7.5px] font-bold tracking-wider uppercase">
                <Bike className="h-2.5 w-2.5" strokeWidth={2} />
                {demo === 'new' ? 'Nouvelle course' : 'En préparation'}
              </span>
              <span className="text-[8.5px] font-bold tabular-nums">+ 6,80 €</span>
            </div>
            <div className="flex items-start gap-1 mb-0.5">
              <span className="w-1 h-1 rounded-full bg-[#1D1D1F] mt-[3px] flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[6.5px] text-[#86868B]">Récupérer</div>
                <div className="text-[8px] font-semibold truncate">Le Comptoir Niçois</div>
              </div>
            </div>
            <div className="flex items-start gap-1 mb-1">
              <MapPin className="h-2 w-2 mt-[2px] flex-shrink-0 text-[#1D1D1F]" strokeWidth={2} />
              <div className="min-w-0">
                <div className="text-[6.5px] text-[#86868B]">Déposer</div>
                <div className="text-[8px] font-semibold truncate">12 rue Masséna · 2,4 km</div>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <button className="flex-1 text-[7px] font-semibold py-0.5 rounded-full bg-[#F2F2F7] text-[#3C3C43]">Refuser</button>
              <button className="flex-1 text-[7px] font-semibold py-0.5 rounded-full bg-[#1D1D1F] text-white">Accepter</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhoneScreenMessages({ inView }: { inView: boolean }) {
  const messages = [
    { n: 'Marie', t: 'Le devis est parfait, on signe !', d: '14:32', u: true },
    { n: 'Thomas', t: 'Réunion demain à 10h ?', d: '13:08', u: true },
    { n: 'Sophie', t: 'Merci pour la livraison rapide', d: '12:45' },
    { n: 'Lucas', t: 'Photo du chantier 📸', d: '11:20' },
    { n: 'Élise', t: 'OK pour vendredi', d: '09:15' },
    { n: 'Karim', t: 'Disponible cet après-midi ?', d: 'Hier' },
  ];

  return (
    <div className="absolute inset-0 bg-white">
      <div className="absolute top-[26px] left-0 right-0 px-3 pb-2 border-b border-[#E5E5EA]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#0066CC]">Modifier</span>
          <span className="text-[12px] font-bold text-[#1D1D1F]">Messages</span>
          <motion.span
            className="relative w-3 h-3 rounded-full bg-[#F2F2F7] flex items-center justify-center"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#1D1D1F] flex items-center justify-center text-[6px] font-bold text-white">2</span>
          </motion.span>
        </div>
      </div>
      <div className="absolute top-[60px] inset-x-0 bottom-0 overflow-hidden">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.4 + i * 0.12 }}
            className="flex items-center gap-2 px-3 py-2 border-b border-[#F2F2F7]"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#86868B] to-[#1D1D1F] flex items-center justify-center text-white text-[8.5px] font-bold flex-shrink-0">{m.n[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#1D1D1F]">{m.n}</span>
                <span className="text-[8px] text-[#86868B]">{m.d}</span>
              </div>
              <div className="text-[9px] text-[#3C3C43] truncate">{m.t}</div>
            </div>
            {m.u && <span className="w-1.5 h-1.5 rounded-full bg-[#1D1D1F] flex-shrink-0" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PhoneScreenOrders({ inView }: { inView: boolean }) {
  return (
    <div className="absolute inset-0 bg-white">
      <div className="absolute top-[26px] left-3 right-3">
        <div className="text-[8px] text-[#86868B] uppercase tracking-wider font-semibold">Aujourd'hui</div>
        <div className="text-[12px] font-bold text-[#1D1D1F]">3 commandes</div>
      </div>
      <div className="absolute top-[70px] inset-x-3 space-y-1.5">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
            className="bg-[#FAFAFA] rounded-[8px] p-1.5 ring-1 ring-[#E5E5EA]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#1D1D1F]">#A24{i}</span>
              <span className="text-[8px] text-[#86868B]">12:0{i}</span>
            </div>
            <motion.div
              className="h-1 rounded-full bg-[#1D1D1F] mt-1"
              initial={{ width: 0 }}
              animate={inView ? { width: `${30 + i * 20}%` } : {}}
              transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PhoneScreenProfile({ inView }: { inView: boolean }) {
  return (
    <div className="absolute inset-0 bg-white">
      <div className="absolute top-[28px] inset-x-0 flex flex-col items-center">
        <motion.div
          className="w-12 h-12 rounded-full bg-gradient-to-br from-[#86868B] to-[#1D1D1F]"
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.4 }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-2 text-[10px] font-bold text-[#1D1D1F]"
        >
          Marie Lambert
        </motion.div>
        <div className="text-[8px] text-[#86868B]">Membre Premium</div>
      </div>
      <div className="absolute top-[120px] inset-x-3 space-y-1.5">
        {['Mon compte', 'Commandes', 'Paiement', 'Préférences'].map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.35, delay: 0.7 + i * 0.08 }}
            className="flex items-center justify-between p-1.5 rounded-[8px] bg-[#FAFAFA]"
          >
            <span className="text-[9px] text-[#1D1D1F]">{l}</span>
            <span className="text-[10px] text-[#86868B]">›</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   3. Enterprise CRM - Kanban with card moving + animated bars
   ============================================================ */
function EnterpriseMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useFmInView(ref, { once: false, amount: 0.3 });
  const [movingCardCol, setMovingCardCol] = useState(0); // 0=qualif, 1=devis, 2=négo, 3=closing

  // Cycle the moving card through columns every 2.5s while in view
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setMovingCardCol((c) => (c + 1) % 4), 2500);
    return () => clearInterval(id);
  }, [inView]);

  // Trello-style: cards with labels, members initials, due indicator, comment count
  type Card = { n: string; I: any; tag: string; tagColor: string; amt?: string; due?: string; members: { i: string; c: string }[]; comments?: number; checklist?: { done: number; total: number } };
  const columns: { stage: string; cards: Card[] }[] = [
    {
      stage: 'À qualifier',
      cards: [
        { n: 'Garage Auto+', I: Briefcase, tag: 'Lead', tagColor: '#6B7280', amt: '12K€', due: '8 mai', members: [{ i: 'M', c: '#0EA5E9' }] },
        { n: 'TPE Méditerranée', I: Building2, tag: 'Lead', tagColor: '#6B7280', amt: '8K€', members: [{ i: 'A', c: '#10B981' }, { i: 'L', c: '#F59E0B' }] },
      ],
    },
    {
      stage: 'Devis',
      cards: [
        { n: 'Restaurant Bella', I: Store, tag: 'Devis envoyé', tagColor: '#3B82F6', amt: '18K€', due: '12 mai', members: [{ i: 'M', c: '#0EA5E9' }, { i: 'T', c: '#8B5CF6' }], comments: 3, checklist: { done: 2, total: 5 } },
        { n: 'Pharma Saint-Roch', I: Stethoscope, tag: 'Devis envoyé', tagColor: '#3B82F6', amt: '32K€', members: [{ i: 'A', c: '#10B981' }, { i: 'L', c: '#F59E0B' }, { i: 'T', c: '#8B5CF6' }] },
        { n: 'Coiffeur Mireille', I: Store, tag: 'Devis envoyé', tagColor: '#3B82F6', amt: '6K€', members: [{ i: 'L', c: '#F59E0B' }] },
      ],
    },
    {
      stage: 'Négociation',
      cards: [
        { n: 'Boulangerie Dupont', I: Store, tag: 'Chaud', tagColor: '#F59E0B', amt: '24K€', due: '15 mai', members: [{ i: 'M', c: '#0EA5E9' }, { i: 'A', c: '#10B981' }, { i: 'T', c: '#8B5CF6' }], comments: 7, checklist: { done: 4, total: 8 } },
        { n: 'Boutique Vintage', I: ShoppingBag, tag: 'Chaud', tagColor: '#F59E0B', amt: '14K€', members: [{ i: 'L', c: '#F59E0B' }, { i: 'T', c: '#8B5CF6' }] },
      ],
    },
    {
      stage: 'Closing',
      cards: [
        { n: 'Cabinet Médical', I: Stethoscope, tag: 'Signature', tagColor: '#10B981', amt: '42K€', due: '5 mai', members: [{ i: 'M', c: '#0EA5E9' }, { i: 'A', c: '#10B981' }, { i: 'L', c: '#F59E0B' }, { i: 'T', c: '#8B5CF6' }], comments: 12, checklist: { done: 7, total: 8 } },
      ],
    },
  ];

  return (
    <div ref={ref} className="relative w-full max-w-[760px] mx-auto pb-2">
      {/* Cadre iPad TOUJOURS visible (desktop + mobile) : bezel sombre + camera notch. */}
      <div
        className="absolute inset-0 -m-[8px] sm:-m-[12px] md:-m-[14px] rounded-[24px] sm:rounded-[30px] md:rounded-[34px] pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.06)',
        }}
        aria-hidden
      >
        <div className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#0B0E14] ring-1 ring-white/8" />
      </div>
    <div
      className="relative w-full aspect-[16/10] rounded-[18px] sm:rounded-[22px] mx-auto overflow-x-auto overflow-y-hidden sm:overflow-hidden"
      style={{
        background: '#F1F2F4',
        boxShadow: '0 40px 80px -25px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#E4E6EA]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#0EA5E9] to-[#3B82F6] flex items-center justify-center flex-shrink-0">
            <Database className="h-2.5 w-2.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-[11.5px] font-bold text-[#172B4D] tracking-tight">Pipeline ventes</span>
          <span className="text-[10px] text-[#6B778C]">·</span>
          <span className="text-[10px] text-[#6B778C]">Q2 - <Counter to={24} duration={1} /> deals</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Member avatars in header */}
          <div className="flex -space-x-1.5">
            {[
              { i: 'M', c: '#0EA5E9' }, { i: 'A', c: '#10B981' }, { i: 'L', c: '#F59E0B' }, { i: 'T', c: '#8B5CF6' },
            ].map((m, k) => (
              <span key={k} className="rounded-full ring-2 ring-white flex items-center justify-center text-white font-bold" style={{ width: 16, height: 16, background: m.c, fontSize: 7.5 }}>{m.i}</span>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#172B4D] text-white font-semibold">Tous</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white text-[#374151] ring-1 ring-black/8 font-medium">Chaud</span>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-4 gap-2.5 px-3 pt-3 pb-3 relative min-w-[520px] sm:min-w-0" style={{ height: 'calc(100% - 45px)' }}>
        {columns.map((col, i) => {
          const showMover = i === movingCardCol;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
              className="flex flex-col rounded-[10px] overflow-hidden"
              style={{
                background: '#EBECF0',
                boxShadow: '0 1px 0 rgba(9,30,66,0.05)',
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#172B4D] tracking-tight">{col.stage}</span>
                  <span
                    className="rounded-full text-[8.5px] font-semibold flex items-center justify-center px-1.5"
                    style={{ background: '#DFE1E6', color: '#5E6C84', minWidth: 14, height: 14 }}
                  >
                    {col.cards.length + (showMover ? 1 : 0)}
                  </span>
                </div>
                <span className="text-[10px] text-[#6B778C] leading-none" style={{ letterSpacing: 1 }}>•••</span>
              </div>

              {/* Cards */}
              <div className="flex-1 px-1.5 pb-1.5 space-y-1.5 overflow-y-auto">
                {/* Mover card always rendered with layoutId so framer animates between columns */}
                {showMover && (
                  <motion.div
                    layoutId="mover-card"
                    className="rounded-[6px] bg-white overflow-hidden"
                    style={{ boxShadow: '0 8px 18px -6px rgba(9,30,66,0.28), 0 0 0 2px #172B4D' }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  >
                    <div className="px-2 py-1.5 space-y-1">
                      <span
                        className="inline-block rounded-[3px] px-1.5 font-semibold"
                        style={{ background: '#172B4D22', color: '#172B4D', fontSize: 7.5, lineHeight: '12px', letterSpacing: 0.1 }}
                      >
                        Nouveau
                      </span>
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="text-[#5E6C84] flex-shrink-0" style={{ width: 9, height: 9 }} strokeWidth={1.7} />
                        <div className="text-[10px] font-semibold text-[#172B4D] truncate flex-1 leading-tight">Nouvelle Boutique</div>
                      </div>
                      <div className="text-[11px] font-bold text-[#172B4D] tabular-nums">36K€</div>
                      {/* Meta cachee sur mobile pour densite reduite */}
                      <div className="hidden sm:flex items-center justify-between pt-0.5">
                        <span className="inline-flex items-center gap-0.5 text-[#5E6C84]" style={{ fontSize: 8 }}>
                          <CalendarDays style={{ width: 8, height: 8 }} strokeWidth={1.8} />
                          10 mai
                        </span>
                        <div className="flex -space-x-[3px]">
                          <span className="rounded-full ring-[1.5px] ring-white flex items-center justify-center text-white font-bold" style={{ width: 13, height: 13, background: '#0EA5E9', fontSize: 6.5 }}>R</span>
                          <span className="rounded-full ring-[1.5px] ring-white flex items-center justify-center text-white font-bold" style={{ width: 13, height: 13, background: '#10B981', fontSize: 6.5 }}>Z</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {col.cards.map((c, j) => (
                  <motion.div
                    key={`${i}-${j}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.35, delay: 0.3 + i * 0.08 + j * 0.05 }}
                    whileHover={{ y: -1 }}
                    className="rounded-[6px] bg-white overflow-hidden cursor-default"
                    style={{ boxShadow: '0 1px 0 rgba(9,30,66,0.18), 0 0 0 1px rgba(9,30,66,0.04)' }}
                  >
                    <div className="px-2 py-1.5 space-y-1">
                      <span
                        className="inline-block rounded-[3px] px-1.5 font-semibold"
                        style={{
                          background: c.tagColor + '22',
                          color: c.tagColor,
                          fontSize: 7.5,
                          lineHeight: '12px',
                          letterSpacing: 0.1,
                        }}
                      >
                        {c.tag}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <c.I className="text-[#5E6C84] flex-shrink-0" style={{ width: 9, height: 9 }} strokeWidth={1.7} />
                        <div className="text-[10px] font-semibold text-[#172B4D] truncate flex-1 leading-tight">{c.n}</div>
                      </div>
                      {c.amt && (
                        <div className="text-[11px] font-bold text-[#172B4D] tabular-nums tracking-tight">{c.amt}</div>
                      )}
                      {/* Meta + avatars caches sur mobile pour densite reduite (tag + nom + montant uniquement) */}
                      <div className="hidden sm:flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5 text-[#5E6C84]">
                          {c.due && (
                            <span className="inline-flex items-center gap-0.5" style={{ fontSize: 8 }}>
                              <CalendarDays style={{ width: 8, height: 8 }} strokeWidth={1.8} />
                              {c.due}
                            </span>
                          )}
                          {c.comments !== undefined && c.comments > 0 && (
                            <span className="inline-flex items-center gap-0.5" style={{ fontSize: 8 }}>
                              <MessageSquare style={{ width: 8, height: 8 }} strokeWidth={1.8} />
                              {c.comments}
                            </span>
                          )}
                          {c.checklist && (
                            <span className="inline-flex items-center gap-0.5" style={{ fontSize: 8 }}>
                              <CheckIcon style={{ width: 8, height: 8 }} strokeWidth={1.8} />
                              {c.checklist.done}/{c.checklist.total}
                            </span>
                          )}
                        </div>
                        <div className="flex -space-x-[3px]">
                          {c.members.slice(0, 3).map((m, k) => (
                            <span
                              key={k}
                              className="rounded-full ring-[1.5px] ring-white flex items-center justify-center text-white font-bold"
                              style={{ width: 13, height: 13, background: m.c, fontSize: 6.5 }}
                            >
                              {m.i}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* + Ajouter footer */}
              <div className="px-2 py-1 mx-1.5 mb-1.5 rounded text-[#5E6C84] hover:bg-black/5 cursor-default flex items-center gap-1" style={{ fontSize: 9 }}>
                <span style={{ fontSize: 11 }}>+</span> Ajouter une carte
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
    </div>
  );
}

/* ============================================================
   4. Cloud - live metrics, pulsing servers, scrolling logs
   ============================================================ */
function CloudMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useFmInView(ref, { once: false, amount: 0.3 });

  // Live changing metrics
  const [cpu, setCpu] = useState(32);
  const [ram, setRam] = useState(61);
  const [latency, setLatency] = useState(42);
  // Sparkline live (rolling 24 points, refresh chaque 800ms)
  const [spark, setSpark] = useState<number[]>(() => Array.from({ length: 24 }, () => 30 + Math.random() * 40));
  // Notifications count (clignote en s'incrementant)
  const [notifs, setNotifs] = useState(3);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => {
      setCpu((c) => Math.max(20, Math.min(45, c + (Math.random() * 6 - 3))));
      setRam((r) => Math.max(50, Math.min(72, r + (Math.random() * 4 - 2))));
      setLatency((l) => Math.max(35, Math.min(55, l + (Math.random() * 6 - 3))));
      // Sparkline : decale + ajoute un nouveau point
      setSpark((prev) => [...prev.slice(1), 30 + Math.random() * 50]);
    }, 800);
    return () => clearInterval(id);
  }, [inView]);

  const servers = [
    { n: 'web-prod-01', region: 'eu-west-3', baseLoad: 32 },
    { n: 'api-prod-01', region: 'eu-west-3', baseLoad: 61 },
    { n: 'db-master', region: 'eu-west-3', baseLoad: 24 },
    { n: 'db-replica', region: 'eu-west-1', baseLoad: 18 },
  ];

  return (
    <div ref={ref} className="relative w-full max-w-[760px] mx-auto pb-2">
      {/* Cadre iPad TOUJOURS visible (desktop + mobile) */}
      <div
        className="absolute inset-0 -m-[8px] sm:-m-[12px] md:-m-[14px] rounded-[24px] sm:rounded-[30px] md:rounded-[34px] pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.06)',
        }}
        aria-hidden
      >
        <div className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#0B0E14] ring-1 ring-white/8" />
      </div>
    <div
      className="relative w-full aspect-[16/10] rounded-[18px] sm:rounded-[22px] mx-auto overflow-hidden p-4 sm:p-5"
      style={{
        background: 'linear-gradient(135deg, #0E0E10, #1A1A1F)',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <div className="text-[9px] sm:text-[10px] text-white/55 font-medium">Production · eu-west-3</div>
          <div className="text-[15px] sm:text-[18px] font-bold tracking-tight text-white">État serveurs</div>
        </div>
        <motion.div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15"
          animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0.2)', '0 0 0 6px rgba(255,255,255,0)', '0 0 0 0 rgba(255,255,255,0)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.span className="w-2 h-2 rounded-full bg-white" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          <span className="text-[10px] font-semibold text-white">Live</span>
        </motion.div>
      </div>

      <div className="grid grid-cols-4 gap-2.5 mb-3">
        <LiveMetricTile Icon={Cpu} label="CPU" value={cpu} suffix="%" inView={inView} delay={0.1} />
        <LiveMetricTile Icon={MemoryStick} label="RAM" value={ram} suffix="%" inView={inView} delay={0.2} />
        <LiveMetricTile Icon={Activity} label="Latence" value={latency} suffix="ms" inView={inView} delay={0.3} />
        <UptimeTile Icon={Shield} inView={inView} />
      </div>

      <div className="rounded-[10px] bg-white/5 ring-1 ring-white/10 p-3 space-y-1.5 h-[40%]">
        {servers.map((srv, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
            className="flex items-center justify-between text-[10px]"
          >
            <div className="flex items-center gap-2">
              <motion.span className="w-1.5 h-1.5 rounded-full bg-white" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5 + i * 0.3, repeat: Infinity }} />
              <span className="font-semibold text-white">{srv.n}</span>
              <span className="text-white/45">{srv.region}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Barre de charge cachee sur mobile (pour densite), pourcentage seul */}
              <div className="hidden sm:block w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={inView ? { width: `${srv.baseLoad}%` } : {}} transition={{ duration: 1.2, delay: 0.6 + i * 0.1 }} />
              </div>
              <span className="text-white/65 tabular-nums w-9 text-right">{srv.baseLoad}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
    </div>
  );
}

function LiveMetricTile({ Icon, label, value, suffix, inView, delay }: { Icon: any; label: string; value: number; suffix: string; inView: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay }}
      className="rounded-[10px] p-2.5 bg-white/5 ring-1 ring-white/10"
    >
      <div className="flex items-center gap-1 text-[9px] text-white/55">
        <Icon className="text-white/55" style={{ width: 10, height: 10 }} strokeWidth={1.6} />
        {label}
      </div>
      <div className="text-[18px] font-bold text-white tabular-nums leading-tight mt-0.5">
        <motion.span key={Math.round(value)} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
          {value.toFixed(0)}
        </motion.span>
        {suffix}
      </div>
      <div className="text-[9px] text-white/65 font-semibold">stable</div>
    </motion.div>
  );
}

function UptimeTile({ Icon, inView }: { Icon: any; inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-[10px] p-2.5 bg-white/5 ring-1 ring-white/10"
    >
      <div className="flex items-center gap-1 text-[9px] text-white/55">
        <Icon className="text-white/55" style={{ width: 10, height: 10 }} strokeWidth={1.6} />
        Uptime
      </div>
      <div className="text-[18px] font-bold text-white tabular-nums leading-tight mt-0.5">99.99%</div>
      <div className="text-[9px] text-white/65 font-semibold">90 jours</div>
    </motion.div>
  );
}

/* ============================================================
   5. Training - animated progress + chapter checks
   ============================================================ */
function TrainingMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useFmInView(ref, { once: false, amount: 0.3 });

  return (
    <div
      ref={ref}
      className="relative w-full max-w-[680px] aspect-[5/4] sm:aspect-[16/10] rounded-[22px] mx-auto overflow-hidden p-5 pt-3"
      style={{
        background: '#F5F5F7',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.15)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* Espace apprenant header bar */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E5E5EA]"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#1D1D1F] flex items-center justify-center">
            <GraduationCap className="h-3.5 w-3.5 text-white" strokeWidth={1.5} />
          </div>
          <div className="leading-tight">
            <div className="text-[8px] uppercase tracking-[0.12em] font-semibold text-[#86868B]">DELIVERY Digital</div>
            <div className="text-[12px] font-bold text-[#1D1D1F] tracking-tight">Espace apprenant</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#86868B] hidden sm:inline">Marie Lambert</span>
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#86868B] to-[#1D1D1F]" />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_240px] gap-3 sm:gap-4 h-[calc(100%_-_44px)]">
        {/* Player */}
        <div className="rounded-[14px] overflow-hidden p-5 flex flex-col justify-end bg-gradient-to-br from-[#1D1D1F] to-[#3C3C43] relative">
          {/* Gradient accent overlay */}
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), transparent 60%)' }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="relative">
            <div className="text-[10px] text-white/65 font-semibold uppercase tracking-wider">Initiation · 21h · Niveau débutant</div>
            <div className="text-[15px] sm:text-[19px] font-bold text-white tracking-tight leading-[1.1] mt-1">Hygiène, Sécurité et<br />Développement Durable</div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-[3px] rounded-full bg-white/15 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: 0 }}
                  animate={inView ? { width: '34%' } : {}}
                  transition={{ duration: 1.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className="text-[10px] text-white/65 font-semibold tabular-nums">
                <Counter to={34} duration={1.4} suffix=" %" />
              </span>
            </div>
            <motion.div
              className="mt-3 flex items-center gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <motion.div
                className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#1D1D1F]"
                whileHover={{ scale: 1.1 }}
                animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0.3)', '0 0 0 6px rgba(255,255,255,0)'] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                <Play className="h-3 w-3 fill-current" strokeWidth={0} />
              </motion.div>
              <span className="text-[10px] text-white/85 font-medium">Reprendre la lecture</span>
            </motion.div>
          </div>
        </div>

        {/* Sidebar chapters - check off staggered */}
        <div className="rounded-[14px] p-3 space-y-1.5 bg-white border border-[#E5E5EA]">
          <div className="text-[9px] font-semibold uppercase tracking-wider mb-1 text-[#86868B]">Chapitres</div>
          {[
            { n: '1', t: "Bonnes pratiques d'hygiène", done: true },
            { n: '2', t: 'Normes HACCP', done: true },
            { n: '3', t: 'Gestion des contaminations', done: true },
            { n: '4', t: 'Stockage des aliments', done: false, active: true },
            { n: '5', t: 'Gestion des déchets', done: false },
            { n: '6', t: 'Réduction du gaspillage', done: false },
          ].map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 6 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.4 + i * 0.1 }}
              className={`flex items-center gap-2 px-1.5 py-1 rounded-[6px] ${c.active ? 'bg-[#F2F2F7] border border-[#1D1D1F]' : ''}`}
            >
              <motion.div
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-bold flex-shrink-0"
                style={{ background: c.done ? '#1D1D1F' : '#E5E5EA', color: c.done ? '#FFF' : '#86868B' }}
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : {}}
                transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.5 + i * 0.1 }}
              >
                {c.done ? '✓' : c.n}
              </motion.div>
              <span className="text-[10px]" style={{ color: c.active ? '#1D1D1F' : '#86868B', fontWeight: c.active ? 600 : 400 }}>{c.t}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ServiceTile component (Apple-style with colored gradients)
   ============================================================ */
type Tone = 'light' | 'pure' | 'dark' | 'sky' | 'mint' | 'peach' | 'plum';

function ServiceTile({
  id, tone, title, accent, subhead, illustration, primary, secondary, badge, chips, eyebrow,
}: {
  id: string;
  tone: Tone;
  title: string;
  accent?: string;          // italic accent like "Web", "natives" - rendered in italic blue after title
  subhead: React.ReactNode; // can be a string or JSX with embedded links
  illustration: React.ReactNode;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  badge?: React.ReactNode;
  chips?: React.ReactNode;  // tech chips below mockup
  eyebrow?: string;         // small uppercase label above title (e.g. "Autre service proposé")
}) {
  const isDark = tone === 'dark' || tone === 'plum';
  const toneClass =
    tone === 'dark' ? 'tile-night'
    : tone === 'pure' ? 'tile-pure'
    : tone === 'sky' ? 'tile-sky'
    : tone === 'mint' ? 'tile-mint'
    : tone === 'peach' ? 'tile-peach'
    : tone === 'plum' ? 'tile-plum'
    : 'tile-light';
  const titleColor = isDark ? 'text-white' : 'text-[var(--ink-900)]';
  const subheadColor = isDark ? 'text-white/85' : 'text-[var(--ink-700)]';
  const accentClass = isDark ? 'accent-italic-light' : 'accent-italic';
  const linkInk = isDark ? '#2997FF' : '#0066CC';
  const linkInkHover = isDark ? '#5AC8FA' : '#0077ED';

  return (
    <section id={id} className={`tile ${toneClass} py-14 sm:py-24 lg:py-32`}>
      <div className="container">
        <div className="text-center max-w-[820px] mx-auto mb-10 sm:mb-14">
          {eyebrow && (
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className={`h-px w-8 ${isDark ? 'bg-white/30' : 'bg-[var(--ink-300)]'}`} />
              <span
                className={`text-[12px] font-semibold tracking-[0.22em] uppercase ${
                  isDark ? 'text-white/70' : 'text-[var(--ink-700)]'
                }`}
              >
                {eyebrow}
              </span>
              <span className={`h-px w-8 ${isDark ? 'bg-white/30' : 'bg-[var(--ink-300)]'}`} />
            </div>
          )}
          <h2 className={`display-2 text-[34px] sm:text-[64px] lg:text-[76px] ${titleColor} mb-4`}>
            {title}
            {accent && (
              <>
                {' '}
                <span className={accentClass}>{accent}</span>
              </>
            )}
          </h2>
          <p className={`subhead text-[17px] sm:text-[26px] lg:text-[28px] ${subheadColor} max-w-[720px] mx-auto`}>
            {subhead}
          </p>

          {(primary || secondary) && (
            <div className="mt-7 flex flex-wrap justify-center items-center gap-3">
              {primary && (
                <button
                  onClick={primary.onClick}
                  className="inline-flex items-center justify-center text-[15px] font-normal rounded-full px-5 py-2.5 transition-colors duration-200"
                  style={{ background: linkInk, color: 'white' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = linkInkHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = linkInk)}
                >
                  {primary.label}
                </button>
              )}
              {secondary && (
                <button
                  onClick={secondary.onClick}
                  className="inline-flex items-center justify-center text-[15px] font-normal rounded-full px-5 py-2.5 transition-all duration-200 ring-1"
                  style={{ background: 'transparent', color: linkInk, borderColor: linkInk }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = linkInk; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = linkInk; }}
                >
                  {secondary.label}
                </button>
              )}
            </div>
          )}

          {badge && <div className="mt-5">{badge}</div>}
        </div>

        <div className="mockup-responsive">
          {illustration}
        </div>

        {chips && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-2.5"
          >
            <span className={`text-[11.5px] font-semibold uppercase tracking-[0.12em] mr-2 ${isDark ? 'text-white/55' : 'text-[var(--ink-500)]'}`}>
              Stack
            </span>
            {chips}
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   Main Services
   ============================================================ */
const Services = () => {
  const { t } = useTranslation();
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const triggerOpenDigital = () => { window.location.href = '/discutons'; };

  return (
    <>
      <section id="services" ref={ref} className="tile tile-pure py-14 sm:py-24">
        <div className="container">
          <div className="text-center">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-block text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--ink-500)] mb-4"
            >
              {t('tiles.eyebrow')}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="display-1 text-[34px] sm:text-[64px] lg:text-[80px] text-[var(--ink-900)] mb-4"
            >
              {t('services.title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="subhead text-[17px] sm:text-[24px] lg:text-[26px] text-[var(--ink-700)] max-w-[700px] mx-auto"
            >
              {t('services.subtitle')}
            </motion.p>
          </div>
        </div>
      </section>

      <ServiceTile
        id="service-web"
        tone="sky"
        title="Solutions"
        accent="web"
        subhead="SaaS, dashboards et applications web sur mesure, propulsées par les meilleures technos."
        illustration={<WebMock />}
        primary={{ label: "Discuter d'un projet", onClick: triggerOpenDigital }}
        secondary={{ label: 'En savoir plus', onClick: triggerOpenDigital }}
        badge={
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[12.5px] font-semibold text-[var(--ink-900)] ring-1 ring-[var(--ink-100)]">
            <Award className="h-3.5 w-3.5" strokeWidth={1.7} />
            Certifié CII · jusqu'à 20 % remboursé
          </div>
        }
        chips={
          <>
            <TechChip Logo={ReactLogo} label="React" />
            <TechChip Logo={NextLogo} label="Next.js" />
            <TechChip Logo={TypeScriptLogo} label="TypeScript" />
            <TechChip Logo={TailwindLogo} label="Tailwind" />
            <TechChip Logo={NodeLogo} label="Node.js" />
            <TechChip Logo={PostgresLogo} label="PostgreSQL" />
          </>
        }
      />

      <ServiceTile
        id="service-mobile"
        tone="plum"
        title="Apps"
        accent="natives"
        subhead="iOS et Android. Performance native, design soigné, déploiement App Store et Play Store clé en main."
        illustration={<MobileMock />}
        primary={{ label: "Discuter d'un projet", onClick: triggerOpenDigital }}
        secondary={{ label: 'En savoir plus', onClick: triggerOpenDigital }}
        chips={
          <>
            <TechChip Logo={ReactNativeLogo} label="React Native" dark />
            <TechChip Logo={SwiftLogo} label="Swift" dark />
            <TechChip Logo={TypeScriptLogo} label="TypeScript" dark />
            <TechChip Logo={StripeLogo} label="Stripe" dark />
          </>
        }
      />

      <ServiceTile
        id="service-enterprise"
        tone="mint"
        title="Logiciels"
        accent="métier"
        subhead="CRM, ERP, plateformes B2B. Vos process automatisés, votre productivité boostée."
        illustration={<EnterpriseMock />}
        primary={{ label: "Discuter d'un projet", onClick: triggerOpenDigital }}
        secondary={{ label: 'En savoir plus', onClick: triggerOpenDigital }}
        chips={
          <>
            <TechChip Logo={NodeLogo} label="Node.js" />
            <TechChip Logo={PostgresLogo} label="PostgreSQL" />
            <TechChip Logo={ReactLogo} label="React" />
            <TechChip Logo={DockerLogo} label="Docker" />
          </>
        }
      />

      <ServiceTile
        id="service-cloud"
        tone="dark"
        title="Cloud"
        accent="& DevOps"
        subhead="Hébergement, monitoring, scale automatique. Une infrastructure qui tient la charge, jour et nuit."
        illustration={<CloudMock />}
        primary={{ label: "Discuter d'un projet", onClick: triggerOpenDigital }}
        secondary={{ label: 'En savoir plus', onClick: triggerOpenDigital }}
        chips={
          <>
            <TechChip Logo={AWSLogo} label="AWS" dark />
            <TechChip Logo={DockerLogo} label="Docker" dark />
            <TechChip Logo={VercelLogo} label="Vercel" dark />
            <TechChip Logo={NodeLogo} label="Node.js" dark />
          </>
        }
      />

      {/* Section Formation cachee temporairement - focus 100% vente informatique */}
    </>
  );
};

export default Services;
