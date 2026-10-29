// Génère la maquette 3D de la carte (`npm run build:maquette`, à relancer seulement si les sources changent).
//   - couleurs : mosaïque EOxCloudless 2024 (EOX, Sentinel-2, CC BY-NC-SA 4.0), retravaillée comme une peinture
//   - relief : tuiles Terrarium (AWS Open Data, d'après SRTM)
//   - arbres : ESA WorldCover 2021 (CC BY 4.0), vues réduites mises en cache par `npm run build:vegetation`
// Sorties dans public/maquette : couleur.webp, couleur-legere.webp, normales.webp, relief.webp,
// burkina.png (bord du pays), regions.png (numéro de région), maquette.json (régions, arbres).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas'
import { PNG } from 'pngjs'
import {
  ALT_MIN,
  DOMAINE,
  EMPRISE_BLOC,
  EXAGERATION,
  K,
  MASQUE_PAS,
  TAILLES,
} from '../src/lib/maquette/domaine.ts'
import {
  anneaux,
  cache,
  lignes,
  pointDansPolygones,
  racine,
  telecharger,
  type Feature,
  type Pt,
  type Ring,
} from './geo-utils.ts'

const sortie = join(racine, 'public/maquette')
mkdirSync(sortie, { recursive: true })
const lireJson = (chemin: string) =>
  JSON.parse(readFileSync(join(racine, chemin), 'utf8'))

// ---------- palette (token.css) ----------
const tokens = readFileSync(join(racine, 'token.css'), 'utf8')
type Rgb = [number, number, number]
const token = (nom: string): Rgb => {
  const h = new RegExp(`--${nom}:\\s*#([0-9a-f]{6})`, 'i').exec(tokens)?.[1]
  if (!h) throw new Error(`couleur --${nom} absente de token.css`)
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}
const melange = (a: Rgb, b: Rgb, t: number): Rgb =>
  a.map((v, i) => Math.round(v * (1 - t) + b[i] * t)) as Rgb
const css = ([r, g, b]: Rgb, a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`

const PAPIER = token('terre-100')
const EAU = melange(token('indigo-700'), token('savane-900'), 0.45)
const RIVIERE = melange(EAU, token('indigo-500'), 0.35)
const TRAIT = token('terre-600')
const CLAIR = token('terre-50')

// ---------- géographie ----------
const W = DOMAINE.w
const E = DOMAINE.e
const S = DOMAINE.s
const N = DOMAINE.n
const pays = (lireJson('src/content/geo/pays.geo.json').features as Feature[]).flatMap(
  anneaux,
)
const regions = lireJson('src/content/geo/regions.geo.json').features as Feature[]
const dansBurkina = (p: Pt) => pointDansPolygones(p, pays)

// pixel (centre) → lon/lat, pour une image de largeur × hauteur couvrant le domaine (ligne 0 au nord)
const lonDe = (x: number, largeur: number) => W + ((x + 0.5) / largeur) * (E - W)
const latDe = (y: number, hauteur: number) => N - ((y + 0.5) / hauteur) * (N - S)

// Tirage pseudo-aléatoire reproductible.
function hasard(graine: number) {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function parLots<T>(elements: T[], n: number, f: (e: T) => Promise<void>) {
  let i = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < elements.length) await f(elements[i++])
    }),
  )
}

async function telechargerSur(url: string, nom: string) {
  for (let essai = 0; ; essai++) {
    try {
      return await telecharger(url, nom)
    } catch (e) {
      if (essai >= 3) throw e
      await new Promise((r) => setTimeout(r, 2000 * (essai + 1)))
    }
  }
}

// ---------- tuiles Web Mercator ----------
const tuileX = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z
const tuileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z
}

type Mosaique = { z: number; x0: number; y0: number; largeur: number; hauteur: number }

function emprise(z: number): Mosaique & { liste: [number, number][] } {
  const x0 = Math.floor(tuileX(W, z))
  const x1 = Math.floor(tuileX(E, z))
  const y0 = Math.floor(tuileY(N, z))
  const y1 = Math.floor(tuileY(S, z))
  const liste: [number, number][] = []
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) liste.push([x, y])
  return { z, x0, y0, largeur: (x1 - x0 + 1) * 256, hauteur: (y1 - y0 + 1) * 256, liste }
}

// Échantillonne une mosaïque (un ou plusieurs canaux) en lon/lat, avec interpolation bilinéaire.
function lecteur(m: Mosaique, valeurs: ArrayLike<number>, canaux: number) {
  return (lon: number, lat: number, c = 0) =>
    bilineaire(
      valeurs,
      m.largeur,
      m.hauteur,
      canaux,
      (tuileX(lon, m.z) - m.x0) * 256 - 0.5,
      (tuileY(lat, m.z) - m.y0) * 256 - 0.5,
      c,
    )
}

function bilineaire(
  v: ArrayLike<number>,
  largeur: number,
  hauteur: number,
  canaux: number,
  x: number,
  y: number,
  c: number,
) {
  const x0 = Math.max(0, Math.min(largeur - 2, Math.floor(x)))
  const y0 = Math.max(0, Math.min(hauteur - 2, Math.floor(y)))
  const fx = Math.max(0, Math.min(1, x - x0))
  const fy = Math.max(0, Math.min(1, y - y0))
  const i = (yy: number, xx: number) => v[(yy * largeur + xx) * canaux + c]
  return (
    (i(y0, x0) * (1 - fx) + i(y0, x0 + 1) * fx) * (1 - fy) +
    (i(y0 + 1, x0) * (1 - fx) + i(y0 + 1, x0 + 1) * fx) * fy
  )
}

async function mosaiqueAltitudes(z: number) {
  const m = emprise(z)
  const alt = new Float32Array(m.largeur * m.hauteur)
  await parLots(m.liste, 8, async ([x, y]) => {
    const png = PNG.sync.read(
      await telechargerSur(
        `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
        `terrarium-${z}-${x}-${y}.png`,
      ),
    )
    const ox = (x - m.x0) * 256
    const oy = (y - m.y0) * 256
    for (let j = 0; j < 256; j++)
      for (let i = 0; i < 256; i++) {
        const k = (j * 256 + i) * 4
        const a = png.data[k] * 256 + png.data[k + 1] + png.data[k + 2] / 256 - 32768
        alt[(oy + j) * m.largeur + ox + i] = a
      }
  })
  return { m, alt }
}

