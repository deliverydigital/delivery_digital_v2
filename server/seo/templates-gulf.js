/**
 * Templates SEO multi-pays Golfe (Qatar + Saudi Arabia), contenu EN, lead-gen focused.
 *
 * Strategie de conversion :
 *  - 3 CTA vers /discutons par page (intro, milieu, fin) + un bloc encadre "Talk to us"
 *  - Lien CTA enrichi : /discutons?from=seo&country=QA&city=doha&service=web-agency
 *    => le tracking ConversionsRouter le capte comme quote_click + on garde la trace de la source
 *  - Contenu compact (600-800 mots) : SEO suffisant pour villes peu concurrentielles + lecteurs business du Golfe
 *
 * Variations : un hash deterministe (city+service) pioche dans des listes de variantes
 * pour que chaque page ait une intro / FAQ / structure unique (Google deteste le duplicate).
 *
 * @author Rabah Ziane - 2026-05-13
 */

import crypto from 'node:crypto';

/* ===========================================================
   Helpers
   =========================================================== */

const hash32 = (s) => {
  const h = crypto.createHash('sha1').update(s).digest();
  return h.readUInt32BE(0);
};

const pick = (arr, seed) => arr[seed % arr.length];

const slugify = (s) =>
  s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const discutonsCta = (city, service) =>
  `https://deliverydigital.fr/discutons?from=seo&country=${city.country}&city=${city.slug}&service=${service.key}`;

/* ===========================================================
   Reusable copy fragments (Gulf-focused)
   =========================================================== */

const VALUE_PROPS = [
  "European engineering quality with GDPR-grade security",
  "Modern stack, maintainable codebase, no vendor lock-in",
  "Remote-first delivery, weekly demos, full ownership of source code",
  "Aligned with Vision 2030 digital transformation priorities",
  "Multilingual ready (Arabic and English) from day one",
  "Direct access to senior engineers, no offshore handoffs",
];

const CONTEXT_LINES = {
  QA: [
    "Qatar's economy is diversifying fast, with strong demand for digital products beyond oil and gas.",
    "From Lusail's smart-city push to Education City's research hubs, Qatar needs reliable software partners.",
    "Doha is becoming a regional tech and business hub, and digital infrastructure is a strategic priority.",
  ],
  SA: [
    "Vision 2030 has made digital transformation a national priority across all sectors of the Saudi economy.",
    "From Riyadh's KAFD to NEOM and the Red Sea Project, Saudi Arabia is investing massively in new digital infrastructure.",
    "The Saudi market is large, ambitious and increasingly demanding for software partners who can deliver European-grade quality.",
  ],
};

const CTA_INLINE_VARIANTS = [
  "Tell us about your project on [discutons]({cta})..",
  "Have a 2-minute description of what you need? [Start the conversation here]({cta}) .",
  "Not ready for a long brief? Just [describe your idea]({cta}).",
  "Want to discuss feasibility, timeline or budget? [Open the chat]({cta}) and we will get back to you fast.",
];

const FAQ_BANK = [
  {
    q_variants: [
      "Do you work with companies based in {country_label}?",
      "Can you serve clients from {city}?",
    ],
    a: (city) => `Yes. We work remotely with companies across ${city.country_label} and the wider Gulf region. Time zones overlap well with our European working hours, and we run weekly demos and async updates so you always know where the project stands. Get in touch on /discutons.`,
  },
  {
    q_variants: [
      "How long does a typical project take?",
      "What is your delivery timeline?",
    ],
    a: () => `Most engagements deliver a first usable version within 8 to 12 weeks. Larger platforms are broken into 4-week sprints with concrete deliverables every cycle. Exact timing depends on the scope and the integrations involved.`,
  },
  {
    q_variants: [
      "Who owns the source code?",
      "Will we own the intellectual property?",
    ],
    a: () => `You do. The full source code is delivered on your Git repository at the end of each sprint. There is no vendor lock-in and no recurring license tied to the technology we use.`,
  },
  {
    q_variants: [
      "Can you handle Arabic and English bilingual products?",
      "Do you support right-to-left layouts for Arabic?",
    ],
    a: () => `Yes. We design for bilingual Arabic + English from the start: RTL layouts, locale-aware content, and proper Arabic typography. This is built in rather than bolted on later.`,
  },
  {
    q_variants: [
      "How do we get started?",
      "What is the first step?",
    ],
    a: () => `The fastest path is /discutons. A few targeted questions, then a senior engineer follows up directly. No long forms.`,
  },
  {
    q_variants: [
      "Do you sign NDAs before exchanging details?",
      "Can we share confidential information?",
    ],
    a: () => `Yes. We sign mutual NDAs when projects require it. You can mention it on /discutons or in your first message and we will send a draft within 24 hours.`,
  },
];

