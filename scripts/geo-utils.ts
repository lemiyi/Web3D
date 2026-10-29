// Outils communs aux scripts de génération des données cartographiques.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type Pt = [number, number]
export type Ring = Pt[]
export type Feature = {
  properties: Record<string, unknown>
  geometry: { type: string; coordinates: unknown }
}

export const racine = fileURLToPath(new URL('..', import.meta.url))
export const cache = join(racine, '.cache/geo')
mkdirSync(cache, { recursive: true })

export async function telecharger(url: string, nom: string): Promise<Buffer> {
  const chemin = join(cache, nom)
  if (existsSync(chemin)) return readFileSync(chemin)
  const reponse = await fetch(url)
  if (!reponse.ok) throw new Error(`${url} → ${reponse.status}`)
  const donnees = Buffer.from(await reponse.arrayBuffer())
  writeFileSync(chemin, donnees)
  return donnees
}

// Les serveurs Overpass publics refusent souvent (502, file pleine) : on réessaie, d'un miroir à l'autre.
const MIROIRS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
export async function overpass(requete: string, nom: string): Promise<unknown> {
  const chemin = join(cache, nom)
  if (existsSync(chemin)) return JSON.parse(readFileSync(chemin, 'utf8'))
  let derniere = ''
  for (let essai = 0; essai < 9; essai++) {
    const url = MIROIRS[essai % MIROIRS.length]
    try {
      const reponse = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': 'contes-burkina-projet-etudiant/1.0',
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(requete)}`,
        signal: AbortSignal.timeout(240_000),
      })
      const texte = await reponse.text()
      if (reponse.ok && texte.trimStart().startsWith('{')) {
        writeFileSync(chemin, texte)
        return JSON.parse(texte)
      }
      derniere = `${url} → ${reponse.status}`
    } catch (e) {
      derniere = `${url} → ${(e as Error).message}`
    }
    console.warn(`  Overpass : ${derniere}, nouvel essai…`)
    await new Promise((r) => setTimeout(r, 4000 * (essai + 1)))
  }
  throw new Error(`Overpass indisponible (${derniere})`)
}

// Douglas-Peucker
export function simplifier(points: Pt[], tolerance: number): Pt[] {
  if (points.length < 3) return points
  const [ax, ay] = points[0]
  const [bx, by] = points[points.length - 1]
  const dx = bx - ax
  const dy = by - ay
  const longueur = Math.hypot(dx, dy) || 1
  let max = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d =
      Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / longueur
    if (d > max) {
      max = d
      index = i
    }
  }
  if (max <= tolerance) return [points[0], points[points.length - 1]]
  return [
    ...simplifier(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplifier(points.slice(index), tolerance),
  ]
}

// Un anneau est fermé (premier point = dernier) : on le coupe au point le plus éloigné du départ.
export function simplifierAnneau(anneau: Ring, tolerance: number): Ring {
  if (anneau.length < 5) return anneau
  const [ox, oy] = anneau[0]
  let index = 1
  let max = 0
  for (let i = 1; i < anneau.length - 1; i++) {
    const d = Math.hypot(anneau[i][0] - ox, anneau[i][1] - oy)
    if (d > max) {
      max = d
      index = i
    }
  }
  return [
    ...simplifier(anneau.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplifier(anneau.slice(index), tolerance),
  ]
}

export const arrondi = (n: number, d = 1) => Number(n.toFixed(d))
export const arrondiLonLat = (r: Pt[], d = 4): Pt[] =>
  r.map(([x, y]) => [arrondi(x, d), arrondi(y, d)])

export const anneaux = (f: Feature): Ring[][] =>
  f.geometry.type === 'Polygon'
    ? [f.geometry.coordinates as Ring[]]
    : (f.geometry.coordinates as Ring[][])

export const lignes = (f: Feature): Pt[][] =>
  f.geometry.type === 'LineString'
    ? [f.geometry.coordinates as Pt[]]
    : (f.geometry.coordinates as Pt[][])

export function pointDansAnneau([x, y]: Pt, anneau: Ring): boolean {
  let dedans = false
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [xi, yi] = anneau[i]
    const [xj, yj] = anneau[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans
  }
  return dedans
}

// polygones = liste de polygones, chacun = [contour, trous…]
export const pointDansPolygones = (p: Pt, polygones: Ring[][]) =>
  polygones.some(
    ([contour, ...trous]) =>
      pointDansAnneau(p, contour) && !trous.some((t) => pointDansAnneau(p, t)),
  )

// Garde les tronçons de la ligne dont les points vérifient `garder` (une ligne peut sortir puis rentrer).
export function decouper(ligne: Pt[], garder: (p: Pt) => boolean): Pt[][] {
  const troncons: Pt[][] = []
  let courant: Pt[] = []
  for (const p of ligne) {
    if (garder(p)) courant.push(p)
    else {
      if (courant.length > 1) troncons.push(courant)
      courant = []
    }
  }
  if (courant.length > 1) troncons.push(courant)
  return troncons
}

// Surface approximative d'un anneau en km² (formule des lacets, à l'échelle locale).
export function aireKm2(anneau: Ring): number {
  const lat0 = (anneau[0][1] * Math.PI) / 180
  let s = 0
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    s += anneau[j][0] * anneau[i][1] - anneau[i][0] * anneau[j][1]
  }
  return Math.abs(s / 2) * 111.32 * 110.57 * Math.cos(lat0)
}

export const featureCollection = (features: unknown[]) =>
  JSON.stringify({ type: 'FeatureCollection', features })

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function ecrire(chemin: string, contenu: string) {
  mkdirSync(join(chemin, '..'), { recursive: true })
  writeFileSync(chemin, contenu)
  console.log(
    `  ${chemin.replace(racine, '')} · ${(contenu.length / 1024).toFixed(0)} Ko`,
  )
}
