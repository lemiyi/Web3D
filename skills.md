# Skills Claude Code utiles pour le projet « Contes et Légendes du Burkina Faso »

Ce document recense les **skills** (consignes spécialisées que Claude Code charge pour une tâche précise) et les **plugins** qui peuvent aider l'équipe sur ce projet : carte interactive, lecteur de conte, animations, 3D, audio, accessibilité, rapport.

> **Mise à jour sur la 3D.** Une première recherche n'avait trouvé aucun skill Three.js ; une recherche plus large a trouvé le plugin communautaire **`parallax-threejs`**. Il sert à **déboguer et tester** une scène Three.js/GLSL (graphe de scène, console, état GL, tests de régression visuelle), pas à la **concevoir**. Il ajoute des serveurs MCP et un hook : à relire avant installation. La conception de la 3D repose sur la carte inclinée de MapLibre et sur des **bibliothèques** (§5). Voir [`DIRECTION_VISUELLE.md`](DIRECTION_VISUELLE.md) pour les plugins de design, d'images et d'animation (`frontend-design`, `Design`, `Website Design`, `image-generation`) et le plan complet du rendu immersif.

---

## 1. Comment utiliser un skill

- **Automatiquement** : Claude lit la description du skill et le charge quand votre demande correspond (« rends cette page plus belle » → `impeccable`).
- **À la demande** : tapez `/nom-du-skill` dans Claude Code, par exemple `/impeccable`, `/simplify`, `/code-review`.
- **Bon réflexe** : citez le skill dans votre demande (« avec impeccable, fais un audit de la page du lecteur de conte »), et dites précisément *quelle page ou quel composant* est visé.

---

## 2. Skill principal : `impeccable` (design d'interface)

