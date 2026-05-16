/**
 * /admin/dashboard - tableau de bord des conversions.
 *
 * Charge les stats GA/Ads agregees (7/30/90j) + table dernieres conversions
 * + top pages + sources de trafic. Filtres par type + range.
 *
 * Couleurs brand : #59C7DD primary, #002731 ink, #A2DDE9 secondary, #1F5865 accent.
 * Auth : protege par AdminLayout/login admin existant (cookie session).
 *
 * @author Rabah Ziane - 2026-05-13
 */
import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';

type ConvType = 'contact_submit' | 'phone_click' | 'email_click' | 'quote_click';
const TYPES: ConvType[] = ['contact_submit', 'phone_click', 'email_click', 'quote_click'];
const TYPE_LABELS: Record<ConvType, string> = {
  contact_submit: 'Formulaire contact',
  phone_click:    'Clic téléphone',
  email_click:    'Clic email',
  quote_click:    'Demande devis',
};
const TYPE_COLORS: Record<ConvType, string> = {
  contact_submit: '#59C7DD',
  phone_click:    '#A2DDE9',
  email_click:    '#1F5865',
  quote_click:    '#002731',
};

type Stats = {
  byType: Record<ConvType, number>;
  total: number;
  daily: Array<{ date: string; count: number } & Record<ConvType, number>>;
  range: string;
};
type ListItem = {
  _id: string; type: ConvType; page: string; referrer: string;
  utm_source: string; utm_medium: string; utm_campaign: string;
  createdAt: string;
};
type Source = { source: string; count: number };
type TopPage = { page: string; count: number };

type SeoOverview = {
  range: number;
  pages: { published: number; draft: number; rejected: number; byType: Record<string, number>; byCountry: Record<string, number>; byLang: Record<string, number> };
  seo: { gscStatus: 'ok' | 'unauthorized' | 'error'; clicks: number; impressions: number; ctr: number; position: number; indexedUrls: number; gscMessage?: string };
  conversions: { total: number; byType: Record<ConvType, number>; uniqueSessions: number; conversionRate: number; denominator: number };
};
type FunnelStep = { key: string; label: string; value: number; available: boolean };
type GoogleOAuthStatus = { connected: boolean; email?: string; scopes?: string[]; since?: string };

const COLORS = {
  primary: '#59C7DD',
  primaryDark: '#002731',
  secondary: '#A2DDE9',
  textLight: '#F6FAFA',
  accent: '#1F5865',
};

