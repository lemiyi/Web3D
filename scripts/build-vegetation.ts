// Génère la végétation de la carte (`npm run build:vegetation`, à relancer seulement si les sources changent).
//   - couverture terrestre : ESA WorldCover 2021, 10 m (CC BY 4.0), lue par morceaux dans des fichiers
//     « Cloud Optimized GeoTIFF » : on ne télécharge que des vues réduites, pas les 150 Mo de chaque dalle.
// Sortie : public/geo/vegetation.geo.json (zones), utilisée par le fond « Carte en relief ».
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { contours } from 'd3-contour'
import { fromUrl } from 'geotiff'
import { BBOX } from '../src/lib/projection.ts'
import {
  aireKm2,
  arrondi,
  cache,
  ecrire,
  featureCollection,
  racine,
  simplifierAnneau,
  type Pt,
  type Ring,
} from './geo-utils.ts'

const publicGeo = join(racine, 'public/geo')
const FENETRE = { w: -13, e: 9, s: 4, n: 23 }

// Classes WorldCover
const ARBRES = 10
const ARBUSTES = 20
const SOL_NU = 60
const HUMIDE = [90, 95]

type Grille = {
  w: number
  n: number
  pas: number
  largeur: number
  hauteur: number
  arbres: Float32Array
  // arbres + arbustes : la savane arborée et arbustive qui couvre l'essentiel du Burkina
  ligneux: Float32Array
  humide: Float32Array
  nu: Float32Array
  compte: Float32Array
}

const creerGrille = (w: number, e: number, s: number, n: number, pas: number): Grille => {
  const largeur = Math.ceil((e - w) / pas)
  const hauteur = Math.ceil((n - s) / pas)
  const taille = largeur * hauteur
  return {
    w,
    n,
    pas,
    largeur,
    hauteur,
    arbres: new Float32Array(taille),
    ligneux: new Float32Array(taille),
    humide: new Float32Array(taille),
    nu: new Float32Array(taille),
    compte: new Float32Array(taille),
  }
}

const nomDalle = (lat0: number, lon0: number) =>
  `N${String(lat0).padStart(2, '0')}${lon0 < 0 ? 'W' : 'E'}${String(Math.abs(lon0)).padStart(3, '0')}`