**À quoi il sert :** concevoir, critiquer et améliorer une interface web (sites, pages d'accueil, tableaux de bord, composants, formulaires, états vides…). C'est le skill le plus utile pour la partie « expérience immersive » du sujet.

**Ce qu'il couvre :** hiérarchie visuelle, architecture de l'information, charge cognitive, accessibilité, performance, responsive, thèmes, typographie, espacements, alignement, couleurs, mouvement et micro-interactions, textes d'interface, états d'erreur, internationalisation, système de design réutilisable.

**Les verbes qu'il comprend** (à utiliser dans vos demandes) :

| Verbe | Usage dans notre projet |
|---|---|
| **shape** / **design** | Concevoir l'écran d'accueil, la fiche d'aperçu d'un conte, le lecteur |
| **critique** / **audit** | Faire relire une page avant la livraison (hiérarchie, lisibilité, accessibilité) |
| **polish** | Dernière passe de finition avant le 4 novembre |
| **clarify** | Simplifier les libellés (boutons, filtres, messages) |
| **distill** | Retirer le superflu d'un écran trop chargé (par exemple la carte sur mobile) |
| **harden** | Gérer les cas limites : audio qui ne charge pas, carte hors-ligne, JSON incomplet |
| **optimize** | Performance : images, chargement différé, poids de la page |
| **adapt** | Adapter l'interface au mobile, à la tablette, aux petits écrans |
| **animate** | Transitions de scènes, apparition du texte, micro-interactions |
| **colorize** | Palette de couleurs (ocre, latérite, indigo, vert de savane) |
| **extract** | Extraire des composants et des *design tokens* réutilisables |
| **bolder / quieter** | Rendre un design plus audacieux, ou plus discret |
| **live iteration** | Itérer directement dans le navigateur sur un élément de la page |

**Exemples de demandes prêtes à l'emploi :**

```
Avec impeccable, propose la charte graphique (palette, typographies, espacements)
du site de contes burkinabè : terre ocre, indigo, motifs inspirés du bogolan.
```

```
Avec impeccable, fais un audit de la page du lecteur de conte sur mobile :
lisibilité, taille des boutons, contraste, contrôle audio au pouce.
```

```
Avec impeccable, anime la transition entre deux scènes d'un conte
(fondu + léger parallaxe), en respectant prefers-reduced-motion.
```

**Rôle dans l'équipe :** surtout les rôles **B (lecteur de conte)** et **D (design et rapport)**.

---

## 3. Autres skills déjà disponibles (installés)

### 3.1 Design, visualisation et pages

| Skill | Utilité pour le projet |
|---|---|
| `artifact-design` | Règles de conception d'une page HTML publiée (thèmes clair/sombre, mise en page mobile, polices). Utile pour une **maquette ou une page de présentation** à partager à l'équipe. |
| `artifact-diagramming` | Dessiner un **schéma d'architecture** ou un parcours utilisateur lisible, pour le rapport. |
| `artifact-capabilities` | Pages publiées avec état partagé (sondage, liste de tâches de l'équipe, suivi des contes collectés). |
| `dataviz` | Graphiques et tableaux de bord propres (par exemple répartition des contes par langue ou par région pour le rapport). |

### 3.2 Qualité du code

| Skill | Utilité pour le projet |
|---|---|
| `code-review` | Relecture d'une branche avant fusion (`/code-review`). À lancer avant chaque *pull request*. |
| `simplify` | Nettoyer le code modifié : doublons, simplifications, efficacité. |
| `security-review` | Revue de sécurité avant mise en ligne (peu de surface ici : site statique, mais utile pour les dépendances et les liens externes). |
| `run` | Lancer l'application, la capturer et **vérifier qu'une modification fonctionne vraiment**. |
| `init` | Créer le fichier `CLAUDE.md` du projet : stack, commandes, conventions. **À faire dès le jour 1** pour que les 4 membres obtiennent des réponses cohérentes de Claude. |

### 3.3 Navigateur et vérification visuelle

| Skill | Utilité pour le projet |
|---|---|
| `built-in-browser` | Ouvrir le site en local dans le navigateur intégré, lire la page, tester les clics. |
| `chrome-browser` | Tester dans votre vrai Chrome (avec vos sessions) ; utile pour l'audio et les performances. |
| `computer-use` | Piloter une application de l'ordinateur (par exemple Audacity pour nettoyer un enregistrement), à utiliser avec prudence. |

### 3.4 Rapport, documents et recherche

| Skill | Utilité pour le projet |
|---|---|
| `deep-research` | Recherche multi-sources : histoire d'une légende, sources libres de droits, comparaison de bibliothèques. |
| `pdf` | Lire, fusionner ou extraire des PDF (sujet, documents de référence, assemblage du rapport final). |
| `docx` | Seulement si Odilon Simporé exige un fichier Word. Sinon, le rapport reste en **LaTeX**. |
| `pptx` | Diaporama de soutenance, si une présentation est demandée. |
| `docs` | Document partagé et commenté en équipe (cahier des charges vivant, compte rendu). |
| `xlsx` | Tableau de suivi : contes collectés, langues, conteurs, accords, état des enregistrements. |

### 3.5 Outils de travail

| Skill | Utilité pour le projet |
|---|---|
| `schedule` / `loop` | Rappels et tâches répétées (par exemple un contrôle quotidien du site déployé jusqu'au 4 novembre). |
| `update-config` | Régler Claude Code (autorisations, hooks), par exemple lancer le lint avant chaque commit. |
| `fewer-permission-prompts` | Réduire les demandes de confirmation répétitives. |
| `skill-creator` | **Créer votre propre skill** (voir §7) : conventions du projet, format des contes, règles de droits. |
| `claude-api` | Seulement si vous ajoutez une fonction IA (par exemple un assistant qui répond sur un conte). Hors périmètre du MVP. |

---

## 4. Skills et plugins disponibles à installer (catalogue)

Ces éléments sont **proposés dans le catalogue mais non activés**. Ils sont publiés par des auteurs de la communauté : **relisez leur contenu avant de les installer**.

| Plugin | Skills pertinents | Pourquoi pour nous |
|---|---|---|
| **audit-suite** (Orbit, communauté) | `web-animation-design`, `make-interfaces-feel-better`, `web-design-guidelines`, `emil-design-engineering`, `audit-as-a11y-eng` (accessibilité), `audit-as-perf-eng` (performance), `audit-as-frontend-eng`, `audit-as-ux-eng`, `full-audit` | Le plus pertinent : **animations web**, finitions d'interface, audits d'accessibilité et de performance. `vercel-react-best-practices` n'a d'intérêt que si vous choisissez React. |
| **Tweenkit** (communauté) | `animation-html` | Pages d'animation autonomes en un seul fichier. Utile pour une **démo d'introduction ou une animation d'illustration**, pas pour construire le site lui-même. Les deux autres skills (PPTX animé, vidéo) servent à la soutenance. |
| **MuAPI** (communauté) | `generate-image`, `edit-image`, `generate-video`, `image-to-video` | Génération d'images et de vidéos par un service externe. **Attention** : si vous l'utilisez pour les illustrations, il faut l'**indiquer dans le site et le rapport**, et vérifier les conditions du service. Ne pas envoyer de données personnelles ni d'enregistrements de conteurs. |

---

## 5. 3D et animations : bibliothèques à connaître (ce ne sont pas des skills)

Comme aucun skill 3D n'existe, voici comment couvrir ce besoin avec des **bibliothèques**, que Claude sait utiliser si vous lui donnez le contexte.

| Besoin | Outil | Remarque |
|---|---|---|
| Carte 3D/2D (relief, inclinaison) | **MapLibre GL JS** : `pitch`, `bearing`, `terrain` avec tuiles d'élévation | Déjà dans le cahier des charges. **Solution recommandée** : couvre la « 3D » du sujet pour un coût minimal. |
| Objet ou scène 3D (globe d'intro, élément décoratif) | **Three.js** | Bibliothèque 3D de référence sur le web. À réserver à un élément précis. |
| Three.js avec React | **@react-three/fiber** et **@react-three/drei** | Écrire la scène en composants React. |
| Three.js dans la carte | **Couche personnalisée MapLibre** (`custom layer`) | Pour placer un modèle 3D sur la carte. Plus complexe : bonus uniquement. |
| Animations d'interface | **Motion** (ex-Framer Motion), CSS | Transitions de scènes, apparition du texte. |
| Animations complexes en chronologie | **GSAP** | Séquences, défilement animé, parallaxe. |
| Animations vectorielles légères | **Lottie** | Animer une illustration exportée depuis un outil de design. |
| Audio | **Howler.js** | Lecture, pause, vitesse, position. |

**Comment demander à Claude de bien les utiliser :** collez dans votre demande la **version de la bibliothèque** et un lien vers sa documentation officielle, ou demandez-lui de lire la documentation avant d'écrire le code. Cela limite les erreurs d'API obsolètes.

```
Lis la documentation officielle de MapLibre GL JS sur le relief (terrain) puis
active la vue inclinée avec un bouton 2D/3D. Utilise la version installée dans package.json.
```

---

## 6. Chercher et installer d'autres skills

- **Dans le terminal Claude Code** : la commande `/plugin` permet de parcourir et d'installer des plugins depuis un catalogue.
- **Rechercher un skill précis** : demandez « cherche un skill pour Three.js » ou « cherche un skill pour l'accessibilité » ; Claude interroge le catalogue et vous propose une carte d'installation.
- **Avant d'installer** : lisez la description, l'auteur (officiel, partenaire ou communauté) et les outils/serveurs que le plugin ajoute. Un plugin peut contenir des *hooks* ou des serveurs MCP qui s'exécutent sur votre machine.
- **Principe de prudence** : n'installez que ce dont vous avez besoin sur ce projet.

---

## 7. Créer un skill propre au projet (recommandé)

Avec `skill-creator`, l'équipe peut écrire un skill « **contes-burkina** » qui force Claude à respecter les règles du projet. Contenu suggéré :

1. **Format d'un conte** : le schéma JSON (`id`, `titre`, `langue`, `region`, `coordonnees`, `scenes`, `choix`, `sources`, `consentement`).
2. **Règles de droits** : toujours demander la source, le conteur et son accord ; ne jamais recopier un texte protégé ; signaler les illustrations générées par IA.
3. **Conventions de code** : structure des dossiers, noms de branches, format des commits.
4. **Règles d'accessibilité** : transcription obligatoire, `prefers-reduced-motion`, aucune lecture audio automatique.
5. **Charte graphique** : palette, typographies, composants à réutiliser.

Demande type :

```
Avec skill-creator, crée un skill « contes-burkina » à partir du fichier
cahier_des_charges.tex : schéma JSON des contes, règles de droits, conventions de code.
```

Les 4 membres obtiendront alors des résultats homogènes, même s'ils travaillent chacun sur leur machine.

---

## 8. Quel skill pour quel rôle ?

| Rôle | Skills et outils prioritaires |
|---|---|
| **A. Carte et plateforme** | `init`, `run`, `code-review`, `simplify`, `built-in-browser`, MapLibre (doc officielle), `audit-as-perf-eng` |
| **B. Lecteur de conte** | `impeccable` (animate, polish, harden), `web-animation-design`, Howler.js, Motion, `audit-as-a11y-eng` |
| **C. Contenu et audio** | `xlsx` (suivi des contes), `deep-research` (sources), `skill-creator` (format des contes), `computer-use` (Audacity, avec prudence) |
| **D. Design et rapport** | `impeccable` (shape, colorize, critique), `artifact-design`, `artifact-diagramming`, `dataviz`, `pdf`, LaTeX pour le rapport |

---

## 9. Ordre d'utilisation conseillé (27 oct. → 4 nov.)

1. **Jour 1** : `init` (créer `CLAUDE.md`), `skill-creator` (skill « contes-burkina »), `impeccable` (charte graphique).
2. **Jours 2 à 5** : `impeccable` (shape, animate), `run` + `built-in-browser` pour vérifier chaque fonctionnalité, `code-review` avant chaque fusion.
3. **Jours 6 et 7** : `impeccable` (polish, harden, adapt), audits accessibilité et performance, `security-review`.
4. **Jour 8 (rapport)** : `dataviz` et `artifact-diagramming` pour les figures, `pdf` pour l'assemblage, relecture finale.

---

## 10. Limites à garder en tête

- Un skill **guide** Claude, il ne remplace ni les tests sur un vrai téléphone, ni la relecture humaine.
- Le code généré doit être **compris par celui qui le fusionne** : le rapport devra expliquer vos choix, et l'évaluateur peut poser des questions.
- Les contenus culturels (contes, traductions, enregistrements) doivent venir de **personnes qui connaissent ces récits**, pas être inventés ou « complétés » par une IA.
- Les outils d'IA ne sont pas fiables pour le mooré, le dioula ou le fulfuldé : faites valider toute traduction par un locuteur.

---

## 11. Design system des couleurs

La palette du projet (couleurs inspirées de la latérite, du Sahel, de la savane, de l'indigo et du drapeau, thèmes jour et « veillée », couleurs des langues sur la carte, contrastes vérifiés) est décrite dans [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). Les variables CSS sont dans [`tokens.css`](tokens.css) et un aperçu visuel dans [`palette.html`](palette.html).

À donner à `impeccable` dès le premier jour :

```
Avec impeccable, applique DESIGN_SYSTEM.md et tokens.css à tout le site.
Aucune couleur en dur : uniquement les variables CSS.
```

---

## 12. Direction visuelle « rendu immersif »

Le style visé (héros plein écran, navigation en pilule, panneaux en verre, objets 3D pilotés par le défilement) et les skills associés sont dans [`DIRECTION_VISUELLE.md`](DIRECTION_VISUELLE.md).
