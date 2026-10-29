// La maquette 3D : le Burkina en bloc de terre posé sur une bande de pays voisins.
// Partagé par le script `scripts/build-maquette.ts` (textures) et par la scène (géométrie) : tout doit concorder.

// Emprise des textures et du relief, en degrés.
export const DOMAINE = { w: -7.6, e: 4.4, s: 7.6, n: 16.9 }
// Emprise de la grille fine du bloc (le Burkina et un peu de marge).
export const EMPRISE_BLOC = { w: -5.6, e: 2.45, s: 9.35, n: 15.15 }

// Centre de la scène et échelle : une unité vaut 100 km. x vers l'est, y vers le haut, z vers le sud.
export const CENTRE: [number, number] = [-1.55, 12.25]
const KM_PAR_DEGRE = 111.32
const UNITE_KM = 100
export const K = Math.cos((CENTRE[1] * Math.PI) / 180)
const PAR_DEGRE = KM_PAR_DEGRE / UNITE_KM

// Le Burkina est plat : comme sur une maquette, on exagère le relief, davantage sur le bloc que chez les voisins.
export const EXAGERATION = { burkina: 32, voisins: 12 }
export const ALT_BASE = 250 // m, altitude posée à la hauteur de référence
export const SOCLE = 0.28 // épaisseur du bloc au-dessus des voisins, en unités (≈ 28 km « de maquette »)
const METRE = 1 / (UNITE_KM * 1000)

export const hauteurBloc = (alt: number) =>
  SOCLE + (alt - ALT_BASE) * METRE * EXAGERATION.burkina
export const hauteurVoisins = (alt: number) =>
  (alt - ALT_BASE) * METRE * EXAGERATION.voisins

export const versScene = (lon: number, lat: number): [number, number] => [
  (lon - CENTRE[0]) * K * PAR_DEGRE,
  -(lat - CENTRE[1]) * PAR_DEGRE,
]
export const versLonLat = (x: number, z: number): [number, number] => [
  CENTRE[0] + x / (K * PAR_DEGRE),
  CENTRE[1] - z / PAR_DEGRE,
]
// Coordonnées de texture : (0, 0) au sud-ouest, (1, 1) au nord-est.
export const versUv = (lon: number, lat: number): [number, number] => [
  (lon - DOMAINE.w) / (DOMAINE.e - DOMAINE.w),
  (lat - DOMAINE.s) / (DOMAINE.n - DOMAINE.s),
]

// Dimensions des fichiers produits : des pixels à peu près carrés sur le terrain.
const proportion = ((DOMAINE.e - DOMAINE.w) * K) / (DOMAINE.n - DOMAINE.s)
const hauteurPour = (largeur: number) => 2 * Math.round(largeur / proportion / 2)
export const TAILLES = {
  couleur: [4096, hauteurPour(4096)],
  couleurLegere: [2048, hauteurPour(2048)],
  normales: [2048, hauteurPour(2048)],
  masque: [2048, hauteurPour(2048)],
  regions: [2048, hauteurPour(2048)],
  relief: [1024, hauteurPour(1024)],
} as const

// Relief : altitude en mètres codée sur deux octets (rouge = poids fort, vert = poids faible), sans perte.
export const ALT_MIN = -100
export const decoderAltitude = (r: number, g: number) => r * 256 + g + ALT_MIN

// Masque du Burkina : distance signée au bord, en pixels du masque, centrée sur 128.
export const MASQUE_PAS = 8
