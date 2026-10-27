import languesJson from '@/content/langues.json'
import regionsJson from '@/content/regions.json'
import { ConteSchema, LangueSchema, RegionSchema, type Conte } from './schemas'
import { z } from 'zod'

// Tous les contes sont chargés et validés au démarrage : un JSON invalide casse tout de suite.
const modules = import.meta.glob<unknown>('../content/contes/*.json', {
  eager: true,
  import: 'default',
})

// Numérotation des repères : du nord au sud, stable quels que soient les filtres.
export const contes: Conte[] = Object.values(modules)
  .map((m) => ConteSchema.parse(m))
  .sort((a, b) => b.coordonnees[1] - a.coordonnees[1])
export const langues = z.array(LangueSchema).parse(languesJson)
export const regions = z.array(RegionSchema).parse(regionsJson)

export const conteParId = (id: string) => contes.find((c) => c.id === id)
export const langueParCode = (code: string) => langues.find((l) => l.code === code)
export const regionParId = (id: string) => regions.find((r) => r.id === id)
export const numeroDuConte = (id: string) => contes.findIndex((c) => c.id === id) + 1

// Texte lisible (clair ou sombre) sur une couleur de langue.
export function texteSur(couleur: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(couleur.slice(i, i + 2), 16) / 255)
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return luminance > 0.25 ? '#0f1640' : '#fbf1d3'
}
