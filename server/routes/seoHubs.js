/**
 * Routes publiques pour les pages hub SEO (maillage interne).
 *
 *   GET /api/seo-hubs/all              -> liste pays + services + counts (pour /services)
 *   GET /api/seo-hubs/country/:code    -> villes du pays + matrice services (pour /services/country/:code)
 *   GET /api/seo-hubs/related/:slug    -> 3 villes voisines + 3 services voisins (pour PublicSeoPage)
 *
 * Cache memoire 10 min (donnees changent peu).
 *
 * @author Rabah Ziane - 2026-05-17
 */
import express from 'express';
import SeoContent from '../models/SeoContent.js';

const router = express.Router();

const CACHE_TTL_MS = 10 * 60 * 1000;
const _cache = new Map();
function getCache(key) {
  const c = _cache.get(key);
  if (c && c.exp > Date.now()) return c.value;
  return null;
}
function setCache(key, value) {
  _cache.set(key, { value, exp: Date.now() + CACHE_TTL_MS });
}

const COUNTRY_NAMES = {
  FR: 'France', SA: 'Arabie Saoudite', QA: 'Qatar', AE: 'Émirats Arabes Unis',
  KW: 'Koweït', OM: 'Oman', BH: 'Bahreïn', MC: 'Monaco', GULF: 'Golfe',
};

function inferServiceFromSlug(slug) {
  // slug examples: agence-web-paris, developpement-web-lyon, cloud-devops-kuwait-city-kw
  // service is everything before the last city token. We try known prefixes.
  const SERVICES = [
    'intelligence-artificielle',
    'developpement-application-mobile',
    'developpement-web',
    'developpement-saas',
    'developpement-crm',
    'developpement-erp',
    'cloud-devops',
    'agence-web',
  ];
  for (const s of SERVICES) {
    if (slug.startsWith(s + '-')) return s;
  }
  return null;
}

router.get('/all', async (_req, res) => {
  const cached = getCache('all');
  if (cached) return res.json(cached);
  try {
    const items = await SeoContent.find(
      { status: 'published', type: 'city-service' },
      { slug: 1, title: 1, city: 1, service: 1, country: 1, lang: 1 }
    ).lean();

    const byCountry = {}; // code -> { code, name, cities: Set, services: Map<service, count>, total }
    for (const it of items) {
      const code = it.country || 'unknown';
      if (!byCountry[code]) byCountry[code] = { code, name: COUNTRY_NAMES[code] || code, cities: new Set(), services: new Map(), total: 0, lang: it.lang || 'fr' };
      byCountry[code].cities.add(it.city || it.slug);
      const svc = it.service || inferServiceFromSlug(it.slug) || 'autre';
      byCountry[code].services.set(svc, (byCountry[code].services.get(svc) || 0) + 1);
      byCountry[code].total++;
    }

    const result = {
      countries: Object.values(byCountry)
        .map((c) => ({ code: c.code, name: c.name, lang: c.lang, total: c.total, cityCount: c.cities.size, services: Array.from(c.services, ([service, count]) => ({ service, count })).sort((a, b) => b.count - a.count) }))
        .sort((a, b) => b.total - a.total),
      totalPages: items.length,
    };
    setCache('all', result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'hub_all_failed', message: String(e.message || e) });
  }
});

router.get('/country/:code', async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const cacheKey = `country:${code}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const items = await SeoContent.find(
      { status: 'published', type: 'city-service', country: code },
      { slug: 1, title: 1, city: 1, service: 1, country: 1, lang: 1, metaDescription: 1 }
    ).lean();

    if (items.length === 0) return res.status(404).json({ error: 'no_pages_for_country' });

    // groupe par ville
    const byCityMap = new Map();
    for (const it of items) {
      const city = it.city || 'unknown';
      if (!byCityMap.has(city)) byCityMap.set(city, []);
      byCityMap.get(city).push({ slug: it.slug, service: it.service || inferServiceFromSlug(it.slug), title: it.title });
    }
    const byCity = Array.from(byCityMap, ([city, services]) => ({ city, services })).sort((a, b) => a.city.localeCompare(b.city));

    // groupe par service
    const byServiceMap = new Map();
    for (const it of items) {
      const svc = it.service || inferServiceFromSlug(it.slug) || 'autre';
      if (!byServiceMap.has(svc)) byServiceMap.set(svc, []);
      byServiceMap.get(svc).push({ slug: it.slug, city: it.city, title: it.title });
    }
    const byService = Array.from(byServiceMap, ([service, cities]) => ({ service, cities: cities.sort((a, b) => (a.city || '').localeCompare(b.city || '')) })).sort((a, b) => b.cities.length - a.cities.length);

    const result = {
      code,
      name: COUNTRY_NAMES[code] || code,
      lang: items[0].lang || 'fr',
      total: items.length,
      byCity,
      byService,
    };
    setCache(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'hub_country_failed', message: String(e.message || e) });
  }
});

router.get('/related/:slug', async (req, res) => {
  const slug = String(req.params.slug || '');
  const cacheKey = `related:${slug}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const me = await SeoContent.findOne({ slug, status: 'published' }, { city: 1, service: 1, country: 1, type: 1 }).lean();
    if (!me) return res.json({ relatedCities: [], relatedServices: [] });

    const myService = me.service || inferServiceFromSlug(slug);
    const myCity = me.city;
    const myCountry = me.country;

    const [sameSvcOtherCities, sameCityOtherSvc] = await Promise.all([
      SeoContent.find(
        { status: 'published', type: 'city-service', country: myCountry, service: myService, slug: { $ne: slug } },
        { slug: 1, title: 1, city: 1 }
      ).limit(6).lean(),
      SeoContent.find(
        { status: 'published', type: 'city-service', country: myCountry, city: myCity, slug: { $ne: slug } },
        { slug: 1, title: 1, service: 1 }
      ).limit(6).lean(),
    ]);

    const result = {
      relatedCities: sameSvcOtherCities.map((x) => ({ slug: x.slug, title: x.title, city: x.city })),
      relatedServices: sameCityOtherSvc.map((x) => ({ slug: x.slug, title: x.title, service: x.service })),
      country: myCountry,
      countryName: COUNTRY_NAMES[myCountry] || myCountry,
    };
    setCache(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'hub_related_failed', message: String(e.message || e) });
  }
});

export default router;
