# BudgetMaster — PWA (iPhone only)

**Objectif** : une application *installable* sur iPhone, qui fonctionne **hors ligne**, avec stockage local (IndexedDB), **notifications** (iOS 16.4+), **verrouillage par PIN**, cagnottes, catégories à plafond, transactions, graphique mensuel, et export/import JSON.

> ⚠️ Face ID WebAuthn *réel* exige un serveur pour la vérification. Sur iPhone seul, on fournit un **PIN** + (optionnel) un **Raccourci iOS** qui exige Face ID avant d’ouvrir l’URL de l’app — cela ajoute une barrière biométrique à l’ouverture.

## Installation (directement depuis l’iPhone)
1. Ouvre **GitHub** (appli mobile ou Safari) et crée un dépôt public `budgetmaster`.
2. Uploade tous les fichiers de ce dossier (tu peux utiliser l’upload Zip → “Add file” → “Upload files”).
3. Dans le dépôt → **Settings → Pages** → **Source = Deploy from a branch**, **Branch = main /(root)**.
4. Quand la page est en ligne (URL GitHub Pages), ouvre-la dans Safari → **Partager** → **Ajouter à l’écran d’accueil** (PWA installée).
5. La première fois, va dans **Réglages** (de l’app) → définis un **PIN** et active **Verrouiller au lancement**.

## Raccourci iOS (Face ID avant l’ouverture)
1. Ouvre **Raccourcis** → **+** → **Ajouter une action** → **URL** → mets l’URL de ton PWA.
2. Ajoute l’action **Ouvrir des URL**.
3. Dans les options du raccourci, active **Afficher sur la feuille de partage** (si tu veux), **Ajouter à l’écran d’accueil** et **Exiger Face ID**.
> Résultat : pour lancer l’app, tu tapes l’icône du Raccourci → Face ID → il ouvre le PWA.

## Notifications web (iOS 16.4+)
- Autorise les notifications lors de l’appui **Tester notification** sur le tableau de bord.
- Sur iOS, les notifications web requièrent que l’app soit **installée** (icône écran d’accueil) et que l’utilisateur ait accepté la permission.

## Données / Sauvegarde
- **Stockage** : IndexedDB sur l’appareil (offline). Pas de serveur.
- **Exporter** : bouton “Exporter JSON” → fichier téléchargeable.
- **Importer** : sélectionne un fichier `.json` de sauvegarde.

## Limites et options avancées
- **Face ID natif** : besoin d’une app native (Xcode/macOS) ou d’un backend WebAuthn — non faisable 100% depuis l’iPhone.
- **Chiffrement local** : tu peux utiliser un PIN et, pour plus, on peut ajouter un chiffrement AES dérivé du PIN.
- **Synchro multi‑devices** : nécessite un serveur (Firebase, Supabase) — pas inclus ici.

Bonne utilisation ✌️