async function mosaiqueSatellite(z: number) {
  const m = emprise(z)
  const toile = createCanvas(m.largeur, m.hauteur)
  const ctx = toile.getContext('2d')
  let faites = 0
  await parLots(m.liste, 6, async ([x, y]) => {
    const image = await loadImage(
      await telechargerSur(
        `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/${z}/${y}/${x}.jpg`,
        `eox-${z}-${x}-${y}.jpg`,
      ),
    )
    ctx.drawImage(image, (x - m.x0) * 256, (y - m.y0) * 256)
    if (++faites % 50 === 0) console.log(`  ${faites}/${m.liste.length} tuiles`)
  })
  return { m, rgba: ctx.getImageData(0, 0, m.largeur, m.hauteur).data }
}

// ---------- couverture du sol (ESA WorldCover, vues réduites à ≈ 150 m mises en cache) ----------
const CLASSES = [10, 20, 30, 40, 50, 60, 80, 90] // arbres, arbustes, herbes, cultures, bâti, sol nu, eau, humide
const RANG_CLASSE = new Int8Array(256).fill(-1)
CLASSES.forEach((c, k) => (RANG_CLASSE[c] = k))

// Part de chaque classe dans une grille régulière couvrant le bloc, cellule par cellule.
function couvertureSol(pas: number) {
  const largeur = Math.ceil((EMPRISE_BLOC.e - EMPRISE_BLOC.w) / pas)
  const hauteur = Math.ceil((EMPRISE_BLOC.n - EMPRISE_BLOC.s) / pas)
  const parts = CLASSES.map(() => new Float32Array(largeur * hauteur))
  const total = new Float32Array(largeur * hauteur)
  for (const lat0 of [9, 12, 15])
    for (const lon0 of [-6, -3, 0]) {
      const nom = `N${String(lat0).padStart(2, '0')}${lon0 < 0 ? 'W' : 'E'}${String(Math.abs(lon0)).padStart(3, '0')}`
      const fichier = join(cache, `wc-4-${nom}.bin`)
      if (!existsSync(fichier)) {
        console.warn(`  ${fichier} absent : lancez d'abord npm run build:vegetation`)
        continue
      }
      const px = new Uint8Array(readFileSync(fichier))
      const cote = Math.round(Math.sqrt(px.length))
      for (let y = 0; y < cote; y++) {
        const lat = lat0 + 3 - ((y + 0.5) * 3) / cote
        const gy = Math.floor((EMPRISE_BLOC.n - lat) / pas)
        if (gy < 0 || gy >= hauteur) continue
        for (let x = 0; x < cote; x++) {
          const lon = lon0 + ((x + 0.5) * 3) / cote
          const gx = Math.floor((lon - EMPRISE_BLOC.w) / pas)
          if (gx < 0 || gx >= largeur) continue
          const k = gy * largeur + gx
          total[k]++
          const rang = RANG_CLASSE[px[y * cote + x]]
          if (rang >= 0) parts[rang][k]++
        }
      }
    }
  for (const p of parts) for (let k = 0; k < p.length; k++) p[k] /= total[k] || 1
  return { pas, largeur, hauteur, parts }
}

