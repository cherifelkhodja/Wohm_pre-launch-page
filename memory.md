# memory.md — Journal des modifications WOHM

> **Ce fichier est obligatoire.** Chaque modification du projet doit y être consignée.
> Ne jamais supprimer les entrées existantes.

---

## 2026-03-23

### feat: Initialisation du site pré-lancement
- Création du serveur Express avec Helmet, CORS, rate limiting
- Base de données PostgreSQL (tables `subscribers` et `visits`)
- Landing page hero avec countdown vers le 6 juillet 2026
- Formulaire d'inscription (prénom, email, voiture)
- Dockerfile multi-stage + config Railway
- Routes admin pour consulter les inscrits et visites

### fix: Réorganisation du formulaire
- 3 champs sur une ligne, bouton pleine largeur en dessous

### fix: Suppression de la section Story + simplification du footer

### fix: Mise à jour du countdown vers le lundi 6 juillet 2026 à 09:00

### feat: Amélioration responsive mobile + mise à jour des meta tags

### feat: Ajout du mode clair/sombre avec toggle

### fix: Isolation du script theme toggle pour ne pas casser le formulaire

### feat: Retour erreur 409 quand un email est déjà inscrit

---

## 2026-03-23 — Phase 1 Redesign

### feat: Refonte complète landing page Phase 1
- Ajout de 3 nouvelles sections : Le problème, Notre approche, Expertise
- Section « Le problème » : pain point coût constructeur (15 000 à 30 000 €)
- Section « Notre approche » : proposition de valeur + chiffres clés (animation count-up)
- Section « Expertise » : crédibilité équipe ingénieurs
- CTA renforcé avec mention diagnostic offert au lancement
- SEO : meta description, Open Graph, Twitter Card, JSON-LD LocalBusiness
- Accessibilité : alt descriptifs, aria-labels sur formulaire
- Favicons : favicon-32x32, favicon-16x16, apple-touch-icon
- Analytics : placeholder Plausible intégré
- Sitemap mis à jour

### fix: Normalisation des tailles de police entre sections + correction texte CTA

### fix: Augmentation de la taille des labels de section (12px → 14px)

### remove: Masquage temporaire des cartes chiffres clés (section Notre approche)

### fix: Mise à jour du texte expertise — référence à l'industrie F1

### fix: Ajout des symptômes moteur électrique dans la section Le problème
- Vibrations, surchauffe, perte de puissance

---

## 2026-03-24

### fix: Remplacement de toutes les mentions « véhicule » par « voiture »
- Concerne le contenu visible uniquement (le champ API reste `vehicule` pour compatibilité BDD)

### feat: Ajout assets images
- Upload de og-image.png, favicon-32x32.png, favicon-16x16.png, apple-touch-icon.png

### feat: Ajout mention « 80% d'économie » dans la section Notre approche
- Nouvelle ligne de mise en avant : "Réparation jusqu'à 80% d'économie par rapport au tarif de remplacement constructeur"

### fix: Alignement des meta descriptions sur la mention 80% d'économie
- Meta description, OG description et Twitter description mises à jour

---

## 2026-03-25

### fix: Ajout puis retrait des tarifs constructeur dans la ligne d'économie
- Ajouté temporairement « (15 000 à 30 000 €) » à côté du 80% d'économie
- Retiré pour garder la ligne épurée — les tarifs restent uniquement dans la section « Le problème »

### docs: Création de CLAUDE.md et memory.md
- CLAUDE.md : guide complet de développement (stack, structure, conventions, API, SEO)
- memory.md : journal obligatoire de toutes les modifications du projet

---

## 2026-04-03

### feat: Admin panel avec authentification par sessions
- Système d'auth par sessions PostgreSQL (express-session + connect-pg-simple + bcryptjs)
- Page login admin (/admin/login.html) avec thème cohérent du site
- Script CLI create-admin.js pour créer le premier administrateur
- Middleware requireSession + transition Bearer token → sessions
- Dashboard admin avec stats (inscrits, visites, candidatures, offres actives)

### feat: Invitation admin par email (Resend)
- Route POST /api/admin/invites avec token d'invitation (expire 48h)
- Page setup.html pour accepter l'invitation et créer son compte
- Emails d'invitation via Resend API

