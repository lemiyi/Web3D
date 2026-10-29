import { URL_TERRARIUM } from './relief'

const Z = 9 // ≈ 300 m par pixel : assez fin pour lire une altitude sans télécharger beaucoup
const TAILLE = 256

// Terrarium encode l'altitude en mètres dans les trois canaux de couleur.
export const decoderTerrarium = (r: number, g: number, b: number) =>
  r * 256 + g + b / 256 - 32768

export function tuileDe(lon: number, lat: number, z = Z) {
  const n = 2 ** z
  const x = ((lon + 180) / 360) * n
  const phi = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n
  const tx = Math.floor(x)
  const ty = Math.floor(y)
  return {
    tx,
    ty,
    px: Math.min(TAILLE - 1, Math.floor((x - tx) * TAILLE)),
    py: Math.min(TAILLE - 1, Math.floor((y - ty) * TAILLE)),
  }
}

const tuiles = new Map<string, Promise<Uint8ClampedArray | null>>()

async function chargerTuile(tx: number, ty: number) {
  try {
    const url = URL_TERRARIUM.replace('{z}', String(Z))
      .replace('{x}', String(tx))
      .replace('{y}', String(ty))
    const reponse = await fetch(url)
    if (!reponse.ok) return null
    const image = await createImageBitmap(await reponse.blob(), {
      colorSpaceConversion: 'none',
    })
    const toile = document.createElement('canvas')
    toile.width = toile.height = TAILLE
    const ctx = toile.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(image, 0, 0)
    return ctx.getImageData(0, 0, TAILLE, TAILLE).data
  } catch {
    return null
  }
}

// Altitude en mètres au point donné, ou null si la tuile est indisponible.
export async function altitudeEn(lon: number, lat: number): Promise<number | null> {
  const { tx, ty, px, py } = tuileDe(lon, lat)
  const cle = `${tx}/${ty}`
  let tuile = tuiles.get(cle)
  if (!tuile) {
    tuile = chargerTuile(tx, ty)
    tuiles.set(cle, tuile)
    if (tuiles.size > 24) tuiles.delete(tuiles.keys().next().value as string)
  }
  const donnees = await tuile
  if (!donnees) {
    tuiles.delete(cle)
    return null
  }
  const i = (py * TAILLE + px) * 4
  return Math.round(decoderTerrarium(donnees[i], donnees[i + 1], donnees[i + 2]))
}