/* ===========================================================
   Renderers
   =========================================================== */

function buildBody({ city, service, seed }) {
  const cta = discutonsCta(city, service);
  const valueProps = [...VALUE_PROPS].sort(() => 0.5 - (hash32(`${city.slug}-vp-${service.key}`) % 100) / 100);
  const intro1 = pick(CONTEXT_LINES[city.country] || CONTEXT_LINES.QA, seed);
  const ctaInline1 = pick(CTA_INLINE_VARIANTS, seed).replace('{cta}', cta);
  const ctaInline2 = pick(CTA_INLINE_VARIANTS, seed + 1).replace('{cta}', cta);

  const faqShuffled = [...FAQ_BANK].sort(
    (a, b) => hash32(`${city.slug}-${service.key}-${a.q_variants[0]}`) - hash32(`${city.slug}-${service.key}-${b.q_variants[0]}`),
  ).slice(0, 4);

  const deliverables = service.deliverables.map((d) => `- ${d}`).join('\n');
  const problems = service.problems.slice(0, 3).map((p) => `- ${p}`).join('\n');
  const stack = service.stack.join(', ');

  const h1 = pick(service.h1_variants, seed).replace('{city}', city.name);

  const intro = [
    `${intro1} If your company is based in ${city.name}, ${city.country_label}, and you need ${service.label.toLowerCase()} delivered by a focused European team, this page is for you.`,
    `${city.context.charAt(0).toUpperCase() + city.context.slice(1)}. DELIVERY Digital is a French software studio that builds custom ${service.label.toLowerCase()} solutions for clients across the Gulf, fully remote, with senior engineers and weekly demos.`,
  ][seed % 2];

  return `# ${h1}

${intro}

> **[Tell us about your project](${cta})** .

## What we deliver

${deliverables}

We work with founders, IT directors and operations leaders in ${city.country_label} who need software that actually fits the business, not generic off-the-shelf tools.

## Common problems we solve for ${city.name} clients

${problems}

If any of these match your situation, ${ctaInline1}

## Our stack

We build with a modern, proven stack: **${stack}**. We pick technologies that will still be supportable in 5 years, not the trend of the month. Source code is delivered on your Git repository, with full documentation.

## How we work with clients in ${city.country_label}

- **Remote-first**: weekly video demos, async updates, and a shared backlog you can read at any time.
- **Senior engineers**: no offshore handoffs, no junior-only teams. The person you talk to is the person who writes the code.
- **Bilingual ready**: products designed for Arabic and English from day one, with proper RTL layouts.
- **Vision 2030 friendly**: we have experience integrating with Saudi and Qatar government APIs, payment gateways, and identity providers.

${ctaInline2}

## Why DELIVERY Digital

${valueProps.slice(0, 4).map((v) => `- ${v}`).join('\n')}

## Frequently asked questions

${faqShuffled.map((f) => `### ${pick(f.q_variants, seed).replace('{country_label}', city.country_label).replace('{city}', city.name)}\n\n${f.a(city)}`).join('\n\n')}

## Let's talk

The fastest way to start is via [our conversation form](/discutons). We will ask the 5 questions that matter.

[**Start the conversation on /discutons →**](${cta})
`;
}

/* ===========================================================
   Public API
   =========================================================== */

export function generateLandingDraft({ city, service }) {
  const seed = hash32(`${city.slug}-${service.key}`);
  const title = pick(service.h1_variants, seed).replace('{city}', city.name);
  const metaTitle = pick(service.meta_title_variants, seed).replace('{city}', city.name);
  const metaDescription = pick(service.meta_desc_variants, seed)
    .replace('{city}', city.name)
    .replace('{country_label}', city.country_label);
  const targetKeyword = `${service.key.replace(/-/g, ' ')} ${city.name.toLowerCase()}`;
  const slug = slugify(`${service.key}-${city.slug}-${city.country.toLowerCase()}`);
  const body = buildBody({ city, service, seed });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `https://deliverydigital.fr/services/${slug}#org`,
    name: `DELIVERY Digital - ${service.label} in ${city.name}`,
    description: metaDescription,
    url: `https://deliverydigital.fr/services/${slug}`,
    areaServed: {
      '@type': 'City',
      name: city.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: city.name,
        addressCountry: city.country,
      },
    },
    knowsLanguage: ['en', 'ar', 'fr'],
    serviceType: service.label,
  };

  return {
    type: 'city-service',
    slug,
    status: 'draft',
    title,
    metaTitle,
    metaDescription,
    targetKeyword,
    body,
    city: city.name,
    service: service.label,
    country: city.country,
    lang: 'en',
    jsonLd,
    generationPrompt: `template-gulf-en: ${service.key} × ${city.slug} (${city.country})`,
    generationModel: 'template-v1',
    createdBy: 'seo-agent',
  };
}

