import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import Anthropic from '@anthropic-ai/sdk';
import ProjectChat from '../models/ProjectChat.js';
import ChatUser from '../models/ChatUser.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const TOKEN_TTL = '90d';

// Validation email reelle (anti-junk lead) - ajoute 2026-05-19 par @author Rabah Ziane
// 3 niveaux : syntaxe stricte > blocklist domaines jetables > DNS MX lookup.
// Pourquoi : avant cette securite, des prospects entraient des emails type a@a.a ou
// test@mailinator pour acceder au chat sans laisser de coordonnees exploitables.
// Limite : on ne fait PAS de SMTP RCPT TO car peu fiable (faux negatifs sur Microsoft 365,
// catch-all, etc.) et trop lent. Ces 3 checks attrapent ~95% du bruit.
// TODO(Rabah): si junk persiste, integrer une API tierce (ZeroBounce ~0,003 $/email).

// Liste des domaines jetables les plus connus (source : disposable-email-domains GitHub).
// Tenue minimale - elargir au besoin si on detecte du junk repete.
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '20minutemail.com',
  'anonymbox.com', 'cool.fr.nf', 'courriel.fr.nf', 'discardmail.com', 'discardmail.de',
  'dispostable.com', 'disposeamail.com', 'dodgeit.com', 'dodgit.com', 'donemail.ru',
  'e4ward.com', 'email60.com', 'emailias.com', 'emailmiser.com', 'emailondeck.com',
  'emailsensei.com', 'emailtemporario.com.br', 'emailwarden.com', 'emailx.at.hm',
  'emailxfer.com', 'emkei.cz', 'fakeinbox.com', 'fakeinformation.com', 'fakemail.fr',
  'fastacura.com', 'fastchevy.com', 'fastchrysler.com', 'fastkawasaki.com',
  'fastmazda.com', 'fastmitsubishi.com', 'fastnissan.com', 'fastsubaru.com',
  'fastsuzuki.com', 'fasttoyota.com', 'fastyamaha.com', 'filzmail.com', 'fizmail.com',
  'fr33mail.info', 'fux0ringduh.com', 'garliclife.com', 'getairmail.com',
  'get2mail.fr', 'getonemail.com', 'getonemail.net', 'ghosttexter.de', 'girlsundertheinfluence.com',
  'gishpuppy.com', 'great-host.in', 'guerillamail.biz', 'guerillamail.com',
  'guerillamail.de', 'guerillamail.info', 'guerillamail.net', 'guerillamail.org',
  'guerrillamail.biz', 'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.info',
  'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com', 'haltospam.com',
  'imails.info', 'inboxalias.com', 'inboxclean.com', 'inboxclean.org', 'incognitomail.com',
  'incognitomail.net', 'incognitomail.org', 'ipoo.org', 'irish2me.com', 'jetable.com',
  'jetable.fr.nf', 'jetable.net', 'jetable.org', 'jnxjn.com', 'junk1e.com',
  'kasmail.com', 'kaspop.com', 'keepmymail.com', 'killmail.com', 'killmail.net',
  'klzlk.com', 'koszmail.pl', 'kurzepost.de', 'letthemeatspam.com', 'lhsdv.com',
  'lifebyfood.com', 'link2mail.net', 'litedrop.com', 'lookugly.com', 'lopl.co.cc',
  'lortemail.dk', 'lr78.com', 'lroid.com', 'lukop.dk', 'm21.cc', 'maboard.com',
  'mail-filter.com', 'mail-temporaire.fr', 'mail.by', 'mail.mezimages.net',
  'mail4trash.com', 'mailbidon.com', 'mailblocks.com', 'mailcatch.com', 'maileater.com',
  'mailexpire.com', 'mailfa.tk', 'mailforspam.com', 'mailfreeway.com', 'mailguard.me',
  'mailimate.com', 'mailin8r.com', 'mailinater.com', 'mailinator.com', 'mailinator.net',
  'mailinator.org', 'mailinator2.com', 'mailincubator.com', 'mailismagic.com',
  'mailme.lv', 'mailme24.com', 'mailmetrash.com', 'mailmoat.com', 'mailms.com',
  'mailnator.com', 'mailnesia.com', 'mailnull.com', 'mailpick.biz', 'mailrock.biz',
  'mailscrap.com', 'mailshell.com', 'mailsiphon.com', 'mailtemp.info', 'mailtome.de',
  'mailtothis.com', 'mailtrash.net', 'mailtv.net', 'mailtv.tv', 'mailzilla.com',
  'mbx.cc', 'mega.zik.dj', 'meinspamschutz.de', 'meltmail.com', 'messagebeamer.de',
  'mierdamail.com', 'mintemail.com', 'moburl.com', 'monumentmail.com', 'mt2009.com',
  'mt2014.com', 'mycard.net.ua', 'mycleaninbox.net', 'mymailoasis.com', 'mypartyclip.de',
  'myphantomemail.com', 'myspaceinc.com', 'myspaceinc.net', 'myspaceinc.org',
  'myspacepimpedup.com', 'myspamless.com', 'mytrashmail.com', 'neomailbox.com',
  'nepwk.com', 'nervmich.net', 'nervtmich.net', 'netmails.com', 'netmails.net',
  'neverbox.com', 'no-spam.ws', 'noblepioneer.com', 'nomail.xl.cx', 'nomail2me.com',
  'nomorespamemails.com', 'nospam.ze.tc', 'nospam4.us', 'nospamfor.us', 'nospamthanks.info',
  'notmailinator.com', 'nowmymail.com', 'nurfuerspam.de', 'objectmail.com', 'obobbo.com',
  'oneoffemail.com', 'onewaymail.com', 'online.ms', 'oopi.org', 'ordinaryamerican.net',
  'otherinbox.com', 'ovpn.to', 'owlpic.com', 'pancakemail.com', 'pjjkp.com', 'plexolan.de',
  'poofy.org', 'pookmail.com', 'privacy.net', 'proxymail.eu', 'punkass.com', 'putthisinyourspamdatabase.com',
  'quickinbox.com', 'rcpt.at', 'recode.me', 'recursor.net', 'regbypass.com', 'regbypass.comsafe-mail.net',
  'rmqkr.net', 'royal.net', 'rppkn.com', 'rtrtr.com', 's0ny.net', 'safe-mail.net',
  'safersignup.de', 'safetymail.info', 'safetypost.de', 'sandelf.de', 'saynotospams.com',
  'selfdestructingmail.com', 'sendspamhere.com', 'sharklasers.com', 'shieldedmail.com',
  'shiftmail.com', 'shitmail.me', 'shortmail.net', 'sibmail.com', 'skeefmail.com',
  'slaskpost.se', 'slopsbox.com', 'smellfear.com', 'snakemail.com', 'sneakemail.com',
  'sofimail.com', 'sofort-mail.de', 'sogetthis.com', 'soodonims.com', 'spam.la',
  'spam.su', 'spamavert.com', 'spambob.com', 'spambob.net', 'spambob.org', 'spambog.com',
  'spambog.de', 'spambog.ru', 'spambox.info', 'spambox.us', 'spamcero.com', 'spamcorptastic.com',
  'spamcowboy.com', 'spamcowboy.net', 'spamcowboy.org', 'spamday.com', 'spamex.com',
  'spamfree.eu', 'spamfree24.com', 'spamfree24.de', 'spamfree24.eu', 'spamfree24.info',
  'spamfree24.net', 'spamfree24.org', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'spamherelots.com', 'spamhereplease.com', 'spamhole.com', 'spamify.com', 'spaminator.de',
  'spamkill.info', 'spaml.com', 'spaml.de', 'spammotel.com', 'spamobox.com', 'spamoff.de',
  'spamslicer.com', 'spamspot.com', 'spamthis.co.uk', 'spamthisplease.com', 'spamtrail.com',
  'speed.1s.fr', 'supergreatmail.com', 'supermailer.jp', 'suremail.info', 'teewars.org',
  'teleworm.com', 'teleworm.us', 'temp-mail.com', 'temp-mail.org', 'temp-mail.ru',
  'tempalias.com', 'tempemail.biz', 'tempemail.com', 'tempemail.net', 'tempinbox.co.uk',
  'tempinbox.com', 'tempmail.de', 'tempmail.eu', 'tempmail.it', 'tempmaildemo.com',
  'tempmailer.com', 'tempomail.fr', 'temporaryemail.net', 'temporaryforwarding.com',
  'temporaryinbox.com', 'thanksnospam.info', 'thankyou2010.com', 'thisisnotmyrealemail.com',
  'throwawayemailaddress.com', 'tilien.com', 'tmailinator.com', 'toomail.biz', 'topranklist.de',
  'tradermail.info', 'trash-amil.com', 'trash-mail.at', 'trash-mail.com', 'trash-mail.de',
  'trash2009.com', 'trashdevil.com', 'trashemail.de', 'trashmail.at', 'trashmail.com',
  'trashmail.de', 'trashmail.me', 'trashmail.net', 'trashmail.org', 'trashmail.ws',
  'trashmailer.com', 'trashymail.com', 'trashymail.net', 'trbvm.com', 'trillianpro.com',
  'twinmail.de', 'tyldd.com', 'uggsrock.com', 'umail.net', 'uroid.com', 'us.af',
  'venompen.com', 'veryrealemail.com', 'viditag.com', 'viralplays.com', 'vpn.st',
  'vsimcard.com', 'vubby.com', 'wasteland.rfc822.org', 'webemail.me', 'weg-werf-email.de',
  'wegwerf-emails.de', 'wegwerfadresse.de', 'wegwerfemail.com', 'wegwerfemail.de',
  'wegwerfmail.de', 'wegwerfmail.info', 'wegwerfmail.net', 'wegwerfmail.org',
  'wh4f.org', 'whyspam.me', 'willhackforfood.biz', 'willselfdestruct.com', 'winemaven.info',
  'wronghead.com', 'wuzup.net', 'wuzupmail.net', 'www.e4ward.com', 'www.gishpuppy.com',
  'www.mailinator.com', 'wwwnew.eu', 'xagloo.com', 'xemaps.com', 'xents.com',
  'xmaily.com', 'xoxy.net', 'yapped.net', 'yeah.net', 'yep.it', 'yogamaven.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'ypmail.webarnak.fr.eu.org', 'yuurok.com',
  'zehnminutenmail.de', 'zippymail.info', 'zoaxe.com', 'zoemail.com', 'zomg.info',
]);

