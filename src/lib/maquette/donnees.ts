// Chargement des fichiers de la maquette (public/maquette, voir scripts/build-maquette.ts)
// et lecture du relief côté processeur : hauteur d'un point, région survolée, point visé par le pointeur.
import * as THREE from 'three'
import { DOMAINE, TAILLES, decoderAltitude, hauteurBloc, hauteurVoisins } from './domaine'

const BASE = `${import.meta.env.BASE_URL}maquette/`

export type Infos = { regions: string[]; arbres: number[] }

export type Donnees = {
  infos: Infos
  lacs: GeoJSON.FeatureCollection
  // altitude en mètres, grille TAILLES.relief, ligne 0 au nord
  altitudes: Float32Array
  // numéro de région (0 hors du Burkina), grille TAILLES.regions
  regions: Uint8Array
  textures: {
    couleur: THREE.Texture
    normales: THREE.Texture
    masque: THREE.Texture
    regions: THREE.Texture
  }
}

async function pixels(nom: string) {
  const reponse = await fetch(BASE + nom)
  if (!reponse.ok) throw new Error(`maquette/${nom} : erreur ${reponse.status}`)
  // Valeurs brutes : pas de conversion de couleurs, sinon le relief codé dans l'image serait faussé.
  const image = await createImageBitmap(await reponse.blob(), {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  })
  const toile = document.createElement('canvas')
  toile.width = image.width
  toile.height = image.height
  const ctx = toile.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas 2D indisponible')
  ctx.drawImage(image, 0, 0)
  image.close()
  return { toile, donnees: ctx.getImageData(0, 0, toile.width, toile.height).data }
}

// Image décodée hors du fil principal (createImageBitmap), retournée d'avance pour WebGL.
async function texture(nom: string, couleurs: boolean): Promise<THREE.Texture> {
  const reponse = await fetch(BASE + nom)
  if (!reponse.ok) throw new Error(`maquette/${nom} : erreur ${reponse.status}`)
  const image = await createImageBitmap(await reponse.blob(), {
    imageOrientation: 'flipY',
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  })
  const t = new THREE.Texture(image)
  t.flipY = false
  t.colorSpace = couleurs ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  t.needsUpdate = true
  return t
}

export async function chargerDonnees(leger: boolean): Promise<Donnees> {
  const json = <T>(chemin: string) =>
    fetch(import.meta.env.BASE_URL + chemin).then((r) => {
      if (!r.ok) throw new Error(`${chemin} : erreur ${r.status}`)
      return r.json() as Promise<T>
    })
  const [infos, lacs, relief, regions, couleur, normales, masque] = await Promise.all([
    json<Infos>('maquette/maquette.json'),
    json<GeoJSON.FeatureCollection>('geo/plans-eau.geo.json'),
    pixels('relief.webp'),
    pixels('regions.png'),
    texture(leger ? 'couleur-legere.webp' : 'couleur.webp', true),
    texture('normales.webp', false),
    texture('burkina.png', false),
  ])

  await new Promise((r) => setTimeout(r, 0))
  const altitudes = new Float32Array(TAILLES.relief[0] * TAILLES.relief[1])
  for (let i = 0; i < altitudes.length; i++)
    altitudes[i] = decoderAltitude(relief.donnees[i * 4], relief.donnees[i * 4 + 1])

  await new Promise((r) => setTimeout(r, 0))
  const numeros = new Uint8Array(TAILLES.regions[0] * TAILLES.regions[1])
  for (let i = 0; i < numeros.length; i++)
    numeros[i] = Math.round(regions.donnees[i * 4] / 16)

  // Le numéro de région se lit tel quel : pas de mélange entre pixels voisins.
  const texRegions = new THREE.CanvasTexture(regions.toile)
  texRegions.colorSpace = THREE.NoColorSpace
  texRegions.magFilter = texRegions.minFilter = THREE.NearestFilter
  texRegions.generateMipmaps = false

  return {
    infos,
    lacs,
    altitudes,
    regions: numeros,
    textures: { couleur, normales, masque, regions: texRegions },
  }
}

// position (lon, lat) → pixel continu d'une grille couvrant le domaine
const versGrille = (lon: number, lat: number, largeur: number, hauteur: number) => [
  ((lon - DOMAINE.w) / (DOMAINE.e - DOMAINE.w)) * largeur - 0.5,
  ((DOMAINE.n - lat) / (DOMAINE.n - DOMAINE.s)) * hauteur - 0.5,
]

export function altitudeEn(d: Donnees, lon: number, lat: number): number {
  const [l, h] = TAILLES.relief
  const [x, y] = versGrille(lon, lat, l, h)
  const x0 = Math.max(0, Math.min(l - 2, Math.floor(x)))
  const y0 = Math.max(0, Math.min(h - 2, Math.floor(y)))
  const fx = Math.max(0, Math.min(1, x - x0))
  const fy = Math.max(0, Math.min(1, y - y0))
  const a = d.altitudes
  const v = (yy: number, xx: number) => a[yy * l + xx]
  return (
    (v(y0, x0) * (1 - fx) + v(y0, x0 + 1) * fx) * (1 - fy) +
    (v(y0 + 1, x0) * (1 - fx) + v(y0 + 1, x0 + 1) * fx) * fy
  )
}

// Numéro de région (1 à 13) ou 0 hors du Burkina.
export function regionEn(d: Donnees, lon: number, lat: number): number {
  const [l, h] = TAILLES.regions
  const [x, y] = versGrille(lon, lat, l, h)
  const xx = Math.round(x)
  const yy = Math.round(y)
  if (xx < 0 || yy < 0 || xx >= l || yy >= h) return 0
  return d.regions[yy * l + xx]
}

// Hauteur du sol dans la scène : sur le bloc au Burkina, sur la table ailleurs.
export function hauteurEn(d: Donnees, lon: number, lat: number): number {
  const alt = altitudeEn(d, lon, lat)
  return regionEn(d, lon, lat)
    ? hauteurBloc(alt)
    : hauteurVoisins(alt) * bordure(lon, lat)
}

// Près des bords du domaine, la table redescend à zéro pour se fondre dans le papier.
export function bordure(lon: number, lat: number): number {
  const u = (lon - DOMAINE.w) / (DOMAINE.e - DOMAINE.w)
  const v = (lat - DOMAINE.s) / (DOMAINE.n - DOMAINE.s)
  const e = Math.min(u, 1 - u, v, 1 - v)
  const t = Math.max(0, Math.min(1, e / 0.07))
  return t * t * (3 - 2 * t)
}
