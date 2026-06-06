import { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, Users, Sparkles, LogOut, MessageSquare, Loader2, FileText, BarChart3, GraduationCap, FolderOpen, ExternalLink, Building2, UserCog } from 'lucide-react';
import AIOrb from './AIOrb';
import AgencyAdmin from './AgencyAdmin';
import TrainerAdmin from './TrainerAdmin';
import VideoStudio from './VideoStudio';
import SeoAdmin from './SeoAdmin';
import RankingsTab from './admin/RankingsTab';
import LinkBuildingTab from './admin/LinkBuildingTab';
import ProspectAdmin from './ProspectAdmin';
import LiveConversations from './LiveConversations';
import QuoteAdmin from './QuoteAdmin';
import TrainingProgramsManagement from './TrainingProgramsManagement';
import AdminConversionsDashboard from '../pages/admin/AdminConversionsDashboard';

const SECRET_KEY = 'dd_seo_admin_secret';

// Fusion 2026-05-14 (Rabah) : ajout onglets 'formations' (TrainingProgramsManagement)
// et 'gestion' (lien vers ancien AdminDashboard /?admin=true pour Clients/Projets/Taches
// en attendant migration complete demain).
type Section = 'overview' | 'conversations' | 'prospects' | 'quotes' | 'seo' | 'dashboard' | 'formations' | 'gestion' | 'rankings' | 'linkbuilding' | 'agencies' | 'trainers' | 'video';