// Cache MX lookup pour eviter de spammer le DNS si le meme domaine repete dans la journee.
// TTL 6h, taille max ~500 entries (eviction LRU naive).
const mxCache = new Map();
const MX_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function hasMxRecord(domain) {
  const now = Date.now();
  const cached = mxCache.get(domain);
  if (cached && now - cached.ts < MX_CACHE_TTL_MS) return cached.ok;
  try {
    const mx = await dns.resolveMx(domain);
    const ok = Array.isArray(mx) && mx.length > 0;
    if (mxCache.size > 500) {
      const firstKey = mxCache.keys().next().value;
      mxCache.delete(firstKey);
    }
    mxCache.set(domain, { ts: now, ok });
    return ok;
  } catch {
    mxCache.set(domain, { ts: now, ok: false });
    return false;
  }
}

// Retourne { ok: true } ou { ok: false, reason: 'syntax|disposable|no_mx', message }
// message est destine a etre affiche tel quel cote frontend.
async function validateEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  // Syntaxe stricte : refuse a@a.a, test@.com, etc. Tolere les + alias et tirets.
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(e)) {
    return { ok: false, reason: 'syntax', message: 'Format d\'email invalide. Merci de saisir une adresse correcte.' };
  }
  const domain = e.split('@')[1];
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, reason: 'disposable', message: 'Les emails jetables ne sont pas acceptes. Merci d\'utiliser votre adresse professionnelle ou personnelle.' };
  }
  const okMx = await hasMxRecord(domain);
  if (!okMx) {
    return { ok: false, reason: 'no_mx', message: 'Ce domaine n\'accepte pas d\'email. Verifiez votre adresse.' };
  }
  return { ok: true };
}

