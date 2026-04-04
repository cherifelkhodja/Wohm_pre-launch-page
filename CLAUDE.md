# CLAUDE.md — Guide de développement WOHM

## Projet

WOHM est un centre d'ingénierie spécialisé dans la réparation de batteries haute tension et moteurs de voitures électriques en Île-de-France. Ce dépôt contient le site pré-lancement (landing page + API de capture de leads).

- **URL production** : https://wohm.fr
- **Hébergement** : Railway (Dockerfile + PostgreSQL)
- **Domaine** : wohm.fr

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML / CSS / JS vanilla (fichier unique `public/index.html`) |
| Backend | Node.js 20 + Express 4 |
| Base de données | PostgreSQL (via `pg`) |
| Auth | Sessions PostgreSQL (express-session + connect-pg-simple + bcryptjs) |
| Upload | Multer (memory) → AWS S3 |
| Email | Resend (invitations, digest quotidien) |
| Cron | node-cron (digest 18h Europe/Paris) |
| Sécurité | Helmet, CORS, rate limiter in-memory, sessions httpOnly |
| Déploiement | Docker multi-stage → Railway |
| Fonts | Outfit (body) + Bebas Neue (titres) via Google Fonts |
| Analytics | Plausible (placeholder) |

## Structure du projet

```
├── CLAUDE.md            ← ce fichier
├── memory.md            ← journal des modifications (OBLIGATOIRE, voir ci-dessous)
├── Dockerfile           ← build multi-stage Node 20 Alpine
├── railway.json         ← config Railway (builder + healthcheck)
├── package.json
├── server.js            ← serveur Express (orchestrateur : middleware, routes, cron)
├── db.js                ← connexion PostgreSQL + init tables (8 tables)
├── middleware/
│   ├── auth.js          ← requireSession
│   ├── rate-limiter.js  ← createRateLimiter (in-memory)
│   └── upload.js        ← multer (10 Mo, PDF+Word, validation magic bytes)
├── routes/
│   ├── admin-auth.js    ← login, logout, me
│   ├── admin-invites.js ← invitation admin + setup/:token
│   ├── admin-jobs.js    ← CRUD offres d'emploi
│   ├── admin-applications.js ← suivi candidatures + statuts
│   ├── admin-subscribers.js  ← inscrits + visites (existant extrait)
│   ├── public-subscribe.js   ← inscription leads (existant extrait)
│   ├── public-jobs.js        ← liste + détail offres publiques
│   └── public-apply.js       ← candidature avec upload CV
├── services/
│   ├── email.js         ← Resend (invitations, digest, refus)
│   ├── s3.js            ← upload/presigned URL AWS S3
│   ├── slug.js          ← génération slugs uniques
│   └── digest.js        ← cron quotidien 18h
├── scripts/
│   └── create-admin.js  ← CLI : node scripts/create-admin.js <email> <password> <prenom>
├── admin/
│   ├── login.html       ← page connexion admin
│   ├── setup.html       ← acceptation invitation
│   ├── index.html       ← dashboard admin
│   ├── jobs.html        ← gestion offres d'emploi
│   ├── applications.html ← suivi candidatures
│   └── shared.js        ← utilitaires JS partagés (fetchAPI, nav, badges)
└── public/
    ├── index.html       ← landing page (+ section "On recrute" dynamique)
    ├── jobs.html         ← liste publique des offres
    ├── job-detail.html   ← détail d'une offre (servi via /jobs/:slug)
    ├── apply.html        ← formulaire de candidature
    ├── robots.txt
    ├── sitemap.xml
    └── assets/          ← logo, favicon, og-image
```

## Commandes

```bash
npm install          # installer les dépendances
npm run dev          # lancer en mode watch (développement)
npm start            # lancer en production
```

### Variables d'environnement requises

- `DATABASE_URL` — connexion PostgreSQL
- `ADMIN_TOKEN` — token Bearer pour les routes admin (legacy, transition vers sessions)
- `SESSION_SECRET` — secret pour signer les cookies de session
- `RESEND_API_KEY` — clé API Resend pour les emails
- `S3_BUCKET` — nom du bucket S3 pour les CV
- `S3_REGION` — région AWS du bucket
- `AWS_ACCESS_KEY_ID` — clé d'accès AWS
- `AWS_SECRET_ACCESS_KEY` — secret AWS
- `DIGEST_RECIPIENT_EMAIL` — email(s) supplémentaires pour le digest
- `PORT` — port du serveur (défaut : 3000)
- `NODE_ENV` — `production` active SSL sur PostgreSQL
- `TZ` — timezone pour le cron (Europe/Paris)