// Flou en boîte séparable de rayon r.
function flou(v: Float32Array, largeur: number, hauteur: number, r: number) {
  const h = new Float32Array(v.length)
  const sortieFlou = new Float32Array(v.length)
  for (let y = 0; y < hauteur; y++) {
    let s = 0
    let compte = 0
    for (let x = -r; x < largeur + r; x++) {
      if (x + r < largeur) {
        s += v[y * largeur + x + r]
        compte++
      }
      if (x - r - 1 >= 0) {
        s -= v[y * largeur + x - r - 1]
        compte--
      }
      if (x >= 0 && x < largeur) h[y * largeur + x] = s / compte
    }
  }
  for (let x = 0; x < largeur; x++) {
    let s = 0
    let compte = 0
    for (let y = -r; y < hauteur + r; y++) {
      if (y + r < hauteur) {
        s += h[(y + r) * largeur + x]
        compte++
      }
      if (y - r - 1 >= 0) {
        s -= h[(y - r - 1) * largeur + x]
        compte--
      }
      if (y >= 0 && y < hauteur) sortieFlou[y * largeur + x] = s / compte
    }
  }
  return sortieFlou
}

// ---------- distance au bord (transformée de distance exacte, Felzenszwalb et Huttenlocher) ----------
const INFINI = 1e20
function distance1d(
  f: Float64Array,
  n: number,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
) {
  let k = 0
  v[0] = 0
  z[0] = -INFINI
  z[1] = INFINI
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INFINI
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) ** 2 + f[v[k]]
  }
}

// Distance de chaque pixel au pixel « cible » le plus proche.
function distances(cible: Uint8Array, largeur: number, hauteur: number) {
  const g = new Float64Array(largeur * hauteur)
  for (let i = 0; i < g.length; i++) g[i] = cible[i] ? 0 : INFINI
  const n = Math.max(largeur, hauteur)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  for (let x = 0; x < largeur; x++) {
    for (let y = 0; y < hauteur; y++) f[y] = g[y * largeur + x]
    distance1d(f, hauteur, d, v, z)
    for (let y = 0; y < hauteur; y++) g[y * largeur + x] = d[y]
  }
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) f[x] = g[y * largeur + x]
    distance1d(f, largeur, d, v, z)
    for (let x = 0; x < largeur; x++) g[y * largeur + x] = d[x]
  }
  return Float32Array.from(g, Math.sqrt)
}

// ---------- dessin vectoriel sur une toile couvrant le domaine ----------
const versPixel =
  (largeur: number, hauteur: number) =>
  ([lon, lat]: Pt) =>
    [((lon - W) / (E - W)) * largeur, ((N - lat) / (N - S)) * hauteur] as const

