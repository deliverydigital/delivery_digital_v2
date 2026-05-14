import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Search, RefreshCw, X as XIcon, Mail, Phone, Building2,
  MessageSquare, Circle, ChevronRight, User as UserIcon, Globe, Clock,
  Languages,
} from 'lucide-react';

// Ouvre Google Translate web dans un nouvel onglet pour traduire un message
// du drawer LiveConversations. Detection auto de la langue source -> francais.
// Pratique quand un prospect ecrit en bangla / arabe / urdu / etc.
// @author Rabah Ziane - 2026-05-14
function openTranslate(text: string) {
  const url = `https://translate.google.com/?sl=auto&tl=fr&op=translate&text=${encodeURIComponent(text.slice(0, 5000))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

interface ConvUser {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  country?: string;
}

interface ConvSummary {
  sessionId: string;
  userId: string;
  title: string;
  status: string;
  messageCount: number;
  lastMessage?: { role: 'user' | 'assistant'; content: string; at: string };
  lastUserContent: string;
  lastAssistantContent: string;
  updatedAt: string;
  createdAt: string;
  isActive: boolean;
  user: ConvUser;
}

interface SessionDetail {
  sessionId: string;
  userId: string;
  title: string;
  status: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; at?: string }>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface FullUser extends ConvUser {
  _id: string;
  createdAt: string;
}

const POLL_LIST_MS = 5000;
const POLL_DETAIL_MS = 3000;

export default function LiveConversations({ secret }: { secret: string }) {
  const [items, setItems] = useState<ConvSummary[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number }>({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState(false);
  const [search, setSearch] = useState('');
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(
    async (url: string) => {
      const res = await fetch(url, { headers: { 'x-admin-secret': secret } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    [secret]
  );

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterActive) params.set('active', 'true');
      if (search) params.set('q', search);
      const data = await api(`/api/admin/conversations?${params}`);
      setItems(data.items || []);
      setStats(data.stats || { total: 0, active: 0 });
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, filterActive, search]);

  useEffect(() => { load(); }, [load]);

  // Polling toutes les 5s
  useEffect(() => {
    const id = setInterval(load, POLL_LIST_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[28px] sm:text-[34px] text-[#1D1D1F]"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
        >
          Conversations
          <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#34C759]/10 text-[#34C759] text-[11.5px] font-semibold align-middle">
            <Circle className="h-2 w-2 fill-current" />
            {stats.active} en direct
          </span>
        </h1>
        <button onClick={load} className="p-2 rounded-full ring-1 ring-black/8 bg-white text-[#86868B] hover:text-[#1D1D1F]">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (email, nom, message)..."
            className="w-full pl-9 pr-3 py-2 rounded-full bg-white ring-1 ring-black/8 text-[13px] outline-none focus:ring-[#1D1D1F]"
          />
        </div>
        <button
          onClick={() => setFilterActive(!filterActive)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium ${
            filterActive ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'
          }`}
        >
          <Circle className={`h-2.5 w-2.5 ${filterActive ? 'fill-[#34C759] text-[#34C759]' : 'fill-current'}`} />
          {filterActive ? 'En direct uniquement' : 'Tous'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[14px] bg-[#FF3B30]/10 ring-1 ring-[#FF3B30]/20 px-4 py-3 text-[13px] text-[#FF3B30]">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-[#86868B] text-[14px] py-10">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-10 text-center">
          <p className="text-[#86868B] text-[14px]">Aucune conversation pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <button
              key={c.sessionId}
              onClick={() => setOpenSession(c.sessionId)}
              className="w-full text-left bg-white rounded-[18px] ring-1 ring-black/5 p-4 hover:ring-black/15 transition-all"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.isActive ? 'bg-[#34C759]/10' : 'bg-[#F2EFE9]'}`}>
                  {c.isActive ? (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="w-2.5 h-2.5 rounded-full bg-[#34C759]"
                    />
                  ) : (
                    <UserIcon className="h-4 w-4 text-[#86868B]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-[14px] text-[#1D1D1F] truncate">
                      {c.user.name || c.user.email || '(anonyme)'}
                    </span>
                    {c.user.email && c.user.name && (
                      <span className="text-[11.5px] text-[#86868B] truncate">{c.user.email}</span>
                    )}
                    {c.user.company && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#86868B]">
                        <Building2 className="h-3 w-3" />{c.user.company}
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-[#1D1D1F]/70 line-clamp-2">
                    {c.lastMessage?.role === 'user' ? '> ' : ''}{c.lastMessage?.content || c.title || ''}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-[#86868B]">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {c.messageCount}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(c.updatedAt)}
                    </span>
                    {c.user.country && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" />{c.user.country}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-[#C7C7CC] flex-shrink-0 mt-2" />
              </div>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {openSession && (
          <ConversationDrawer
            sessionId={openSession}
            secret={secret}
            onClose={() => setOpenSession(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ============== Drawer detail conversation (live) ============== */

function ConversationDrawer({
  sessionId, secret, onClose,
}: { sessionId: string; secret: string; onClose: () => void }) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [user, setUser] = useState<FullUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastLenRef = useRef(0);

  const fetchFull = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/conversations/${sessionId}`, {
        headers: { 'x-admin-secret': secret },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSession(data.session);
      setUser(data.user);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [sessionId, secret]);

  useEffect(() => { fetchFull(); }, [fetchFull]);

  // Polling toutes les 3s pour les nouveaux messages
  useEffect(() => {
    const id = setInterval(fetchFull, POLL_DETAIL_MS);
    return () => clearInterval(id);
  }, [fetchFull]);

  // Auto-scroll bottom on new messages
  useEffect(() => {
    if (!scrollRef.current || !session) return;
    if (session.messages.length > lastLenRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      lastLenRef.current = session.messages.length;
    }
  }, [session]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 right-0 w-full sm:w-[640px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {session?.isActive && (
                <motion.span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759] text-[10.5px] font-semibold"
                  animate={{ opacity: [1, 0.55, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >
                  <Circle className="h-1.5 w-1.5 fill-current" />
                  En direct
                </motion.span>
              )}
              <h3
                className="text-[18px] text-[#1D1D1F] truncate"
                style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
              >
                {user?.name || user?.email || '(anonyme)'}
              </h3>
            </div>
            {user && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#86868B]">
                {user.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>}
                {user.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</span>}
                {user.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{user.company}</span>}
                {user.country && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{user.country}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F] flex-shrink-0">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          style={{
            background: '#F2EFE9',
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,29,31,0.08) 1px, transparent 0)',
            backgroundSize: '14px 14px',
          }}
        >
          {error && (
            <div className="rounded-[14px] bg-[#FF3B30]/10 ring-1 ring-[#FF3B30]/20 px-4 py-3 text-[13px] text-[#FF3B30]">
              {error}
            </div>
          )}
          {!session && !error && (
            <div className="flex items-center gap-2 text-[#86868B] text-[14px] py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
            </div>
          )}
          {session?.messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} gap-1`}>
              <div
                className={`max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#1D1D1F] text-white'
                    : 'bg-white text-[#1D1D1F] ring-1 ring-black/5'
                }`}
                style={m.role === 'user'
                  ? { boxShadow: '0 2px 10px -2px rgba(0,0,0,0.18)' }
                  : { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                {m.content}
              </div>
              {/* Bouton Traduire (Google Translate web) - utile pour les messages
                  en langues non maitrisees (bangla, arabe, urdu, etc.).
                  @author Rabah Ziane - 2026-05-14 */}
              <button
                onClick={() => openTranslate(m.content)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-black/8 hover:border-black/20 hover:bg-[#F5F5F7] text-[10.5px] text-[#86868B] hover:text-[#1D1D1F] transition"
                title="Traduire en francais via Google Translate"
              >
                <Languages className="h-3 w-3" /> Traduire
              </button>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-black/5 flex items-center justify-between text-[11px] text-[#86868B]">
          <span>{session?.messages.length || 0} messages</span>
          {session && (
            <span>Derniere activite : {timeAgo(session.updatedAt)}</span>
          )}
        </div>
      </motion.div>
    </>
  );
}

/* ============== Helpers ============== */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return 'a l\'instant';
  if (sec < 60) return `il y a ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}
