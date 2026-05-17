import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Loader2, MapPin, ChevronRight } from 'lucide-react';
import AIOrb from './AIOrb';

interface SeoItem {
  _id: string;
  type: 'city-service' | 'article' | 'faq';
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  body: string;
  city?: string;
  service?: string;
  faqItems?: Array<{ question: string; answer: string }>;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RelatedItem { slug: string; title: string; type: string; city?: string; service?: string }
interface HubRelated {
  relatedCities: Array<{ slug: string; title: string; city: string }>;
  relatedServices: Array<{ slug: string; title: string; service: string }>;
  country?: string;
  countryName?: string;
}

export default function PublicSeoPage({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [item, setItem] = useState<SeoItem | null>(null);
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [hubRelated, setHubRelated] = useState<HubRelated | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    // Preview mode : si ?preview=<id> en URL + admin secret en localStorage, on fetch via /api/admin/seo
    // pour rendre les drafts comme un visiteur les verrait apres publication.
    // @author Rabah Ziane - 2026-05-13
    const urlParams = new URLSearchParams(window.location.search);
    const previewId = urlParams.get('preview');
    const adminSecret = (typeof window !== 'undefined' && window.localStorage)
      ? window.localStorage.getItem('dd_seo_admin_secret')
      : null;
    const isPreview = Boolean(previewId && adminSecret);

    const detailFetch = isPreview
      ? fetch(`/api/admin/seo/${previewId}`, { headers: { 'x-admin-secret': adminSecret as string } })
          .then((r) => (r.status === 404 ? null : r.json()))
      : fetch(`/api/seo/${encodeURIComponent(slug)}`).then((r) => (r.status === 404 ? null : r.json()));

    Promise.all([
      detailFetch,
      fetch('/api/seo').then((r) => (r.ok ? r.json() : { items: [] })),
    ])
      .then(([detail, list]) => {
        if (cancelled) return;
        if (!detail || !detail.item) { setNotFound(true); setLoading(false); return; }
        const it: SeoItem = detail.item;
        setItem(it);

        // Maillage interne : autres pages services x ville (8 max, autres villes meme service en priorite)
        const all: RelatedItem[] = (list.items || []).filter((x: any) => x.slug !== slug);
        const sameService = all.filter((x: any) => x.type === 'city-service' && it.service && x.title.toLowerCase().includes(it.service.toLowerCase().split(' ')[0]));
        const sameCity = all.filter((x: any) => x.type === 'city-service' && it.city && x.title.toLowerCase().includes(it.city.toLowerCase()));
        const others = all.filter((x: any) => !sameService.includes(x) && !sameCity.includes(x));
        const rel = [...sameService.slice(0, 4), ...sameCity.slice(0, 3), ...others.slice(0, 3)].slice(0, 8);
        setRelated(rel);

        // Maillage interne v2 : utilise /api/seo-hubs/related (exact match city+service+country)
        fetch(`/api/seo-hubs/related/${encodeURIComponent(slug)}`)
          .then((r) => r.json())
          .then((d) => { if (!cancelled) setHubRelated(d); })
          .catch(() => { /* ignore */ });

        // Meta tags + JSON-LD
        document.title = it.metaTitle || it.title;
        updateMetaTag('description', it.metaDescription || '');
        updateMetaTag('og:title', it.metaTitle || it.title, 'property');
        updateMetaTag('og:description', it.metaDescription || '', 'property');
        updateMetaTag('og:url', window.location.href, 'property');
        updateMetaTag('og:type', it.type === 'article' ? 'article' : 'website', 'property');
        updateCanonical(window.location.href);

        const datePublished = it.publishedAt || it.createdAt || new Date().toISOString();
        const dateModified = it.updatedAt || datePublished;

        // JSON-LD : Article (ou WebPage)
        injectJsonLd('seo-article', {
          '@context': 'https://schema.org',
          '@type': it.type === 'article' ? 'Article' : 'WebPage',
          headline: it.metaTitle || it.title,
          name: it.title,
          description: it.metaDescription,
          url: window.location.href,
          datePublished,
          dateModified,
          inLanguage: 'fr-FR',
          author: { '@type': 'Organization', name: 'DELIVERY Digital Technology', url: 'https://deliverydigital.fr' },
          publisher: {
            '@type': 'Organization',
            name: 'DELIVERY Digital Technology',
            logo: { '@type': 'ImageObject', url: 'https://deliverydigital.fr/apple-touch-icon.png' },
          },
        });

        // JSON-LD : BreadcrumbList
        const breadcrumbs: any[] = [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://deliverydigital.fr/' },
        ];
        if (it.type === 'city-service') {
          breadcrumbs.push({ '@type': 'ListItem', position: 2, name: 'Services', item: 'https://deliverydigital.fr/discutons' });
          breadcrumbs.push({ '@type': 'ListItem', position: 3, name: it.title.length > 50 ? it.title.slice(0, 50) + '...' : it.title, item: window.location.href });
        } else if (it.type === 'article') {
          breadcrumbs.push({ '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://deliverydigital.fr/discutons' });
          breadcrumbs.push({ '@type': 'ListItem', position: 3, name: it.title.length > 50 ? it.title.slice(0, 50) + '...' : it.title, item: window.location.href });
        } else {
          breadcrumbs.push({ '@type': 'ListItem', position: 2, name: it.title, item: window.location.href });
        }
        injectJsonLd('seo-breadcrumb', { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbs });

        // JSON-LD : FAQ (extrait du body si pas en faqItems explicite)
        const faqs = it.faqItems && it.faqItems.length ? it.faqItems : extractFaqFromBody(it.body);
        if (faqs.length > 0) {
          injectJsonLd('seo-faq', {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((q) => ({
              '@type': 'Question',
              name: q.question,
              acceptedAnswer: { '@type': 'Answer', text: q.answer },
            })),
          });
        }

        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setNotFound(true); setLoading(false); } });

    return () => {
      cancelled = true;
      ['seo-article', 'seo-breadcrumb', 'seo-faq'].forEach((id) => {
        const tag = document.getElementById(id);
        if (tag) tag.remove();
      });
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#86868B]" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 text-center">
        <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-2">Page introuvable</h1>
        <p className="text-[15px] text-[#86868B] mb-6">Ce contenu n'existe pas ou n'est plus publie.</p>
        <a href="/" className="px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold">Retour a l'accueil</a>
      </div>
    );
  }

