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
