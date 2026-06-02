import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Plus, Menu as MenuIcon, X as XIcon, MessageSquare, Trash2, LogOut } from 'lucide-react';
import AIOrb from './AIOrb';

type Msg = { role: 'user' | 'assistant'; content: string };
type ChatUser = { id: string; email: string; name: string; company?: string | null; phone?: string | null; country?: string | null };
type ConvSummary = { sessionId: string; title: string; status: string; messageCount: number; lastUpdate: string; preview: string };

const TOKEN_KEY = 'dd_chat_token';
const ACTIVE_CONV_KEY = 'dd_active_conv';

// Les suggestions sont resolues via t() dans le composant pour suivre la langue active.
// @author Rabah Ziane - 2026-05-11
const STARTER_SUGGESTION_KEYS = [
  'chat.suggest1',
  'chat.suggest2',
  'chat.suggest3',
  'chat.suggest4',
  'chat.suggest5',
];

/* Strip markdown bold (**...**) for plain-text contexts (chips, single-line previews). */
function stripBold(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1');
}

/* Render text with **bold** markers as JSX (strong) + preserve newlines via parent whitespace-pre-wrap. */
function renderRichText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/* Extract bullet/dash/numbered list items from assistant text. 2+ items required. */
function extractListItems(text: string): string[] {
  if (!text) return [];
  if (/ESTIMATION|━━━|─────/i.test(text)) return [];
  const items: string[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    let m = line.match(/^[-•*]\s+(.+)$/);
    if (m) { items.push(m[1].trim()); continue; }
    m = line.match(/^\d+[.)]\s+(.+)$/);
    if (m) { items.push(m[1].trim()); continue; }
  }
  const cleaned = Array.from(new Set(items.map((s) => s.replace(/[.,;:]+$/, '').trim()))).slice(0, 8);
  return cleaned.length >= 2 ? cleaned : [];
}

/* ============== AUTH GATE ============== */

