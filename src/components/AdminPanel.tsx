import { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, Users, Sparkles, LogOut, MessageSquare, Loader2 } from 'lucide-react';
import AIOrb from './AIOrb';
import SeoAdmin from './SeoAdmin';
import ProspectAdmin from './ProspectAdmin';
import LiveConversations from './LiveConversations';

const SECRET_KEY = 'dd_seo_admin_secret';

type Section = 'overview' | 'conversations' | 'prospects' | 'seo';

export default function AdminPanel() {
  const [secret, setSecret] = useState<string | null>(() => localStorage.getItem(SECRET_KEY));
  const [section, setSection] = useState<Section>(() => {
    const p = window.location.pathname;
    if (p.startsWith('/admin/seo')) return 'seo';
    if (p.startsWith('/admin/prospects')) return 'prospects';
    if (p.startsWith('/admin/conversations')) return 'conversations';
    return 'overview';
  });
  const [stats, setStats] = useState<{ prospects: number; conversations: number; activeConv: number; published: number } | null>(null);

  const loadStats = useCallback(async () => {
    if (!secret) return;
    try {
      const opts = { headers: { 'x-admin-secret': secret } };
      const [pStats, conv, seo] = await Promise.all([
        fetch('/api/admin/prospects/stats', opts).then((r) => r.ok ? r.json() : { total: 0 }),
        fetch('/api/admin/conversations', opts).then((r) => r.ok ? r.json() : { stats: { total: 0, active: 0 } }),
        fetch('/api/admin/seo?status=published', opts).then((r) => r.ok ? r.json() : { items: [] }),
      ]);
      setStats({
        prospects: pStats.total || 0,
        conversations: conv.stats?.total || 0,
        activeConv: conv.stats?.active || 0,
        published: (seo.items || []).length,
      });
    } catch {}
  }, [secret]);

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
          <SideBtn active={section === 'seo'} icon={<Sparkles className="h-4 w-4" />} label="SEO Content" onClick={() => setSection('seo')} />
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
        <MobileBtn active={section === 'seo'} icon={<Sparkles className="h-4 w-4" />} label="SEO" onClick={() => setSection('seo')} />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 px-5 sm:px-8 pt-8 pb-24 md:pb-20 max-w-[1200px]">
        {section === 'overview' && <Overview stats={stats} />}
        {section === 'conversations' && <LiveConversations secret={secret} />}
        {section === 'prospects' && <ProspectAdmin embedded sharedSecret={secret} />}
        {section === 'seo' && <SeoAdmin embedded sharedSecret={secret} />}
      </main>
    </div>
  );
}

function SideBtn({ active, icon, label, badge, onClick }: { active: boolean; icon: React.ReactNode; label: string; badge?: number; onClick: () => void }) {
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
        <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#34C759] text-white text-[10px] font-bold">
          {badge}
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
