import type { Conte, TypeConte } from './schemas'

export type Filtres = {
  langue: string | null
  region: string | null
  type: TypeConte | null
  recherche: string
}

export const LIBELLES_TYPE: Record<TypeConte, string> = {
  conte: 'Conte',
  legende: 'Légende',
  histoire: 'Récit historique',
}

export const sansAccents = (texte: string) =>
  texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const filtresActifs = (f: Filtres) =>
  [f.langue, f.region, f.type, f.recherche.trim()].filter(Boolean).length

export function filtrerContes(contes: Conte[], f: Filtres): Conte[] {
  const requete = sansAccents(f.recherche.trim())
  return contes.filter(
    (c) =>
      (!f.langue || c.langue === f.langue) &&
      (!f.region || c.region === f.region) &&
      (!f.type || c.type === f.type) &&
      (!requete ||
        sansAccents(c.titre.fr).includes(requete) ||
        sansAccents(c.titre.langue).includes(requete)),
  )
}