// SYSTEM_PROMPT - Refonte 2026-05-14 par @author Rabah Ziane
// CHANGEMENT : retire totalement la grille tarifaire et la Phase 2 Estimation.
// Le chat n'estime plus AUCUN prix. Il qualifie, vend la valeur DD, collecte les infos
// necessaires pour qu'un conseiller humain etablisse un devis sous 24h via /admin/quotes.
// Pourquoi : demande user 2026-05-14 - eviter que le bot donne un prix "auto" non aligne
// avec ce que le conseiller veut facturer reellement. Le devis reste un acte humain.
// TODO(Rabah): si volume de leads explose, voir si on veut un brief JSON structure
// genere par Claude (en + du transcript) pour pre-remplir /admin/quotes plus vite.
const SYSTEM_PROMPT = `Tu es le conseiller projet de DELIVERY Digital, société française de développement web et mobile certifiée Crédit Impôt Innovation (CII).

# Identité (règle stricte)
Si on te demande qui tu es, ce que tu es, ton nom, qui t'a créé, ou quelle technologie/quel modèle tu utilises : tu réponds UNIQUEMENT que tu es l'assistant de DELIVERY Digital, là pour comprendre le besoin et orienter vers un conseiller humain. Tu ne mentionnes JAMAIS "Anthropic", "Claude", "OpenAI", "modèle de langage", "LLM" ni aucune technologie sous-jacente, et tu ne dis jamais que tu es "un assistant IA créé par" qui que ce soit. Tu es simplement l'assistant de DELIVERY Digital, rien de plus - tu restes sur ce rôle et tu ramènes la conversation au projet du prospect.

# Langue
Tu détectes automatiquement la langue du premier message du prospect et tu réponds DANS CETTE LANGUE pendant toute la conversation (français, anglais, espagnol, italien, allemand, arabe, etc.). Si le prospect change de langue, tu t'adaptes. Toutes les règles ci-dessous s'appliquent dans la langue cible.

# Ton rôle
Mener une conversation pour :
1. Comprendre finement la demande du prospect (qualification)
2. Mettre en valeur DELIVERY Digital (expertise, démarche, certifications) de manière subtile et non commerciale
3. Collecter toutes les informations nécessaires pour qu'un conseiller humain établisse un devis ou une proposition d'inscription personnalisée sous 24h

# Deux types de demandes possibles - tu dois savoir distinguer (sans cloisonner)
DELIVERY Digital propose DEUX types de services :

**A. Développement digital sur mesure** (web, mobile, SaaS, CRM, IA, marketplace, etc.)
- Posture : tu cadres le projet (type, features, contexte business, volumétrie, délai)
- Mots-clés du prospect : "site", "app", "plateforme", "logiciel", "automatiser", "IA", "refonte", "e-commerce", "API"...

**B. Formation professionnelle** (programmes Qualiopi finançables OPCO)
- Catalogue : Bases nutrition & allergènes (21h, 525€), Hygiène Sécurité Développement Durable initiation (21h, 525€), Hygiène Sécurité Développement Durable 35h (525€), Assurer sa sécurité en chantier (35h, 840€), Reflex'English Level 1 (80h, 4000€)
- Posture : tu cadres la situation (qui suit, quel public, financement OPCO ou perso, dates souhaitées, format présentiel/distanciel)
- Mots-clés du prospect : "formation", "OPCO", "Qualiopi", "se former", "session", "stagiaire", nom d'une formation précise...
- Si le prospect arrive avec un message du type "Je souhaite m'inscrire à la formation X" → tu es sur le rail B, pose les questions OPCO directement (nom de l'entreprise, OPCO de rattachement, nombre de stagiaires, date souhaitée, contact RH).

**Règle d'or** : Tu identifies le rail dominant (A ou B) mais tu **ne restreins JAMAIS le prospect**. S'il évoque les deux sujets dans la même conversation, tu traites les deux naturellement. Si le contexte est ambigu, demande poliment de quoi il a besoin pour bien l'orienter.

Dans ton message final de récap, **précise le type de demande** : "demande de devis Développement", "demande d'inscription Formation", ou "demande mixte Développement + Formation" selon le cas - le conseiller humain saura ainsi sur quel canal travailler.

# Règle absolue : AUCUN tarif, AUCUNE estimation, AUCUNE fourchette
Tu ne donnes JAMAIS de prix, ni d'estimation, ni d'ordre de grandeur, ni de fourchette, ni de "à partir de", ni de comparaison chiffrée, sous AUCUN prétexte. Pas de mention d'€, $, £, ni de chiffre lié à un coût.

Chaque tarif chez DELIVERY Digital est personnalisé et établi par un conseiller humain après analyse du brief. Tu n'as pas accès à la grille tarifaire, et tu ne dois pas chercher à deviner un prix.

# Si le prospect demande un prix, un tarif, un budget, un coût, un devis, "combien ça coûte", ou équivalent
Réponds toujours dans cet esprit (adapte à la langue et au contexte) :

"Chaque projet chez nous est sur mesure, donc le tarif dépend vraiment de vos besoins précis. Pour vous proposer quelque chose d'aligné avec votre situation, quel est votre budget approximatif (même une fourchette) ? Notre conseiller revient ensuite vers vous sous 24h avec une proposition adaptée à ce budget et à votre projet."

Puis enchaîne IMMÉDIATEMENT sur la prochaine question de cadrage manquante (type, features, volumétrie, délai, contact). Ne laisse pas le prospect sur sa demande tarifaire sans relancer la conversation.

Si le prospect insiste pour avoir un prix "même approximatif" : reste ferme, polie. "Je comprends, mais nous ne donnons pas d'estimation à l'aveugle - cela rendrait service à personne. Notre conseiller a besoin de votre brief complet pour vous proposer un tarif honnête. C'est gratuit et sans engagement, sous 24h."

# Style
- Vouvoiement (ou équivalent formel) sauf si le prospect tutoie
- Phrases courtes, 2-3 max par réponse
- UNE question principale à la fois
- Tu reformules pour montrer que tu comprends
- Tu utilises des listes à puces "- " quand tu proposes des options/exemples au prospect (le frontend les rend cliquables)
- Utilise UNIQUEMENT le tiret du 6 ("-"), JAMAIS le tiret long
- Ton chaleureux mais professionnel, jamais commercial agressif
- L'emoji 🙏 (mains jointes) est INTERDIT - ne JAMAIS l'utiliser, dans aucune langue, sous aucun pretexte


# RÈGLE ABSOLUE : Jamais recommander de SaaS concurrent
Tu ne recommandes JAMAIS, sous AUCUN prétexte, un outil tiers ou un SaaS concurrent pour réaliser le projet :
- Interdits explicites : Shopify, Wix, Squarespace, Webflow, WordPress.com, Wordpress hébergé, Framer, Bubble, Carrd, Notion sites, Shopline, Prestashop hébergé, BigCommerce, Etsy, ou tout autre outil "DIY" / no-code SaaS
- Tu ne dis JAMAIS "pour démarrer, prenez X", "c'est mieux pour vous d'aller voir X", "ce n'est pas notre domaine", "nous on fait du complexe uniquement"
- Tu ne fais JAMAIS de comparaison "DD vs Shopify" en suggérant l'autre, même de loin
- Tu n'envoies JAMAIS le prospect ailleurs (pas de "allez sur shopify.com" ou similaire)

DELIVERY Digital fait des sites web sur mesure de TOUS niveaux : du site vitrine 1 page à la marketplace complexe. Une boutique en ligne simple, un site vitrine, un blog, un portfolio, une landing page, une app mobile basique : TOUT est faisable chez nous, sur mesure, avec un design propre et un code propre - PAS de templates Shopify ou Wix.

Si le prospect mentionne lui-même Shopify/Wix/etc., tu réponds dans cet esprit : "Tout à fait possible chez nous aussi, et avec l'avantage d'un site 100% sur mesure (design, performances, SEO, indépendance vis-à-vis d'un abonnement mensuel). Quel est votre budget approximatif pour ce projet ? Comme ça je peux faire remonter un brief précis à notre conseiller, qui revient vers vous sous 24h avec une proposition adaptée."

# Réflexe "petit projet / pas cher / juste un truc simple"
Si le prospect dit "juste un truc simple", "pas besoin d'un truc compliqué", "petit budget", "j'ai pas beaucoup", "c'est pour démarrer" :
- Tu ne minimises JAMAIS la pertinence de DD pour son projet
- Tu ne dis JAMAIS "DD est plutôt positionné sur des projets complexes" (FAUX - on fait aussi des projets simples)
- Tu réponds que c'est tout à fait dans nos cordes, qu'on s'adapte à tous les budgets et tous les niveaux de projet
- Tu demandes son budget approximatif + son téléphone pour que le conseiller le rappelle avec une proposition adaptée à ce budget

# Budget du prospect (à demander explicitement)
Quand le prospect parle de prix/tarif/coût OU que le projet est cadré (Phase 2-3), tu demandes son budget approximatif :
"Avec votre budget, je pose la question. Donnez-moi votre numéro pour qu'un conseiller vous contacte."

Tu ne donnes JAMAIS de prix toi-même, mais tu utilises le budget client pour orienter ton brief vers le conseiller.

# Mettre en valeur DELIVERY Digital (à intégrer naturellement au fil de la conversation, pas en pitch)
Glisse ces éléments quand c'est pertinent, en réponse aux préoccupations du prospect :
- Société française avec une équipe d'experts en développement web, mobile, IA et cloud
- Certifiée Crédit Impôt Innovation (CII) - permet à certaines entreprises françaises éligibles d'avoir jusqu'à -20% sur le projet (voir règle CII)
- Démarche 100% personnalisée : pas de template, chaque projet est étudié spécifiquement
- Accompagnement de bout en bout : cadrage, design, dev, recette, mise en production, maintenance
- Suivi dédié pendant tout le projet, expert technique référent
- Engagement qualité : devis détaillé, jalons clairs, livraisons régulières
- Références : DeliveryEat (plateforme de livraison full-stack), apps mobiles iOS/Android en production, plateformes SaaS B2B

Tu n'enchaînes pas tous ces points d'affilée. Tu écoutes d'abord, puis tu mentionnes UN élément pertinent à la fois quand il répond à une inquiétude implicite du prospect.

# Informations à collecter (progressivement, sans interrogatoire)
Au fil de l'échange, capte :
- Prénom (si pas déjà confirmé via le compte)
- Type de projet (site vitrine, e-commerce, app web / SaaS, app mobile, CRM / ERP, marketplace, refonte, IA / chatbot, autre)
- Contexte business : qui est le client final, pour quel usage, quel problème à résoudre
- 3 à 5 features ou fonctionnalités clés attendues
- Volumétrie si pertinent (nombre d'utilisateurs prévus, nombre de produits, trafic estimé, etc.)
- Délai souhaité ou contraintes calendaires
- Téléphone et nom de l'entreprise (en fin d'échange, naturellement)
- Pays si pertinent (impacte le mode de facturation et les certifications applicables)
- Toute contrainte particulière mentionnée spontanément (budget approximatif, stack technique souhaitée, intégrations existantes, etc.)

# Phases de la conversation

**Phase 1 - Découverte (2 à 4 échanges)**
Si email connu mais prénom non confirmé : commence par "Pour bien vous adresser, comment vous appelez-vous ?" puis enchaîne sur le projet. Sinon, salue par le prénom et lance la conversation projet.
Objectif : comprendre le type de projet et le contexte business global.

**Phase 2 - Cadrage (3 à 5 échanges)**
Approfondis : features clés, volumétrie, délai, contraintes spécifiques.

**Phase 3 - Conclusion**
Récapitule le projet en 3 ou 4 lignes : "Si je résume, vous souhaitez [type] pour [usage] avec [features principales], pour un lancement souhaité [délai]. Est-ce bien ça ?"
Demande téléphone et nom de l'entreprise si pas encore connus.
Termine par : "Parfait, j'ai tout ce qu'il faut. Notre conseiller revient vers vous sous 24h avec un devis détaillé et personnalisé. Vous recevrez aussi un email récapitulatif de notre échange. À très vite !"

# Règle CII (très important - sois prudent)
Le Crédit Impôt Innovation -20% est STRICTEMENT RÉSERVÉ aux entreprises françaises (SIRET) ET aux projets reconnus INNOVATION. Pas tous les projets web sont éligibles.

Conditions cumulatives :
1. Entreprise française (SIRET / SIREN)
2. Projet innovant (IA propriétaire, algorithme original, SaaS B2B nouvelle génération, logiciel métier complexe)
3. PAS éligibles : sites vitrines classiques, Shopify / Woo standard, refontes graphiques

Tu ne mentionnes pas le CII spontanément. Tu en parles UNIQUEMENT si :
- Le prospect évoque "innovation", "IA", "R&D", "CII", "crédit impôt", "subvention", OU
- Le projet est manifestement innovant (IA propriétaire, SaaS B2B inédit, etc.)

Si tu en parles : "Pour les entreprises françaises avec un projet reconnu innovant, le Crédit Impôt Innovation peut permettre une économie de 20% sur le projet - à valider avec un expert-comptable, ce n'est pas automatique. Notre conseiller pourra vous orienter."

# Devises
Tu ne donnes jamais de prix donc la question des devises ne se pose pas. Si le prospect mentionne un budget en devise (USD, GBP, etc.), tu en prends note pour transmettre au conseiller, mais tu n'en donnes pas de conversion.`;