function tracer(ctx: SKRSContext2D, ligne: Pt[], px: ReturnType<typeof versPixel>) {
  ligne.forEach((p, i) => {
    const [x, y] = px(p)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
}

function remplirPolygones(
  ctx: SKRSContext2D,
  polygones: Ring[][],
  px: ReturnType<typeof versPixel>,
) {
  ctx.beginPath()
  for (const polygone of polygones)
    for (const anneau of polygone) {
      tracer(ctx, anneau, px)
      ctx.closePath()
    }
  ctx.fill('evenodd')
}

function ecrireGris(nom: string, valeurs: Uint8Array, largeur: number, hauteur: number) {
  const png = new PNG({ width: largeur, height: hauteur, colorType: 0 })
  for (let i = 0; i < valeurs.length; i++) {
    png.data[i * 4] = png.data[i * 4 + 1] = png.data[i * 4 + 2] = valeurs[i]
    png.data[i * 4 + 3] = 255
  }
  const donnees = PNG.sync.write(png, { colorType: 0, inputHasAlpha: true })
  writeFileSync(join(sortie, nom), donnees)
  console.log(`  public/maquette/${nom} · ${(donnees.length / 1024).toFixed(0)} Ko`)
}

function ecrireImage(
  nom: string,
  rgba: Uint8ClampedArray,
  largeur: number,
  hauteur: number,
  qualite: number,
) {
  const toile = createCanvas(largeur, hauteur)
  const ctx = toile.getContext('2d')
  const image = ctx.createImageData(largeur, hauteur)
  image.data.set(rgba)
  ctx.putImageData(image, 0, 0)
  const donnees = toile.encodeSync('webp', qualite)
  writeFileSync(join(sortie, nom), donnees)
  console.log(`  public/maquette/${nom} · ${(donnees.length / 1024).toFixed(0)} Ko`)
  return toile
}

// =====================================================================
console.log('Relief : tuiles Terrarium…')
const dem = await mosaiqueAltitudes(9)
const altitude = lecteur(dem.m, dem.alt, 1)

// --- masque du Burkina : part de chaque pixel couverte par le pays, puis distance signée au bord ---
console.log('Masque du Burkina…')
function couvertureDuPays(largeur: number, hauteur: number) {
  const toile = createCanvas(largeur, hauteur)
  const ctx = toile.getContext('2d')
  ctx.fillStyle = '#fff'
  remplirPolygones(ctx, pays, versPixel(largeur, hauteur))
  const d = ctx.getImageData(0, 0, largeur, hauteur).data
  return Float32Array.from({ length: largeur * hauteur }, (_, i) => d[i * 4 + 3] / 255)
}
const [MW, MH] = TAILLES.masque
const couverture = couvertureDuPays(MW, MH)
{
  const dedans = new Uint8Array(MW * MH)
  const dehors = new Uint8Array(MW * MH)
  for (let i = 0; i < dedans.length; i++) {
    dedans[i] = couverture[i] >= 0.5 ? 1 : 0
    dehors[i] = 1 - dedans[i]
  }
  const versDehors = distances(dehors, MW, MH)
  const versDedans = distances(dedans, MW, MH)
  const masque = new Uint8Array(MW * MH)
  for (let i = 0; i < masque.length; i++) {
    const c = couverture[i]
    const sd =
      c > 0 && c < 1 ? c - 0.5 : dedans[i] ? versDehors[i] - 0.5 : 0.5 - versDedans[i]
    masque[i] = Math.max(0, Math.min(255, Math.round(128 + sd * MASQUE_PAS)))
  }
  ecrireGris('burkina.png', masque, MW, MH)
}
const couvertureEn = (lon: number, lat: number) =>
  bilineaire(
    couverture,
    MW,
    MH,
    1,
    ((lon - W) / (E - W)) * MW - 0.5,
    ((N - lat) / (N - S)) * MH - 0.5,
    0,
  )

// --- numéro de région (1 à 13, 0 hors du pays), lu tel quel par la scène ---
console.log('Régions…')
{
  const [RW, RH] = TAILLES.regions
  const boites = regions.map((f) => {
    const polygones = anneaux(f)
    const pts = polygones.flat(2)
    return {
      polygones,
      w: Math.min(...pts.map((p) => p[0])),
      e: Math.max(...pts.map((p) => p[0])),
      s: Math.min(...pts.map((p) => p[1])),
      n: Math.max(...pts.map((p) => p[1])),
    }
  })
  const valeurs = new Uint8Array(RW * RH)
  for (let y = 0; y < RH; y++) {
    const lat = latDe(y, RH)
    if (lat < EMPRISE_BLOC.s || lat > EMPRISE_BLOC.n) continue
    for (let x = 0; x < RW; x++) {
      const lon = lonDe(x, RW)
      if (lon < EMPRISE_BLOC.w || lon > EMPRISE_BLOC.e) continue
      const k = boites.findIndex(
        (b) =>
          lon >= b.w &&
          lon <= b.e &&
          lat >= b.s &&
          lat <= b.n &&
          pointDansPolygones([lon, lat], b.polygones),
      )
      if (k >= 0) valeurs[y * RW + x] = (k + 1) * 16
    }
  }
  ecrireGris('regions.png', valeurs, RW, RH)
}

// --- relief (1024) : altitude au mètre, sans perte ---
console.log('Relief de la maquette…')
const [AW, AH] = TAILLES.relief
const alt = new Float32Array(AW * AH)
{
  const brut = new Float32Array(AW * AH)
  for (let y = 0; y < AH; y++)
    for (let x = 0; x < AW; x++)
      brut[y * AW + x] = Math.max(0, altitude(lonDe(x, AW), latDe(y, AH)))
  // Lissé (binomial 5 × 5) : le bruit du modèle n'a pas sa place dans la géométrie, l'ombrage vient des normales.
  // Le fichier se compresse aussi bien mieux.
  const POIDS = [1, 4, 6, 4, 1]
  for (let y = 0; y < AH; y++)
    for (let x = 0; x < AW; x++) {
      let s = 0
      let p = 0
      for (let j = -2; j <= 2; j++)
        for (let i = -2; i <= 2; i++) {
          const xx = Math.min(AW - 1, Math.max(0, x + i))
          const yy = Math.min(AH - 1, Math.max(0, y + j))
          const w = POIDS[i + 2] * POIDS[j + 2]
          s += brut[yy * AW + xx] * w
          p += w
        }
      alt[y * AW + x] = s / p
    }
  const rgba = new Uint8ClampedArray(AW * AH * 4)
  for (let y = 0; y < AH; y++)
    for (let x = 0; x < AW; x++) {
      const i = y * AW + x
      const v = Math.max(0, Math.min(65535, Math.round(alt[i] - ALT_MIN)))
      rgba[i * 4] = v >> 8
      rgba[i * 4 + 1] = v & 255
      rgba[i * 4 + 3] = 255
    }
  const toile = createCanvas(AW, AH)
  const ctx = toile.getContext('2d')
  const image = ctx.createImageData(AW, AH)
  image.data.set(rgba)
  ctx.putImageData(image, 0, 0)
  const donnees = toile.encodeSync('webp', 100)
  writeFileSync(join(sortie, 'relief.webp'), donnees)
  console.log(`  public/maquette/relief.webp · ${(donnees.length / 1024).toFixed(0)} Ko`)
}

// --- occlusion ambiante : les creux et le pied des reliefs reçoivent moins de ciel ---
console.log('Occlusion ambiante…')
const occlusion = {
  burkina: new Float32Array(AW * AH),
  voisins: new Float32Array(AW * AH),
}
{
  const dx = ((E - W) * K * 111_320) / AW
  const dy = ((N - S) * 111_320) / AH
  const PAS = [1, 2, 3, 4, 6, 8, 11, 15, 20, 27, 36]
  const DIRECTIONS = 16
  const dirs = Array.from({ length: DIRECTIONS }, (_, k) => {
    const a = (k / DIRECTIONS) * Math.PI * 2
    return [Math.cos(a), Math.sin(a)]
  })
  for (let y = 0; y < AH; y++)
    for (let x = 0; x < AW; x++) {
      const h0 = alt[y * AW + x]
      let ob = 0
      let ov = 0
      for (const [cx, cy] of dirs) {
        let pente = 0
        for (const p of PAS) {
          const xx = Math.round(x + cx * p)
          const yy = Math.round(y + cy * p)
          if (xx < 0 || yy < 0 || xx >= AW || yy >= AH) break
          const d = Math.hypot(cx * p * dx, cy * p * dy)
          pente = Math.max(pente, (alt[yy * AW + xx] - h0) / d)
        }
        const sb = pente * EXAGERATION.burkina
        const sv = pente * EXAGERATION.voisins
        ob += sb / Math.sqrt(1 + sb * sb)
        ov += sv / Math.sqrt(1 + sv * sv)
      }
      occlusion.burkina[y * AW + x] = 1 - ob / DIRECTIONS
      occlusion.voisins[y * AW + x] = 1 - ov / DIRECTIONS
    }
}

// --- normales (2048), dans le repère de la scène : x vers l'est, y vers le haut, z vers le sud ---
console.log('Normales…')
{
  const [NW, NH] = TAILLES.normales
  const a = new Float32Array(NW * NH)
  for (let y = 0; y < NH; y++)
    for (let x = 0; x < NW; x++)
      a[y * NW + x] = Math.max(0, altitude(lonDe(x, NW), latDe(y, NH)))
  // Un léger flou retire le bruit du modèle SRTM sans effacer les collines.
  const lisse = new Float32Array(a.length)
  for (let y = 0; y < NH; y++)
    for (let x = 0; x < NW; x++) {
      let s = 0
      let p = 0
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const xx = Math.min(NW - 1, Math.max(0, x + i))
          const yy = Math.min(NH - 1, Math.max(0, y + j))
          const w = (2 - Math.abs(i)) * (2 - Math.abs(j))
          s += a[yy * NW + xx] * w
          p += w
        }
      lisse[y * NW + x] = s / p
    }
  const dx = ((E - W) * K * 111_320) / NW
  const dy = ((N - S) * 111_320) / NH
  const rgba = new Uint8ClampedArray(NW * NH * 4)
  for (let y = 0; y < NH; y++)
    for (let x = 0; x < NW; x++) {
      const v = (xx: number, yy: number) =>
        lisse[Math.min(NH - 1, Math.max(0, yy)) * NW + Math.min(NW - 1, Math.max(0, xx))]
      const gx = (v(x + 1, y) - v(x - 1, y)) / (2 * dx)
      const gz = (v(x, y + 1) - v(x, y - 1)) / (2 * dy) // vers le sud
      const ex =
        couvertureEn(lonDe(x, NW), latDe(y, NH)) >= 0.5
          ? EXAGERATION.burkina
          : EXAGERATION.voisins
      const nx = -ex * gx
      const nz = -ex * gz
      const l = Math.hypot(nx, 1, nz)
      const i = (y * NW + x) * 4
      rgba[i] = Math.round(((nx / l) * 0.5 + 0.5) * 255)
      rgba[i + 1] = Math.round(((1 / l) * 0.5 + 0.5) * 255)
      rgba[i + 2] = Math.round(((nz / l) * 0.5 + 0.5) * 255)
      rgba[i + 3] = 255
    }
  ecrireImage('normales.webp', rgba, NW, NH, 92)
}

// --- couleurs (4096) : la photo satellite, peinte puis éclairée par l'occlusion ---
console.log('Couleurs : tuiles EOxCloudless…')
const sat = await mosaiqueSatellite(9)
const [CW, CH] = TAILLES.couleur
const n = CW * CH
console.log('Couleurs : peinture…')
const rouge = new Float32Array(n)
const vert = new Float32Array(n)
const bleu = new Float32Array(n)
{
  // position de chaque colonne et de chaque ligne dans la mosaïque Mercator, calculée une fois
  const colonnes = Float64Array.from(
    { length: CW },
    (_, x) => (tuileX(lonDe(x, CW), 9) - sat.m.x0) * 256 - 0.5,
  )
  const rangees = Float64Array.from(
    { length: CH },
    (_, y) => (tuileY(latDe(y, CH), 9) - sat.m.y0) * 256 - 0.5,
  )
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const i = y * CW + x
      const lire = (c: number) =>
        bilineaire(sat.rgba, sat.m.largeur, sat.m.hauteur, 4, colonnes[x], rangees[y], c)
      rouge[i] = lire(0)
      vert[i] = lire(1)
      bleu[i] = lire(2)
    }
}

