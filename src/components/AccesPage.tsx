import { useEffect, useState } from 'react';

/**
 * Page publique : le client transmet ses identifiants en securite (lien envoye
 * par l'agence). HTTPS + chiffrement AES-256 au repos. @author Rabah Ziane - 2026-06-02
 */
type Ctx = { label?: string; agencyName?: string };

export default function AccesPage({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'received' | 'cancelled' | 'expired' | 'notfound'>('pending');
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/access-requests/${token}`);
        const j = await r.json();
        if (!j.ok) { setStatus('notfound'); return; }
        setCtx(j.context);
        setStatus(j.expired ? 'expired' : j.status);
      } catch { setStatus('notfound'); } finally { setLoading(false); }
    })();
  }, [token]);

  async function submit() {
    setError(null);
    if (!login.trim()) { setError('Indiquez votre identifiant.'); return; }
    if (!password.trim()) { setError('Indiquez votre mot de passe.'); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/access-requests/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: login.trim(), password: password.trim(), note: note.trim() || undefined }) });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.error === 'expired' ? 'Ce lien a expiré.' : 'Envoi impossible. Réessayez.'); return; }
      setDone(true); setLogin(''); setPassword(''); setNote('');
    } catch { setError('Erreur réseau.'); } finally { setSubmitting(false); }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-screen bg-[#F2EFE9] flex items-center justify-center px-5 py-12"><div className="w-full max-w-md">{children}</div></main>
  );
  const Msg = ({ title, text, ok }: { title: string; text: string; ok?: boolean }) => (
    <div className={`rounded-2xl border p-8 text-center bg-white ${ok ? 'border-[#34C759]/40' : 'border-black/10'}`}><h1 className="text-xl font-bold text-[#1D1D1F]">{title}</h1><p className="text-[13px] text-[#86868B] mt-2">{text}</p></div>
  );

  if (loading) return <Shell><p className="text-center text-[#86868B] text-[13px]">Chargement…</p></Shell>;
  if (status === 'notfound') return <Shell><Msg title="Lien introuvable" text="Ce lien n'existe pas ou a été supprimé." /></Shell>;
  if (status === 'cancelled') return <Shell><Msg title="Demande annulée" text="Cette demande a été annulée. Contactez votre interlocuteur." /></Shell>;
  if (status === 'expired') return <Shell><Msg title="Lien expiré" text="Ce lien a expiré. Demandez-en un nouveau." /></Shell>;
  if (done || status === 'received') return <Shell><Msg ok title="Accès transmis ✓" text="Merci, vos identifiants ont été transmis de façon chiffrée. Vous pouvez fermer cette page." /></Shell>;

  return (
    <Shell>
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#86868B]">Delivery Digital · Accès sécurisé</p>
        <h1 className="text-xl font-bold text-[#1D1D1F] mt-1">{ctx?.label || 'Transmettez vos accès'}</h1>
        {ctx?.agencyName && <p className="text-[13px] text-[#86868B] mt-1">Demandé par {ctx.agencyName}.</p>}
        <div className="rounded-xl bg-[#34C759]/5 border border-[#34C759]/30 p-3 text-[12px] text-[#1D1D1F] my-4">🔒 Connexion chiffrée (HTTPS). Vos identifiants sont stockés chiffrés (AES-256).</div>
        <label className="block text-[12px] font-semibold mb-1">Identifiant *</label>
        <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Identifiant / email" className="w-full px-3 py-2.5 rounded-lg border border-black/10 text-[14px] mb-3 focus:outline-none focus:border-black/30" />
        <label className="block text-[12px] font-semibold mb-1">Mot de passe *</label>
        <div className="relative mb-3">
          <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full px-3 py-2.5 pr-16 rounded-lg border border-black/10 text-[14px] focus:outline-none focus:border-black/30" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11.5px] text-[#86868B]">{show ? 'Masquer' : 'Voir'}</button>
        </div>
        <label className="block text-[12px] font-semibold mb-1">Note (facultatif)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="URL du portail, code client…" className="w-full px-3 py-2.5 rounded-lg border border-black/10 text-[14px] mb-4 focus:outline-none focus:border-black/30" />
        {error && <p className="text-[12.5px] text-[#FF3B30] mb-3">{error}</p>}
        <button onClick={submit} disabled={submitting} className="w-full px-4 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-60">{submitting ? 'Envoi sécurisé…' : 'Transmettre en sécurité'}</button>
      </div>
    </Shell>
  );
}
