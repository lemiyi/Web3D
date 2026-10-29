---
version: 1
slug: "src-pages-accueil-tsx"
primary_target: "src/pages/Accueil.tsx"
related_targets: ["src/pages/Carte.tsx"]
---

# Accueil et Carte

Surfaces : Accueil (Persuade) et Carte (Experience). Public : grand public burkinabè sur téléphone Android. Action : entrer dans la carte et ouvrir un conte. Preuve : le pays réel en relief, avec ses contes posés sur leurs lieux. Illustrations codées en SVG, sans image générée. Aucune génération d'images disponible : construction code-first.

Révision du 27 oct. 2026 : l'équipe a fourni son design system (token.css, DIRECTION_VISUELLE.md). Choix confirmé par l'utilisateur : hybride. La carte en relief reste le héros (c'est la 3D du sujet) ; les couleurs, thèmes et formes viennent du design system. Le fond nuit indigo de la première version est abandonné.

## Direction contract

THESIS: le pays entier est l'image de héros, une carte de relief réelle où chaque conte est un lieu à ouvrir, dans l'interface en pilules et en verre voulue par l'équipe. Refuse la page culturelle standard (photo plein écran, grille de cartes).

OWN-WORLD: token.css est la seule source des couleurs, thème clair sable par défaut et thème « veillée » sombre (data-theme ou préférence système). Aucune couleur en dur dans le code : variables seulement. Échelle d'altitude réelle en six bandes (--relief-0 à --relief-5) du vert savane au brun, rivières en --secondary, repères colorés par --lang-*. Manrope 800 serré pour les titres, Source Serif 4 pour les textes de lecture. Navigation en pilule flottante, bouton d'action noir (--text sur --bg), barre de chiffres et panneaux en verre (trois au plus visibles), bouton en barre d'échelle.

STORY: le visiteur voit que des contes vivent sur de vrais lieux, lit les langues, entre dans la carte et ouvre un récit.

FIRST VIEWPORT: pilule flottante en haut ; à gauche le titre dans la zone calme, la phrase d'accroche, le bouton barre d'échelle et les langues en pilules ; à droite le Burkina en bandes d'altitude avec sept repères numérotés, la barre de chiffres en verre posée dans l'angle vide, la clé d'altitude en dessous.

FORM: carte de relief murale (IGB) habillée du design system d'équipe, position 5 de ma liste, graine 7ed61f04. Raises conservés : règle de latitude au défilement (barre collante sur mobile), inertie amortie, un seul axe vertical, couleur engagée sur de grandes régions, compteur à l'apparition.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Décisions ouvertes
- Texte d'accroche en langues nationales, à valider par l'équipe.
- Contenus de démonstration (six contes « [Démo] » et yennenga) à remplacer par de vrais récits avec consentement.
- Niveau 2 (parallaxe en couches) et niveau 3 (objet 3D, baobab) de DIRECTION_VISUELLE.md : non réalisés, à décider avant le 29 oct.
- Couleurs de langue : désormais dans token.css ; le champ « couleur » a été retiré de langues.json et du schéma (le cahier le prévoyait).