  return (
    <article className="max-w-[760px] mx-auto px-5 sm:px-8 pt-[80px] sm:pt-[120px] pb-24">
      {/* Breadcrumb visible (echo du JSON-LD pour user) */}
      <nav className="text-[12.5px] text-[#86868B] mb-5 flex items-center flex-wrap gap-1.5" aria-label="Breadcrumb">
        <a href="/" className="hover:text-[#1D1D1F]">Accueil</a>
        <ChevronRight className="h-3 w-3" />
        <a href="/discutons" className="hover:text-[#1D1D1F]">{item.type === 'article' ? 'Blog' : 'Services'}</a>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#1D1D1F] truncate max-w-[300px]">{item.title}</span>
      </nav>

      <div className="prose prose-neutral max-w-none">
        <MarkdownView body={item.body} />
      </div>

      {/* CTA discutons en fin de page */}
      <div className="mt-12 pt-10 border-t border-black/8 text-center">
        <div className="flex justify-center mb-4"><AIOrb size={48} innerColor="#FFFFFF" /></div>
        <h3
          className="text-[22px] sm:text-[28px] text-[#1D1D1F] mb-3"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
        >
          Notre agent IA vous répond
        </h3>
        <p className="text-[15px] text-[#86868B] mb-6 max-w-[480px] mx-auto">
          Décrivez votre idée.
        </p>
        <a
          href={`/discutons?utm_source=site&utm_medium=article_footer&utm_campaign=${encodeURIComponent(slug)}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1D1D1F] text-white text-[15px] font-semibold hover:bg-[#3C3C43]"
        >
          🤖 Démarrer maintenant →
        </a>
      </div>

      {/* Maillage interne v2 : par service + par ville (exact match) */}
      {hubRelated && (hubRelated.relatedCities.length > 0 || hubRelated.relatedServices.length > 0) ? (
        <aside className="mt-12 pt-10 border-t border-black/8 grid sm:grid-cols-2 gap-6">
          {hubRelated.relatedCities.length > 0 && (
            <div>
              <h4 className="text-[14px] font-semibold uppercase tracking-wider text-[#86868B] mb-3">Le même service dans d'autres villes</h4>
              <ul className="space-y-1.5">
                {hubRelated.relatedCities.map((r) => (
                  <li key={r.slug}>
                    <a href={`/services/${r.slug}`} className="group flex items-start gap-2 p-2 rounded-[10px] bg-[#FAFAFA] hover:bg-[#F2EFE9] transition-colors">
                      <MapPin className="h-3.5 w-3.5 text-[#86868B] mt-0.5 flex-shrink-0 group-hover:text-[#1D1D1F]" />
                      <span className="text-[13.5px] text-[#1D1D1F] leading-snug">{r.city || r.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hubRelated.relatedServices.length > 0 && (
            <div>
              <h4 className="text-[14px] font-semibold uppercase tracking-wider text-[#86868B] mb-3">Autres services dans cette ville</h4>
              <ul className="space-y-1.5">
                {hubRelated.relatedServices.map((r) => (
                  <li key={r.slug}>
                    <a href={`/services/${r.slug}`} className="group flex items-start gap-2 p-2 rounded-[10px] bg-[#FAFAFA] hover:bg-[#F2EFE9] transition-colors">
                      <ChevronRight className="h-3.5 w-3.5 text-[#86868B] mt-0.5 flex-shrink-0 group-hover:text-[#1D1D1F]" />
                      <span className="text-[13.5px] text-[#1D1D1F] leading-snug">{r.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hubRelated.countryName && (
            <div className="sm:col-span-2 pt-4 border-t border-black/5 text-center">
              <a href={`/services/country/${(hubRelated.country || '').toLowerCase()}`} className="inline-flex items-center gap-1.5 text-[13.5px] text-[#0066CC] hover:underline">
                Voir tous nos services au {hubRelated.countryName} <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </aside>
      ) : related.length > 0 && (
        <aside className="mt-12 pt-10 border-t border-black/8">
          <h4 className="text-[14px] font-semibold uppercase tracking-wider text-[#86868B] mb-4">A explorer aussi</h4>
          <div className="grid sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <a
                key={r.slug}
                href={r.type === 'article' ? `/blog/${r.slug}` : `/services/${r.slug}`}
                className="group flex items-start gap-2 p-3 rounded-[12px] bg-[#FAFAFA] hover:bg-[#F2EFE9] transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-[#86868B] mt-0.5 flex-shrink-0 group-hover:text-[#1D1D1F]" />
                <span className="text-[13px] text-[#1D1D1F] leading-snug line-clamp-2">{r.title}</span>
              </a>
            ))}
          </div>
        </aside>
      )}
    </article>
  );
}

/* ============== Helpers ============== */

function updateMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let tag = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function updateCanonical(href: string) {
  let tag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = 'canonical';
    document.head.appendChild(tag);
  }
  tag.href = href;
}

function injectJsonLd(id: string, data: any) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const tag = document.createElement('script');
  tag.id = id;
  tag.type = 'application/ld+json';
  tag.textContent = JSON.stringify(data);
  document.head.appendChild(tag);
}

/* Extrait Q/R d'une section "## Questions frequentes" avec H3 questions */
function extractFaqFromBody(body: string): Array<{ question: string; answer: string }> {
  const faqSectionMatch = body.match(/##\s+(?:Questions?\s+(?:fréquentes?|frequentes?))[\s\S]*?(?=\n##\s|$)/i);
  if (!faqSectionMatch) return [];
  const section = faqSectionMatch[0];
  const items: Array<{ question: string; answer: string }> = [];

  // Format possible : ### Question ? \n\n Reponse... \n\n ### autre Question ? ...
  const re = /(?:###\s+|\*\*)([^\n*]+(?:\?))(?:\*\*)?\s*\n+([^]+?)(?=\n(?:###|\*\*[^*]|\n##)|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const question = m[1].trim().replace(/\*+$/, '').trim();
    const answer = m[2].trim().replace(/^\*+|\*+$/g, '').replace(/\n+/g, ' ').trim();
    if (question && answer) items.push({ question, answer });
  }
  return items.slice(0, 8);
}

/* ============== Mini Markdown renderer ============== */

function MarkdownView({ body }: { body: string }) {
  const lines = body.split('\n');
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuf.length === 0) return;
    out.push(
      <ul key={key++} className="list-disc pl-6 my-3 space-y-1.5 text-[16px] text-[#1D1D1F]/85">
        {listBuf.map((li, i) => <li key={i}>{renderInline(li)}</li>)}
      </ul>
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      out.push(
        <h1
          key={key++}
          className="text-[34px] sm:text-[44px] text-[#1D1D1F] leading-[1.1] mt-2 mb-5"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
        >
          {renderInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      out.push(
        <h2
          key={key++}
          className="text-[24px] sm:text-[30px] text-[#1D1D1F] leading-tight mt-10 mb-4"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
        >
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      out.push(
        <h3 key={key++} className="text-[18px] sm:text-[20px] font-semibold text-[#1D1D1F] mt-6 mb-2">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (/^[-*]\s+/.test(line)) {
      listBuf.push(line.replace(/^[-*]\s+/, ''));
    } else if (line.startsWith('> ')) {
      flushList();
      const inner = line.replace(/^>\s+/, '');
      // Si le blockquote contient un lien (CTA), render comme une carte CTA proeminente
      const ctaMatch = inner.match(/^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*[-–—]?\s*(.*)$/);
      if (ctaMatch) {
        const [, label, href, desc] = ctaMatch;
        const isExternal = href.startsWith('http');
        out.push(
          <div key={key++} className="my-6 rounded-[16px] p-4 sm:p-5 bg-[#F2EFE9] ring-1 ring-black/5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <a
              href={href}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold hover:bg-[#3C3C43] transition-colors whitespace-nowrap"
            >
              {label}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-1.5"><path d="M5 12h14M13 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            {desc && <span className="text-[14px] text-[#1D1D1F]/75">{renderInline(desc)}</span>}
          </div>
        );
      } else {
        out.push(
          <blockquote key={key++} className="my-4 pl-4 border-l-2 border-[#1D1D1F]/15 text-[15.5px] text-[#1D1D1F]/75 italic">
            {renderInline(inner)}
          </blockquote>
        );
      }
    } else {
      flushList();
      out.push(
        <p key={key++} className="text-[16px] text-[#1D1D1F]/85 leading-relaxed my-3">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();
  return <>{out}</>;
}

function renderInline(text: string): React.ReactNode {
  // bold **x**, links [x](y)
  const parts: React.ReactNode[] = [];
  let i = 0;
  let buf = '';
  let key = 0;
  const flushBuf = () => { if (buf) { parts.push(buf); buf = ''; } };

  while (i < text.length) {
    if (text.slice(i, i + 2) === '**') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flushBuf();
        // Recursively render inner text so links/etc inside bold work
        parts.push(<strong key={key++} className="font-semibold text-[#1D1D1F]">{renderInline(text.slice(i + 2, end))}</strong>);
        i = end + 2;
        continue;
      }
    }
    const linkMatch = text.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      flushBuf();
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          className="text-[#0066CC] hover:underline"
          target={linkMatch[2].startsWith('http') ? '_blank' : undefined}
          rel={linkMatch[2].startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {linkMatch[1]}
        </a>
      );
      i += linkMatch[0].length;
      continue;
    }
    buf += text[i];
    i++;
  }
  flushBuf();
  return <>{parts}</>;
}
