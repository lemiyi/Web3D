# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + TypeScript + Vite 8, Tailwind CSS v4, React Router, Zustand, Zod, MapLibre GL (react-map-gl), Motion. Site statique (SPA) sans backend ni base de données, contenu en JSON versionné dans le dépôt, déployé sur Vercel ou Netlify. Choix imposé par le cahier des charges (`docs/cahier_des_charges.pdf`).

## Users

Grand public burkinabè (confirmé) : jeunes et familles, très majoritairement sur téléphone Android, avec une connexion souvent limitée. Ils découvrent ou redécouvrent des contes et légendes de leur pays, dans la langue des conteurs. Le site est aussi évalué dans un cadre académique (Master, module Multimédia/Web3D) : le lien et un rapport sont envoyés à Odilon Simpore (Gobelab) avant le 4 novembre 2026.

## Product Purpose

Préserver, numériser et transmettre le patrimoine oral burkinabè. L'utilisateur parcourt le pays sur une carte interactive 2D/3D, ouvre des contes, légendes et récits historiques locaux, et les vit avec une voix en langue nationale (mooré, dioula, fulfuldé, gulmancema…), des illustrations animées et des choix interactifs. Succès : un site public fonctionnel, rapide sur mobile, livré à temps avec au moins 8 contes complets.

## Positioning

Aucune autre plateforme ne relie chaque récit à un lieu précis du Burkina sur une carte en relief, avec la voix du conteur dans sa langue d'origine, le texte surligné en synchronisation et des embranchements narratifs.

## Operating Context

Équipe de 4 étudiants, 8 jours (27 oct. au 4 nov. 2026). Rôles : A carte et plateforme, B lecteur de conte, C contenu et audio, D design et rapport. Git avec branches par fonctionnalité, un fichier JSON par conte. Audio AAC mono 64 kbit/s (.m4a), illustrations en SVG (animables) ou WebP ≤ 200 Ko, 3 à 6 scènes par conte.

## Capabilities and Constraints

- MVP (F1 à F8) : carte 2D/3D avec marqueurs et filtres, fiche d'aperçu, lecteur de conte scène par scène, audio avec texte surligné, narration interactive à 2 choix, recherche et filtres (langue, région, type), pages Accueil / À propos / Sources, responsive et accessible.
- Hors périmètre : comptes utilisateurs, base de données, back-office, application native, moteur 3D complet. La « 3D » est la vue inclinée de la carte avec relief.
- Bonus possibles : conte au hasard, quiz, PWA hors-ligne, mode « veillée » sombre, formulaire externe « Proposer un conte », interface FR/EN.
- Objectifs mesurables : Lighthouse mobile ≥ 80, accessibilité ≥ 90, premier affichage < 3 s en 4G, Chrome / Firefox / Safari + un Android + un iPhone, aucun lien mort ni erreur console.
- Contenu minimal : 8 contes (objectif 10 à 12) de 2 à 5 minutes, 4 langues nationales avec audio plus le français, 5 régions, au moins 2 contes interactifs et 1 récit historique.
- Aucune lecture automatique du son ; transcription textuelle de chaque audio.
- Droits : n'utiliser un texte publié que s'il est du domaine public ou autorisé, sinon réécrire avec ses propres mots et citer la source. Illustrations générées par IA : à signaler clairement dans le site et le rapport.

## Brand Commitments

Nom de travail : « Contes et Légendes du Burkina Faso ». Aucune identité visuelle ni logo n'est encore décidé. Le cahier des charges suggère des couleurs de terre, un vert de savane et un indigo, et des motifs de bogolan / tissage, mais ces pistes n'ont pas été confirmées comme contraintes : elles restent ouvertes pour le travail de design.

## Evidence on Hand

- `docs/cahier_des_charges.pdf` et `docs/Projet Web Multimédia.pdf` : cahier des charges et sujet.
- Un seul conte de démonstration (`src/content/contes/yennenga.json`) avec texte et illustration provisoires : ne pas le présenter comme contenu réel.
- Aucun enregistrement audio, aucun conteur confirmé, aucune illustration originale à ce jour. Le contenu est à rechercher (état au 27 oct. 2026). Ne pas fabriquer de conteurs, de consentements, de sources ou de citations.

## Product Principles

1. Le contenu oral est le cœur : la voix du conteur et la langue d'origine passent avant l'interface.
2. Mobile d'abord et léger : le site doit rester utilisable avec une connexion limitée.
3. L'immersion se mérite par la narration (carte, voix, image, choix), jamais par des effets décoratifs.
4. Respect des conteurs et des droits : consentement, sources et licences visibles sur le site.
5. Livrer à temps : un MVP complet vaut mieux qu'un site ambitieux inachevé.

## Accessibility & Inclusion

Contraste AA, focus visible, navigation clavier, étiquettes ARIA, transcription de chaque audio, respect de `prefers-reduced-motion`, aucune lecture automatique du son. Les langues nationales (mooré, dioula, fulfuldé, gulmancema) sont des langues à part entière du produit, pas des variantes décoratives du français.
