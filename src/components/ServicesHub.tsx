/**
 * Page hub /services - liste tous les pays + services + nombre de villes.
 * Sert au maillage interne SEO : Google crawl 1 page -> decouvre toutes les autres.
 *
 * @author Rabah Ziane - 2026-05-17
 */
import { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';

type CountryHub = {
  code: string;
  name: string;
  lang: string;
  total: number;
  cityCount: number;
  services: Array<{ service: string; count: number }>;
};

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

export default function ServicesHub() {
  const [data, setData] = useState<{ countries: CountryHub[]; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Nos services par pays et par ville | DELIVERY Digital';
    fetch('/api/seo-hubs/all').then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: '#F2EFE9', minHeight: '100vh' }}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-[11px] uppercase tracking-[0.22em] font-bold mb-2 text-[#1D1D1F]/70">DELIVERY Digital</p>
        <h1
          className="text-[40px] sm:text-[56px] text-[#1D1D1F] leading-[1.05] mb-4 max-w-3xl"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
        >
          Tous nos services, par pays et par ville
        </h1>
        <p className="text-[16px] sm:text-[18px] text-[#1D1D1F]/75 max-w-2xl mb-10">
          {data ? `${data.totalPages.toLocaleString('fr-FR')} pages dédiées à votre ville et votre besoin.` : 'Chargement...'} Sélectionnez un pays pour découvrir nos prestations locales.
        </p>

        {loading && <p className="text-[#86868B]">Chargement...</p>}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {data.countries.map((c) => (
              <a
                key={c.code}
                href={`/services/country/${c.code.toLowerCase()}`}
                className="block bg-white rounded-[22px] p-6 ring-1 ring-black/5 hover:ring-black/20 hover:shadow-md transition-all"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-baseline justify-between mb-3">
                  <h2
                    className="text-[26px] sm:text-[30px] text-[#1D1D1F] leading-tight"
                    style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
                  >
                    <span className="mr-2">{COUNTRY_FLAGS[c.code] || '🌍'}</span>{c.name}
                  </h2>
                  <span className="text-[12px] text-[#86868B]">{c.cityCount} villes · {c.total} pages</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.services.slice(0, 8).map((s) => (
                    <span key={s.service} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2EFE9] text-[12px] text-[#1D1D1F]">
                      {SERVICE_LABELS[s.service] || s.service}
                      <span className="text-[10.5px] text-[#86868B]">{s.count}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-4 text-[13px] text-[#0066CC]">Explorer le {c.name} →</div>
              </a>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
