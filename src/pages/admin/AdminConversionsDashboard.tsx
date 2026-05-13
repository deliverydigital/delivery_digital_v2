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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!secret) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const qs = `range=${range}` + (typeFilter !== 'all' ? `&type=${typeFilter}` : '');
        const [s, l, p, src] = await Promise.all([
          fetch(`/api/admin/conversions/stats?range=${range}`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
          fetch(`/api/admin/conversions/list?${qs}&limit=20`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
          fetch(`/api/admin/conversions/top-pages?range=${range}`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
          fetch(`/api/admin/conversions/sources?range=${range}`, { headers: { 'x-admin-secret': secret } }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setStats(s);
        setList(l.items || []);
        setPages(p.pages || []);
        setSources(src.sources || []);
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
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.22em] font-bold mb-1" style={{ color: COLORS.accent }}>
              Suivi des conversions
            </p>
            <h1 className="text-2xl lg:text-3xl tracking-tight font-bold" style={{ color: COLORS.primaryDark }}>
              Dashboard
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

        {/* KPI cards */}
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
