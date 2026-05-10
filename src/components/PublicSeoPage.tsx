import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
}

export default function PublicSeoPage({ slug }: { slug: string }) {
  const [item, setItem] = useState<SeoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/seo/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) { setNotFound(true); setLoading(false); return; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setItem(data.item);

        // Update meta tags at runtime
        if (data.item) {
          document.title = data.item.metaTitle || data.item.title;
          updateMetaTag('description', data.item.metaDescription || '');
          updateMetaTag('og:title', data.item.metaTitle || data.item.title, 'property');
          updateMetaTag('og:description', data.item.metaDescription || '', 'property');
          updateMetaTag('og:url', window.location.href, 'property');
          updateCanonical(window.location.href);

          // Inject FAQ JSON-LD
          if (data.item.type === 'faq' && data.item.faqItems?.length) {
            injectJsonLd('seo-faq', {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: data.item.faqItems.map((q: any) => ({
                '@type': 'Question',
                name: q.question,
                acceptedAnswer: { '@type': 'Answer', text: q.answer },
              })),
            });
          }
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setNotFound(true); setLoading(false); } });

    return () => {
      cancelled = true;
      const tag = document.getElementById('seo-faq');
      if (tag) tag.remove();
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
          Discutons de votre projet
        </h3>
        <p className="text-[15px] text-[#86868B] mb-6 max-w-[480px] mx-auto">
          Notre agent IA comprend votre besoin. Un expert revient vers vous sous 24 h.
        </p>
        <a
          href="/discutons"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1D1D1F] text-white text-[15px] font-semibold hover:bg-[#3C3C43]"
        >
          Demarrer la conversation
        </a>
      </div>
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
        parts.push(<strong key={key++} className="font-semibold text-[#1D1D1F]">{text.slice(i + 2, end)}</strong>);
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