## Architecture frontend

Le frontend est un **fichier unique** (`public/index.html`) contenant HTML, CSS et JS inline. Pas de bundler, pas de framework.

### Sections de la landing page (Phase 1)

1. **Hero** — logo, tagline, countdown vers l'ouverture (6 juillet 2026)
2. **Reveal** — titre principal avec animation
3. **Le problème** — pain point coût constructeur (15 000 à 30 000 €)
4. **Notre approche** — proposition de valeur + mention 80% d'économie
5. **Expertise** — crédibilité équipe (ingénieurs F1)
6. **On recrute** — aperçu des 3 dernières offres d'emploi (chargées dynamiquement)
7. **CTA** — formulaire d'inscription (prénom, email, voiture)
8. **Footer** — liens légaux + contact

### Design

- Thème sombre par défaut, mode clair via toggle (classe `.light` sur `<html>`)
- Palette : bleu `#2EA3E0`, fond `#060A13`, surface `#0B1120`
- Animations : racing lines, sweep, count-up, scroll reveal (IntersectionObserver)

## API

### Routes publiques

| Route | Méthode | Description |
|-------|---------|-------------|
| `/health` | GET | Health check |
| `/api/subscribe` | POST | Inscription lead (prénom, email, vehicule) |
| `/api/jobs` | GET | Liste des offres actives |
| `/api/jobs/:slug` | GET | Détail d'une offre |
| `/api/apply` | POST | Candidature (multipart: champs + CV) |
| `/jobs/:slug` | GET | Page HTML détail offre (SSR) |

### Routes auth

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/admin/login` | POST | Connexion admin (email + password) |
| `/api/admin/logout` | POST | Déconnexion |
| `/api/admin/me` | GET | Info admin connecté |
| `/api/admin/setup/:token` | GET/POST | Validation/acceptation invitation |

### Routes admin (session requise)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/admin/invites` | POST | Inviter un nouvel admin |
| `/api/admin/subscribers` | GET | Liste des inscrits |
| `/api/admin/subscribers/count` | GET | Nombre d'inscrits |
| `/api/admin/visits` | GET | Visites par IP |
| `/api/admin/visits/count` | GET | Total visites + IPs uniques |
| `/api/admin/jobs/:id/views` | GET | Détail des vues d'une offre (IP uniques) |
| `/api/admin/jobs` | GET/POST | Lister/Créer offres |
| `/api/admin/jobs/:id` | PUT/DELETE | Modifier/Supprimer offre |
| `/api/admin/jobs/:id/archive` | PATCH | Archiver/Désarchiver |
| `/api/admin/applications` | GET | Liste candidatures (filtrable) |
| `/api/admin/applications/new-count` | GET | Nombre de candidatures non vues |
| `/api/admin/applications/:id` | GET | Détail candidature (marque vue) |
| `/api/admin/applications/:id/cv` | GET | URL présignée S3 pour CV |
| `/api/admin/applications/:id/status` | PATCH | Changer statut (raison si refus) |

### Rate limiting

- Subscribe : 5 req/min/IP
- Apply : 3 req/min/IP
- Admin : 10 req/min/IP
- Login : 5 req/min/IP

## SEO

- Meta description, Open Graph, Twitter Card configurés
- JSON-LD `LocalBusiness` avec adresse et date d'ouverture
- `robots.txt` + `sitemap.xml` présents
- Canonical : `https://wohm.fr/`

## Règles de développement

### Terminologie

- Toujours utiliser **« voiture »** (jamais « véhicule ») dans le contenu visible
- Le champ API reste `vehicule` pour compatibilité BDD

### Conventions

- Pas de framework JS — tout est vanilla
- CSS inline dans `index.html` (pas de fichier CSS séparé)
- Commits en français ou anglais, format conventionnel (`feat:`, `fix:`, `remove:`, etc.)
- Branche de développement : créer depuis `master`

### Obligation memory.md

**Chaque modification du projet DOIT être consignée dans `memory.md`.**
Ce fichier sert de journal exhaustif de toutes les améliorations, corrections et changements apportés au projet. Avant de commit, mettre à jour `memory.md` avec :

- La date de la modification
- Une description claire du changement
- La raison / contexte du changement

Ne jamais supprimer les entrées existantes dans `memory.md`.

## Phases du projet

| Phase | Période | Contenu |
|-------|---------|---------|
| Phase 1 | Mars 2026 | Landing page + capture de leads (actuel) |
| Phase 2 | Mai 2026 | À définir |
| Phase 3 | Juin 2026 | À définir |
