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

// La couleur d'une langue vient de token.css (--lang-moore, --lang-dioula…), claire ou sombre selon le thème.
export const couleurLangue = (code: string) => `var(--lang-${code}, var(--lang-autres))`
