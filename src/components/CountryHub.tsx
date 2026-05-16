/**
 * Page hub /services/country/:code - liste toutes les villes + services d'un pays.
 * Maillage interne dense : 1 page liste 50-200 pages internes -> Google crawl tout d'un coup.
 *
 * @author Rabah Ziane - 2026-05-17
 */
import { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';

type CityServices = { city: string; services: Array<{ slug: string; service: string | null; title: string }> };
type ServiceCities = { service: string; cities: Array<{ slug: string; city: string; title: string }> };
type CountryHubData = { code: string; name: string; lang: string; total: number; byCity: CityServices[]; byService: ServiceCities[] };

const SERVICE_LABELS: Record<string, string> = {
  'agence-web': 'Agence web',
  'developpement-web': 'Développement web',
  'developpement-application-mobile': 'Application mobile',
  'developpement-saas': 'SaaS sur mesure',
  'developpement-crm': 'CRM sur mesure',
  'developpement-erp': 'ERP sur mesure',
  'cloud-devops': 'Cloud & DevOps',
  'intelligence-artificielle': 'Intelligence artificielle',
};

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷', SA: '🇸🇦', QA: '🇶🇦', AE: '🇦🇪', KW: '🇰🇼', OM: '🇴🇲', BH: '🇧🇭', MC: '🇲🇨', GULF: '🌐',
};

export default function CountryHub({ code }: { code: string }) {
  const [data, setData] = useState<CountryHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'cities' | 'services'>('cities');

  useEffect(() => {
    fetch(`/api/seo-hubs/country/${code.toUpperCase()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); }
        else {
          setData(d);
          document.title = `Nos services au ${d.name} | DELIVERY Digital`;
        }
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [code]);

  if (loading) return <div style={{ background: '#F2EFE9', minHeight: '100vh' }}><Header /><div className="text-center py-20 text-[#86868B]">Chargement...</div></div>;
  if (error || !data) return <div style={{ background: '#F2EFE9', minHeight: '100vh' }}><Header /><div className="text-center py-20 text-[#86868B]">Pays non trouvé. <a href="/services" className="text-[#0066CC] underline">Retour aux pays</a></div></div>;

  return (
    <div style={{ background: '#F2EFE9', minHeight: '100vh' }}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-[11px] uppercase tracking-[0.22em] font-bold mb-2 text-[#1D1D1F]/70">
          <a href="/services" className="hover:underline">Tous nos services</a> · {data.name}
        </p>
        <h1
          className="text-[40px] sm:text-[56px] text-[#1D1D1F] leading-[1.05] mb-4 max-w-3xl"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
        >
          <span className="mr-2">{COUNTRY_FLAGS[data.code] || '🌍'}</span>{data.name}
        </h1>
        <p className="text-[16px] sm:text-[18px] text-[#1D1D1F]/75 max-w-2xl mb-8">
          {data.total.toLocaleString('fr-FR')} pages locales pour vous accompagner sur tous vos projets digitaux au {data.name}.
        </p>

        <div className="mb-6 flex gap-2">
          <button onClick={() => setView('cities')} className={`px-4 py-2 rounded-full text-[13.5px] font-semibold transition ${view === 'cities' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}>Par ville ({data.byCity.length})</button>
          <button onClick={() => setView('services')} className={`px-4 py-2 rounded-full text-[13.5px] font-semibold transition ${view === 'services' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}>Par service ({data.byService.length})</button>
        </div>

        {view === 'cities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.byCity.map((c) => (
              <div key={c.city} className="bg-white rounded-[18px] p-5 ring-1 ring-black/5">
                <h3
                  className="text-[20px] text-[#1D1D1F] mb-3"
                  style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
                >{c.city}</h3>
                <ul className="space-y-1.5">
                  {c.services.map((s) => (
                    <li key={s.slug}>
                      <a href={`/services/${s.slug}`} className="text-[14px] text-[#0066CC] hover:underline">
                        {SERVICE_LABELS[s.service || ''] || s.service || s.slug}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {view === 'services' && (
          <div className="space-y-6">
            {data.byService.map((s) => (
              <div key={s.service} className="bg-white rounded-[18px] p-5 ring-1 ring-black/5">
                <h3
                  className="text-[22px] text-[#1D1D1F] mb-3"
                  style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
                >
                  {SERVICE_LABELS[s.service] || s.service}
                  <span className="ml-2 text-[12px] text-[#86868B] font-normal">{s.cities.length} villes</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {s.cities.map((c) => (
                    <a key={c.slug} href={`/services/${c.slug}`} className="inline-block px-3 py-1.5 rounded-full bg-[#F2EFE9] text-[13px] text-[#1D1D1F] hover:bg-[#E8E0CC] hover:text-[#0066CC]">
                      {c.city || c.slug}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