export default function AdminPanel() {
  const [secret, setSecret] = useState<string | null>(() => localStorage.getItem(SECRET_KEY));
  const [section, setSection] = useState<Section>(() => {
    const p = window.location.pathname;
    if (p.startsWith('/admin/rankings') || p.startsWith('/admin/serp')) return 'rankings';
    if (p.startsWith('/admin/seo')) return 'seo';
    if (p.startsWith('/admin/prospects')) return 'prospects';
    if (p.startsWith('/admin/conversations')) return 'conversations';
    if (p.startsWith('/admin/devis') || p.startsWith('/admin/quotes')) return 'quotes';
    if (p.startsWith('/admin/dashboard') || p.startsWith('/admin/conversions')) return 'dashboard';
    if (p.startsWith('/admin/formations') || p.startsWith('/admin/training')) return 'formations';
    if (p.startsWith('/admin/gestion') || p.startsWith('/admin/projects') || p.startsWith('/admin/clients')) return 'gestion';
    if (p.startsWith('/admin/formateurs') || p.startsWith('/admin/trainers')) return 'trainers';
    return 'overview';
  });
  useEffect(() => {
    const handler = (e: any) => { if (e?.detail) setSection(e.detail); };
    window.addEventListener('admin-navigate', handler as any);
    return () => window.removeEventListener('admin-navigate', handler as any);
  }, []);
  const [stats, setStats] = useState<{ prospects: number; conversations: number; activeConv: number; published: number; agencyPending: number; trainerPending: number } | null>(null);

  const loadStats = useCallback(async () => {
    if (!secret) return;
    try {
      const opts = { headers: { 'x-admin-secret': secret } };
      const [pStats, conv, seo, agc, trn] = await Promise.all([
        fetch('/api/admin/prospects/stats', opts).then((r) => r.ok ? r.json() : { total: 0 }),
        fetch('/api/admin/conversations', opts).then((r) => r.ok ? r.json() : { stats: { total: 0, active: 0 } }),
        fetch('/api/admin/seo?status=published', opts).then((r) => r.ok ? r.json() : { items: [] }),
        fetch('/api/admin/agencies/pending-count', opts).then((r) => r.ok ? r.json() : { count: 0 }),
        fetch('/api/admin/trainers/pending-count', opts).then((r) => r.ok ? r.json() : { count: 0 }),
      ]);
      setStats({
        prospects: pStats.total || 0,
        conversations: conv.stats?.total || 0,
        activeConv: conv.stats?.active || 0,
        published: (seo.items || []).length,
        agencyPending: agc.count || 0,
        trainerPending: trn.count || 0,
      });
    } catch {}
  }, [secret]);
  // Charge les stats au démarrage + rafraîchit le compteur d'actions agence (pastille) toutes les 60s.
  useEffect(() => { if (!secret) return; loadStats(); const id = setInterval(loadStats, 60000); return () => clearInterval(id); }, [secret, loadStats]);

  useEffect(() => {
    if (section === 'overview') {
      loadStats();
      const id = setInterval(loadStats, 8000);
      return () => clearInterval(id);
    }
  }, [section, loadStats]);

  useEffect(() => {
    const path = section === 'overview' ? '/admin' : `/admin/${section}`;
    if (window.location.pathname !== path) {
      window.history.replaceState({}, '', path);
    }
  }, [section]);

  if (!secret) {
    return <SecretGate onAuth={(s) => { localStorage.setItem(SECRET_KEY, s); setSecret(s); }} />;
  }

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: '#F2EFE9',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,29,31,0.08) 1px, transparent 0)',
        backgroundSize: '14px 14px',
      }}
    >
      {/* Sidebar globale */}
      <aside className="w-[240px] flex-shrink-0 hidden md:flex flex-col bg-white border-r border-black/8 min-h-screen">
        <div className="px-5 pt-5 pb-4 border-b border-black/5">
          <div className="flex items-center gap-2.5 mb-1">
            <AIOrb size={28} innerColor="#FFFFFF" />
            <span
              className="text-[16px] text-[#1D1D1F]"
              style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
            >
              Admin
            </span>
          </div>
          <p className="text-[11px] text-[#86868B]">DELIVERY Digital</p>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <SideBtn active={section === 'overview'} icon={<LayoutDashboard className="h-4 w-4" />} label="Vue d'ensemble" onClick={() => setSection('overview')} />
          <SideBtn
            active={section === 'conversations'}
            icon={<MessageSquare className="h-4 w-4" />}
            label="Conversations"
            badge={stats?.activeConv ? stats.activeConv : undefined}
            onClick={() => setSection('conversations')}
          />
          <SideBtn active={section === 'prospects'} icon={<Users className="h-4 w-4" />} label="Prospects" onClick={() => setSection('prospects')} />
          <SideBtn active={section === 'quotes'} icon={<FileText className="h-4 w-4" />} label="Devis" onClick={() => setSection('quotes')} />
          <SideBtn active={section === 'formations'} icon={<GraduationCap className="h-4 w-4" />} label="Formations" onClick={() => setSection('formations')} />
          <SideBtn active={section === 'dashboard'} icon={<BarChart3 className="h-4 w-4" />} label="Dashboard" onClick={() => setSection('dashboard')} />
          <SideBtn active={section === 'rankings'} icon={<BarChart3 className="h-4 w-4" />} label="Mots-clés SERP" onClick={() => setSection('rankings')} />
          <SideBtn active={section === 'linkbuilding'} icon={<ExternalLink className="h-4 w-4" />} label="Link Building" onClick={() => setSection('linkbuilding')} />
          <SideBtn active={section === 'seo'} icon={<Sparkles className="h-4 w-4" />} label="SEO Content" onClick={() => setSection('seo')} />
          <SideBtn active={section === 'gestion'} icon={<FolderOpen className="h-4 w-4" />} label="Projets & Clients" onClick={() => setSection('gestion')} />
          <SideBtn active={section === 'agencies'} icon={<Building2 className="h-4 w-4" />} label="Agences" badge={stats?.agencyPending || undefined} pulse onClick={() => setSection('agencies')} />
          <SideBtn active={section === 'trainers'} icon={<UserCog className="h-4 w-4" />} label="Formateurs" badge={stats?.trainerPending || undefined} pulse onClick={() => setSection('trainers')} />
          {/* Vidéos Hacœur masqué pour l'instant (code conservé, à réactiver plus tard). @Rabah 2026-06-06
          <SideBtn active={section === 'video'} icon={<Video className="h-4 w-4" />} label="Vidéos Hacœur" onClick={() => setSection('video')} /> */}
        </nav>

        <div className="px-4 py-3 border-t border-black/5">
          <button
            onClick={() => { localStorage.removeItem(SECRET_KEY); setSecret(null); }}
            className="inline-flex items-center gap-1.5 text-[11.5px] text-[#86868B] hover:text-[#1D1D1F]"
          >
            <LogOut className="h-3 w-3" />
            Se deconnecter
          </button>
        </div>
      </aside>

      {/* Mobile bottom-bar nav (visible md:hidden) */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-black/8 flex">
        <MobileBtn active={section === 'overview'} icon={<LayoutDashboard className="h-4 w-4" />} label="Home" onClick={() => setSection('overview')} />
        <MobileBtn active={section === 'conversations'} icon={<MessageSquare className="h-4 w-4" />} label="Chats" onClick={() => setSection('conversations')} />
        <MobileBtn active={section === 'prospects'} icon={<Users className="h-4 w-4" />} label="Prospects" onClick={() => setSection('prospects')} />
        <MobileBtn active={section === 'quotes'} icon={<FileText className="h-4 w-4" />} label="Devis" onClick={() => setSection('quotes')} />
        <MobileBtn active={section === 'dashboard'} icon={<BarChart3 className="h-4 w-4" />} label="Stats" onClick={() => setSection('dashboard')} />
        <MobileBtn active={section === 'seo'} icon={<Sparkles className="h-4 w-4" />} label="SEO" onClick={() => setSection('seo')} />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 px-5 sm:px-8 pt-8 pb-24 md:pb-20 max-w-[1200px]">
        {section === 'overview' && <Overview stats={stats} />}
        {section === 'conversations' && <LiveConversations secret={secret} />}
        {section === 'prospects' && <ProspectAdmin embedded sharedSecret={secret} />}
        {section === 'quotes' && <QuoteAdmin secret={secret} />}
        {section === 'dashboard' && <AdminConversionsDashboard secret={secret} />}
        {section === 'rankings' && <RankingsTab secret={secret} />}
        {section === 'linkbuilding' && <LinkBuildingTab secret={secret} />}
        {section === 'seo' && <SeoAdmin embedded sharedSecret={secret} />}
        {section === 'formations' && <TrainingProgramsManagement />}
        {section === 'agencies' && <AgencyAdmin secret={secret} />}
        {section === 'trainers' && <TrainerAdmin secret={secret} />}
        {section === 'video' && <VideoStudio secret={secret} />}
        {section === 'gestion' && <GestionPlaceholder />}
      </main>
    </div>
  );
}