/* Blog posts (article type) - rotation of Gulf-business topics in English. */
const BLOG_TOPICS = [
  {
    slug: 'european-software-partner-vs-local-gulf-agency',
    title: 'European software partner vs local Gulf agency: which model fits your project?',
    keyword: 'European software partner Gulf',
    sections: [
      ['When a local Gulf agency makes sense', 'Local presence helps for sales-facing, deeply localised marketing platforms and short turnaround projects. The boundary is smaller than it used to be.'],
      ['When a European partner is the better fit', 'For mission-critical software (ERP, SaaS, fintech, AI), the engineering quality bar is higher. European studios tend to push code quality, GDPR-grade security and long-term maintainability.'],
      ['The hybrid model that actually works', 'A senior European engineering team + a local point of contact for cultural alignment. Many Gulf groups now run this exact mix.'],
      ['What to ask any candidate partner', '- Who owns the source code?\n- Are the engineers senior or juniors?\n- What is the post-launch maintenance plan?\n- Can they support Arabic + English from day one?'],
    ],
  },
  {
    slug: 'vision-2030-software-build-vs-buy',
    title: 'Vision 2030 and your software stack: build, buy, or hybrid?',
    keyword: 'Vision 2030 software',
    sections: [
      ['The Vision 2030 software gap', 'Vision 2030 pushes digital transformation across all Saudi sectors, but off-the-shelf SaaS often does not fit local processes, languages or regulations.'],
      ['Where buying still wins', 'Generic horizontal tools (email, CRM basics, simple e-commerce) are fine to buy. Save engineering for what differentiates you.'],
      ['Where building wins', 'Anything customer-facing, regulator-facing, or process-defining. Custom software is what allows your company to scale on its own terms.'],
      ['The pragmatic hybrid', 'Buy commodity tools, build the layer that touches your customers, integrate the two with clean APIs.'],
    ],
  },
  {
    slug: 'arabic-english-bilingual-app-design',
    title: 'Designing bilingual Arabic + English apps: 7 things teams often get wrong',
    keyword: 'bilingual Arabic English app design',
    sections: [
      ['RTL is not just a CSS flag', 'Right-to-left layouts affect navigation, animations, charts, and content hierarchy. It needs to be designed in, not bolted on.'],
      ['Arabic typography matters more than people think', 'Default web fonts often look amateurish in Arabic. Investing in a quality Arabic typeface is one of the highest-leverage decisions you can make.'],
      ['Dates, numbers and calendars', 'Hijri vs Gregorian, Arabic-Indic vs Latin digits, week-start day. These choices need explicit decisions, not defaults.'],
      ['Form patterns', 'Input fields, validation messages, error states. They all behave differently in RTL.'],
      ['Content writing, not translation', 'Translating English copy literally rarely works. You need a writer who thinks in Arabic.'],
      ['Testing with real users', 'Even bilingual teams have blind spots. Test with Arabic-first users early.'],
      ['Decide your default', 'Some products default to Arabic, others to English. Pick a side, then design around it.'],
    ],
  },
  {
    slug: 'saas-mvp-3-months-gulf-founders',
    title: 'How to ship a SaaS MVP in 3 months as a Gulf founder',
    keyword: 'SaaS MVP Gulf founders',
    sections: [
      ['Cut scope ruthlessly', 'A good MVP solves one problem for one user. Everything else is a distraction.'],
      ['Pick a boring stack', 'Next.js + Node.js + PostgreSQL will not be the bottleneck. The bottleneck is finding paying users.'],
      ['Wire up billing on day one', 'Stripe (or local equivalent) integration day one means you can charge from week one.'],
      ['Skip mobile apps until you need them', 'A responsive web app is enough for most B2B MVPs. Native apps come after product-market fit.'],
      ['Get to first paid customer fast', 'The clock that matters is "weeks to first paid customer", not "weeks to first feature".'],
    ],
  },
  {
    slug: 'ai-agents-for-gulf-businesses',
    title: 'AI agents for Gulf businesses: 4 use cases that already pay back',
    keyword: 'AI agents Gulf businesses',
    sections: [
      ['Customer support triage', 'AI agents that read incoming tickets, classify them, draft a reply and only escalate the hard ones. Typical 60-70% deflection.'],
      ['Document processing', 'Contracts, invoices, KYC forms. AI agents extract structured data and push it into your ERP. Saves hours per employee per week.'],
      ['Sales co-pilot', 'AI agents that prep call notes, summarise CRM history and suggest the next action. Salespeople love it once it is integrated properly.'],
      ['Internal search across your data', 'A private RAG system on your internal documents. Employees stop asking each other "where is the X file" and start asking the agent.'],
    ],
  },
];