function ChatAuth({ onAuth }: { onAuth: (token: string, user: ChatUser) => void }) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Veuillez vérifier votre email.'); return; }
    setBusy(true);
    // Tous les cas d'echec (syntaxe, jetable, MX inexistant, reseau, erreur backend) renvoient
    // le meme message simple cote UX : "Veuillez verifier votre email."
    // Pourquoi : demande user 2026-05-19, message generique a affichage clair plutot que
    // techniques (no_mx, jetable...) qui peuvent confondre un prospect non technique.
    // @author Rabah Ziane
    const GENERIC_EMAIL_ERROR = 'Veuillez vérifier votre email.';
    try {
      const res = await fetch('/api/project-chat/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) { setError(GENERIC_EMAIL_ERROR); return; }
      const data = await res.json();
      onAuth(data.token, data.user);
    } catch (err) {
      setError(GENERIC_EMAIL_ERROR);
    } finally {
      setBusy(false);
    }
  };

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
            {t('chat.letsTalk')}
          </h1>
          <p className="mt-2 text-[15px] text-[#86868B] text-center max-w-[360px]">
            {t('chat.emailEntry')}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-[22px] ring-1 ring-black/5 p-5 sm:p-6 space-y-3"
          style={{ boxShadow: '0 12px 30px -12px rgba(0,0,0,0.10)' }}
        >
          <div>
            <label className="block text-[12px] font-semibold text-[#1D1D1F] mb-1">{t('chat.emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-[12px] bg-[#F5F5F7] ring-1 ring-transparent focus:ring-[#1D1D1F] outline-none text-[15px] text-[#1D1D1F]"
              placeholder="vous@exemple.com"
            />
          </div>

          {error && <p className="text-[13px] text-[#FF3B30]">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-1 px-5 py-3 rounded-full bg-[#1D1D1F] text-white text-[15px] font-semibold hover:bg-[#3C3C43] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : null}
            {t('chat.startBtn')}
          </button>

        </form>
      </div>
    </div>
  );
}

/* ============== MAIN CHAT ============== */

const ProjectChat = () => {
  const { t, i18n } = useTranslation();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => localStorage.getItem(ACTIVE_CONV_KEY));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const authedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }, [token]);

  /* Init: validate token + load user + conversations */
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const meRes = await authedFetch('/api/project-chat/me');
        if (!meRes.ok) throw new Error('invalid');
        const meData = await meRes.json();
        setUser(meData.user);
        await reloadConversations();
        // If active conv set, load it
        const activeId = localStorage.getItem(ACTIVE_CONV_KEY);
        if (activeId) {
          await loadConversation(activeId);
        }
      } catch (err) {
        // Token invalid - clear
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const reloadConversations = async () => {
    try {
      const res = await authedFetch('/api/project-chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {}
  };

  const loadConversation = async (sessionId: string) => {
    try {
      const res = await authedFetch(`/api/project-chat/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      setActiveSessionId(sessionId);
      localStorage.setItem(ACTIVE_CONV_KEY, sessionId);
      setSidebarOpen(false);
    } catch {}
  };

  const newConversation = () => {
    setMessages([]);
    setActiveSessionId(null);
    localStorage.removeItem(ACTIVE_CONV_KEY);
    setSidebarOpen(false);
  };

  const deleteConversation = async (sessionId: string) => {
    if (!confirm('Supprimer cette conversation ?')) return;
    await authedFetch(`/api/project-chat/${sessionId}`, { method: 'DELETE' });
    if (sessionId === activeSessionId) newConversation();
    await reloadConversations();
  };

  const handleAuth = (newToken: string, newUser: ChatUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACTIVE_CONV_KEY);
    setToken(null);
    setUser(null);
    setMessages([]);
    setConversations([]);
    setActiveSessionId(null);
  };

  /* Inline suggestions (chips above composer) from latest assistant list */
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastAssistantContent = lastAssistant?.content || '';
  const inlineSuggestions = !busy ? extractListItems(lastAssistantContent) : [];
  useEffect(() => { setPicked(new Set()); }, [lastAssistantContent]);

  const togglePick = (s: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  /* Auto-scroll */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  // Pre-fill du chat via query string ?prefill=...
  // Cas d'usage : bouton "S'inscrire" sur /formation -> redirige vers
  // /discutons?prefill=Je%20souhaite%20m'inscrire... pour demarrer la conv sur le rail
  // Formation. Le message est envoye automatiquement une fois le user authentifie.
  // L'URL est nettoyee apres pour eviter le rejeu au refresh.
  // @author Rabah Ziane - 2026-05-14
  const prefillSentRef = useRef(false);
  useEffect(() => {
    if (prefillSentRef.current) return;
    if (!user || !token || busy) return;
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get('prefill');
    if (!prefill || !prefill.trim()) return;
    prefillSentRef.current = true;
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
    void send(prefill.slice(0, 1000));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const send = async (text?: string) => {
    let content = (text ?? input).trim();
    if (picked.size > 0) {
      const picks = Array.from(picked).map(stripBold).join(', ');
      content = content ? `${picks}. ${content}` : picks;
    }
    if (!content || busy) return;

    setError(null);
    setInput('');
    setPicked(new Set());
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setBusy(true);

    try {
      const res = await authedFetch('/api/project-chat', {
        method: 'POST',
        // Force l'IA a repondre dans la langue UI active (sinon elle detecte FR par defaut). @author Rabah Ziane - 2026-05-13
        body: JSON.stringify({ sessionId: activeSessionId, message: content, lang: (i18n.language || 'fr').split('-')[0] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      // Capture sessionId if this was a new conv
      if (!activeSessionId && data.sessionId) {
        setActiveSessionId(data.sessionId);
        localStorage.setItem(ACTIVE_CONV_KEY, data.sessionId);
      }
      await reloadConversations();
    } catch {
      setError("L'assistant n'a pas pu répondre. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  /* ===== AUTH GATE ===== */
  if (!token || !user) return <ChatAuth onAuth={handleAuth} />;

  /* ===== CHAT ===== */
  const hasUserMsg = messages.some((m) => m.role === 'user');

  const Sidebar = (
    <div className="h-full flex flex-col bg-white border-r border-black/8">
      <div className="px-4 pt-5 pb-3 border-b border-black/5">
        <div className="flex items-center gap-2 mb-3">
          <AIOrb size={22} innerColor="#FFFFFF" />
          <span className="font-brand text-[15px] text-[#1D1D1F]">Discutons..</span>
        </div>
        <button
          onClick={newConversation}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[13.5px] font-semibold hover:bg-[#3C3C43] transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          {t('chat.newConv')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="text-[12.5px] text-[#86868B] text-center px-3 py-6">{t("chat.noConv")}</p>
        ) : (
          conversations.map((c) => (
            <div key={c.sessionId} className="group flex items-center">
              <button
                onClick={() => loadConversation(c.sessionId)}
                className={`flex-1 text-left px-3 py-2.5 rounded-[10px] transition-colors min-w-0 ${
                  c.sessionId === activeSessionId ? 'bg-[#F2EFE9]' : 'hover:bg-[#F5F5F7]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1D1D1F] truncate">
                  <MessageSquare className="h-3 w-3 flex-shrink-0" strokeWidth={2} />
                  <span className="truncate">{c.title}</span>
                </div>
                {c.preview && (
                  <p className="text-[11.5px] text-[#86868B] truncate mt-0.5">{c.preview}</p>
                )}
              </button>
              <button
                onClick={() => deleteConversation(c.sessionId)}
                className="opacity-0 group-hover:opacity-100 px-2 py-2 text-[#86868B] hover:text-[#FF3B30] transition-opacity"
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-black/5">
        <div className="text-[12.5px] font-semibold text-[#1D1D1F] truncate">{user.name}</div>
        <div className="text-[11.5px] text-[#86868B] truncate">{user.email}</div>
        <button
          onClick={handleLogout}
          className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-[#86868B] hover:text-[#1D1D1F]"
        >
          <LogOut className="h-3 w-3" strokeWidth={2} />
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="h-[100dvh] w-screen max-w-full flex overflow-hidden"
      style={{
        background: '#F2EFE9',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,29,31,0.10) 1px, transparent 0)',
        backgroundSize: '14px 14px',
      }}
    >
      {/* Sidebar - desktop */}
      <aside className="hidden lg:block w-[280px] flex-shrink-0 fixed inset-y-0 left-0">
        {Sidebar}
      </aside>

      {/* Sidebar - mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed inset-y-0 left-0 w-[300px] z-50"
            >
              {Sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-[280px] flex flex-col h-[100dvh] min-w-0">
        {/* Top bar */}
        <div className="pt-[60px] sm:pt-[68px] pb-2">
          <div className="max-w-[760px] mx-auto px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-[#1D1D1F] hover:text-[#3C3C43] mr-1"
                aria-label="Conversations"
              >
                <MenuIcon className="h-5 w-5" strokeWidth={1.8} />
              </button>
              <AIOrb size={26} innerColor="#F2EFE9" />
              <span className="font-brand text-[16px] text-[#1D1D1F]">Discutons..</span>
            </div>
            <a href="/" className="text-[14px] text-[#86868B] hover:text-[#1D1D1F]" aria-label="Fermer">Accueil</a>
          </div>
          <div className="max-w-[760px] mx-auto px-5 mt-2">
            <div className="h-px bg-black/8" />
          </div>
        </div>

        {/* Messages - the only scrollable region (hero is inside so it scrolls too) */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {!hasUserMsg && (
            <div className="max-w-[760px] mx-auto w-full px-5 pt-4 pb-1">
              <h1
                className="text-[28px] sm:text-[40px] leading-[1.08] text-[#1D1D1F] mb-2"
                style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
              >
                Bonjour {user.name},<br />{t("chat.letsTalk")}
              </h1>
              <p className="text-[14px] sm:text-[16px] text-[#86868B] max-w-[560px]">
                {t("chat.describeIdea")}
              </p>
            </div>
          )}
          <div className="max-w-[760px] mx-auto w-full px-5 py-4 pb-[320px] space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] break-words overflow-wrap-anywhere rounded-[18px] px-4 py-3 text-[15px] leading-[1.45] whitespace-pre-wrap ${
                      m.role === 'user' ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#1D1D1F] ring-1 ring-black/5'
                    }`}
                    style={m.role === 'user'
                      ? { overflowWrap: 'anywhere', wordBreak: 'break-word', boxShadow: '0 2px 10px -2px rgba(0,0,0,0.18)' }
                      : { overflowWrap: 'anywhere', wordBreak: 'break-word', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  >
                    {m.role === 'assistant' ? renderRichText(m.content) : m.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {busy && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div
                  className="bg-white ring-1 ring-black/5 rounded-[18px] px-4 py-3 inline-flex items-center gap-3 text-[#86868B]"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <span className="inline-flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="block w-1.5 h-1.5 rounded-full bg-[#1D1D1F]"
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }}
                      />
                    ))}
                  </span>
                  <span className="text-[13.5px] text-[#1D1D1F]/75">{t("chat.typing")}</span>
                </div>
              </motion.div>
            )}

            {error && <div className="text-center text-[13px] text-[#FF3B30]">{error}</div>}

            {/* Starter suggestions inside scrollable area */}
            {!hasUserMsg && (
              <div className="pt-2">
                <div className="text-[12px] uppercase tracking-[0.12em] font-semibold text-[#86868B] mb-2">{t('chat.suggestionsTitle')}</div>
                <div className="flex flex-col gap-2">
                  {STARTER_SUGGESTION_KEYS.map((key) => {
                    const s = t(key);
                    return (
                      <button
                        key={key}
                        onClick={() => send(s)}
                        className="text-left text-[14.5px] text-[#1D1D1F] bg-white hover:bg-[#FAFAFA] ring-1 ring-black/8 rounded-[14px] px-4 py-3 transition-colors"
                        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer - fixed bottom */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-[280px] z-30 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] bg-[#F2EFE9] border-t border-black/5 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)]">
          <div className="max-w-[760px] mx-auto px-5">
            {inlineSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-wrap gap-1 mb-2"
              >
                {inlineSuggestions.map((s) => {
                  const isOn = picked.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => togglePick(s)}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-[3px] rounded-full text-[10px] leading-tight font-medium transition-all max-w-[180px] ${
                        isOn
                          ? 'bg-[#1D1D1F] text-white ring-1 ring-[#1D1D1F]'
                          : 'bg-white text-[#1D1D1F] ring-1 ring-black/8 hover:ring-black/20'
                      }`}
                      style={!isOn ? { boxShadow: '0 1px 2px rgba(0,0,0,0.03)' } : undefined}
                      title={stripBold(s)}
                    >
                      {isOn && <span className="text-[8px]">✓</span>}
                      <span className="truncate">{stripBold(s)}</span>
                    </button>
                  );
                })}
                {picked.size > 0 && (
                  <button
                    onClick={() => setPicked(new Set())}
                    className="text-[9.5px] text-[#86868B] hover:text-[#1D1D1F] underline px-1"
                  >
                    Tout retirer
                  </button>
                )}
              </motion.div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-end gap-2 bg-white ring-1 ring-black/8 rounded-[22px] p-2 pl-4"
              style={{ boxShadow: '0 6px 24px -8px rgba(0,0,0,0.12)' }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                rows={1}
                placeholder={picked.size > 0 ? t('chat.typePrecision') : t('chat.typePlaceholder')}
                className="flex-1 resize-none border-0 outline-none bg-transparent text-[15px] py-2.5 max-h-32 text-[#1D1D1F] placeholder:text-[#86868B]"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || (!input.trim() && picked.size === 0)}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#3C3C43] transition-colors"
                aria-label="Envoyer"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Send className="h-4 w-4" strokeWidth={2} />}
              </button>
            </form>
            <p className="text-center text-[11px] text-[#86868B] mt-2">
              Vos messages restent confidentiels et servent uniquement pour votre projet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectChat;
