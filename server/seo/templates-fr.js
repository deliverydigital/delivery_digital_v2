/**
 * Templates SEO France - FR natif, lead-gen vers /discutons.
 *
 * Specifite vs templates-gulf.js :
 *  - Texte en francais (Google FR + lecteurs francophones)
 *  - MENTION du CII (Credit Impot Innovation) car les clients FR y sont eligibles
 *  - Argument anti-localite (DELIVERY est remote-first, base a Nice mais sert toute la France)
 *  - Argument Qualiopi pour la formation (optionnel par service)
 *
 * @author Rabah Ziane - 2026-05-13
 */

import crypto from 'node:crypto';

const hash32 = (s) => {
  const h = crypto.createHash('sha1').update(s).digest();
  return h.readUInt32BE(0);
};

const pick = (arr, seed) => arr[seed % arr.length];

const slugify = (s) =>
  s.toString().toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const discutonsCta = (city, service) =>
  `https://deliverydigital.fr/discutons?from=seo&country=${city.country}&city=${city.slug}&service=${service.key}`;

/* ===== Fragments FR reutilisables ===== */

const VALUE_PROPS = [
  "Equipe d'ingenieurs senior, code maintenable, propriete totale du code source",
  "Methode remote-first eprouvee, points hebdo, backlog partage en temps reel",
  "Stack technique moderne (React, Next.js, TypeScript, Node.js)",
  "Certifies CII : 20 % de vos depenses d'innovation remboursees (plafond 400 000 EUR/an)",
  "Pas de sous-traitance offshore : l'ingenieur qui vous parle est celui qui ecrit le code",
  "Mise en production rapide, demos hebdo, livraisons toutes les 2 a 4 semaines",
];

const CTA_INLINE_VARIANTS = [
  "Parlez de votre projet a notre [agent IA conversationnel]({cta}). Il cadre votre besoin en 5 minutes et le route vers le bon interlocuteur.",
  "Une idee claire ? [Demarrez la conversation ici]({cta}) - notre agent IA recupere l'essentiel et on revient vers vous sous 24h ouvrees.",
  "Pas envie d'un long cahier des charges ? [Decrivez votre projet a l'agent IA]({cta}). On vous repond sous 1 jour ouvre.",
  "Envie d'evaluer la faisabilite ou le budget ? [Ouvrez le chat]({cta}) et on revient vers vous rapidement.",
];

const FAQ_BANK = [
  {
    q_variants: [
      "Travaillez-vous avec des entreprises a {city} ?",
      "Pouvez-vous accompagner les entreprises de {city} ?",
    ],
    a: (city) => `Oui. Nous travaillons en remote avec des entreprises partout en France, y compris a ${city.name}. Nous fonctionnons par demos hebdomadaires en visio, backlog partage et echanges async. Vous gardez le controle du projet. Echangeons sur /discutons.`,
  },
  {
    q_variants: [
      "Combien de temps prend un projet typique ?",
      "Quel est votre delai de livraison habituel ?",
    ],
    a: () => `La plupart des projets livrent une premiere version utilisable entre 8 et 12 semaines. Les plateformes plus larges sont decoupees en sprints de 4 semaines avec des livrables concrets a chaque cycle. Le delai exact depend du perimetre et des integrations.`,
  },
  {
    q_variants: [
      "A qui appartient le code source ?",
      "Sommes-nous proprietaires du code livre ?",
    ],
    a: () => `Vous l'etes. Le code source complet est livre sur votre depot Git a chaque sprint. Aucun vendor lock-in, aucune licence recurrente liee aux technos utilisees.`,
  },
  {
    q_variants: [
      "Que couvre exactement le Credit Impot Innovation (CII) ?",
      "Comment fonctionne le CII pour mon projet ?",
    ],
    a: () => `Le CII permet aux PME francaises eligibles de recuperer 20 % des depenses d'innovation engagees sur un projet, dans la limite de 400 000 EUR de depenses eligibles par an et par entreprise (soit jusqu'a 80 000 EUR de credit annuel). DELIVERY Digital etant certifiee CII, vos depenses chez nous sont eligibles si votre projet respecte les criteres d'innovation. Plus de details sur /discutons.`,
  },
  {
    q_variants: [
      "Comment se passe le premier contact ?",
      "Quelle est la premiere etape ?",
    ],
    a: () => `Le plus rapide : notre agent IA conversationnel sur /discutons. Il pose les 5 questions qui comptent en quelques minutes, puis un ingenieur senior vous rappelle. Pas de formulaire interminable.`,
  },
  {
    q_variants: [
      "Signez-vous un NDA avant d'echanger les details ?",
      "Pouvons-nous partager des informations confidentielles ?",
    ],
    a: () => `Oui. Nous signons des NDA mutuels quand les projets le necessitent. Mentionnez-le sur /discutons ou dans votre premier message, on vous renvoie un projet de NDA sous 24h.`,
  },
];