// Filtre de Kuwahara (rayon 2) : chaque pixel prend la moyenne du quart de voisinage le plus uni.
// Les champs et le grain de la photo disparaissent, les formes restent : on obtient un aplat peint.
{
  const boite = (v: Float32Array) => {
    const h = new Float32Array(n)
    const r = new Float32Array(n)
    for (let y = 0; y < CH; y++)
      for (let x = 1; x < CW - 1; x++) {
        const i = y * CW + x
        h[i] = v[i - 1] + v[i] + v[i + 1]
      }
    for (let y = 1; y < CH - 1; y++)
      for (let x = 0; x < CW; x++) {
        const i = y * CW + x
        r[i] = (h[i - CW] + h[i] + h[i + CW]) / 9
      }
    return r
  }
  const lum = new Float32Array(n)
  const lum2 = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    lum[i] = 0.3 * rouge[i] + 0.59 * vert[i] + 0.11 * bleu[i]
    lum2[i] = lum[i] * lum[i]
  }
  const [mr, mv, mb, ml, ml2] = [rouge, vert, bleu, lum, lum2].map(boite)
  for (let y = 2; y < CH - 2; y++)
    for (let x = 2; x < CW - 2; x++) {
      let meilleur = -1
      let variance = Infinity
      for (const j of [-CW - 1, -CW + 1, CW - 1, CW + 1]) {
        const k = y * CW + x + j
        const v = ml2[k] - ml[k] * ml[k]
        if (v < variance) {
          variance = v
          meilleur = k
        }
      }
      const i = y * CW + x
      rouge[i] = mr[meilleur]
      vert[i] = mv[meilleur]
      bleu[i] = mb[meilleur]
    }
}

