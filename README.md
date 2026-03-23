# WOHM — Site pré-lancement

Landing page pré-lancement pour [wohm.fr](https://wohm.fr). Capture de leads (prénom, email, véhicule) en PostgreSQL.

## Stack

- **Node.js** + **Express**
- **PostgreSQL** (Railway add-on)
- HTML/CSS/JS statique servi par Express
- Déploiement **Railway** + domaine custom `wohm.fr`

## Structure

```
├── server.js              # Express app, routes, middleware
├── db.js                  # Pool pg, migration auto
├── package.json
├── .gitignore
├── Dockerfile             # Multi-stage, non-root user
├── railway.json
├── public/
│   ├── index.html         # Landing page
│   ├── assets/            # Logos (à placer manuellement)
│   │   └── wohm_logo_dark_transparent.png
│   ├── favicon.ico        # Générer depuis logo_final.png
│   ├── og-image.png       # 1200x630
│   ├── robots.txt
│   └── sitemap.xml
└── README.md
```

## Setup local

### Prérequis

- Node.js >= 20
- PostgreSQL

### Installation

```bash
npm install
```

### Variables d'environnement

Définir les variables suivantes (via export ou un fichier `.env` local) :

| Variable       | Description                          | Exemple                                        |
|----------------|--------------------------------------|-------------------------------------------------|
| `DATABASE_URL` | URL de connexion PostgreSQL          | `postgresql://user:pass@localhost:5432/wohm`    |
| `ADMIN_TOKEN`  | Token Bearer pour les routes admin   | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID)   |
| `PORT`         | Port du serveur (défaut: 3000)       | `3000`                                          |
| `NODE_ENV`     | Environnement (`production` / autre) | `production`                                    |

### Lancement

```bash
# Avec un fichier .env local (Node 20+)
node --env-file=.env server.js

# Ou en définissant les variables manuellement
DATABASE_URL=postgresql://... ADMIN_TOKEN=... node server.js

# Mode développement (auto-reload)
node --env-file=.env --watch server.js
```

## Assets

Placer les fichiers images dans `public/assets/` :

- `wohm_logo_dark_transparent.png` — Logo blanc + Ω bleu, fond transparent (pour le site)
- Autres variantes (light, SVG, etc.)

Et à la racine de `public/` :

- `favicon.ico` — Générer depuis `logo_final.png`
- `og-image.png` — Image 1200x630 (fond #0B1120 + logo centré + slogan)

## API

### POST /api/subscribe

Inscription d'un nouveau lead.

```json
{
  "prenom": "Jean",
  "email": "jean@example.com",
  "vehicule": "Tesla Model 3"
}
```

- `prenom` : requis, max 100 caractères
- `email` : requis, max 255 caractères
- `vehicule` : optionnel, max 255 caractères
- Rate limit : 5 req/min/IP
- Retour : `{ "ok": true }` ou `{ "error": "..." }`

### GET /api/subscribers

Liste des inscrits (admin).

- Header : `Authorization: Bearer {ADMIN_TOKEN}`
- Rate limit : 10 req/min/IP
- Retour : JSON array trié par date DESC

### GET /api/subscribers/count

Nombre d'inscrits (admin).

- Header : `Authorization: Bearer {ADMIN_TOKEN}`
- Retour : `{ "count": N }`

### GET /health

Health check.

- Retour : `{ "status": "ok", "timestamp": "..." }`

## Déploiement Railway

1. Créer un projet sur [Railway](https://railway.app)
2. Ajouter un service PostgreSQL (add-on) → `DATABASE_URL` auto-injectée
3. Connecter ce repo GitHub
4. Définir les variables d'environnement :
   - `ADMIN_TOKEN` — Générer avec `uuidgen`
   - `NODE_ENV` — `production`
5. Le build utilise le `Dockerfile` automatiquement

### Domaine custom

1. Dans Railway Settings → Custom Domain : ajouter `wohm.fr`
2. Chez le registrar DNS : créer un CNAME `wohm.fr` → valeur fournie par Railway
3. SSL géré automatiquement par Railway
