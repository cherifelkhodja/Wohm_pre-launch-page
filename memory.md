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

### feat: Export CSV des inscrits et candidatures
- Endpoint `GET /api/admin/subscribers/export` : export CSV des inscrits (Prénom, Email, Voiture, Date d'inscription)
- Endpoint `GET /api/admin/applications/export` : export CSV des candidatures (Civilité, Prénom, Nom, Email, Téléphone, Poste, Statut pro, Salaire actuel, Salaire souhaité, Offre, Statut, Date)
- Les deux routes protégées par `requireSession` et `adminLimiter`
- Headers CSV avec BOM UTF-8 pour compatibilité Excel, Content-Disposition avec date du jour
- Bouton export ajouté dans le dashboard admin (Actions rapides) et la page candidatures (à côté des filtres)

### feat: Filtres par plage de dates sur le dashboard admin
- Barre de filtres sous le titre du dashboard : boutons rapides (Tout, 7j, 30j, 90j) + sélecteurs de dates personnalisées
- Le bouton actif est mis en surbrillance (fond bleu, texte blanc)
- Backend : `GET /api/admin/subscribers/count` accepte `from` et `to` (ISO date) pour filtrer par `created_at`
- Backend : `GET /api/admin/visits/count` accepte `from` et `to` pour filtrer par `created_at`
- Backend : `GET /api/admin/applications` accepte `from` et `to` pour filtrer par `a.created_at`
- Sans paramètres, le comportement reste inchangé (toutes les données)

### feat: Notes internes sur les candidatures (commentaires admin)
- Nouvelle table `application_notes` (id, application_id, admin_id, content, created_at) avec CASCADE sur suppression candidature et SET NULL sur suppression admin
- Endpoint `GET /api/admin/applications/:id/notes` : liste des notes avec nom de l'admin (JOIN admins), triées par date décroissante
- Endpoint `POST /api/admin/applications/:id/notes` : création d'une note (contenu non vide requis), associée à l'admin connecté via session
- Section "Notes internes" dans la modale de détail candidature (admin/applications.html) : liste des notes existantes + champ de saisie avec bouton "Ajouter"
- Chaque note affiche le prénom de l'admin (gras), la date, et le contenu
- Soumission possible via clic sur "Ajouter" ou touche Entrée

### feat: Badge de notification dans l'onglet navigateur
- Polling toutes les 60 secondes de `GET /api/admin/applications/new-count`
- Préfixe du titre d'onglet avec le compteur : `(3) WOHM Admin — Dashboard`
- Ne poll pas si l'onglet est caché (`document.hidden`)
- Activé automatiquement sur toutes les pages admin via `renderAdminNav()`

### feat: Actions groupées sur les candidatures
- Colonne checkbox ajoutée dans le tableau des candidatures (header "tout sélectionner" + checkbox par ligne)
- Barre d'action groupée apparaît quand au moins une candidature est sélectionnée
- Actions disponibles : Marquer contacté, Refuser (avec raison obligatoire)
- Endpoint `PATCH /api/admin/applications/bulk-status` : mise à jour en lot avec validation des transitions
- Envoi automatique des emails de refus pour chaque candidature refusée en lot

---

## 2026-04-14

### feat: Visionneuse de CV intégrée dans l'administration
- Nouveau bouton "Voir le CV" dans la modale détail candidature → ouvre une visionneuse plein écran
- Prévisualisation PDF native via `<iframe>` (URL S3 présignée avec `ResponseContentDisposition: inline`)
- Fichiers Word (.doc/.docx) : fallback avec message clair et bouton de téléchargement (non prévisualisables nativement par les navigateurs)
- Navigation rapide entre candidatures : flèches ← / → au clavier + boutons Précédent/Suivant dans l'en-tête
- Raccourci Échap pour fermer la visionneuse
- Compteur de position (ex : `3 / 47`) dans l'en-tête, en-tête affiche nom candidat + poste + nom du fichier CV
- Bouton téléchargement disponible dans la visionneuse + dans la modale détail + icône téléchargement par ligne dans le tableau des candidatures
- Marquage automatique "vue" quand la visionneuse charge un CV (badge bleu disparaît)
- Backend : `GET /api/admin/applications/:id/cv` accepte `?download=1` pour forcer `Content-Disposition: attachment`, sinon `inline` pour prévisualisation ; retourne également l'extension détectée (pour que le client choisisse entre iframe et fallback)
- `services/s3.js` : `getPresignedCVUrl(key, { disposition, filename })` ajoute `ResponseContentDisposition` à l'URL présignée
- `server.js` : ajout de `frameSrc: ["'self'", "https://*.amazonaws.com"]` à la CSP Helmet pour autoriser l'iframe vers le bucket S3

### fix: Invitation admin échouait toujours avec "Les mots de passe ne correspondent pas"
- Le backend (`routes/admin-invites.js`) exige `password_confirm` dans le body POST `/api/admin/setup/:token`
- Le frontend (`admin/setup.html`) validait bien l'égalité côté client mais n'envoyait pas `password_confirm` → rejet systématique côté serveur
- Fix : ajout du champ `password_confirm` dans la requête POST

### fix: Durcissements visionneuse CV (audit pré-merge main)
- `services/s3.js` : encodage RFC 5987 (`filename*=UTF-8''...` + fallback ASCII via `filename="..."`) dans `ResponseContentDisposition` pour supporter les noms de fichiers non-ASCII (ex : `CV_Mélanie.pdf`)
- `admin/applications.html` : le visionnage d'un CV ne déclenche plus `loadApplications()` (reload complet de la liste) — mise à jour locale du flag `is_new` + `renderApplications()` pour éviter les dérives d'index pendant la navigation rapide prev/next

### remove: Désactivation de l'envoi d'email au candidat en cas de refus
- Suppression de l'appel à `sendRejectionEmail()` dans `routes/admin-applications.js` pour le refus unitaire (`PATCH /:id/status`) et le refus groupé (`PATCH /bulk-status`)
- Suppression de l'import correspondant
- La fonction `sendRejectionEmail()` reste disponible dans `services/email.js` pour réactivation ultérieure
- Le changement de statut et la sauvegarde de la raison en BDD sont inchangés

### refactor: Visionneuse CV intégrée dans la modale candidature (plus d'overlay plein écran)
- Suppression de l'overlay plein écran `#cv-viewer` — le CV est maintenant affiché **dans la modale candidature** en side-by-side
- Nouvelle structure modale : en-tête (nom candidat + contrôles navigation), corps en 2 colonnes (infos à gauche `440px` fixe, CV à droite flex), pied de page (actions)
- Modale agrandie à `max-width: 1200px` / `height: 85vh`
- Responsive : sur mobile (<960 px), les colonnes se superposent verticalement (infos en haut, CV en dessous)
- Navigation prev/next entre candidatures directement dans l'en-tête de la modale (flèches ← / → au clavier + boutons) — met à jour infos ET CV sans rouvrir la modale
- Suppression du bouton "Voir le CV" (CV toujours visible) ; bouton "Télécharger le CV" conservé dans le panneau infos
- Bouton de fermeture `×` ajouté dans l'en-tête (en plus du bouton "Fermer" du pied de page)
- Raccourcis clavier : Échap pour fermer, ← / → pour navigation — désactivés dans les champs de saisie (ne pas interférer avec les notes)
- Fichiers Word : fallback avec message + bouton téléchargement, affiché dans le panneau CV

### fix: Clic sur la case à cocher d'une candidature ouvrait la modale de détail
- Ajout d'une classe `.app-checkbox-cell` sur le `<td>` de la checkbox et d'un garde dans le handler de délégation du tableau (`if (e.target.closest('.app-checkbox-cell')) return;`)
- Le `stopPropagation` inline restait en place en défense en profondeur, mais le garde explicite supprime le bug de manière robuste

### feat: Nouveau statut "À contacter" avant "Contacté" dans le workflow des candidatures
- Nouveau statut `a_contacter` inséré entre `new` et `contacte` dans le workflow
- Transitions : `new → a_contacter → contacte → entretien → valide` (refus toujours possible depuis chaque étape active)
- Backend (`routes/admin-applications.js`) : mise à jour de `VALID_TRANSITIONS` + `statusLabels` (export CSV)
- Frontend (`admin/applications.html`) :
  - Bouton "À contacter" (primary) dans la modale détail pour une candidature "Nouveau"
  - Bouton "Marquer contacté" dans la modale pour une candidature "À contacter"
  - Option "À contacter" dans le filtre de statut de la page candidatures
  - Action groupée "À contacter" remplace "Marquer contacté" (le bulk ne s'applique qu'aux candidatures "Nouveau")
- `admin/shared.js` : badge "À contacter" avec couleur violette `#8B5CF6`
- Aucune migration BDD requise (colonne `status` VARCHAR(20), nouvelle valeur validée côté serveur)

---

## 2026-04-15

### remove: Allègement de l'UI (mention diagnostic, toggle thème, lien retour)
- `public/index.html` : suppression de la mention « et bénéficier d'un diagnostic offert lors du lancement » dans le sous-titre du CTA. Le texte devient simplement « Inscrivez-vous pour être informé de notre ouverture. »
- `public/index.html` : suppression complète du bouton de bascule de thème (HTML, CSS `.theme-toggle` + media query mobile, script JS d'initialisation et toggle). Les règles `html.light` restent en place mais sont désormais inactives faute de déclencheur (pourront être nettoyées ultérieurement si besoin).
- `public/jobs.html` : suppression du lien « ← Retour au site » (et du CSS `.back-link` associé) en haut de la page des offres d'emploi. Les liens de navigation entre offres et formulaire de candidature sont conservés.
- Raison : simplification visuelle demandée pour la landing et la page emploi.

### feat: Redirection de la racine `/` vers la page emploi `/jobs.html`
- `server.js` : ajout d'un handler `app.get('/')` qui renvoie un `res.redirect(302, '/jobs.html')`, placé avant `express.static` pour court-circuiter le service automatique de `public/index.html`. Le tracking de visite sur `/` (middleware en amont) reste actif.
- Code 302 (temporaire) volontaire pour permettre une bascule simple si la landing redevient la page d'accueil. La landing `public/index.html` reste accessible via son URL directe `/index.html`.
- `sitemap.xml` non modifié pour l'instant (à réviser si la redirection devient permanente).
- Raison : pivot du site vers la page « offres d'emploi » comme entrée principale.

### chore: Rebranding « WOHM » → « EV Clinic » sur la page offres d'emploi
- `public/jobs.html` : remplacement des trois mentions visibles de la marque « WOHM » par « EV Clinic » — balise `<title>`, meta description, et phrase d'accroche « Rejoignez l'aventure … ».
- URL canonique (`https://wohm.fr/jobs`) conservée : il s'agit du domaine technique, non d'une mention de marque visible.
- Raison : démarche de rebranding en cours côté front. Périmètre strict limité à `jobs.html` tant que le changement de marque n'est pas validé sur le reste du site.

### chore: Précision de la marque « EV Clinic » → « EV Clinic Paris »
- `public/jobs.html` : les trois mentions « EV Clinic » deviennent « EV Clinic Paris » (title, meta description, phrase d'accroche).
- Raison : ajout du rattachement géographique dans le nom de marque affiché sur la page offres d'emploi.

---

## 2026-04-28

### feat: Pagination « Charger plus » + téléchargement groupé des CV (admin candidatures)
- `routes/admin-applications.js` :
  - `GET /api/admin/applications` : changement du format de réponse, retourne désormais `{ items, hasMore, limit, offset }` au lieu d'un tableau brut. Le SQL fait `LIMIT limit + 1` pour détecter la présence d'une page suivante sans requête de comptage séparée.
  - Nouvelle route `POST /api/admin/applications/bulk-cv` : reçoit `{ ids: [] }`, streame un ZIP des CV correspondants (max 100). Nommage : `Prenom_Nom.ext` (sanitisé, déduplication automatique en cas de collision).
- `services/s3.js` : nouveau helper `getCVStream(key)` qui retourne le stream `Body` du `GetObjectCommand` S3, utilisé pour piper directement les CV dans l'archive ZIP sans buffering complet en mémoire.
- `package.json` : ajout de la dépendance `archiver@^7.0.1` pour la génération du ZIP en streaming.
- `admin/applications.html` :
  - UI « Charger plus » : nouveau bouton et compteur (« X candidatures affichées (plus disponibles) ») sous le tableau, masqué quand `hasMore` est `false`. Page de 50 candidatures par requête.
  - `loadApplications()` réinitialise l'offset, `loadMoreApplications()` append les nouvelles lignes sans casser la sélection ni la navigation prev/next du modal détail.
  - Préservation de la sélection (cases à cocher) lors des re-render, indispensable pour ne pas perdre les sélections après un « Charger plus ».
  - Nouveau bouton « Télécharger les CV (ZIP) » dans la barre d'actions groupées : POST vers `/api/admin/applications/bulk-cv`, télécharge le ZIP côté client via `Blob` + `URL.createObjectURL`.
- Raison : avant ce changement, seules les 50 candidatures les plus récentes étaient visibles dans l'admin (le frontend ne passait jamais `limit`/`offset`, alors que le backend supportait déjà la pagination). Demande utilisateur d'ajouter aussi le téléchargement groupé des CV pour faciliter le tri RH.
