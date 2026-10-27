// Projection plane simple utilisée par la carte de l'accueil (SVG) et par `scripts/build-geo.ts`.
// Emprise du Burkina Faso avec une petite marge.
export const BBOX = { w: -5.6, e: 2.5, s: 9.3, n: 15.2 }
export const K = Math.cos((12.3 * Math.PI) / 180) // correction de longitude à la latitude centrale
export const ECHELLE = 100 // unités SVG par degré de latitude

export const VIEWBOX = [
  0,
  0,
  Math.round((BBOX.e - BBOX.w) * K * ECHELLE),
  Math.round((BBOX.n - BBOX.s) * ECHELLE),
] as const

export const versViewBox = ([lon, lat]: readonly [number, number]) => ({
  x: (lon - BBOX.w) * K * ECHELLE,
  y: (BBOX.n - lat) * ECHELLE,
})