### feat: Gestion des offres d'emploi (CRUD)
- Table job_postings avec slug unique, description, profil recherché, compétences (tags), localisation, télétravail, type de contrat, niveau d'expérience
- Admin : page jobs.html avec CRUD complet + bouton copier le lien
- Public : page jobs.html (liste), job-detail.html (détail via /jobs/:slug)
- Route SSR /jobs/:slug pour les URLs partageables sur les plateformes d'emploi
- Section "On recrute" dynamique dans la landing page (3 dernières offres)

### feat: Système de candidatures avec upload CV sur S3
- Formulaire de candidature complet : civilité, identité, téléphone, poste, statut professionnel (salarié/stagiaire/alternant)
- Champs conditionnels : salaire (salarié) ou durée/école/date début (stagiaire/alternant)
- Disponibilité (immédiate à +3 mois), niveau d'anglais (5 niveaux)
- Upload CV : PDF + Word, max 10 Mo, drag & drop, validation magic bytes
- Stockage CV sur AWS S3 avec clé structurée (cv/{id}/{timestamp}-{filename})
- Téléchargement admin via URL présignée S3 (expire 15 min)

### feat: Suivi des candidatures (admin)
- Page applications.html avec filtres par statut et par offre
- Badge "NEW" par admin (table application_views, tracking par admin)
- Workflow de statuts : new → contacté → entretien → validé / refusé
- Transitions validées côté serveur
- Refus : raison obligatoire, stockée pour envoi futur d'email

### feat: Digest quotidien à 18h (node-cron + Resend)
- Cron planifié à 18h Europe/Paris
- Email envoyé à tous les admins si nouvelles candidatures dans la journée

### refactor: Restructuration du projet
- Extraction des routes en modules : routes/, middleware/, services/, scripts/
- server.js allégé en orchestrateur (middleware, routes, cron)
- Séparation routes/services/middleware (Single Responsibility)
- Service slug.js pour la génération de slugs uniques
- Service s3.js pour l'upload et les URLs présignées
- Service email.js pour Resend (invitations, digest, refus)
- Middleware upload.js avec validation MIME type + magic bytes

### docs: Mise à jour sitemap.xml avec /jobs et /apply

---

## 2026-04-03 — Corrections post-analyse

### fix: Déplacement du CV vers le chemin final sur S3
- Le CV était stocké avec un chemin temporaire (`cv/pending/...`) et jamais déplacé
- Ajout d'une fonction `moveCV` dans `services/s3.js` (CopyObject + DeleteObject)
- Après insertion en BDD, le fichier est déplacé vers `cv/{appId}/...` et la BDD est mise à jour
- Fallback gracieux : si le déplacement échoue, le CV reste accessible au chemin temporaire

### fix: Inclusion de la raison du refus dans l'email de rejet
- `sendRejectionEmail()` ignorait le paramètre `reason` — corrigé avec un bloc stylé dans l'email
- Ajout de l'échappement HTML (XSS) sur le prénom et la raison
- Ajout de l'appel à `sendRejectionEmail()` dans `routes/admin-applications.js` lors du changement de statut vers "refusé"

### fix: Validation backend du mot de passe de confirmation (setup admin)
- Ajout de la validation `password_confirm` côté serveur dans `routes/admin-invites.js`

### fix: Vérification du digest manqué au démarrage
- Nouvelle table `digest_sent` pour suivre les digests envoyés par date
- `runDigest()` vérifie si le digest a déjà été envoyé avant d'envoyer
- `checkMissedDigest()` envoie effectivement le digest si le serveur redémarre après 18h

### fix: Erreur fatale si SESSION_SECRET non défini en production
- Ajout d'un check au démarrage dans `server.js` — le serveur refuse de démarrer sans `SESSION_SECRET` en production

### feat: Pagination sur les listes
- `GET /api/jobs` : support `limit` (max 100, défaut 50) et `offset`
- `GET /api/admin/applications` : support `limit` et `offset`

---

## 2026-04-03 — Audit de sécurité + corrections review