function buildBody({ city, service, seed }) {
  const cta = discutonsCta(city, service);
  const valueProps = [...VALUE_PROPS].sort(
    () => 0.5 - (hash32(`${city.slug}-vp-${service.key}`) % 100) / 100,
  );
  const ctaInline1 = pick(CTA_INLINE_VARIANTS, seed).replace('{cta}', cta);
  const ctaInline2 = pick(CTA_INLINE_VARIANTS, seed + 1).replace('{cta}', cta);

  const faqShuffled = [...FAQ_BANK].sort(
    (a, b) => hash32(`${city.slug}-${service.key}-${a.q_variants[0]}`)
            - hash32(`${city.slug}-${service.key}-${b.q_variants[0]}`),
  ).slice(0, 4);

  const h1 = pick(service.h1_variants, seed).replace('{ville}', city.name);
  const deliverables = service.deliverables.map((d) => `- ${d}`).join('\n');
  const problems = service.problems.slice(0, 3).map((p) => `- ${p}`).join('\n');
  const stack = service.stack.join(', ');

  const intro = [
    `Vous etes une entreprise basee a ${city.name} et vous avez besoin d'un partenaire technique fiable pour ${service.label.toLowerCase()} ? DELIVERY Digital est un studio logiciel base a Nice qui intervient en remote pour les entreprises de ${city.name} et de ${city.region}, avec des ingenieurs senior et des livraisons hebdomadaires.`,
    `${city.context.charAt(0).toUpperCase() + city.context.slice(1)}. Pour ${service.label.toLowerCase()} a ${city.name}, DELIVERY Digital propose une approche directe : code de qualite, equipe senior, mise en production rapide, et accompagnement CII pour eligibilite a 20 % de remboursement.`,
  ][seed % 2];

  return `# ${h1}

${intro}

> **[Decrivez votre projet a notre agent IA](${cta})** - il cadre le besoin en 5 minutes.

## Ce que nous livrons

${deliverables}

Nous accompagnons les dirigeants, DSI et responsables operations des entreprises de ${city.name} qui ont besoin d'un logiciel qui colle vraiment au metier, pas un outil generique sur etagere.

## Problemes qu'on resout regulierement pour les entreprises de ${city.name}

${problems}

Si l'une de ces situations vous parle, ${ctaInline1}

## Notre stack

Nous construisons avec une stack moderne et durable : **${stack}**. Nous choisissons des technologies qui seront encore maintenables dans 5 ans, pas la tendance du mois. Code source livre sur votre depot Git avec documentation complete.

## Comment nous travaillons avec les entreprises de ${city.region}

- **Remote-first** : demos en visio hebdomadaires, backlog partage, mises a jour async.
- **Ingenieurs senior** : pas de sous-traitance offshore, pas d'equipes junior seules.
- **Methodologie agile** : sprints de 2 a 4 semaines, livrables concrets a chaque cycle.
- **Reactivite** : Slack partage avec votre equipe, reponse rapide en heures ouvrees.

${ctaInline2}

## Credit Impot Innovation (CII) : 20 % rembourses

DELIVERY Digital est certifiee CII par les services de l'Etat. Concretement, si votre projet rentre dans le perimetre du dispositif CII, vous pouvez recuperer **20 % des depenses d'innovation engagees**, dans la limite de **400 000 EUR de depenses eligibles par an** (soit jusqu'a **80 000 EUR de credit d'impot annuel**).

Le CII s'applique aux PME francaises qui developpent des produits nouveaux. Notre equipe vous accompagne pour identifier les depenses eligibles et constituer le dossier au moment de la declaration.

## Pourquoi DELIVERY Digital

${valueProps.slice(0, 4).map((v) => `- ${v}`).join('\n')}

## Questions frequentes

${faqShuffled.map((f) => `### ${pick(f.q_variants, seed).replace('{city}', city.name)}\n\n${f.a(city)}`).join('\n\n')}

## Discutons

Le plus rapide pour demarrer : notre agent IA conversationnel. Il pose les 5 questions qui comptent et route votre demande vers un ingenieur senior.

[**Demarrer la conversation sur /discutons →**](${cta})
`;
}

export function generateLandingDraftFr({ city, service }) {
  const seed = hash32(`${city.slug}-${service.key}`);
  const title = pick(service.h1_variants, seed).replace('{ville}', city.name);
  const metaTitle = pick(service.meta_title_variants, seed).replace('{ville}', city.name);
  const metaDescription = pick(service.meta_desc_variants, seed).replace('{ville}', city.name);
  const targetKeyword = `${service.key.replace(/-/g, ' ')} ${city.name.toLowerCase()}`;
  const slug = slugify(`${service.key}-${city.slug}`);
  const body = buildBody({ city, service, seed });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `https://deliverydigital.fr/services/${slug}#org`,
    name: `DELIVERY Digital - ${service.label} a ${city.name}`,
    description: metaDescription,
    url: `https://deliverydigital.fr/services/${slug}`,
    areaServed: {
      '@type': 'City',
      name: city.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: city.name,
        addressRegion: city.region,
        addressCountry: city.country,
      },
    },
    knowsLanguage: ['fr', 'en'],
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
    lang: 'fr',
    jsonLd,
    generationPrompt: `template-fr: ${service.key} × ${city.slug} (${city.country})`,
    generationModel: 'template-v1',
    createdBy: 'seo-agent',
  };
}