// Lit une dalle de 3° × 3° à la résolution de la vue réduite `vue` (0 = 10 m, 4 = 148 m, 6 = 590 m)
// et ajoute ses pixels à la grille.
async function verser(g: Grille, lat0: number, lon0: number, vue: number) {
  const nom = nomDalle(lat0, lon0)
  const fichier = join(cache, `wc-${vue}-${nom}.bin`)
  let pixels: Uint8Array
  let cote: number
  if (existsSync(fichier)) {
    pixels = new Uint8Array(readFileSync(fichier))
    cote = Math.round(Math.sqrt(pixels.length))
  } else {
    const url = `https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_${nom}_Map.tif`
    let image
    for (let essai = 0; ; essai++) {
      try {
        const tiff = await fromUrl(url)
        image = await tiff.getImage(vue)
        cote = image.getWidth()
        pixels = (await image.readRasters({ samples: [0] }))[0] as Uint8Array
        break
      } catch (e) {
        // Les dalles de pleine mer n'existent pas.
        const existe = await fetch(url, { method: 'HEAD' }).then((r) => r.status < 400)
        if (!existe) return false
        if (essai >= 3) throw e
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
    writeFileSync(fichier, pixels!)
  }
  const px = 3 / cote!
  for (let y = 0; y < cote!; y++) {
    const lat = lat0 + 3 - (y + 0.5) * px
    const gy = Math.floor((g.n - lat) / g.pas)
    if (gy < 0 || gy >= g.hauteur) continue
    for (let x = 0; x < cote!; x++) {
      const lon = lon0 + (x + 0.5) * px
      const gx = Math.floor((lon - g.w) / g.pas)
      if (gx < 0 || gx >= g.largeur) continue
      const i = gy * g.largeur + gx
      const c = pixels![y * cote! + x]
      g.compte[i]++
      if (c === ARBRES) {
        g.arbres[i]++
        g.ligneux[i]++
      } else if (c === ARBUSTES) g.ligneux[i]++
      else if (c === SOL_NU) g.nu[i]++
      else if (HUMIDE.includes(c)) g.humide[i]++
    }
  }
  return true
}

async function remplir(
  g: Grille,
  vue: number,
  [w, e, s, n]: [number, number, number, number],
) {
  const lat0 = (v: number) => Math.floor(v / 3) * 3
  let lues = 0
  for (let la = lat0(s); la < n; la += 3) {
    for (let lo = lat0(w); lo < e; lo += 3) {
      if (await verser(g, la, lo, vue)) lues++
    }
  }
  for (let i = 0; i < g.compte.length; i++) {
    const c = g.compte[i] || 1
    g.arbres[i] /= c
    g.ligneux[i] /= c
    g.nu[i] /= c
    g.humide[i] /= c
  }
  return lues
}

// Courbes d'iso-valeur d'une grille → zones (polygones en lon/lat).
function zones(
  g: Grille,
  valeurs: Float32Array,
  seuil: number,
  tolerance: number,
  aireMin: number,
) {
  const polygones = contours().size([g.largeur, g.hauteur]).thresholds([seuil])(
    Array.from(valeurs),
  )[0].coordinates
  const lonLat = ([x, y]: Pt): Pt => [
    arrondi(g.w + (x + 0.5) * g.pas, 3),
    arrondi(g.n - (y + 0.5) * g.pas, 3),
  ]
  const resultat: Ring[][] = []
  for (const polygone of polygones) {
    const anneaux = polygone.map((a) =>
      simplifierAnneau((a as Ring).map(lonLat), tolerance),
    )
    if (anneaux[0].length < 4 || aireKm2(anneaux[0]) < aireMin) continue
    const trous = anneaux.slice(1).filter((a) => a.length >= 4 && aireKm2(a) >= aireMin)
    resultat.push([anneaux[0], ...trous])
  }
  return resultat
}

// ---------- grilles ----------
console.log('Végétation : Burkina en détail (≈ 150 m)…')
const fine = creerGrille(BBOX.w, BBOX.e, BBOX.s, BBOX.n, 0.004)
console.log(`  ${await remplir(fine, 4, [BBOX.w, BBOX.e, BBOX.s, BBOX.n])} dalles`)

console.log('Végétation : pays voisins (≈ 600 m)…')
const large = creerGrille(FENETRE.w, FENETRE.e, FENETRE.s, FENETRE.n, 0.0107)
console.log(
  `  ${await remplir(large, 6, [FENETRE.w, FENETRE.e, FENETRE.s, FENETRE.n])} dalles`,
)

// Dans la boîte du Burkina, la grille fine fait foi : on vide la grille large à cet endroit.
for (let gy = 0; gy < large.hauteur; gy++) {
  const lat = large.n - (gy + 0.5) * large.pas
  if (lat < BBOX.s || lat > BBOX.n) continue
  for (let gx = 0; gx < large.largeur; gx++) {
    const lon = large.w + (gx + 0.5) * large.pas
    if (lon < BBOX.w || lon > BBOX.e) continue
    const i = gy * large.largeur + gx
    large.arbres[i] = large.ligneux[i] = large.nu[i] = large.humide[i] = 0
  }
}

// ---------- zones ----------
const SEUIL_DENSE = 0.35 // part de la maille couverte d'arbres : forêts et galeries forestières
const SEUIL_EPARS = 0.4 // part couverte d'arbres ou d'arbustes : savane
const defs = [
  { k: 'epars', valeurs: 'ligneux' as const, seuil: SEUIL_EPARS },
  { k: 'dense', valeurs: 'arbres' as const, seuil: SEUIL_DENSE },
  { k: 'humide', valeurs: 'humide' as const, seuil: 0.25 },
  { k: 'nu', valeurs: 'nu' as const, seuil: 0.5 },
]
const features: unknown[] = []
for (const { k, valeurs, seuil } of defs) {
  for (const [g, tolerance, aireMin] of [
    [fine, 0.022, 5],
    [large, 0.07, 80],
  ] as const) {
    const polygones = zones(g, g[valeurs], seuil, tolerance, aireMin)
    if (polygones.length)
      features.push({
        type: 'Feature',
        properties: { k },
        geometry: { type: 'MultiPolygon', coordinates: polygones },
      })
  }
}
ecrire(join(publicGeo, 'vegetation.geo.json'), featureCollection(features))

console.log(`✓ ${features.length} zones de végétation`)
