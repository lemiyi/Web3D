export type Mot = { debut: number; fin: number; texte: string }

// La voix de synthèse lit tout le texte affiché : les crochets ([Démo], [à compléter]) sont blanchis
// à longueur égale, pour que la position du mot lu reste la même dans le texte affiché.
export const nettoyerPourVoix = (texte: string) =>
  texte.replace(/\[[^\]]*\]/g, (m) => ' '.repeat(m.length))

export function motsDuTexte(texte: string): Mot[] {
  return [...texte.matchAll(/\S+/g)].map((m) => ({
    debut: m.index,
    fin: m.index + m[0].length,
    texte: m[0],
  }))
}

// Rang du mot en cours de lecture (-1 : lecture pas commencée).
export function motActif(mots: Mot[], position: number): number {
  if (position < 0) return -1
  let rang = -1
  for (let i = 0; i < mots.length && mots[i].debut <= position; i++) rang = i
  return rang
}

export function phrasesDuTexte(texte: string): { debut: number; fin: number }[] {
  return [...texte.matchAll(/[^.!?…]+[.!?…]*\s*/g)].map((m) => ({
    debut: m.index,
    fin: m.index + m[0].length,
  }))
}

export function rangDePhrase(texte: string, position: number): number {
  if (position < 0) return -1
  const phrases = phrasesDuTexte(texte)
  const rang = phrases.findIndex((p) => position >= p.debut && position < p.fin)
  return rang === -1 ? phrases.length - 1 : rang
}
