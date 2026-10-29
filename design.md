# Direction visuelle « rendu immersif » et skills à utiliser

Ce document traduit les trois références visuelles (héros plein écran avec paysage ou objet 3D, navigation flottante en pilule, panneaux en verre, grands titres) en **direction artistique pour les contes du Burkina Faso**, puis définit **quels skills, plugins et bibliothèques** utiliser, dans quel ordre.

À lire avec : [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) (couleurs), [`tokens.css`](tokens.css), [`SKILLS_CLAUDE_CODE.md`](SKILLS_CLAUDE_CODE.md) (liste générale des skills) et [`cahier_des_charges.tex`](cahier_des_charges.tex).

> Le lien Pinterest (« Insanely smooth 3D scroll animation », site Alethia) a été ouvert : c'est une **vidéo**. Seule la vignette est visible (la lecture demande une connexion Pinterest) : le mouvement exact est **déduit du titre et de la vignette**, pas observé. On y voit des rochers couverts de mousse qui flottent en 3D sur fond sombre, à côté d'un titre aligné à gauche.

---

## 1. Ce que les trois références ont en commun

| # | Référence | Ce qu'on voit |
|---|---|---|
| 1 | « Finance. Freedom. Fellows. » | Photo-rendu plein écran d'un lac au soleil, arbres au premier plan qui encadrent les coins, navigation transparente, badge en pilule, titre très gras, bouton noir, **barre de chiffres en verre** en bas |
| 2 | « Design with ease. » (Haven) | Paysage de montagne et prairie fleurie au coucher du soleil, **navigation en pilule blanche flottante**, titre dans le ciel (zone calme), deux boutons, indicateur « Scroll » en verre, fleurs floues au premier plan |
| 3 | Arbre couvert de mousse | Carte beige aux coins arrondis, **objet 3D découpé qui déborde du cadre** et passe derrière le texte, cartes blanches flottantes avec chiffres, icônes sociales en colonne |
| 4 | Lien Pinterest (Alethia, vidéo) | Page **sombre**, objets 3D (rochers moussus) qui **flottent et bougent au défilement**, titre à gauche, navigation discrète en haut. Le défilement pilote la 3D |

### L'ADN commun (à reproduire)

