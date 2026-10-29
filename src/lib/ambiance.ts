// Ambiances de scène : leurs fonds sont les dégradés --scene-* de token.css.
export const AMBIANCES = ['aube', 'jour', 'crepuscule', 'nuit'] as const
export type Ambiance = (typeof AMBIANCES)[number]

// Sans ambiance précisée dans le JSON, le conte va de l'aube à la nuit au fil des scènes.
export const ambianceParRang = (rang: number): Ambiance =>
  (['aube', 'jour', 'jour', 'crepuscule'] as const)[rang] ?? 'nuit'
