/**
 * /locations - Page qui liste TOUTES les pages SEO publiees groupees par pays/ville.
 * Sert deux roles :
 *  1. Hub interne pour Googlebot (1 page > toutes les autres = boost de crawl)
 *  2. UX pour un visiteur qui veut voir ce qu'on couvre
 *
 * @author Rabah Ziane - 2026-05-13
 */
import { useEffect, useState } from 'react';

interface SeoItem {
  _id: string;
  type: 'city-service' | 'article' | 'faq';
  slug: string;
  title: string;
  metaDescription?: string;
  city?: string;
  service?: string;
}

const COUNTRY_LABELS: Record<string, { label: string; flag: string; order: number }> = {
  FR: { label: 'France', flag: '🇫🇷', order: 1 },
  MC: { label: 'Monaco', flag: '🇲🇨', order: 2 },
  QA: { label: 'Qatar', flag: '🇶🇦', order: 3 },
  SA: { label: 'Saudi Arabia', flag: '🇸🇦', order: 4 },
  AE: { label: 'United Arab Emirates', flag: '🇦🇪', order: 5 },
  KW: { label: 'Kuwait', flag: '🇰🇼', order: 6 },
  OM: { label: 'Oman', flag: '🇴🇲', order: 7 },
  BH: { label: 'Bahrain', flag: '🇧🇭', order: 8 },
  GULF: { label: 'Gulf region', flag: '🌍', order: 9 },
};

function detectCountry(slug: string): string {
  const suffixes = ['-qa', '-sa', '-ae', '-kw', '-om', '-bh'];
  for (const s of suffixes) {
    if (slug.endsWith(s)) return s.slice(1).toUpperCase();
  }
  return 'FR';
}

export default function LocationsPage() {
  const [items, setItems] = useState<SeoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Nos services par ville | DELIVERY Digital';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Retrouvez toutes nos pages de services (web, mobile, SaaS, IA, cloud) par ville, en France et dans le Golfe. Accédez en 1 clic aux propositions adaptées à votre marché.');
    }
    fetch('/api/seo')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        setItems((d.items || []).filter((i: SeoItem) => i.type === 'city-service'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const grouped: Record<string, { country: string; cities: Record<string, SeoItem[]> }> = {};
  for (const it of items) {
    const country = detectCountry(it.slug);
    if (!grouped[country]) grouped[country] = { country, cities: {} };
    const cityKey = it.city || it.slug.split('-').slice(0, -1).join('-') || 'other';
    if (!grouped[country].cities[cityKey]) grouped[country].cities[cityKey] = [];
    grouped[country].cities[cityKey].push(it);
  }

  const countryEntries = Object.entries(grouped).sort(
    ([a], [b]) => (COUNTRY_LABELS[a]?.order || 99) - (COUNTRY_LABELS[b]?.order || 99),
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 pt-12 pb-20">
        <h1
          className="text-[36px] sm:text-[48px] leading-[1.05] text-[#1D1D1F] mb-3"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
        >
          Nos services par ville
        </h1>
        <p className="text-[16px] text-[#86868B] mb-10 max-w-[720px]">
          DELIVERY Digital intervient en remote pour des entreprises en France et dans le Golfe. Voici toutes les pages dédiées par ville et par service.
          {!loading && items.length > 0 && (
            <span className="text-[#1D1D1F] font-medium"> {items.length} pages disponibles.</span>
          )}
        </p>

        {loading && <p className="text-[14px] text-[#86868B]">Chargement…</p>}

        {countryEntries.map(([country, { cities }]) => {
          const meta = COUNTRY_LABELS[country] || { label: country, flag: '🌍', order: 99 };
          const cityList = Object.entries(cities).sort(([a], [b]) => a.localeCompare(b));
          return (
            <section key={country} className="mb-12">
              <h2
                className="text-[22px] sm:text-[28px] text-[#1D1D1F] mb-4 flex items-center gap-2"
                style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
              >
                <span aria-hidden>{meta.flag}</span>
                {meta.label}
                <span className="text-[14px] font-normal text-[#86868B]">
                  {Object.values(cities).reduce((s, arr) => s + arr.length, 0)} pages
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cityList.map(([city, pages]) => (
                  <div key={city} className="bg-[#F5F5F7] rounded-[14px] p-4">
                    <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-2">{city}</h3>
                    <ul className="space-y-1">
                      {pages.map((p) => (
                        <li key={p._id}>
                          <a
                            href={`/services/${p.slug}`}
                            className="text-[13px] text-[#0066CC] hover:underline"
                          >
                            {p.service || p.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <div className="mt-16 pt-10 border-t border-black/10 text-center">
          <p className="text-[14px] text-[#86868B] mb-3">Vous ne voyez pas votre ville ?</p>
          <a
            href="/discutons"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold hover:bg-[#3C3C43] transition-colors"
          >
            Discutons de votre projet
          </a>
        </div>
      </div>
    </div>
  );
}
