# Suivi des conversions Google Ads + dashboard interne

Ce document explique comment activer le suivi des conversions sur **deliverydigital.fr**.

## 1. Ce qui est tracké

4 événements de conversion :

| Event interne | Déclenché par |
|---|---|
| `contact_submit` | Soumission du formulaire de contact (Contact.tsx) |
| `phone_click` | Clic sur n'importe quel `<a href="tel:...">` (auto-détecté) |
| `email_click` | Clic sur n'importe quel `<a href="mailto:...">` (auto-détecté) |
| `quote_click` | Clic sur les boutons "Discutons" / "Demande de devis" |

Chaque événement est envoyé à **3 destinations** :
1. **Google Analytics 4** (event `conversion_<type>`)
2. **Google Ads** (event `conversion` avec `send_to: AW-.../<label>`)
3. **Base de données interne** (MongoDB collection `conversions`) → dashboard `/admin/dashboard`

Les hits GA/Ads se font **uniquement après consentement** (bandeau RGPD). La sauvegarde DB se fait toujours (aucune donnée personnelle en clair : IP hachée SHA-256 + salt).

---

## 2. Variables d'environnement à renseigner

Ajoutez dans le `.env` de prod (`/home/ubuntu/deliverydigital-main-web-app/deliverydigital-web-app/.env`) :

```bash
# Google Analytics 4
VITE_GA_ID=G-FEZ0VTXRTH

# Google Ads (à compléter après création des conversions)
VITE_GADS_ID=AW-XXXXXXXXX
VITE_GADS_LABEL_CONTACT=AbCdEfGhIj
VITE_GADS_LABEL_PHONE=KlMnOpQrSt
VITE_GADS_LABEL_EMAIL=UvWxYzAbCd
VITE_GADS_LABEL_QUOTE=EfGhIjKlMn

# Salt secret pour hash IP RGPD (générer avec `openssl rand -hex 32`)
DASHBOARD_IP_SALT=<32_bytes_hex>
```

Après modification du `.env` :

```bash
cd /home/ubuntu/deliverydigital-main-web-app/deliverydigital-web-app
npm run build
pm2 reload deliverydigital-main-web deliverydigital-main-web-apis
```

---

## 3. Créer les conversions côté Google Ads

1. **Connexion** : https://ads.google.com → compte DELIVERY Digital
2. **Outils & paramètres** → **Mesure** → **Conversions**
3. Cliquer **+ Nouvelle action de conversion** → **Site web** → entrer `https://deliverydigital.fr`
4. Si Google propose des détections auto, **les ignorer** (on utilise gtag manuel)
5. Cliquer **+ Ajouter une action de conversion manuellement**, créer **4 actions** :

| Nom interne | Catégorie | Valeur | Comptage |
|---|---|---|---|
| Formulaire contact | Submit lead form | 1 EUR | Unique |
| Clic téléphone | Phone calls | 1 EUR | Une par clic |
| Clic email | Submit lead form | 1 EUR | Une par clic |
| Demande devis | Submit lead form | 5 EUR | Unique |

6. Pour chaque conversion créée :
   - Google génère un **ID conversion** (`AW-1234567890`) et un **label conversion** (`AbCdEfGhIj`)
   - Notez les deux. **L'ID est identique pour les 4 conversions**, seul le label change.
7. **Mode d'installation** → "Insérer le tag vous-même" → Google affiche le snippet, **ignorer** (déjà géré).

---

## 4. Renseigner les IDs dans le `.env`

Une fois les 4 conversions créées, copiez les labels dans `.env` :

```bash
VITE_GADS_ID=AW-1234567890                        # même ID pour les 4
VITE_GADS_LABEL_CONTACT=AbCdEfGhIjKlMnOp          # label de "Formulaire contact"
VITE_GADS_LABEL_PHONE=QrStUvWxYzAbCdEf            # label de "Clic téléphone"
VITE_GADS_LABEL_EMAIL=GhIjKlMnOpQrStUv            # label de "Clic email"
VITE_GADS_LABEL_QUOTE=WxYzAbCdEfGhIjKl            # label de "Demande devis"
```

Puis rebuild + reload pm2 (cf. §2).

---

## 5. Vérifier que le suivi fonctionne

### Méthode 1 : Tag Assistant Chrome
1. Installer l'extension **Tag Assistant Companion** (Chrome Web Store).
2. Aller sur https://deliverydigital.fr → accepter le bandeau cookies.
3. Ouvrir Tag Assistant → "Add domain" → vérifier que **G-FEZ0VTXRTH** et **AW-...** apparaissent.
4. Cliquer "Discutons" ou un lien `tel:` → Tag Assistant doit afficher l'événement `conversion`.

### Méthode 2 : Console navigateur
1. Aller sur https://deliverydigital.fr → accepter le bandeau cookies.
2. Console : `window.dataLayer` doit contenir les hits gtag.
3. Cliquer un lien tel/mail → vérifier qu'un nouveau hit apparaît dans dataLayer.

### Méthode 3 : Dashboard interne
1. Aller sur https://deliverydigital.fr/admin (login admin).
2. Onglet **Dashboard conversions** → les compteurs incrémentent en temps réel.

### Méthode 4 : Google Ads (J+1)
Les conversions remontent **24-48h après** dans Google Ads (Outils → Conversions → All conversions). Si une conversion reste sur "vérification" plus de 7 jours, vérifier le label dans `.env`.

---

## 6. Politique RGPD

- Bandeau cookies affiché tant que l'utilisateur n'a ni accepté ni refusé.
- Choix persisté dans `localStorage.dd_consent` = `granted` | `denied`.
- **Refuser** : aucun script GA/Ads chargé, le site fonctionne normalement.
- **Accepter** : gtag.js chargé, Consent Mode v2 = `granted` partout.
- IP visiteur **hachée SHA-256 + salt server-side** avant d'atteindre MongoDB.
- Durée de conservation : recommandée 13 mois (configurable dans GA4 propriété → Conservation des données).

---

## 7. Endpoints backend

| Méthode | URL | Auth | Description |
|---|---|---|---|
| POST | `/api/conversions` | publique | Enregistre un événement (envoi auto par le front) |
| GET | `/api/admin/conversions/stats?range=7\|30\|90` | admin | Compteurs + timeseries daily |
| GET | `/api/admin/conversions/list?range=30&type=...&page=1` | admin | Table paginée |
| GET | `/api/admin/conversions/top-pages?range=30` | admin | Top 5 pages converties |
| GET | `/api/admin/conversions/sources?range=30` | admin | Sources de trafic |

---

## 8. Fichiers ajoutés

- `server/models/Conversion.js` — schema Mongoose
- `server/routes/conversions.js` — routes API (publique + admin)
- `src/lib/analytics.ts` — helpers tracking
- `src/components/ConsentBanner.tsx` — bandeau RGPD
- `src/pages/admin/AdminDashboard.tsx` — page dashboard
- `docs/CONVERSIONS_SETUP.md` — ce document

---

@author Rabah Ziane — 2026-05-13
