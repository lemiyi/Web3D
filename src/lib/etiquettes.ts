// Placement des noms posés sur la carte : on garde les noms par ordre d'importance et on écarte
// ceux qui en recouvriraient un autre, un repère de conte ou un nom de région.
export type Boite = {
  lon: number
  lat: number
  // taille en pixels
  l: number
  h: number
  // décalage du centre de la boîte par rapport au point, en pixels (y vers le bas)
  dx?: number
  dy?: number
}

// Une zone MapLibre de zoom z mesure 512 · 2^z pixels pour 360° de longitude.
const degresParPixel = (zoom: number) => 360 / (512 * 2 ** zoom)

const centre = (b: Boite, k: number) => ({
  x: b.lon / k + (b.dx ?? 0),
  y: (-b.lat / k) * 1.02 + (b.dy ?? 0), // 1,02 : étirement de Mercator vers 12° de latitude
})

export function seChevauchent(a: Boite, b: Boite, zoom: number): boolean {
  const k = degresParPixel(zoom)
  const [ca, cb] = [centre(a, k), centre(b, k)]
  return (
    Math.abs(ca.x - cb.x) < (a.l + b.l) / 2 && Math.abs(ca.y - cb.y) < (a.h + b.h) / 2
  )
}

export const largeurTexte = (texte: string, taillePx: number) =>
  Math.ceil(texte.length * taillePx * 0.6)

// Retourne les candidats retenus, dans l'ordre de priorité reçu.
export function placer<T extends Boite>(
  fixes: Boite[],
  candidats: T[],
  zoom: number,
): T[] {
  const posees: Boite[] = [...fixes]
  const gardes: T[] = []
  for (const c of candidats) {
    if (posees.some((p) => seChevauchent(c, p, zoom))) continue
    posees.push(c)
    gardes.push(c)
  }
  return gardes
}