let anthropicClient = null;
const getAnthropic = () => {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing in env');
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
};

/* Auth middleware (Bearer JWT scoped to chat users) */
const requireChatAuth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
    const decoded = jwt.verify(h.slice(7), JWT_SECRET);
    if (!decoded?.chatUserId) return res.status(401).json({ error: 'invalid_token' });
    const user = await ChatUser.findById(decoded.chatUserId);
    if (!user) return res.status(401).json({ error: 'user_not_found' });
    req.chatUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
};

/* SMTP helper */
const createSmtpTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || '587');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
};

// Echappement HTML basique pour eviter casse / injection dans l'email.
// @author Rabah Ziane - 2026-05-14
const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Envoi de l'email de demande de devis a contact@deliverydigital.fr.
// Reforme 2026-05-14 (@author Rabah Ziane) : sujet et HTML orientes "brief devis pret a traiter"
// puisque le chat ne donne plus aucun prix - c'est le conseiller qui etablit le devis
// via /admin/quotes. Pourquoi : aider l'admin a comprendre le contexte du prospect en un
// coup d'oeil avant d'aller creer le devis dans l'interface admin.
const sendLeadEmail = async (chat, chatUser) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const transporter = createSmtpTransporter();
  const transcript = chat.messages
    .map((m) => `[${m.role === 'user' ? 'Prospect' : 'Conseiller IA'}] ${m.content}`)
    .join('\n\n');

  const name = chatUser.name || '-';
  const email = chatUser.email || '-';
  const phone = chatUser.phone || chat.leadInfo?.phone || '-';
  const company = chatUser.company || chat.leadInfo?.company || '-';
  const country = chatUser.country || '-';
  const title = chat.title || 'Nouvelle conversation';

  const subject = `Demande de devis - ${name}${company !== '-' ? ` (${company})` : ''} - ${title}`.slice(0, 180);

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 680px; color:#1D1D1F;">
      <div style="background:#1D1D1F; color:#fff; padding:18px 22px; border-radius:14px 14px 0 0;">
        <div style="font-size:12px; letter-spacing:.08em; text-transform:uppercase; opacity:.7;">Demande de devis</div>
        <div style="font-size:22px; font-weight:600; margin-top:4px;">${escapeHtml(name)} ${company !== '-' ? `<span style="opacity:.7; font-weight:400;">- ${escapeHtml(company)}</span>` : ''}</div>
      </div>
      <div style="background:#F2EFE9; padding:18px 22px; border-radius:0 0 14px 14px; margin-bottom:24px;">
        <div style="font-size:14px; line-height:1.6;">
          Nouveau prospect via <b>/discutons</b>. Le brief est cadré, il reste à établir le devis dans
          <a href="https://deliverydigital.fr/admin/quotes" style="color:#1D1D1F; text-decoration:underline;">/admin/quotes</a>.
        </div>
      </div>

      <h3 style="margin:0 0 12px 0; font-size:15px; letter-spacing:.04em; text-transform:uppercase; color:#86868B;">Contact</h3>
      <table style="border-collapse: collapse; width:100%; margin-bottom: 28px; font-size:14px;">
        <tr><td style="padding:8px 0; width:130px; color:#86868B;">Nom</td><td style="padding:8px 0;"><b>${escapeHtml(name)}</b></td></tr>
        <tr><td style="padding:8px 0; color:#86868B;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#1D1D1F;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px 0; color:#86868B;">Téléphone</td><td style="padding:8px 0;">${escapeHtml(phone)}</td></tr>
        <tr><td style="padding:8px 0; color:#86868B;">Société</td><td style="padding:8px 0;">${escapeHtml(company)}</td></tr>
        <tr><td style="padding:8px 0; color:#86868B;">Pays</td><td style="padding:8px 0;">${escapeHtml(country)}</td></tr>
        <tr><td style="padding:8px 0; color:#86868B;">Sujet</td><td style="padding:8px 0;">${escapeHtml(title)}</td></tr>
      </table>

      <h3 style="margin:0 0 12px 0; font-size:15px; letter-spacing:.04em; text-transform:uppercase; color:#86868B;">Brief - échange complet</h3>
      <pre style="background:#F5F5F7; padding:18px; border-radius:12px; white-space:pre-wrap; font-size:13px; line-height:1.65; font-family: -apple-system, system-ui, sans-serif; color:#1D1D1F;">${escapeHtml(transcript)}</pre>

      <div style="margin-top:28px; padding-top:18px; border-top:1px solid #E5E5EA;">
        <a href="https://deliverydigital.fr/admin/quotes" style="display:inline-block; background:#1D1D1F; color:#fff; padding:12px 22px; border-radius:10px; text-decoration:none; font-size:14px; font-weight:500;">Créer le devis dans l'admin</a>
      </div>

      <p style="color:#86868B; font-size:12px; margin-top:28px;">Session : ${escapeHtml(chat.sessionId)} - ${new Date().toLocaleString('fr-FR')}</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: 'contact@deliverydigital.fr',
    subject,
    html
  });

  chat.notifiedAt = new Date();
  chat.status = 'notified';
  await chat.save();
};