function SideBtn({ active, icon, label, badge, pulse, onClick }: { active: boolean; icon: React.ReactNode; label: string; badge?: number; pulse?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13.5px] font-semibold transition-colors ${
        active ? 'bg-[#F2EFE9] text-[#1D1D1F]' : 'text-[#86868B] hover:bg-[#F5F5F7]'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`relative inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-white text-[10px] font-bold ${pulse ? 'bg-[#FF3B30]' : 'bg-[#34C759]'}`}>
          {pulse && <span className="absolute inset-0 rounded-full bg-[#FF3B30] opacity-75 animate-ping" />}
          <span className="relative">{badge}</span>
        </span>
      )}
    </button>
  );
}

function MobileBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${
        active ? 'text-[#1D1D1F]' : 'text-[#86868B]'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

function Overview({ stats }: { stats: { prospects: number; conversations: number; activeConv: number; published: number } | null }) {
  return (
    <>
      <h1
        className="text-[28px] sm:text-[40px] text-[#1D1D1F] mb-1"
        style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
      >
        Vue d'ensemble.
      </h1>
      <p className="text-[14px] text-[#86868B] mb-8">Naviguez via le menu de gauche.</p>

      {!stats ? (
        <div className="flex items-center gap-2 text-[#86868B] text-[14px]">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-[820px]">
          <Stat label="Conv. en direct" value={stats.activeConv} accent="#34C759" pulse={stats.activeConv > 0} />
          <Stat label="Conv. totales" value={stats.conversations} />
          <Stat label="Prospects" value={stats.prospects} />
          <Stat label="Pages SEO publiees" value={stats.published} />
        </div>
      )}
    </>
  );
}

// Onglet temporaire "Projets & Clients" : pointe vers l'ancien AdminDashboard
// (route /?admin=true) qui contient Clients, Projets, Taches, Categories, Types, Messages,
// Parametres. A migrer demain dans le nouveau design unifie (Rabah - 2026-05-14).
function GestionPlaceholder() {
  return (
    <>
      <h1
        className="text-[28px] sm:text-[40px] text-[#1D1D1F] mb-1"
        style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
      >
        Projets & Clients.
      </h1>
      <p className="text-[14px] text-[#86868B] mb-8 max-w-[640px]">
        L'ancien tableau de bord (Clients, Projets, Taches, Categories, Types, Messages, Parametres)
        sera migre dans ce panneau dans la prochaine mise a jour. En attendant, accedez-y ci-dessous.
      </p>
      <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-6 max-w-[560px]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p className="text-[14px] text-[#1D1D1F] mb-4 font-semibold">Acceder a l'ancien dashboard</p>
        <p className="text-[13px] text-[#86868B] mb-5 leading-[1.6]">
          Connexion avec votre compte admin (admin@deliverydigital.fr). Le dashboard s'ouvre dans
          un nouvel onglet et reste accessible en parallele de ce panneau.
        </p>
        <a
          href="/?admin=true"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold hover:bg-[#3C3C43] transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir Clients / Projets / Taches
        </a>
      </div>
    </>
  );
}

function Stat({ label, value, accent, pulse }: { label: string; value: number; accent?: string; pulse?: boolean }) {
  return (
    <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-4 relative" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="text-[11px] uppercase tracking-wider text-[#86868B] font-semibold mb-1.5">{label}</div>
      <div className="text-[26px] font-bold tracking-tight" style={{ color: accent || '#1D1D1F' }}>{value}</div>
      {pulse && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34C759]" />
        </span>
      )}
    </div>
  );
}

function SecretGate({ onAuth }: { onAuth: (secret: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{
        background: '#F2EFE9',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,29,31,0.10) 1px, transparent 0)',
        backgroundSize: '14px 14px',
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-7">
          <AIOrb size={56} innerColor="#F2EFE9" />
          <h1
            className="mt-5 text-[28px] sm:text-[34px] leading-[1.1] text-[#1D1D1F] text-center"
            style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
          >
            Admin
          </h1>
          <p className="mt-2 text-[15px] text-[#86868B] text-center max-w-[360px]">
            Entrez votre cle d'acces administrateur.
          </p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (val.trim()) onAuth(val.trim()); }}
          className="bg-white rounded-[22px] ring-1 ring-black/5 p-5 sm:p-6 space-y-3"
          style={{ boxShadow: '0 12px 30px -12px rgba(0,0,0,0.10)' }}
        >
          <input
            type="password"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 rounded-[12px] bg-[#F5F5F7] outline-none text-[15px] text-[#1D1D1F]"
            placeholder="Admin secret"
          />
          <button
            type="submit"
            className="w-full px-5 py-3 rounded-full bg-[#1D1D1F] text-white text-[15px] font-semibold hover:bg-[#3C3C43] transition-colors"
          >
            Acceder
          </button>
        </form>
      </div>
    </div>
  );
}
