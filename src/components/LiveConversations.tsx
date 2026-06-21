import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Search, RefreshCw, X as XIcon, Mail, Phone, Building2,
  MessageSquare, Circle, ChevronRight, User as UserIcon, Globe, Clock,
  Languages, Send, CheckCircle2, FileText, Download,
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
  relancedAt?: string | null;
  relanceCount?: number;
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
  relancedAt?: string | null;
  relanceCount?: number;
  humanTakeover?: boolean;
  category?: 'hot' | 'serious' | 'callback' | 'cold' | 'spam' | null;
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

  // Bouton "Relancer par email" - envoie un email au prospect qui a commence
  // a discuter puis a quitte. La confirmation utilise window.confirm pour
  // rester simple (pas de modal custom). Stocke un flash pour feedback inline.
  // @author Rabah Ziane - 2026-05-19
  const [relanceState, setRelanceState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [relanceMsg, setRelanceMsg] = useState<string>('');
  // Generation de devis a partir de la conversation (Claude). @Rabah 2026-06-02
  const [quoteState, setQuoteState] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [quoteMsg, setQuoteMsg] = useState<string>('');
  const [quoteToken, setQuoteToken] = useState<string>('');

  // Reprise main par conseiller (mode humain) : permet de taper un message
  // manuel envoye au prospect. Active humanTakeover cote serveur, qui empeche
  // le bot IA de repondre automatiquement aux messages suivants du prospect.
  // @author Rabah Ziane - 2026-05-21
  const [manualText, setManualText] = useState('');
  const [sendingManual, setSendingManual] = useState(false);
  const sendManualMessage = useCallback(async () => {
    const content = manualText.trim();
    if (!content) return;
    setSendingManual(true);
    try {
      const res = await fetch(`/api/admin/conversations/${sessionId}/manual-message`, {
        method: 'POST',
        headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSession((prev) => (prev ? { ...prev, messages: data.messages, humanTakeover: true } : prev));
      setManualText('');
    } catch (e: any) {
      alert(`Erreur envoi : ${e.message || 'inconnue'}`);
    } finally {
      setSendingManual(false);
    }
  }, [manualText, sessionId, secret]);
  const toggleTakeover = useCallback(async (active: boolean) => {
    try {
      const res = await fetch(`/api/admin/conversations/${sessionId}/takeover`, {
        method: 'POST',
        headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSession((prev) => (prev ? { ...prev, humanTakeover: data.humanTakeover } : prev));
    } catch (e: any) {
      alert(`Erreur toggle : ${e.message || 'inconnue'}`);
    }
  }, [sessionId, secret]);

  const sendRelance = useCallback(async () => {
    if (!user?.email) {
      setRelanceState('error');
      setRelanceMsg('Pas d’email pour ce prospect');
      return;
    }
    const ok = window.confirm(
      `Envoyer un email de relance à ${user.email} ?\n\n` +
      (session?.relancedAt
        ? `⚠️ Déjà relancé le ${new Date(session.relancedAt).toLocaleString('fr-FR')}. Renvoyer quand même ?`
        : 'Un email avec le dernier message du prospect lui sera envoyé.')
    );
    if (!ok) return;
    setRelanceState('sending');
    try {
      const res = await fetch(`/api/admin/conversations/${sessionId}/relance`, {
        method: 'POST',
        headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRelanceState('sent');
      setRelanceMsg(`Email envoyé à ${data.sentTo}`);
      // Met a jour la session locale pour afficher la date de relance.
      setSession((prev) => (prev ? { ...prev, relancedAt: data.relancedAt, relanceCount: data.relanceCount } : prev));
      setTimeout(() => setRelanceState('idle'), 4000);
    } catch (e: any) {
      setRelanceState('error');
      setRelanceMsg(e.message || 'Erreur envoi');
      setTimeout(() => setRelanceState('idle'), 5000);
    }
  }, [sessionId, secret, user, session]);

  // Genere un devis (brouillon) a partir de la conversation : Claude lit l'echange
  // + le catalogue et propose des lignes tarifees. Le devis apparait dans la
  // section Devis pour relecture/envoi. @Rabah 2026-06-02
  const generateQuote = useCallback(async () => {
    if (quoteState === 'generating') return;
    const ok = window.confirm('Générer un devis (brouillon) à partir de cette conversation ?\n\nL’IA analyse l’échange et propose des prestations chiffrées. Vous pourrez le relire et l’ajuster dans la section Devis avant de l’envoyer.');
    if (!ok) return;
    setQuoteState('generating');
    setQuoteMsg('');
    try {
      const res = await fetch('/api/admin/quotes-quick/from-conversation', {
        method: 'POST',
        headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setQuoteState('done');
      setQuoteToken(data.item?.publicToken || '');
      setQuoteMsg(`Devis ${data.item?.ref || ''} créé en brouillon — retrouvez-le dans la section Devis pour l’ajuster et l’envoyer.`);
      setTimeout(() => setQuoteState('idle'), 8000);
    } catch (e: any) {
      setQuoteState('error');
      setQuoteMsg(e.message || 'Erreur génération devis');
      setTimeout(() => setQuoteState('idle'), 6000);
    }
  }, [sessionId, secret, quoteState]);

  // Telecharge la conversation en PDF brande DELIVERY Digital (infos prospect + echange). @Rabah 2026-06-16
  const downloadConversation = useCallback(async () => {
    if (!session) return;
    const _conv = (session.messages || []).map((m) => m.content || '').join(' ');
    const _pm = _conv.match(/(\+?\d[\d().\-\s]{7,}\d)/);
    const phone = (user?.phone || (_pm ? _pm[1].trim() : '')) || '';
    const clean = (s: any) => String(s ?? '').replace(/[—–]/g, '-');
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const M = 15;
      const navy: [number, number, number] = [11, 31, 58];
      const orange: [number, number, number] = [255, 153, 0];
      const gray: [number, number, number] = [110, 116, 124];

      let headerBottom = 24;
      try {
        const logo = await new Promise<{ data: string; w: number; h: number }>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            const x = c.getContext('2d');
            if (!x) return reject(new Error('ctx'));
            x.drawImage(img, 0, 0);
            resolve({ data: c.toDataURL('image/png'), w: img.width, h: img.height });
          };
          img.onerror = reject;
          img.src = encodeURI('/Logo-DELIVERY-Digital-Neo-sans-Bold noir_ 2 copie 5.png');
        });
        const lw = 48; const lh = lw * (logo.h / logo.w);
        pdf.addImage(logo.data, 'PNG', M, 12, lw, lh);
        headerBottom = 12 + lh + 4;
      } catch {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.setTextColor(navy[0], navy[1], navy[2]);
        pdf.text('DELIVERY Digital', M, 22); headerBottom = 28;
      }

      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(navy[0], navy[1], navy[2]);
      pdf.text('Conversation prospect', M, headerBottom + 6);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(gray[0], gray[1], gray[2]);
      pdf.text(clean('Exporte le ' + new Date().toLocaleString('fr-FR')), W - M, headerBottom + 6, { align: 'right' });
      pdf.setDrawColor(orange[0], orange[1], orange[2]); pdf.setLineWidth(1);
      pdf.line(M, headerBottom + 10, W - M, headerBottom + 10);

      let y = headerBottom + 20;

      const info = [
        user?.name && ('Nom : ' + user.name),
        user?.email && ('Email : ' + user.email),
        phone && ('Telephone : ' + phone),
        user?.company && ('Entreprise : ' + user.company),
        user?.country && ('Pays : ' + user.country),
        session?.category && ('Categorie : ' + session.category),
      ].filter(Boolean) as string[];
      const infoH = 10 + info.length * 6;
      pdf.setFillColor(245, 245, 247);
      pdf.roundedRect(M, y, W - 2 * M, infoH, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(navy[0], navy[1], navy[2]);
      pdf.text('Informations prospect', M + 4, y + 7);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(40, 40, 40);
      info.forEach((line, i) => pdf.text(clean(line), M + 4, y + 14 + i * 6));
      y += infoH + 8;

      const maxW = W - 2 * M - 8;
      (session.messages || []).forEach((m) => {
        const who = m.role === 'assistant' ? 'DELIVERY Digital' : (user?.name || 'Prospect');
        const lines = pdf.splitTextToSize(clean(m.content), maxW);
        const blockH = 9 + lines.length * 5;
        if (y + blockH > H - 18) { pdf.addPage(); y = 20; }
        if (m.role === 'assistant') pdf.setFillColor(245, 245, 247); else pdf.setFillColor(238, 243, 251);
        pdf.roundedRect(M, y, W - 2 * M, blockH, 2, 2, 'F');
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(gray[0], gray[1], gray[2]);
        pdf.text(clean(who), M + 4, y + 5);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
        pdf.text(lines, M + 4, y + 11);
        y += blockH + 4;
      });

      const pages = pdf.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        pdf.setPage(p);
        pdf.setDrawColor(225, 225, 225); pdf.setLineWidth(0.3); pdf.line(M, H - 14, W - M, H - 14);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(gray[0], gray[1], gray[2]);
        pdf.text(clean('DELIVERY Digital - deliverydigital.fr'), M, H - 9);
        pdf.text('Page ' + p + '/' + pages, W - M, H - 9, { align: 'right' });
      }

      pdf.save('conversation-' + String(user?.name || user?.email || 'prospect').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.pdf');
    } catch (e) {
      console.error('PDF conversation error', e);
      alert('Erreur lors de la generation du PDF');
    }
  }, [session, user]);

  // Envoie au partenaire/agence (WhatsApp ou Email) : coordonnees prospect + lien devis. @Rabah 2026-06-16
  const sendToAgency = useCallback((channel: 'whatsapp' | 'email') => {
    if (!session) return;
    const _conv = (session.messages || []).map((m) => m.content || '').join(' ');
    const _pm = _conv.match(/(\+?\d[\d().\-\s]{7,}\d)/);
    const phone = (user?.phone || (_pm ? _pm[1].trim() : '')) || '';
    let devisUrl = quoteToken ? `https://deliverydigital.fr/devis/${quoteToken}` : '';
    if (!devisUrl) devisUrl = (window.prompt('Lien du devis a transmettre (optionnel) :', '') || '').trim();
    const lines = [
      'Nouveau prospect a contacter (DELIVERY Digital)',
      '',
      user?.name && ('Nom : ' + user.name),
      user?.email && ('Email : ' + user.email),
      phone && ('Telephone : ' + phone),
      user?.company && ('Entreprise : ' + user.company),
      user?.country && ('Pays : ' + user.country),
      session?.category && ('Categorie : ' + session.category),
      devisUrl ? '' : undefined,
      devisUrl ? ('Devis : ' + devisUrl) : undefined,
      '',
      'Merci de recontacter ce prospect. Le detail de la conversation est dans le PDF telechargeable.',
    ].filter((x) => x !== false && x !== undefined) as string[];
    const text = lines.join('\n');
    if (channel === 'whatsapp') {
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    } else {
      const subject = 'Prospect a contacter' + (user?.name ? ' - ' + user.name : '');
      window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
    }
  }, [session, user, quoteToken]);

  const editMessageAt = useCallback(async (i: number, current: string) => {
    const next = window.prompt('Modifier le message :', current);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === current.trim()) return;
    try {
      const res = await fetch(`/api/admin/conversations/${sessionId}/messages/${i}`, {
        method: 'PATCH',
        headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSession((prev) => (prev ? { ...prev, messages: data.messages } : prev));
    } catch (e: any) {
      alert(`Erreur modification : ${e.message || 'inconnue'}`);
    }
  }, [sessionId, secret]);
  const deleteMessageAt = useCallback(async (i: number) => {
    if (!window.confirm('Supprimer ce message ? Action irréversible.')) return;
    try {
      const res = await fetch(`/api/admin/conversations/${sessionId}/messages/${i}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSession((prev) => (prev ? { ...prev, messages: data.messages } : prev));
    } catch (e: any) {
      alert(`Erreur suppression : ${e.message || 'inconnue'}`);
    }
  }, [sessionId, secret]);

    const setCategoryAt = useCallback(async (cat: string | null) => {
    try {
      const res = await fetch(`/api/admin/conversations/${sessionId}/category`, {
        method: 'PATCH',
        headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSession((prev) => (prev ? { ...prev, category: data.category } : prev));
    } catch (e: any) {
      alert(`Erreur categorie : ${e.message || 'inconnue'}`);
    }
  }, [sessionId, secret]);

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
                {session?.relancedAt && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759] font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Relancé {session.relanceCount && session.relanceCount > 1 ? `×${session.relanceCount}` : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Bouton Telecharger la conversation (infos prospect + echange) */}
            <button
              onClick={downloadConversation}
              disabled={!session?.messages?.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white text-[#1D1D1F] border border-black/10 hover:border-black/20 disabled:opacity-50 transition"
              title="Télécharger la conversation (avec les infos du prospect)"
            >
              <Download className="h-3.5 w-3.5" /> Télécharger
            </button>
            {/* Envoyer a l'agence (WhatsApp / Email) : coordonnees prospect + lien devis */}
            <button
              onClick={() => sendToAgency('whatsapp')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[#25D366] text-white hover:bg-[#1ebe5d] transition"
              title="Envoyer le prospect + devis a l'agence par WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Agence WhatsApp
            </button>
            <button
              onClick={() => sendToAgency('email')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white text-[#1D1D1F] border border-black/10 hover:border-black/20 transition"
              title="Envoyer le prospect + devis a l'agence par email"
            >
              <Mail className="h-3.5 w-3.5" /> Agence Email
            </button>
            {/* Bouton Generer un devis - lit la conversation et cree un brouillon de devis. */}
            <button
              onClick={generateQuote}
              disabled={quoteState === 'generating'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition ${
                quoteState === 'done'
                  ? 'bg-[#34C759] text-white'
                  : quoteState === 'error'
                  ? 'bg-[#FF3B30]/10 text-[#FF3B30] ring-1 ring-[#FF3B30]/30'
                  : 'bg-white text-[#1D1D1F] border border-black/10 hover:border-black/20 disabled:opacity-50'
              }`}
              title="Générer un devis (brouillon) à partir de cette conversation"
            >
              {quoteState === 'generating' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {quoteState === 'generating' ? 'Génération…' : quoteState === 'done' ? 'Devis créé ✓' : quoteState === 'error' ? 'Échec' : 'Générer un devis'}
            </button>
            {/* Bouton Relancer par email - actif uniquement si on a un email. */}
            {user?.email && (
              <button
                onClick={sendRelance}
                disabled={relanceState === 'sending'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition ${
                  relanceState === 'sent'
                    ? 'bg-[#34C759] text-white'
                    : relanceState === 'error'
                    ? 'bg-[#FF3B30]/10 text-[#FF3B30] ring-1 ring-[#FF3B30]/30'
                    : 'bg-[#1D1D1F] text-white hover:bg-black disabled:opacity-50'
                }`}
                title={user.email ? `Envoyer un email de relance à ${user.email}` : ''}
              >
                {relanceState === 'sending' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {relanceState === 'sending' ? 'Envoi…' : relanceState === 'sent' ? 'Envoyé ✓' : relanceState === 'error' ? 'Échec' : 'Relancer'}
              </button>
            )}
            <select
              value={session?.category || ''}
              onChange={(e) => setCategoryAt(e.target.value || null)}
              className="px-2.5 py-1.5 rounded-full text-[12px] font-semibold bg-white border border-black/10 hover:border-black/20 text-[#1D1D1F] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D1D1F]/30"
              title="Categorie du prospect"
            >
              <option value="">Categorie...</option>
              <option value="hot">🔥 Hot lead</option>
              <option value="serious">⭐ Sérieux</option>
              <option value="callback">📞 À rappeler</option>
              <option value="cold">❄️ Froid</option>
              <option value="spam">🗑️ Spam</option>
            </select>
            <button onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F]">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        {relanceState !== 'idle' && relanceMsg && (
          <div className={`px-5 py-2 text-[12px] ${
            relanceState === 'sent' ? 'bg-[#34C759]/10 text-[#34C759]' :
            relanceState === 'error' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 'bg-[#F2EFE9] text-[#86868B]'
          }`}>
            {relanceMsg}
          </div>
        )}
        {quoteState !== 'idle' && quoteMsg && (
          <div className={`px-5 py-2 text-[12px] ${
            quoteState === 'done' ? 'bg-[#34C759]/10 text-[#34C759]' :
            quoteState === 'error' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 'bg-[#F2EFE9] text-[#86868B]'
          }`}>
            {quoteMsg}
          </div>
        )}

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
              <div className="inline-flex items-center gap-1">
                <button
                  onClick={() => openTranslate(m.content)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-black/8 hover:border-black/20 hover:bg-[#F5F5F7] text-[10.5px] text-[#86868B] hover:text-[#1D1D1F] transition"
                  title="Traduire en francais via Google Translate"
                >
                  <Languages className="h-3 w-3" /> Traduire
                </button>
                <button
                  onClick={() => editMessageAt(i, m.content)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-black/8 hover:border-black/20 hover:bg-[#F5F5F7] text-[10.5px] text-[#86868B] hover:text-[#1D1D1F] transition"
                  title="Modifier ce message"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => deleteMessageAt(i)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-black/8 hover:border-[#FF3B30]/40 hover:bg-[#FF3B30]/5 text-[10.5px] text-[#86868B] hover:text-[#FF3B30] transition"
                  title="Supprimer ce message"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Barre composition admin : reprise main / message manuel.
            @author Rabah Ziane - 2026-05-21 */}
        <div className="px-5 py-3 border-t border-black/5 bg-[#FBFAF6]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-[#1D1D1F] uppercase tracking-wide">
              {session?.humanTakeover ? 'Mode humain (IA en pause)' : 'Mode IA (auto)'}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleTakeover(true)}
                disabled={!!session?.humanTakeover}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${session?.humanTakeover ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#1D1D1F] ring-1 ring-black/10 hover:bg-black/5'}`}
                title="Mettre l'IA en pause - vous repondez manuellement"
              >
                Reprendre la main
              </button>
              <button
                onClick={() => toggleTakeover(false)}
                disabled={!session?.humanTakeover}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${!session?.humanTakeover ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#1D1D1F] ring-1 ring-black/10 hover:bg-black/5'}`}
                title="Laisser le bot IA repondre automatiquement"
              >
                Laisser à l'IA DDN
              </button>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendManualMessage();
                }
              }}
              rows={2}
              placeholder="Tapez un message pour le prospect (Cmd+Entree pour envoyer)..."
              className="flex-1 resize-none rounded-[12px] border border-black/10 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1D1D1F]/30"
            />
            <button
              onClick={sendManualMessage}
              disabled={sendingManual || !manualText.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#1D1D1F] text-white text-[12px] font-semibold hover:bg-black disabled:opacity-40"
            >
              {sendingManual ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {sendingManual ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
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