const extractLeadInfo = (existing, latestUser) => {
  const next = { ...(existing || {}) };
  const text = latestUser || '';
  if (!next.email) {
    const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (m) next.email = m[0];
  }
  if (!next.phone) {
    const m = text.replace(/\s/g, '').match(/(\+?\d{8,15})/);
    if (m && m[0].length >= 9) next.phone = m[0];
  }
  return next;
};

const newSessionId = () => `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/* ============== AUTH ============== */

/* POST /api/project-chat/auth - light sign-in (email only, name optional) */
router.post('/auth', async (req, res) => {
  try {
    const { email, name, company, phone, country } = req.body || {};
    // Validation reelle (syntaxe stricte + blocklist jetables + DNS MX).
    // Anti junk-lead - ajoute 2026-05-19 Rabah. Voir validateEmail() en haut du fichier.
    const validation = await validateEmail(email);
    if (!validation.ok) {
      return res.status(400).json({ error: 'email_invalid', reason: validation.reason, message: validation.message });
    }

    const cleanEmail = email.toLowerCase().trim();
    // Default name from email prefix if not provided (e.g. john.doe@x.com -> John)
    const fallbackName = (cleanEmail.split('@')[0] || 'Visiteur').split(/[._-]/)[0];
    const finalName = (name && name.trim().length >= 2)
      ? name.trim()
      : fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);

    let user = await ChatUser.findOne({ email: cleanEmail });
    if (!user) {
      user = await ChatUser.create({
        email: cleanEmail,
        name: finalName,
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        country: country?.trim() || null,
      });
    } else {
      let dirty = false;
      if (name && user.name !== name.trim()) { user.name = name.trim(); dirty = true; }
      if (company && !user.company) { user.company = company.trim(); dirty = true; }
      if (phone && !user.phone) { user.phone = phone.trim(); dirty = true; }
      if (country && !user.country) { user.country = country.trim(); dirty = true; }
      user.lastActiveAt = new Date();
      await user.save();
    }

    const token = jwt.sign({ chatUserId: user._id.toString() }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    return res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, company: user.company, phone: user.phone, country: user.country }
    });
  } catch (err) {
    console.error('[chat-auth] error:', err);
    return res.status(500).json({ error: 'auth_failed' });
  }
});

/* GET /api/project-chat/me - return current user */
router.get('/me', requireChatAuth, (req, res) => {
  const u = req.chatUser;
  return res.json({ user: { id: u._id, email: u.email, name: u.name, company: u.company, phone: u.phone, country: u.country } });
});

/* ============== CONVERSATIONS ============== */

/* GET /api/project-chat/conversations - list user's conversations (newest first) */
router.get('/conversations', requireChatAuth, async (req, res) => {
  const items = await ProjectChat.find({ chatUserId: req.chatUser._id })
    .select('_id sessionId title status createdAt updatedAt messages')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  const summary = items.map((c) => ({
    sessionId: c.sessionId,
    title: c.title,
    status: c.status,
    messageCount: (c.messages || []).length,
    lastUpdate: c.updatedAt,
    preview: (c.messages || []).slice(-1).map((m) => m.content).join('').slice(0, 90)
  }));
  return res.json({ conversations: summary });
});

/* POST /api/project-chat/new - create empty new conversation */
router.post('/new', requireChatAuth, async (req, res) => {
  const sessionId = newSessionId();
  const chat = await ProjectChat.create({
    sessionId,
    chatUserId: req.chatUser._id,
    title: 'Nouvelle conversation',
    messages: [],
  });
  await ChatUser.updateOne({ _id: req.chatUser._id }, { $inc: { conversationCount: 1 } });
  return res.json({ sessionId: chat.sessionId, title: chat.title });
});

/* GET /api/project-chat/:sessionId - load full conversation */
router.get('/:sessionId', requireChatAuth, async (req, res) => {
  const chat = await ProjectChat.findOne({ sessionId: req.params.sessionId, chatUserId: req.chatUser._id });
  if (!chat) return res.json({ messages: [], leadInfo: null, title: null });
  return res.json({
    messages: chat.messages,
    leadInfo: chat.leadInfo,
    status: chat.status,
    title: chat.title,
    sessionId: chat.sessionId,
  });
});

/* DELETE /api/project-chat/:sessionId */
router.delete('/:sessionId', requireChatAuth, async (req, res) => {
  await ProjectChat.deleteOne({ sessionId: req.params.sessionId, chatUserId: req.chatUser._id });
  return res.json({ ok: true });
});

/* ============== SEND MESSAGE ============== */

/* POST /api/project-chat - send a message in a conversation (creates if missing) */
router.post('/', requireChatAuth, async (req, res) => {
  try {
    const { sessionId: providedSessionId, message, lang: bodyLang } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message required' });
    }
    if (message.length > 4000) return res.status(400).json({ error: 'message too long' });

    const sessionId = providedSessionId || newSessionId();

    let chat = await ProjectChat.findOne({ sessionId, chatUserId: req.chatUser._id });
    if (!chat) {
      chat = new ProjectChat({
        sessionId,
        chatUserId: req.chatUser._id,
        title: 'Nouvelle conversation',
        messages: [],
        userAgent: req.get('user-agent') || null,
        ip: req.ip || null,
        leadInfo: {
          name: req.chatUser.name,
          email: req.chatUser.email,
          phone: req.chatUser.phone,
          company: req.chatUser.company,
        },
      });
      await ChatUser.updateOne({ _id: req.chatUser._id }, { $inc: { conversationCount: 1 } });
    }

    chat.messages.push({ role: 'user', content: message });
    chat.leadInfo = extractLeadInfo(chat.leadInfo, message);

    // humanTakeover mode : si l'admin a pris la main, on n'appelle PAS le bot.
    // On stocke juste le message du prospect et on retourne un placeholder.
    // L'admin verra le nouveau message dans son dashboard live et y repondra manuellement.
    // @author Rabah Ziane - 2026-05-21
    if (chat.humanTakeover) {
      await chat.save();
      return res.json({
        sessionId: chat.sessionId,
        reply: null,
        humanMode: true,
        messages: chat.messages,
      });
    }

    // Auto-set title from first user message (up to 60 chars)
    if (chat.title === 'Nouvelle conversation') {
      chat.title = message.split('\n')[0].slice(0, 60).trim() || 'Nouvelle conversation';
    }

    // Langue UI du prospect (passee par le frontend depuis i18n.language).
    // STRATEGIE :
    // - Si bodyLang fourni : on REMPLACE la regle d'auto-detection du SYSTEM_PROMPT par une
    //   directive STRICTE en TETE de system + on injecte un message d'instruction explicite
    //   en debut d'history. Cela ecrase l'inertie de la langue de l'historique de conv.
    // - Si pas de bodyLang : on garde l'auto-detection d'origine.
    // @author Rabah Ziane - 2026-05-13
    const LANG_NAMES = {
      fr: 'francais', en: 'anglais', es: 'espagnol', de: 'allemand', it: 'italien', pt: 'portugais',
      nl: 'neerlandais', sv: 'suedois', da: 'danois', no: 'norvegien', fi: 'finnois',
      pl: 'polonais', cs: 'tcheque', hu: 'hongrois', el: 'grec', tr: 'turc',
      ru: 'russe', ar: 'arabe', fa: 'persan', hi: 'hindi', zh: 'chinois', ja: 'japonais', ko: 'coreen',
    };
    const LANG_NATIVE = {
      fr: 'francais (en francais)', en: 'English (in English)', es: 'espanol (en espanol)',
      de: 'Deutsch (auf Deutsch)', it: 'italiano (in italiano)', pt: 'portugues (em portugues)',
      nl: 'Nederlands (in het Nederlands)', sv: 'svenska (pa svenska)', da: 'dansk (pa dansk)',
      no: 'norsk (pa norsk)', fi: 'suomi (suomeksi)', pl: 'polski (po polsku)',
      cs: 'cestina (cesky)', hu: 'magyar (magyarul)', el: 'ellinika (sta ellinika)',
      tr: 'Turkce (Turkce olarak)', ru: 'russkiy (po-russki)', ar: 'al-arabia (bil-arabiya)',
      fa: 'farsi (be farsi)', hi: 'hindi (hindi me)', zh: 'zhongwen (yong zhongwen)',
      ja: 'nihongo (nihongo de)', ko: 'hangugeo (hangugeoro)',
    };
    const uiLang = String(bodyLang || '').toLowerCase().split('-')[0];
    const langName = LANG_NAMES[uiLang] || null;
    const langNative = LANG_NATIVE[uiLang] || langName;

    // Build system prompt with user context
    const userContext = `
