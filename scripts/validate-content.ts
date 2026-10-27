// Valide tout le contenu JSON avant le build (`npm run validate`, lancé par `prebuild`).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { ConteSchema, LangueSchema, RegionSchema } from '../src/lib/schemas.ts'

const racine = fileURLToPath(new URL('..', import.meta.url))
const lire = (chemin: string): unknown =>
  JSON.parse(readFileSync(join(racine, chemin), 'utf8'))
const erreurs: string[] = []

const langues = z.array(LangueSchema).parse(lire('src/content/langues.json'))
const regions = z.array(RegionSchema).parse(lire('src/content/regions.json'))
const codesLangues = new Set(langues.map((l) => l.code))
const idsRegions = new Set(regions.map((r) => r.id))

const fichiers = readdirSync(join(racine, 'src/content/contes')).filter((f) =>
  f.endsWith('.json'),
)

for (const fichier of fichiers) {
  const resultat = ConteSchema.safeParse(lire(`src/content/contes/${fichier}`))
  if (!resultat.success) {
    for (const issue of resultat.error.issues)
      erreurs.push(`${fichier} : ${issue.path.join('.')} — ${issue.message}`)
    continue
  }
  const conte = resultat.data
  if (fichier !== `${conte.id}.json`)
    erreurs.push(`${fichier} : le nom doit être ${conte.id}.json`)
  if (!codesLangues.has(conte.langue))
    erreurs.push(`${fichier} : langue inconnue "${conte.langue}"`)
  if (!idsRegions.has(conte.region))
    erreurs.push(`${fichier} : région inconnue "${conte.region}"`)

  for (const scene of conte.scenes) {
    const medias = [scene.illustration, scene.audio?.fichier].filter(
      (m): m is string => !!m,
    )
    for (const media of medias) {
      if (!existsSync(join(racine, 'public', media)))
        erreurs.push(`${fichier} : ${scene.id} → fichier manquant public${media}`)
    }
  }
}

if (erreurs.length) {
  console.error(
    `✗ Contenu invalide (${erreurs.length} erreur(s)) :\n  - ${erreurs.join('\n  - ')}`,
  )
  process.exit(1)
}
console.log(
  `✓ Contenu valide : ${fichiers.length} conte(s), ${regions.length} régions, ${langues.length} langues`,
)