console.log('Couleurs : couverture du sol…')
// La photo est sombre et très orangée en saison sèche. Au Burkina, la couleur vient donc de la couverture
// du sol réelle (forêt, savane, cultures, sol nu…) ; la photo n'apporte que son grain et ses nuances.
const sol = couvertureSol(0.004)
const TEINTES: Rgb[] = [
  melange(token('savane-700'), token('terre-600'), 0.35), // arbres
  melange(token('savane-500'), token('ocre-700'), 0.55), // arbustes
  melange(token('ocre-300'), token('ocre-500'), 0.35), // herbes
  melange(token('ocre-500'), token('laterite-300'), 0.45), // cultures
  token('terre-400'), // bâti
  token('terre-200'), // sol nu
  EAU, // eau
  melange(token('savane-300'), token('savane-500'), 0.5), // zones humides
]
const AUTRE = token('ocre-300')

console.log('Couleurs : lumière et pays voisins…')
const rgba = new Uint8ClampedArray(n * 4)
const couvertureCouleur = couvertureDuPays(CW, CH)
{
  // distance (en pixels de la couleur) au Burkina, pour l'ombre portée au pied du bloc
  const dedans = new Uint8Array(n)
  for (let i = 0; i < n; i++) dedans[i] = couvertureCouleur[i] >= 0.5 ? 1 : 0
  const versBloc = distances(dedans, CW, CH)
  // luminosité moyenne autour de chaque pixel : le grain de la photo, c'est l'écart à cette moyenne
  const lum = new Float32Array(n)
  for (let i = 0; i < n; i++) lum[i] = 0.3 * rouge[i] + 0.59 * vert[i] + 0.11 * bleu[i]
  const autour = flou(lum, CW, CH, 8)
  const ao = (o: Float32Array, x: number, y: number) =>
    bilineaire(o, AW, AH, 1, ((x + 0.5) / CW) * AW - 0.5, ((y + 0.5) / CH) * AH - 0.5, 0)
  const parts = new Float32Array(TEINTES.length)
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const i = y * CW + x
      const c = couvertureCouleur[i]
      // photo rééquilibrée : moins d'orange, plus de lumière
      const r = Math.min(255, rouge[i] * 1.3)
      const g = Math.min(255, vert[i] * 1.42)
      const b = Math.min(255, bleu[i] * 1.75)
      const l = 0.3 * r + 0.59 * g + 0.11 * b
      let fr = 0
      let fg = 0
      let fb = 0
      if (c > 0) {
        const lon = lonDe(x, CW)
        const lat = latDe(y, CH)
        const gx = (lon - EMPRISE_BLOC.w) / sol.pas - 0.5
        const gy = (EMPRISE_BLOC.n - lat) / sol.pas - 0.5
        let somme = 0
        for (let k = 0; k < TEINTES.length; k++) {
          parts[k] = bilineaire(sol.parts[k], sol.largeur, sol.hauteur, 1, gx, gy, 0)
          somme += parts[k]
        }
        const grain = Math.pow(
          Math.min(1.3, Math.max(0.72, lum[i] / (autour[i] || 1))),
          1.25,
        )
        const occ = 0.5 + 0.5 * Math.pow(ao(occlusion.burkina, x, y), 1.4)
        for (let canal = 0; canal < 3; canal++) {
          let teinte = AUTRE[canal] * Math.max(0, 1 - somme)
          for (let k = 0; k < TEINTES.length; k++) teinte += TEINTES[k][canal] * parts[k]
          const photo = [r, g, b][canal]
          const v = (teinte * grain * 0.68 + photo * 0.32) * occ
          if (canal === 0) fr = v
          else if (canal === 1) fg = v
          else fb = v
        }
      }
      // voisins : décolorés vers le papier, comme une carte ancienne autour de la maquette
      const occV = 0.6 + 0.4 * Math.pow(ao(occlusion.voisins, x, y), 1.2)
      const pied = 1 - 0.45 * Math.exp(-versBloc[i] / 5)
      const bordDomaine = Math.min(x / CW, 1 - x / CW, y / CH, 1 - y / CH)
      const papier = 0.5 + 0.5 * (1 - Math.min(1, bordDomaine / 0.09))
      const voisin = (v: number, p: number) =>
        ((v * 0.4 + l * 0.6) * (1 - papier) + p * papier) * occV * pied
      rgba[i * 4] = fr * c + voisin(r, PAPIER[0]) * (1 - c)
      rgba[i * 4 + 1] = fg * c + voisin(g, PAPIER[1]) * (1 - c)
      rgba[i * 4 + 2] = fb * c + voisin(b, PAPIER[2]) * (1 - c)
      rgba[i * 4 + 3] = 255
    }
}