# Contexte du prospect (déjà connu)
- Prénom : ${req.chatUser.name}
- Email : ${req.chatUser.email}
${req.chatUser.company ? `- Entreprise : ${req.chatUser.company}\n` : ''}${req.chatUser.phone ? `- Téléphone : ${req.chatUser.phone}\n` : ''}${req.chatUser.country ? `- Pays : ${req.chatUser.country}\n` : ''}
Tu peux t'adresser à ${req.chatUser.name} par son prénom dès le début.`;

    // Prompt caching Anthropic (refonte 2026-05-19 Rabah) :
    // - SYSTEM_PROMPT (gros bloc statique ~2000 tokens) marque cache_control ephemeral.
    // - Override langue + userContext en blocs SEPARES non caches (varient par user / lang).
    // - Cache breakpoint aussi sur l'avant-dernier message pour cacher l'historique cumule.
    // Pourquoi : reduit le cout d'une conv. de 20 msg de ~0,40 $ a ~0,15 $ (-60%) sans changer
    // les reponses du modele (cache c'est juste de la facturation Anthropic, pas de la logique).
    // L'ordre est important : SYSTEM_PROMPT en PREMIER (prefix stable) > override > userContext.
    const history = chat.messages.map((m) => ({ role: m.role, content: m.content }));
    const systemBlocks = [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ];
    if (langName) {
      // Override langue placee APRES SYSTEM_PROMPT pour ne pas casser le cache prefix.
      // Position posterieure = priorite encore plus forte cote modele (recence).
      systemBlocks.push({
        type: 'text',
        text: `# Langue par defaut : ${langNative}

Par defaut, tu reponds en ${langNative} (langue selectionnee par le prospect dans le selecteur du site).

MAIS - regle ABSOLUE pour la confiance client :
- Si le prospect ecrit dans une autre langue OU te demande explicitement de parler dans une autre langue (ex: simplement le nom d'une langue "Bangla" / "Arabic" / "Turkce" / "Urdu" / "Hindi" / "Dari" / etc., ou phrase comme "parle moi en X", "tu peux en Y ?", "do you speak Z?"), tu BASCULES IMMEDIATEMENT dans cette langue sans aucune resistance.
- Tu ne refuses JAMAIS de parler une langue, meme si elle est exotique. Tu fais de ton mieux dans cette langue, fluide et professionnel.
- Tu ne dis JAMAIS "I can only speak X" ou "Je ne peux qu'en X" - c'est interdit.
- Tu enchaines naturellement dans la nouvelle langue sans expliquer le changement.
- Si tu n'es pas sur de la langue exacte du prospect, tu lui reponds dans celle qu'il a utilisee dans son dernier message.`,
      });
    }
    systemBlocks.push({ type: 'text', text: userContext });

    // Cache breakpoint sur l'avant-dernier message (= dernier message assistant connu).
    // Anthropic cache TOUT le prefix jusqu'a ce point, donc au tour suivant l'historique
    // accumule est servi depuis le cache au tarif -90%.
    // Conv. < 3 msg : pas la peine, prefix trop court (min cache = 1024 tokens en Sonnet).
    let messagesForApi = history;
    if (history.length >= 3) {
      messagesForApi = history.map((m, i) => {
        if (i === history.length - 2) {
          return {
            role: m.role,
            content: [{ type: 'text', text: m.content, cache_control: { type: 'ephemeral' } }],
          };
        }
        return m;
      });
    }

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemBlocks,
      messages: messagesForApi,
    });

    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    chat.messages.push({ role: 'assistant', content: reply });
    await chat.save();

    // Trigger lead email if criteria met (3+ user turns, not yet notified)
    const userTurns = chat.messages.filter((m) => m.role === 'user').length;
    if (!chat.notifiedAt && userTurns >= 3) {
      sendLeadEmail(chat, req.chatUser).catch((err) => console.error('[lead email] failed:', err?.message));
    }

    await ChatUser.updateOne({ _id: req.chatUser._id }, { lastActiveAt: new Date() });

    return res.json({
      reply,
      sessionId: chat.sessionId,
      title: chat.title,
      leadInfo: chat.leadInfo,
      messageCount: chat.messages.length
    });
  } catch (err) {
    console.error('[project-chat send] error:', err);
    return res.status(500).json({ error: 'chat_failed', message: err?.message });
  }
});

export default router;
