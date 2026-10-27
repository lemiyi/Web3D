import { z } from 'zod'

export const TypeConteSchema = z.enum(['conte', 'legende', 'histoire'])

export const LangueSchema = z.object({
  code: z.string(),
  nom: z.string(),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export const RegionSchema = z.object({
  id: z.string(),
  nom: z.string(),
  chefLieu: z.string(),
  centre: z.tuple([z.number(), z.number()]), // [longitude, latitude]
  langues: z.array(z.string()),
})

// Segment de voix : sert à surligner le texte pendant la lecture (F4).
const SegmentSchema = z
  .object({
    texte: z.string(),
    debut: z.number().min(0),
    fin: z.number().positive(),
  })
  .refine((s) => s.fin > s.debut, { message: 'segment : fin doit être > debut' })

const AudioSchema = z.object({
  fichier: z.string().startsWith('/media/audio/'),
  debut: z.number().min(0),
  fin: z.number().positive(),
})

const ChoixSchema = z.object({
  label: z.string().min(1),
  vers: z.string(),
})

// Une scène avance par `suite`, par `choix` (2 options) ou se termine (`fin`).
const SceneSchema = z
  .object({
    id: z.string(),
    texteFr: z.string().min(1),
    texteLangue: z.string().min(1),
    illustration: z.string().startsWith('/media/img/'),
    audio: AudioSchema.optional(),
    segments: z.array(SegmentSchema).optional(),
    suite: z.string().optional(),
    choix: z.array(ChoixSchema).length(2).optional(),
    fin: z.literal(true).optional(),
  })
  .refine((s) => [s.suite, s.choix, s.fin].filter((x) => x !== undefined).length === 1, {
    message: 'une scène doit avoir exactement un de : suite, choix, fin',
  })

export const ConteSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    titre: z.object({ fr: z.string(), langue: z.string() }),
    type: TypeConteSchema,
    region: z.string(),
    langue: z.string(),
    coordonnees: z.tuple([z.number().min(-6), z.number().min(9)]), // [lon, lat] Burkina
    dureeMinutes: z.number().positive(),
    resume: z.string(),
    conteur: z.object({ nom: z.string(), consentement: z.boolean() }),
    sources: z.array(z.string()).min(1),
    scenes: z.array(SceneSchema).min(1),
  })
  .superRefine((conte, ctx) => {
    const ids = new Set<string>()
    for (const s of conte.scenes) {
      if (ids.has(s.id))
        ctx.addIssue({ code: 'custom', message: `scène en double : ${s.id}` })
      ids.add(s.id)
    }

    const cibles = (s: (typeof conte.scenes)[number]) =>
      s.suite ? [s.suite] : (s.choix?.map((c) => c.vers) ?? [])

    for (const s of conte.scenes) {
      for (const cible of cibles(s)) {
        if (!ids.has(cible))
          ctx.addIssue({ code: 'custom', message: `${s.id} → scène inconnue : ${cible}` })
      }
    }

    // Toutes les scènes doivent être atteignables depuis la première.
    const vues = new Set<string>()
    const pile = [conte.scenes[0].id]
    while (pile.length) {
      const id = pile.pop()!
      if (vues.has(id)) continue
      vues.add(id)
      const scene = conte.scenes.find((s) => s.id === id)
      if (scene) pile.push(...cibles(scene))
    }
    for (const id of ids) {
      if (!vues.has(id))
        ctx.addIssue({
          code: 'custom',
          message: `scène orpheline (inatteignable) : ${id}`,
        })
    }
  })

export type Conte = z.infer<typeof ConteSchema>
export type Scene = Conte['scenes'][number]
export type Langue = z.infer<typeof LangueSchema>
export type Region = z.infer<typeof RegionSchema>
export type TypeConte = z.infer<typeof TypeConteSchema>