### fix(CRITIQUE): Protection XSS sur le contenu HTML (présentation + offres)
- Ajout de `services/sanitize.js` : sanitisation HTML côté serveur (suppression script, iframe, event handlers, javascript: URLs)
- Sanitisation à l'écriture dans `routes/admin-settings.js` et `routes/admin-jobs.js`
- Ajout de `sanitizeHtml()` côté client dans `admin/shared.js` et `public/job-detail.html`
- `textToHtml()` passe maintenant par `sanitizeHtml()` au lieu de retourner du HTML brut
- Présentation entreprise sanitisée à l'affichage (job-detail.html + admin/index.html)

### fix(HAUTE): Prévention timing attack sur le login
- `bcrypt.compare()` est maintenant toujours appelé, même si l'utilisateur n'existe pas (comparaison avec hash factice)

### fix(HAUTE): Prévention session fixation
- `req.session.regenerate()` appelé après login et après setup admin via invitation

### fix(HAUTE): Suppression authentification Bearer token legacy
- `requireBearerAdmin` et `requireAdmin` supprimés de `middleware/auth.js`
- `admin-subscribers.js` migré de `requireAdmin` vers `requireSession`
- Surface d'attaque réduite

### fix(MOYENNE): Whitelist des clés de settings
- Seule la clé `company_presentation` est autorisée dans `routes/admin-settings.js`
- Toute autre clé retourne une erreur 400

### fix(MOYENNE): Rate limiting sur les endpoints setup
- Ajout de `setupLimiter` (5 req/min/IP) sur GET et POST `/api/admin/setup/:token`

### fix(BASSE): Validation complexité mot de passe
- Le mot de passe doit contenir au moins 1 majuscule, 1 minuscule et 1 chiffre

### fix(BASSE): `password_confirm` obligatoire au setup admin

### fix(review): Encodage URI du CopySource S3
- `encodeURI()` appliqué pour éviter les erreurs sur noms de fichiers avec caractères spéciaux

### fix(review): Pagination — header X-Total-Count
- `GET /api/jobs` retourne le total dans le header `X-Total-Count`

### fix(review): Clarification paramIdx dans la pagination admin
- Indices `limitIdx` et `offsetIdx` calculés explicitement avant le push

### refactor: Extraction de la présentation WOHM dans une page Paramètres
- Création de `admin/settings.html` — page dédiée avec éditeur de présentation
- Suppression du bloc présentation du dashboard (`admin/index.html`)
- Ajout de l'entrée "Paramètres" dans la navigation admin (`admin/shared.js`)

---

## 2026-04-04

### feat: Compteur de visiteurs unique par offre d'emploi
- Nouvelle table `job_views` (job_posting_id, ip, user_agent) avec contrainte UNIQUE(job_posting_id, ip)
- Tracking automatique à chaque consultation d'une offre via `/api/jobs/:slug` (IP unique par annonce)
- Endpoint admin `GET /api/admin/jobs/:id/views` pour le détail des vues
- Colonne "Vues" ajoutée dans la liste admin des offres avec compteur d'IP uniques
- Le compteur JOIN est intégré au listing admin pour éviter les requêtes N+1

### fix: Refonte des icônes du menu admin
- Remplacement des caractères Unicode (&#9636;, &#9997;, &#128196;, &#9881;) par des icônes SVG (Feather-style)
- Icônes : Dashboard (grille), Offres (valise), Candidatures (utilisateurs), Paramètres (engrenage), Déconnexion (flèche)
- Structure HTML améliorée avec `<span class="nav-icon">` et `<span class="nav-label">` pour un meilleur contrôle CSS

### feat: Version mobile de l'admin
- Menu hamburger (☰) fixe en haut à gauche sur mobile, ouvre la sidebar en slide-over
- Sidebar coulissante 260px avec fermeture au clic extérieur ou sur un lien
- Contenu admin pleine largeur sans marge gauche sur mobile
- Grille de stats responsive : 2 colonnes tablette, 1 colonne petit mobile
- Tables avec scroll horizontal dans les cartes
- Modales adaptées (largeur calc(100vw - 32px), padding réduit)
- Boutons agrandis sur mobile pour meilleure accessibilité tactile

### fix: Placeholders salaire du formulaire de candidature
- Salaire actuel : 45 000 → 35 000
- Salaire souhaité : 50 000 → 40 000