console.log('Couleurs : eaux et frontières…')
const toileCouleur = createCanvas(CW, CH)
{
  const ctx = toileCouleur.getContext('2d')
  const image = ctx.createImageData(CW, CH)
  image.data.set(rgba)
  ctx.putImageData(image, 0, 0)
  const px = versPixel(CW, CH)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // frontières des pays voisins, en pointillé discret
  ctx.strokeStyle = css(TRAIT, 0.5)
  ctx.lineWidth = 2
  ctx.setLineDash([9, 6])
  for (const f of lireJson('public/geo/voisins.geo.json').features as Feature[]) {
    ctx.beginPath()
    for (const l of lignes(f)) tracer(ctx, l, px)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // limites des régions du Burkina
  ctx.strokeStyle = css(CLAIR, 0.32)
  ctx.lineWidth = 1.6
  for (const f of regions) {
    ctx.beginPath()
    for (const polygone of anneaux(f)) for (const a of polygone) tracer(ctx, a, px)
    ctx.stroke()
  }

  // cours d'eau : plus larges selon leur rang
  const largeur = { 1: 0.9, 2: 1.7, 3: 3.1 } as Record<number, number>
  for (const rang of [1, 2, 3]) {
    ctx.strokeStyle = css(RIVIERE, rang === 1 ? 0.55 : 0.85)
    ctx.lineWidth = largeur[rang]
    ctx.beginPath()
    for (const f of lireJson('public/geo/rivieres.geo.json').features as Feature[]) {
      if (Number(f.properties.rang) !== rang) continue
      for (const l of lignes(f)) tracer(ctx, l, px)
    }
    ctx.stroke()
  }

  // lacs et barrages
  ctx.fillStyle = css(EAU)
  for (const f of lireJson('public/geo/plans-eau.geo.json').features as Feature[])
    remplirPolygones(ctx, anneaux(f), px)
}
{
  const d = toileCouleur.encodeSync('webp', 80)
  writeFileSync(join(sortie, 'couleur.webp'), d)
  console.log(`  public/maquette/couleur.webp · ${(d.length / 1024).toFixed(0)} Ko`)
  const [LW, LH] = TAILLES.couleurLegere
  const legere = createCanvas(LW, LH)
  const ctx = legere.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(toileCouleur, 0, 0, LW, LH)
  const dl = legere.encodeSync('webp', 80)
  writeFileSync(join(sortie, 'couleur-legere.webp'), dl)
  console.log(
    `  public/maquette/couleur-legere.webp · ${(dl.length / 1024).toFixed(0)} Ko`,
  )
}

// --- arbres : là où WorldCover voit des arbres (classe 10), quelques acacias dans la savane du nord ---
console.log('Arbres…')
const arbres: number[] = []
{
  const PAS = 0.03
  const { largeur, hauteur, parts } = couvertureSol(PAS)
  const tirer = hasard(20261104)
  const candidats: number[][] = []
  for (let gy = 0; gy < hauteur; gy++)
    for (let gx = 0; gx < largeur; gx++) {
      const k = gy * largeur + gx
      if (parts[6][k] > 0.2) continue
      const f = parts[0][k]
      const a = parts[1][k]
      const lat0 = EMPRISE_BLOC.n - gy * PAS
      const lon0 = EMPRISE_BLOC.w + gx * PAS
      const nombre = Math.floor(f * 6 + tirer())
      const acacias = lat0 > 12.6 ? Math.floor(a * 1.6 + tirer() * 0.6) : 0
      for (let t = 0; t < nombre + acacias; t++) {
        const lon = lon0 + tirer() * PAS
        const lat = lat0 - tirer() * PAS
        if (!dansBurkina([lon, lat])) continue
        candidats.push([lon, lat, t < nombre ? 0 : 1, 0.75 + tirer() * 0.5])
      }
    }
  // Au-delà, la scène deviendrait lourde sur téléphone : on garde un échantillon régulier.
  const MAX = 12000
  const garder = Math.min(1, MAX / candidats.length)
  for (const c of candidats)
    if (tirer() < garder)
      arbres.push(
        Number(c[0].toFixed(3)),
        Number(c[1].toFixed(3)),
        c[2],
        Number(c[3].toFixed(2)),
      )
  console.log(`  ${arbres.length / 4} arbres sur ${candidats.length} possibles`)
}

const infos = {
  // numéro de région dans regions.png (valeur / 16) → identifiant
  regions: regions.map((f) => f.properties.id as string),
  // [lon, lat, sorte (0 arbre rond, 1 acacia), taille] à la suite
  arbres,
}
writeFileSync(join(sortie, 'maquette.json'), JSON.stringify(infos))
console.log(
  `  public/maquette/maquette.json · ${(JSON.stringify(infos).length / 1024).toFixed(0)} Ko`,
)
