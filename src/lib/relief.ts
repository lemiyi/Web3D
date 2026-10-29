// Échelle d'altitude commune : accueil (SVG), carte (MapLibre) et script scripts/build-geo.ts.
// Les couleurs sont les variables --relief-0 à --relief-5 (index.css).
export const SEUILS = [200, 250, 300, 350, 450] as const
export const NB_BANDES = SEUILS.length + 1

// Tuiles d'altitude (Terrarium, AWS Open Data) : affichées par la carte et lues pour l'altitude sous le curseur.
export const URL_TERRARIUM =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