export default function AdminConversionsDashboard({ secret }: { secret: string }) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [typeFilter, setTypeFilter] = useState<ConvType | 'all'>('all');
  const [stats, setStats] = useState<Stats | null>(null);
  const [list, setList] = useState<ListItem[]>([]);
  const [pages, setPages] = useState<TopPage[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [seoOverview, setSeoOverview] = useState<SeoOverview | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [googleAuth, setGoogleAuth] = useState<GoogleOAuthStatus | null>(null);
  const [oauthBanner, setOauthBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('googleConnected') === '1') {
      setOauthBanner({ type: 'success', msg: 'Connecté à Google ! Les données GSC vont apparaître sous 30s.' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (p.get('googleError')) {
      setOauthBanner({ type: 'error', msg: `Échec OAuth Google: ${p.get('googleError')}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!secret) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const qs = `range=${range}` + (typeFilter !== 'all' ? `&type=${typeFilter}` : '');
        const [s, l, p, src, seo, fn] = await Promise.all([
          fetch(`/api/admin/conversions/stats?range=${range}`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
          fetch(`/api/admin/conversions/list?${qs}&limit=20`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
          fetch(`/api/admin/conversions/top-pages?range=${range}`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
          fetch(`/api/admin/conversions/sources?range=${range}`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
          fetch(`/api/admin/seo-analytics/overview?range=${range}`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
          fetch(`/api/admin/seo-analytics/funnel?range=${range}`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
        ]);
        const gauth = await fetch(`/api/admin/google-oauth/status?secret=${encodeURIComponent(secret)}`).then((r) => r.json()).catch(() => null);
        if (cancelled) return;
        setStats(s);
        setList(l.items || []);
        setPages(p.pages || []);
        setSources(src.sources || []);
        setSeoOverview(seo && !seo.error ? seo : null);
        setFunnel(fn?.steps || []);
        setGoogleAuth(gauth);
      } catch { /* */ }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [range, typeFilter, secret]);

  const kpiCards = useMemo(() => {
    const byType = stats?.byType || { contact_submit: 0, phone_click: 0, email_click: 0, quote_click: 0 };
    return TYPES.map((t) => ({ type: t, label: TYPE_LABELS[t], count: byType[t] || 0, color: TYPE_COLORS[t] }));
  }, [stats]);

  return (
    <div style={{ background: '#F6FAFA', minHeight: '100vh' }} className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {oauthBanner && (
          <div className="rounded-2xl p-3 mb-4 text-[13px] flex items-center gap-3" style={{ background: oauthBanner.type === 'success' ? '#E7F8EE' : '#FFE5E5', border: `1px solid ${oauthBanner.type === 'success' ? '#B4E0C6' : '#F5B5B5'}` }}>
            <span>{oauthBanner.type === 'success' ? '✓' : '✗'}</span>
            <span className="flex-1" style={{ color: oauthBanner.type === 'success' ? '#1F7A4D' : '#A33' }}>{oauthBanner.msg}</span>
            <button onClick={() => setOauthBanner(null)} className="font-bold">×</button>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.22em] font-bold mb-1" style={{ color: COLORS.accent }}>
              Performance globale
            </p>
            <h1 className="text-2xl lg:text-3xl tracking-tight font-bold" style={{ color: COLORS.primaryDark }}>
              SEO &amp; Conversions
            </h1>
          </div>
          {/* Range selector */}
          <div className="flex gap-1 rounded-full p-1" style={{ background: '#fff', border: `1px solid ${COLORS.secondary}` }}>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d as 7 | 30 | 90)}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition`}
                style={range === d
                  ? { background: COLORS.primary, color: COLORS.primaryDark }
                  : { background: 'transparent', color: COLORS.accent }}
              >
                {d} jours
              </button>
            ))}
          </div>
        </div>

        {/* SEO + funnel overview ---------- */}
        {seoOverview && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3">
              <div className="rounded-2xl p-4 sm:p-5 shadow-sm" style={{ background: '#fff', borderLeft: `4px solid ${COLORS.primary}` }}>
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-1" style={{ color: COLORS.accent }}>Pages publiées</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.primaryDark }}>{seoOverview.pages.published.toLocaleString('fr-FR')}</p>
                <p className="text-[11px] mt-1" style={{ color: '#86868B' }}>
                  {Object.entries(seoOverview.pages.byCountry).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(' · ')}
                </p>
              </div>

              <div className="rounded-2xl p-4 sm:p-5 shadow-sm" style={{ background: '#fff', borderLeft: `4px solid ${COLORS.accent}` }}>
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-1" style={{ color: COLORS.accent }}>Pages indexées (GSC)</p>
                {seoOverview.seo.gscStatus === 'ok' ? (
                  <>
                    <p className="text-3xl font-bold" style={{ color: COLORS.primaryDark }}>{seoOverview.seo.indexedUrls.toLocaleString('fr-FR')}</p>
                    <p className="text-[11px] mt-1" style={{ color: '#86868B' }}>sur {seoOverview.pages.published} publiées</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold" style={{ color: COLORS.accent }}>—</p>
                    <p className="text-[11px] mt-1" style={{ color: '#86868B' }}>GSC non autorisée</p>
                  </>
                )}
              </div>

              <div className="rounded-2xl p-4 sm:p-5 shadow-sm" style={{ background: '#fff', borderLeft: `4px solid ${COLORS.secondary}` }}>
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-1" style={{ color: COLORS.accent }}>Clics SEO {range}j</p>
                {seoOverview.seo.gscStatus === 'ok' ? (
                  <>
                    <p className="text-3xl font-bold" style={{ color: COLORS.primaryDark }}>{seoOverview.seo.clicks.toLocaleString('fr-FR')}</p>
                    <p className="text-[11px] mt-1" style={{ color: '#86868B' }}>
                      {seoOverview.seo.impressions.toLocaleString('fr-FR')} impressions · CTR {(seoOverview.seo.ctr * 100).toFixed(2)}% · pos {seoOverview.seo.position.toFixed(1)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold" style={{ color: COLORS.accent }}>—</p>
                    <p className="text-[11px] mt-1" style={{ color: '#86868B' }}>Activer Search Console API</p>
                  </>
                )}
              </div>

              <div className="rounded-2xl p-4 sm:p-5 shadow-sm" style={{ background: '#fff', borderLeft: `4px solid ${COLORS.primaryDark}` }}>
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-1" style={{ color: COLORS.accent }}>Taux de conversion</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.primaryDark }}>
                  {(seoOverview.conversions.conversionRate * 100).toFixed(1)}%
                </p>
                <p className="text-[11px] mt-1" style={{ color: '#86868B' }}>
                  {seoOverview.conversions.total} conv. / {seoOverview.conversions.denominator} {seoOverview.seo.gscStatus === 'ok' && seoOverview.seo.clicks > 0 ? 'clics' : 'sessions'}
                </p>
              </div>
            </div>

            {seoOverview.seo.gscStatus !== 'ok' && (
              <div className="rounded-2xl p-3 sm:p-4 mb-4 text-[12.5px] flex items-center gap-3 flex-wrap" style={{ background: '#FFF8E1', border: '1px solid #F5D78E' }}>
                <span style={{ color: '#B26A00' }}>⚠</span>
                <div className="flex-1 min-w-[260px]" style={{ color: '#7A4F00' }}>
                  {googleAuth?.connected ? (
                    <>
                      <strong>Google connecté ({googleAuth.email})</strong> mais GSC répond non autorisé. Vérifie que <code className="font-mono text-[11.5px] bg-white/60 px-1 rounded">{googleAuth.email}</code> est Propriétaire de la propriété <code>deliverydigital.fr</code> dans Search Console.
                    </>
                  ) : (
                    <>
                      <strong>Google Search Console non connecté.</strong> Clique sur "Connecter Google" pour autoriser l'accès aux clics &amp; impressions par page.
                    </>
                  )}
                </div>
                {!googleAuth?.connected ? (
                  <a
                    href={`/api/admin/google-oauth/start?secret=${encodeURIComponent(secret)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-semibold whitespace-nowrap"
                    style={{ background: '#1D1D1F', color: '#fff' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21.35 11.1h-9.17v2.93h5.27c-.23 1.5-1.7 4.4-5.27 4.4-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.71 1.43l2.53-2.43C16.85 4.12 14.78 3 12.18 3 7.06 3 3 7.06 3 12s4.06 9 9.18 9c5.3 0 8.82-3.72 8.82-8.96 0-.6-.07-1.06-.15-1.55z" fill="#fff"/></svg>
                    Connecter Google
                  </a>
                ) : (
                  <button
                    onClick={async () => {
                      if (!confirm('Déconnecter Google ?')) return;
                      await fetch('/api/admin/google-oauth/disconnect', { method: 'POST', headers: { 'x-admin-secret': secret } });
                      window.location.reload();
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap"
                    style={{ background: '#fff', color: '#7A4F00', border: '1px solid #E0C76E' }}
                  >
                    Déconnecter
                  </button>
                )}
              </div>
            )}

            {seoOverview.seo.gscStatus === 'ok' && googleAuth?.connected && (
              <div className="rounded-2xl p-2.5 mb-4 text-[12px] flex items-center gap-2" style={{ background: '#E7F8EE', border: '1px solid #B4E0C6' }}>
                <span style={{ color: '#1F7A4D' }}>✓</span>
                <span style={{ color: '#1F7A4D' }}>Google Search Console connecté via <strong>{googleAuth.email}</strong>.</span>
              </div>
            )}

            {funnel.length > 0 && (
              <div className="rounded-2xl p-4 sm:p-5 mb-6 shadow-sm" style={{ background: '#fff' }}>
                <p className="text-[13px] font-bold mb-3" style={{ color: COLORS.primaryDark }}>Funnel {range}j</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {funnel.map((step, i) => {
                    const maxVal = Math.max(...funnel.map((s) => s.value)) || 1;
                    const pct = step.available ? (step.value / maxVal) * 100 : 0;
                    return (
                      <div key={step.key} className="rounded-xl p-3" style={{ background: i === 0 ? COLORS.textLight : '#fafcfc' }}>
                        <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold mb-1" style={{ color: COLORS.accent }}>{step.label}</p>
                        <p className="text-2xl font-bold" style={{ color: step.available ? COLORS.primaryDark : '#bbb' }}>
                          {step.available ? step.value.toLocaleString('fr-FR') : '—'}
                        </p>
                        <div className="mt-2 h-1.5 rounded-full" style={{ background: '#eee' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS.primary }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Conversions par type ---------- */}
        <p className="text-[12px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: COLORS.accent }}>
          Conversions par type
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {kpiCards.map((c) => (
            <div
              key={c.type}
              className="rounded-2xl p-4 sm:p-5 shadow-sm cursor-pointer transition"
              style={{ background: '#fff', borderLeft: `4px solid ${c.color}` }}
              onClick={() => setTypeFilter(typeFilter === c.type ? 'all' : c.type)}
            >
              <p className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-1" style={{ color: COLORS.accent }}>
                {c.label}
              </p>
              <p className="text-3xl font-bold" style={{ color: COLORS.primaryDark }}>
                {c.count.toLocaleString('fr-FR')}
              </p>
              <p className="text-[11px] mt-1" style={{ color: '#86868B' }}>
                {range} derniers jours
              </p>
            </div>
          ))}
        </div>

        {typeFilter !== 'all' && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px]"
            style={{ background: COLORS.secondary, color: COLORS.primaryDark }}>
            Filtre actif : <strong>{TYPE_LABELS[typeFilter]}</strong>
            <button onClick={() => setTypeFilter('all')} className="font-bold hover:underline">×</button>
          </div>
        )}

        {/* Chart timeseries */}
        <div className="rounded-2xl p-4 sm:p-5 mb-6 shadow-sm" style={{ background: '#fff' }}>
          <p className="text-[13px] font-bold mb-3" style={{ color: COLORS.primaryDark }}>
            Évolution journalière
          </p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={stats?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: COLORS.accent }} />
                <YAxis tick={{ fontSize: 11, fill: COLORS.accent }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: COLORS.secondary }} />
                <Line type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} name="Total" />
                {TYPES.map((t) => (
                  <Line key={t} type="monotone" dataKey={t} stroke={TYPE_COLORS[t]} strokeWidth={1.2} dot={false} name={TYPE_LABELS[t]} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top pages + Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl p-4 sm:p-5 shadow-sm" style={{ background: '#fff' }}>
            <p className="text-[13px] font-bold mb-3" style={{ color: COLORS.primaryDark }}>
              Top 5 pages converties
            </p>
            {pages.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: COLORS.accent }}>Aucune donnée pour cette période.</p>
            ) : (
              <ul className="space-y-2">
                {pages.map((p) => (
                  <li key={p.page} className="flex items-center justify-between gap-3 text-[13px]" style={{ color: COLORS.primaryDark }}>
                    <span className="truncate min-w-0 font-mono text-[12px]">{p.page}</span>
                    <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: COLORS.secondary, color: COLORS.primaryDark }}>
                      {p.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl p-4 sm:p-5 shadow-sm" style={{ background: '#fff' }}>
            <p className="text-[13px] font-bold mb-3" style={{ color: COLORS.primaryDark }}>
              Sources de trafic
            </p>
            {sources.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: COLORS.accent }}>Aucune donnée pour cette période.</p>
            ) : (
              <div style={{ height: 180 }}>
                <ResponsiveContainer>
                  <BarChart data={sources} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.accent }} />
                    <YAxis type="category" dataKey="source" tick={{ fontSize: 11, fill: COLORS.accent }} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.primary} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Recent conversions table */}
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff' }}>
          <div className="p-4 sm:p-5 border-b" style={{ borderColor: '#eee' }}>
            <p className="text-[13px] font-bold" style={{ color: COLORS.primaryDark }}>
              Dernières conversions {typeFilter !== 'all' && `(${TYPE_LABELS[typeFilter]})`}
            </p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="p-5 text-[13px]" style={{ color: COLORS.accent }}>Chargement…</p>
            ) : list.length === 0 ? (
              <p className="p-5 text-[13px]" style={{ color: COLORS.accent }}>Aucune conversion sur cette période.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead style={{ background: '#fafcfc' }}>
                  <tr>
                    <th className="text-left p-3 font-semibold" style={{ color: COLORS.accent }}>Date</th>
                    <th className="text-left p-3 font-semibold" style={{ color: COLORS.accent }}>Type</th>
                    <th className="text-left p-3 font-semibold" style={{ color: COLORS.accent }}>Page</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell" style={{ color: COLORS.accent }}>Source</th>
                    <th className="text-left p-3 font-semibold hidden lg:table-cell" style={{ color: COLORS.accent }}>Campagne</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#eee' }}>
                  {list.map((c) => (
                    <tr key={c._id}>
                      <td className="p-3 whitespace-nowrap" style={{ color: COLORS.primaryDark }}>
                        {new Date(c.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-semibold"
                          style={{ background: TYPE_COLORS[c.type] + '20', color: TYPE_COLORS[c.type] === '#A2DDE9' ? COLORS.primaryDark : TYPE_COLORS[c.type] }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_COLORS[c.type] }} />
                          {TYPE_LABELS[c.type]}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[12px] max-w-xs truncate" style={{ color: COLORS.primaryDark }}>{c.page || '—'}</td>
                      <td className="p-3 hidden md:table-cell text-[12.5px]" style={{ color: COLORS.accent }}>
                        {c.utm_source || (c.referrer ? new URL(c.referrer).hostname : 'direct')}
                      </td>
                      <td className="p-3 hidden lg:table-cell text-[12.5px]" style={{ color: COLORS.accent }}>
                        {c.utm_campaign || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
