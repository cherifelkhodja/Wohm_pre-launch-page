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
| Sécurité | Helmet, CORS, rate limiter in-memory |
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
├── server.js            ← serveur Express (API + static)
├── db.js                ← connexion PostgreSQL + init tables
└── public/
    ├── index.html       ← landing page complète (HTML + CSS + JS inline)
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
- `ADMIN_TOKEN` — token Bearer pour les routes admin
- `PORT` — port du serveur (défaut : 3000)
- `NODE_ENV` — `production` active SSL sur PostgreSQL

## Architecture frontend

Le frontend est un **fichier unique** (`public/index.html`) contenant HTML, CSS et JS inline. Pas de bundler, pas de framework.

### Sections de la landing page (Phase 1)

1. **Hero** — logo, tagline, countdown vers l'ouverture (6 juillet 2026)
2. **Reveal** — titre principal avec animation
3. **Le problème** — pain point coût constructeur (15 000 à 30 000 €)
4. **Notre approche** — proposition de valeur + mention 80% d'économie
5. **Expertise** — crédibilité équipe (ingénieurs F1)
6. **CTA** — formulaire d'inscription (prénom, email, voiture)
7. **Footer** — liens légaux + contact

### Design

- Thème sombre par défaut, mode clair via toggle (classe `.light` sur `<html>`)
- Palette : bleu `#2EA3E0`, fond `#060A13`, surface `#0B1120`
- Animations : racing lines, sweep, count-up, scroll reveal (IntersectionObserver)

## API

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/health` | GET | — | Health check |
| `/api/subscribe` | POST | — | Inscription (prénom, email, vehicule) |
| `/api/subscribers` | GET | Admin | Liste des inscrits |
| `/api/subscribers/count` | GET | Admin | Nombre d'inscrits |
| `/api/visits` | GET | Admin | Visites par IP |
| `/api/visits/count` | GET | Admin | Total visites + IPs uniques |

### Rate limiting

- Subscribe : 5 req/min/IP
- Admin : 10 req/min/IP

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