export function generateBlogDraft({ topicIndex = 0 } = {}) {
  const topic = BLOG_TOPICS[topicIndex % BLOG_TOPICS.length];
  const cta = `https://deliverydigital.fr/discutons?from=seo&source=blog&topic=${topic.slug}`;
  const body = `# ${topic.title}

${topic.sections[0][1]}

> **Have a project in mind?** [Describe your idea](${cta}) .

${topic.sections.slice(1).map(([h, p]) => `## ${h}\n\n${p}`).join('\n\n')}

## Want to discuss this for your business?

DELIVERY Digital is a French software studio building custom platforms, apps and AI agents for clients across the Gulf and Europe. If you want to discuss your specific case, the fastest path is /discutons.

[**Start the conversation →**](${cta})
`;

  return {
    type: 'article',
    slug: topic.slug,
    status: 'draft',
    title: topic.title,
    metaTitle: topic.title.slice(0, 60),
    metaDescription: topic.sections[0][1].slice(0, 155),
    targetKeyword: topic.keyword,
    body,
    lang: 'en',
    country: 'GULF',
    generationPrompt: `template-blog-gulf: ${topic.slug}`,
    generationModel: 'template-v1',
    createdBy: 'seo-agent',
  };
}

export const BLOG_TOPIC_COUNT = BLOG_TOPICS.length;