1. **Une image plein écran qui raconte le sujet** dès l'arrivée, sans bandeau ni carrousel.
2. **Le texte est posé dans la zone calme de l'image** (ciel, eau), jamais sur les détails.
3. **Profondeur** : premier plan flou ou sombre, plan moyen net, arrière-plan brumeux. Parfois un élément qui sort du cadre.
4. **Interface en pilules** : navigation flottante, boutons très arrondis, badges ovales.
5. **Verre dépoli** (flou d'arrière-plan + transparence) pour les chiffres et les cartes d'information.
6. **Typographie sans empattement, grande et dense** pour le titre ; sous-titre petit et discret.
7. **Un seul bouton d'action fort** (noir ou blanc), pas de dégradés criards.
8. **Lumière chaude et douce** : contre-jour, brume, soleil rasant.
9. **Le défilement pilote la scène** (référence 4) : l'objet 3D tourne, s'éloigne ou se rapproche pendant que l'on descend la page, de façon fluide.

---

## 2. Traduction pour le Burkina Faso

### 2.1 Ambiance

**« Cinéma de savane au crépuscule »** : lumière rasante dorée, poussière de l'harmattan, silhouettes d'arbres (baobab, karité, caïlcédrat), ciel qui passe du rose latérite à l'indigo. Les couleurs viennent directement de [`tokens.css`](tokens.css) : latérite, ocre, savane, indigo, coton.

### 2.2 Les trois écrans clés

**A. Accueil, façon référence 2 (paysage + pilule + titre dans le ciel)**

```
┌──────────────────────────────────────────────┐
│        ( Logo  Carte  Contes  Langues  À propos   [ Écouter ] )  ← pilule flottante
│                                              │
│            (badge) 12 contes · 5 langues     │
│                                              │
│        Les contes du Faso, à écouter.        │  ← titre dans le ciel
│   Légendes et récits racontés dans les       │
│   langues du Burkina.                        │
│        [ Explorer la carte ]  Écouter un conte│
│                                              │
│   ░░░ savane, baobab, herbes floues ░░░░░░░  │  ← avant-plan flou
│            ( Défiler ↓ )                     │
└──────────────────────────────────────────────┘
```

**B. Carte, façon référence 1 (barre de chiffres en verre)**

La carte occupe tout l'écran. En bas, une **barre en verre** : `12 contes · 5 langues · 9 régions · 3 h d'écoute`. Filtres en pilules en haut. Un clic sur un marqueur ouvre une carte en verre avec l'aperçu du conte.

**C. Fiche d'un conte, façon référence 3 (objet 3D qui déborde)**

Un grand **objet emblématique du conte** (un baobab en 3D, une calebasse, un cheval pour Yennenga) flotte sur une carte couleur terre, en partie hors du cadre. Autour, des **cartes blanches ou en verre** : langue, région, durée, conteur. Le bouton « Écouter » est une grosse pilule.

### 2.3 Images de héros par région (idées à valider)

Lieux réels du Burkina Faso, à vérifier et à documenter avant usage :

| Région (indicative) | Lieu | Ambiance |
|---|---|---|
| Cascades | Pics de Sindou, cascades de Karfiguéla, lac de Tengréla | Roche, eau, végétation (proche de la référence 2) |
| Hauts-Bassins | Mare aux hippopotames de Bala | Eau, lumière rasante (proche de la référence 1) |
| Centre-Sud | Tiébélé (cour royale, murs peints) | Terre, motifs géométriques, ocre et blanc |
| Sud-Ouest | Ruines de Loropéni | Pierre, végétation, mystère |
| Sahel | Dunes d'Oursi | Sable, ciel immense, indigo |
| Centre-Nord | Lac de Bam | Eau, ciel, calme |

**Règle de fond :** pour un **lieu réel**, privilégiez de **vraies photographies** libres de droits (Wikimedia Commons, photos de l'équipe, avec la licence citée). Pour une **scène imaginaire** (le cheval de Yennenga, un animal qui parle), utilisez une **illustration picturale** plutôt qu'un faux « photo-rendu », afin de ne pas faire passer une image générée pour un document.

---

## 3. Niveaux d'ambition (à choisir selon le temps)

Il vous reste 8 jours : ne visez pas le niveau 3 partout.

| Niveau | Technique | Effet | Coût | Où l'utiliser |
|---|---|---|---|---|
| **1. Image + verre** | Image plein écran, dégradé de lisibilité, navigation en pilule, barre en verre, animations d'entrée | Rendu proche des références 1 et 2 | Faible (1 à 2 jours) | **Tout le site** (obligatoire) |
| **2. Parallaxe en couches** | 3 à 4 calques PNG/WebP (ciel, montagne, plan moyen, avant-plan) qui bougent à vitesses différentes au défilement ou au mouvement | Profondeur crédible | Moyen (1 à 2 jours) | Accueil et héros de quelques contes |
| **2,5 D (carte de profondeur)** | Image + carte de profondeur dans un shader WebGL : l'image « respire » quand la souris ou le téléphone bouge | Effet 3D sans modèle 3D | Moyen à élevé | 1 ou 2 héros maximum |
| **3. Objet 3D réel** | Modèle `.glb` (par exemple un baobab) affiché avec Three.js, rotation douce, éclairage | Rendu de la référence 3 | Élevé (2 jours ou plus, modèle à trouver ou générer) | **Un seul** : la fiche d'un conte phare ou l'accueil |

**Recommandation :** niveau 1 partout, niveau 2 sur l'accueil, niveau 3 sur **un seul** objet (le baobab). La **3D pilotée par le défilement** (§4.6 bis) fait partie du niveau 3 : c'est la même scène, avec un branchement au défilement en plus. Le niveau 2,5 D est un bonus.

---

## 4. Recettes techniques

### 4.1 Image de héros lisible (le piège n°1)

Un texte sur une photo est illisible sans précaution. Ajoutez un **dégradé de lisibilité** et vérifiez le contraste sur l'image réelle.

```css
.hero { position: relative; min-height: 100svh; color: #fff; }
.hero__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero::after {            /* dégradé de lisibilité */
  content: ""; position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgb(23 17 13 / .35) 0%, rgb(23 17 13 / 0) 40%),
    linear-gradient(0deg,   rgb(23 17 13 / .55) 0%, rgb(23 17 13 / 0) 35%);
}
.hero__content { position: relative; z-index: 1; }
```

Si le texte est sombre sur un ciel clair (référence 2), appliquez un voile clair derrière lui. Dans tous les cas, **mesurez le contraste sur l'image réelle**, pas sur la maquette.

### 4.2 Navigation en pilule flottante

```css
.nav {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 20px; align-items: center;
  padding: 8px 8px 8px 20px; border-radius: 999px;
  background: rgb(255 253 248 / .85); box-shadow: 0 6px 24px rgb(23 17 13 / .12);
}
.nav .cta { background: var(--terre-900); color: #fff; border-radius: 999px; padding: 10px 18px; }
```

Sur mobile : logo + bouton « Menu » dans la pilule, liens dans un panneau.

### 4.3 Panneau en verre (barre de chiffres, cartes d'aperçu)

```css
.glass {
  background: rgb(255 253 248 / .55);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
          backdrop-filter: blur(14px) saturate(1.2);
  border: 1px solid rgb(255 255 255 / .45);
  border-radius: 24px;
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--surface); }   /* repli sans flou */
}
```

**Limite :** le flou d'arrière-plan est coûteux sur les téléphones d'entrée de gamme. **Pas plus de 2 ou 3 panneaux en verre visibles en même temps.**

### 4.4 Parallaxe en couches

Avec Motion (déjà dans la pile) :

```tsx
const { scrollY } = useScroll();
const yCiel   = useTransform(scrollY, [0, 600], [0, 40]);
const yPlan2  = useTransform(scrollY, [0, 600], [0, 120]);
const yAvant  = useTransform(scrollY, [0, 600], [0, 240]);
// <motion.img style={{ y: yCiel }} /> … un par calque
```

Prévoir `prefers-reduced-motion` : calques fixes, sans mouvement.

### 4.5 Effet 2,5 D (carte de profondeur, bonus)

1. Générer ou fournir une **carte de profondeur** de l'image (niveaux de gris, clair = proche). Des modèles d'estimation de profondeur à partir d'une seule image existent.
2. Dans Three.js, afficher un plan avec deux textures (image + profondeur) et un petit *fragment shader* qui décale les coordonnées de texture selon la profondeur et la position du pointeur.
3. Prévoir un repli : image fixe si WebGL est absent, si `prefers-reduced-motion` est actif, ou sur appareil lent.

### 4.6 Objet 3D réel (référence 3)

- **Modèle** : format `.glb`, poids cible **moins de 1,5 Mo** (compression Draco ou Meshopt).
  - Sources : modèle libre sur une banque 3D (**vérifier la licence**), modélisation par un membre de l'équipe (Blender), ou génération par un outil image vers 3D (qualité variable, à contrôler).
- **Affichage** : Three.js avec `@react-three/fiber` et `@react-three/drei` (`useGLTF`, `Float`, `Environment`).
- **Chargement différé** : n'importer le module 3D que sur la page concernée.
- **Repli obligatoire** : une image PNG détourée de l'objet si WebGL est absent, si l'appareil est lent ou si `prefers-reduced-motion` est actif.
- L'objet **déborde du cadre** de la carte (comme la référence 3) : positionnez le canvas plus grand que la carte, `pointer-events: none` sauf si l'objet est interactif.

### 4.6 bis Animation 3D pilotée par le défilement (référence 4)

Principe : la position du défilement (0 à 100 %) commande la rotation, la position et l'échelle de l'objet 3D. Le résultat paraît « fluide » grâce à trois éléments :

1. **Défilement adouci** : la bibliothèque **Lenis** lisse la molette et le toucher.
2. **Interpolation** : l'objet ne saute pas à la valeur cible, il s'en approche progressivement (amortissement).
3. **Une seule scène 3D fixe** (canvas en `position: fixed`) derrière des sections de texte qui défilent.

Deux façons de le brancher :

| Approche | Outils | Quand |
|---|---|---|
| Défilement lié à la caméra ou à l'objet | `ScrollControls` de `@react-three/drei` | Tout dans React, simple à mettre en place |
| Chronologie sur plusieurs sections | **GSAP** (`ScrollTrigger`) pilotant la rotation et la position de l'objet | Séquence précise : l'objet change de position à chaque section |

Squelette de principe (Motion + r3f) :

```tsx
const { scrollYProgress } = useScroll();            // 0 → 1 sur toute la page
useFrame(() => {
  const t = scrollYProgress.get();
  objet.current.rotation.y = MathUtils.damp(objet.current.rotation.y, t * Math.PI * 2, 4, dt);
  objet.current.position.y = MathUtils.damp(objet.current.position.y, -t * 2, 4, dt);
});
```

Pour les contes : **un objet par conte** qui voyage avec le récit. Le baobab grandit ou tourne à chaque scène, la calebasse s'ouvre, etc. Les scènes (§8 du design system) changent d'ambiance en même temps.

**Contraintes :** un seul canvas 3D à la fois ; chargement différé ; repli en image fixe si `prefers-reduced-motion`, si WebGL est absent ou sur appareil lent. Sur mobile, réduisez la qualité (`dpr` limité à 1,5, moins de polygones).

Le fond sombre de cette référence correspond au thème **« veillée »** de [`tokens.css`](tokens.css) (`data-theme="dark"`) : bon choix pour les pages de contes lus le soir.

### 4.7 Typographie

| Usage | Proposition (polices libres, à héberger localement) |
|---|---|
| Titres et interface | **Manrope** ou **Plus Jakarta Sans**, graisses 700 à 800, interlettrage serré sur les grands titres |
| Texte des contes | **Fraunces** ou **Source Serif 4** : lecture longue plus confortable avec empattements |
| Langues nationales | Vérifier que la police affiche les caractères spéciaux (ɛ, ɔ, ɩ, ʋ, ƥ, ŋ…) |

Testez **chaque police** avec les alphabets du mooré, du dioula et du fulfuldé avant de la valider.

### 4.8 Mouvement

- Entrée du héros : titre qui monte avec un fondu (400 à 600 ms), puis le sous-titre, puis les boutons.
- Barre de chiffres : compteur qui s'incrémente à l'apparition.
- Survol des boutons : élévation légère, pas de rebond exagéré.
- Toujours respecter `prefers-reduced-motion`.

---

## 5. Production des images

### 5.1 Chaîne recommandée

1. **Choisir la source** : photo réelle libre de droits ou de l'équipe (lieux réels), illustration générée ou dessinée (scènes de contes).
2. **Générer ou retoucher** : outil d'images de votre choix, guidé par le skill `image-generation` (§6).
3. **Détourer** (objet 3D de repli, éléments d'avant-plan) et **séparer en calques** pour la parallaxe.
4. **Exporter** en AVIF ou WebP, en deux tailles (mobile 800 px, bureau 1600 px).
5. **Documenter** : source, licence, auteur, outil utilisé, date. Tout va dans la page « Sources ».

### 5.2 Modèle de prompt (à adapter, ne pas copier tel quel)

```
Paysage de savane du Burkina Faso au coucher du soleil, grand baobab isolé à droite,
herbes hautes floues au premier plan, ciel dégagé dans le tiers supérieur pour y placer
un titre, lumière dorée rasante, brume légère, style cinéma, ultra détaillé,
aucune personne, aucun texte, format 16:9.
```

Consignes :
- Réservez dans la composition une **zone calme** (ciel, eau) pour le titre.
- Préférez des scènes **sans personnes identifiables** : les visages et vêtements générés tombent facilement dans les clichés ou les erreurs culturelles.
- Évitez les clichés (tenues « africaines » génériques, scènes misérabilistes). Faites relire les images par une personne qui connaît la culture représentée.
- **Ne mélangez pas** images réelles et générées sans l'indiquer.

### 5.3 Transparence et éthique

- **Indiquez clairement** sur le site (page « Sources ») et dans le rapport quelles images sont générées par IA.
- Un conte est un patrimoine vivant : l'illustration doit **respecter** le récit et ses origines. Validez avec le conteur quand c'est possible.
- Ne téléversez **jamais** d'enregistrements de conteurs ni de données personnelles vers un service d'images ou de vidéos.
- Vérifiez les conditions d'usage et de licence de chaque outil avant d'utiliser ses images sur un site public.

### 5.4 Budgets de poids (connexions mobiles limitées)

| Élément | Cible |
|---|---|
| Image de héros (bureau, AVIF/WebP) | 150 à 250 Ko |
| Image de héros (mobile) | 60 à 100 Ko |
| Calque de parallaxe | 40 à 80 Ko chacun |
| Modèle 3D `.glb` | moins de 1,5 Mo |
| Premier affichage utile | moins de 3 s en 4G |

Techniques : `srcset` et `sizes`, `loading="lazy"` hors du premier écran, image de héros en `fetchpriority="high"`, flou d'attente (*blur-up*) de 20 px en base64.

---

## 6. Skills, plugins et bibliothèques à utiliser

### 6.1 Résultat de la recherche dans le catalogue

Les éléments ci-dessous sont **réellement proposés** dans le catalogue. Ceux marqués « installé » sont déjà disponibles ; les autres sont à activer. **Les plugins de la communauté ne sont pas vérifiés par Anthropic** : lisez-les avant de les installer, car certains ajoutent des serveurs MCP ou des hooks qui s'exécutent sur votre machine.

> **Correction.** Dans [`SKILLS_CLAUDE_CODE.md`](SKILLS_CLAUDE_CODE.md), une première recherche n'avait trouvé aucun élément Three.js. Une recherche plus large a trouvé **`parallax-threejs`** (§ ci-dessous). Il sert à **déboguer et tester** la 3D, pas à la **concevoir**.

| Élément | Origine | État | Ce qu'il apporte | Pour ce projet |
|---|---|---|---|---|
| **`impeccable`** | skill | installé | Design d'interface, critique, animation, finition, effets visuels ambitieux, itération en direct dans le navigateur | **Skill central** : héros, pilules, verre, mouvement, finition |
| **`frontend-design`** | plugin Anthropic (officiel) | à activer | Conception et implémentation d'interfaces soignées | Complément à `impeccable` pour éviter un rendu « générique » |
| **`Design`** | plugin Anthropic (officiel) | à activer | `design-critique`, `design-system`, `accessibility-review`, `ux-copy`, `design-handoff` | Critique des maquettes, audit d'accessibilité, textes d'interface |
| **`audit-suite`** | plugin communauté | à activer | `web-animation-design`, `make-interfaces-feel-better`, `web-design-guidelines`, `audit-as-a11y-eng`, `audit-as-perf-eng` | Animations, finitions, audits d'accessibilité et de performance |
| **`Website Design`** | plugin communauté | à activer | `landing-page`, `web-design-system`, `web-review` ; produit un `DESIGN.md` | Fixer la direction visuelle par écrit et relire la page d'accueil. Un serveur MCP externe (UXKIN) est optionnel : **vous pouvez vous en passer**. |
| **`image-generation`** | plugin communauté | à activer | Guide de rédaction de prompts, indépendant du modèle | Rédiger de bons prompts pour les héros |
| **`MuAPI`** | plugin communauté | à activer | Génération d'images et de vidéos par service externe | Option si l'équipe n'a pas d'autre outil d'images (voir §5.3 sur l'éthique et les données) |
| **`parallax-threejs`** | plugin communauté | à activer | Débogage Three.js/GLSL (graphe de scène, console, état GL, pixels), **tests de régression visuelle** | **Seulement si vous faites de la 3D réelle ou un shader** ; ajoute des serveurs MCP et un hook |
| **`Fairmind Design`** | plugin communauté | à activer | Agents de contraste, WCAG, jetons de design | Optionnel : redondant avec `audit-suite` et `Design` |
| **`Codesign`** | plugin communauté | à activer | Moteur de design (animation, redimensionnement, `layerize`…) | Optionnel. Le nom `layerize` suggère une séparation en calques utile à la parallaxe, **à vérifier avant d'en dépendre**. |
| `artifact-design`, `artifact-diagramming`, `dataviz` | skills | installés | Pages publiées, schémas, graphiques | Maquettes partageables, schémas du rapport |
| `built-in-browser`, `run`, `chrome-browser` | skills | installés | Lancer le site et le vérifier visuellement | Contrôle du rendu réel, tests sur écran étroit |
| `code-review`, `simplify`, `security-review` | skills | installés | Qualité du code | Avant chaque fusion |

### 6.2 Combien en installer ?

Chaque plugin ajoute du contexte à Claude et de la surface à surveiller. **Ne les installez pas tous.**

| Besoin | Jeu minimal recommandé |
|---|---|
| **Rendu immersif niveaux 1 et 2** | `impeccable` + `frontend-design` + `audit-suite` + `image-generation` |
| **Ajouter l'objet 3D (niveau 3) ou un shader** | + `parallax-threejs` |
| **Direction visuelle écrite** | + `Website Design` (sans le serveur UXKIN) |
| **Images générées sans autre outil** | + `MuAPI` (en lisant ses conditions) |

### 6.3 Bibliothèques (ce ne sont pas des skills)

| Besoin | Bibliothèque |
|---|---|
| Carte et relief | MapLibre GL JS |
| 3D | Three.js, `@react-three/fiber`, `@react-three/drei` |
| Animations d'interface et parallaxe | Motion (ex-Framer Motion) |
| Défilement fluide | Lenis |
| Chronologies complexes | GSAP |
| Audio | Howler.js |
| Compression de modèles 3D | `gltf-transform` (Draco, Meshopt) |
| Images | `sharp` (conversion AVIF/WebP en ligne de commande) |

Pour chacune : donnez à Claude la **version installée** et un lien vers la **documentation officielle**.

---

## 7. Pipeline par phase (qui utilise quoi)

| Phase | Objectif | Skills et outils | Responsable |
|---|---|---|---|
| **0. Direction** (jour 1) | Fixer le style par écrit | `impeccable` (shape), `Website Design` (`landing-page`, `web-design-system`), `Design` (`design-critique`), ce document | D |
| **1. Images** (jours 1 à 3) | Héros par région, calques, objet à détourer | `image-generation`, photos libres, `MuAPI` si besoin, `sharp` | D + C |
| **2. Interface** (jours 2 à 5) | Navigation en pilule, verre, héros, barre de chiffres | `impeccable`, `frontend-design`, jetons de `tokens.css` | A + B |
| **3. Mouvement** (jours 4 à 6) | Entrées, parallaxe, compteurs | `impeccable` (animate), `web-animation-design`, `make-interfaces-feel-better`, Motion | B |
| **4. 3D** (jours 4 à 6, si retenu) | Baobab, shader | Three.js, r3f, `parallax-threejs` | A ou B |
| **5. Contrôle** (jours 6 et 7) | Accessibilité, performance, rendu mobile | `audit-as-a11y-eng`, `audit-as-perf-eng`, `Design` (`accessibility-review`), `built-in-browser`, `run`, `code-review`, `security-review` | Tous |
| **6. Rapport** (jours 7 et 8) | Figures, captures, schémas | `dataviz`, `artifact-diagramming`, `pdf`, LaTeX | D |

---

## 8. Demandes types pour Claude

**Direction artistique**
```
Avec impeccable et Website Design, rédige un DESIGN.md pour la page d'accueil à partir de
DIRECTION_VISUELLE.md et DESIGN_SYSTEM.md : ambiance, typographie, composition du héros,
pilule de navigation, panneaux en verre. Style « cinéma de savane au crépuscule ».
```

**Héros**
```
Avec impeccable, construis le héros de l'accueil : image plein écran (placeholder), titre dans
la zone calme du ciel, navigation en pilule flottante, barre de chiffres en verre en bas.
Utilise uniquement les variables de tokens.css. Prévois le repli sans backdrop-filter.
```

**Mouvement**
```
Avec web-animation-design, ajoute une parallaxe à 3 calques sur le héros avec Motion,
désactivée si prefers-reduced-motion. Mesure l'impact sur le Lighthouse mobile.
```

**3D**
```
Affiche le modèle baobab.glb avec @react-three/fiber, chargé à la demande, rotation douce,
avec une image PNG de repli si WebGL est indisponible. Utilise parallax-threejs pour
vérifier le rendu et détecter les erreurs de shader.
```

**Contrôle**
```
Avec audit-as-a11y-eng et audit-as-perf-eng, audite la page d'accueil : contraste du texte
sur l'image, taille des cibles tactiles, poids des images, LCP sur mobile.
```

---

## 9. Pièges à éviter

1. **Texte illisible sur l'image** : dégradé de lisibilité et mesure du contraste obligatoires.
2. **Site lourd** : un héros de 2 Mo est inutilisable sur une connexion mobile faible. Respectez les budgets du §5.4.
3. **Trop de verre** : `backdrop-filter` ralentit les téléphones modestes. Limitez-le à 2 ou 3 panneaux.
4. **3D partout** : un seul objet 3D, chargé à la demande, avec repli.
5. **Faux documentaire** : une image générée présentée comme photo d'un lieu réel. Indiquez toujours l'origine.
6. **Clichés culturels** : visages, tenues et décors générés par IA. Évitez-les ou faites-les valider.
7. **Masques et objets rituels** : ne pas les utiliser comme décor sans validation.
8. **Polices incomplètes** : testez les caractères des langues nationales.
9. **Copier les références** : elles servent d'inspiration. Ne reproduisez ni leurs images, ni leurs textes, ni leur marque.
10. **Installer trop de plugins** : chaque plugin communautaire est du code à relire.

---

## 10. Plan réaliste sur 8 jours

| Jour | Rendu immersif |
|---|---|
| 27 oct. | `DESIGN.md`, typographie, composants (pilule, verre, bouton), 1 héros provisoire |
| 28-29 oct. | Héros de l'accueil niveau 1 ; images des 3 premières régions ; barre de chiffres |
| 30 oct. | Parallaxe de l'accueil (niveau 2) ; fiche de conte avec cartes en verre |
| 31 oct. | Objet 3D (baobab) **ou** décision d'y renoncer ; images restantes |
| 1er nov. | Gel ; audits accessibilité et performance ; tests mobile |
| 2-3 nov. | Corrections ; captures pour le rapport |

**Règle d'arbitrage :** si le jeudi 29 octobre le niveau 1 n'est pas en ligne, abandonnez la 3D. Un site rapide, lisible et bien raconté vaut mieux qu'une démo 3D qui plante sur un téléphone.
