// Génère les données cartographiques statiques (`npm run build:geo`, à relancer seulement si les sources changent).
//   - limites du pays et des 13 régions : geoBoundaries / World Bank (CC BY 4.0)
//   - altitudes : tuiles Terrarium (AWS Open Data, issues de SRTM et d'autres modèles)
//   - rivières : Natural Earth (domaine public)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contours } from 'd3-contour'
import { PNG } from 'pngjs'
import { BBOX, ECHELLE, K, VIEWBOX, versViewBox } from '../src/lib/projection.ts'

type Pt = [number, number]
type Ring = Pt[]
type Feature = {
  properties: Record<string, unknown>
  geometry: { type: string; coordinates: unknown }
}

const racine = fileURLToPath(new URL('..', import.meta.url))
const cache = join(racine, '.cache/geo')
const sortie = join(racine, 'src/content/geo')
mkdirSync(cache, { recursive: true })
mkdirSync(sortie, { recursive: true })

const projeter = (p: Pt): Pt => {
  const { x, y } = versViewBox(p)
  return [x, y]
}

async function telecharger(url: string, nom: string): Promise<Buffer> {
  const chemin = join(cache, nom)
  if (existsSync(chemin)) return readFileSync(chemin)
  const reponse = await fetch(url)
  if (!reponse.ok) throw new Error(`${url} → ${reponse.status}`)
  const donnees = Buffer.from(await reponse.arrayBuffer())
  writeFileSync(chemin, donnees)
  return donnees
}

// Douglas-Peucker
function simplifier(points: Pt[], tolerance: number): Pt[] {
  if (points.length < 3) return points
  const [ax, ay] = points[0]
  const [bx, by] = points[points.length - 1]
  const dx = bx - ax
  const dy = by - ay
  const longueur = Math.hypot(dx, dy) || 1
  let max = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / longueur
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
function simplifierAnneau(anneau: Ring, tolerance: number): Ring {
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

const arrondi = (n: number, d = 1) => Number(n.toFixed(d))
const cheminAnneau = (anneau: Ring, tolerance: number) => {
  const pts = simplifierAnneau(anneau, tolerance)
  if (pts.length < 4) return ''
  return `M${pts.map(([x, y]) => `${arrondi(x)} ${arrondi(y)}`).join('L')}Z`
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// ---------- limites ----------
const base = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BFA'
const adm0 = JSON.parse(
  (await telecharger(`${base}/ADM0/geoBoundaries-BFA-ADM0_simplified.geojson`, 'adm0.geojson')).toString(),
) as { features: Feature[] }
const adm1 = JSON.parse(
  (await telecharger(`${base}/ADM1/geoBoundaries-BFA-ADM1_simplified.geojson`, 'adm1.geojson')).toString(),
) as { features: Feature[] }

const anneaux = (f: Feature): Ring[][] =>
  f.geometry.type === 'Polygon'
    ? [f.geometry.coordinates as Ring[]]
    : (f.geometry.coordinates as Ring[][])

const arrondiLonLat = (r: Ring): Ring => r.map(([x, y]) => [arrondi(x, 4), arrondi(y, 4)])
const simplifierLonLat = (r: Ring) => arrondiLonLat(simplifierAnneau(r, 0.004))

const featureCollection = (features: unknown[]) =>
  JSON.stringify({ type: 'FeatureCollection', features })

const paysGeo = adm0.features.map((f) => ({
  type: 'Feature',
  properties: { id: 'burkina-faso' },
  geometry: { type: 'MultiPolygon', coordinates: anneaux(f).map((p) => p.map(simplifierLonLat)) },
}))
writeFileSync(join(sortie, 'pays.geo.json'), featureCollection(paysGeo))

const regionsGeo = adm1.features.map((f) => ({
  type: 'Feature',
  properties: { id: slug(String(f.properties.shapeName)), nom: f.properties.shapeName },
  geometry: { type: 'MultiPolygon', coordinates: anneaux(f).map((p) => p.map(simplifierLonLat)) },
}))
writeFileSync(join(sortie, 'regions.geo.json'), featureCollection(regionsGeo))

// ---------- rivières ----------
const NOMS_RIVIERES = new Set(['Mouhoun', 'Nakanbé', 'Komoé', 'Niger', 'Oti', 'Ouémé'])
const rivieres = JSON.parse(
  (
    await telecharger(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson',
      'rivieres.geo.json',
    )
  ).toString(),
) as { features: Feature[] }

const dansEmprise = ([x, y]: Pt) => x > BBOX.w && x < BBOX.e && y > BBOX.s && y < BBOX.n
const lignesRivieres: { nom: string; lignes: Pt[][] }[] = []
for (const f of rivieres.features) {
  const nom = String(f.properties.name)
  if (!NOMS_RIVIERES.has(nom)) continue
  const lignes = (f.geometry.coordinates as Pt[][]).map((l) => l.filter(dansEmprise)).filter((l) => l.length > 1)
  if (lignes.length) lignesRivieres.push({ nom, lignes })
}
writeFileSync(
  join(sortie, 'rivieres.geo.json'),
  featureCollection(
    lignesRivieres.map(({ nom, lignes }) => ({
      type: 'Feature',
      properties: { nom },
      geometry: {
        type: 'MultiLineString',
        coordinates: lignes.map((l) => arrondiLonLat(simplifier(l, 0.004))),
      },
    })),
  ),
)

// ---------- relief ----------
const Z = 7
const N = 2 ** Z
const tuileX = (lon: number) => Math.floor(((lon + 180) / 360) * N)
const tuileY = (lat: number) => {
  const r = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N)
}
const x0 = tuileX(BBOX.w)
const x1 = tuileX(BBOX.e)
const y0 = tuileY(BBOX.n)
const y1 = tuileY(BBOX.s)
const T = 256
const largeur = (x1 - x0 + 1) * T
const hauteur = (y1 - y0 + 1) * T
const altitudes = new Float32Array(largeur * hauteur)

for (let ty = y0; ty <= y1; ty++) {
  for (let tx = x0; tx <= x1; tx++) {
    const png = PNG.sync.read(
      await telecharger(
        `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`,
        `terrarium-${Z}-${tx}-${ty}.png`,
      ),
    )
    for (let py = 0; py < T; py++) {
      for (let px = 0; px < T; px++) {
        const i = (py * T + px) * 4
        const alt = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768
        altitudes[((ty - y0) * T + py) * largeur + (tx - x0) * T + px] = alt
      }
    }
  }
}

// Réduction par 2 pour alléger les courbes.
const R = 2
const gl = Math.floor(largeur / R)
const gh = Math.floor(hauteur / R)
const grille = new Float64Array(gl * gh)
for (let y = 0; y < gh; y++) {
  for (let x = 0; x < gl; x++) {
    let somme = 0
    for (let dy = 0; dy < R; dy++)
      for (let dx = 0; dx < R; dx++) somme += altitudes[(y * R + dy) * largeur + x * R + dx]
    grille[y * gl + x] = somme / (R * R)
  }
}

// pixel de la grille -> [lon, lat] (projection Web Mercator inverse)
const pixelVersLonLat = (gx: number, gy: number): Pt => {
  const mx = (x0 * T + gx * R) / (N * T)
  const my = (y0 * T + gy * R) / (N * T)
  const lon = mx * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * my))) * 180) / Math.PI
  return [lon, lat]
}

const SEUILS = [200, 250, 300, 350, 450]
const generateur = contours().size([gl, gh]).thresholds(SEUILS)
const bandes = generateur(Array.from(grille)).map((c) => ({
  min: c.value,
  d: c.coordinates
    .map((polygone) =>
      polygone
        .map((anneau) => cheminAnneau((anneau as Ring).map(([gx, gy]) => projeter(pixelVersLonLat(gx, gy))), 0.9))
        .join(''),
    )
    .join(''),
}))

const cheminsPays = paysGeo.flatMap((f) =>
  (f.geometry.coordinates as Ring[][]).map((p) =>
    p.map((a) => cheminAnneau(a.map(projeter), 0.15)).join(''),
  ),
)
const cheminsRegions = regionsGeo.map((f) => {
  const pts = (f.geometry.coordinates as Ring[][]).flatMap((p) => p.flatMap((a) => a.map(projeter)))
  const xs = pts.map(([x]) => x)
  const ys = pts.map(([, y]) => y)
  return {
    id: f.properties.id as string,
    nom: f.properties.nom as string,
    // [x, y, largeur, hauteur] dans le repère du viewBox
    bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].map(
      (v) => arrondi(v),
    ),
    d: (f.geometry.coordinates as Ring[][])
      .map((p) => p.map((a) => cheminAnneau(a.map(projeter), 0.15)).join(''))
      .join(''),
  }
})
const cheminsRivieres = lignesRivieres.map(({ nom, lignes }) => ({
  nom,
  d: lignes
    .map((l) => {
      const pts = simplifier(l.map(projeter), 0.3)
      return pts.length > 1 ? `M${pts.map(([x, y]) => `${arrondi(x)} ${arrondi(y)}`).join('L')}` : ''
    })
    .join(''),
}))

writeFileSync(
  join(sortie, 'hero-map.json'),
  JSON.stringify({
    viewBox: VIEWBOX,
    projection: { ouest: BBOX.w, nord: BBOX.n, k: K, echelle: ECHELLE },
    pays: cheminsPays.join(''),
    regions: cheminsRegions,
    rivieres: cheminsRivieres,
    seuils: SEUILS,
    bandes,
  }),
)

console.log(`✓ géodonnées générées dans src/content/geo (viewBox ${VIEWBOX.join(' ')})`)
