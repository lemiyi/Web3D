// L'heure de la journée sur le fond satellite : la même photo, éclairée en plein jour, à la fin du jour ou de nuit.
// Tout vient de la palette (token.css) ; les valeurs ici ne sont que des mélanges et des intensités.
export type Lumiere = 'jour' | 'soir' | 'nuit'

export const LUMIERES: { id: Lumiere; nom: string; aide: string }[] = [
  { id: 'jour', nom: 'Plein jour', aide: 'Soleil haut, ciel de brume sèche' },
  { id: 'soir', nom: 'Fin du jour', aide: 'Lumière dorée, ombres longues' },
  { id: 'nuit', nom: 'Nuit', aide: 'Les vraies lumières des villes' },
]

const hex = (h: string) => /^#([\da-f]{6})$/i.exec(h)?.[1]
const canal = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16)

export function melanger(a: string, b: string, t: number): string {
  const [ha, hb] = [hex(a), hex(b)]
  if (!ha || !hb) return a
  const m = (i: number) =>
    Math.round(canal(ha, i) * (1 - t) + canal(hb, i) * t)
      .toString(16)
      .padStart(2, '0')
  return `#${m(0)}${m(2)}${m(4)}`
}

export function transparent(couleur: string, alpha: number): string {
  const h = hex(couleur)
  if (!h) return couleur
  return `rgba(${canal(h, 0)}, ${canal(h, 2)}, ${canal(h, 4)}, ${alpha})`
}

// Couleur #rrggbb → [r, g, b] entre 0 et 1, pour les shaders.
export function versRgb(couleur: string): [number, number, number] {
  const h = hex(couleur) ?? '000000'
  return [canal(h, 0) / 255, canal(h, 2) / 255, canal(h, 4) / 255]
}

function palette() {
  const css = getComputedStyle(document.documentElement)
  const v = (nom: string) => css.getPropertyValue(nom).trim()
  return {
    clair: v('--terre-50'),
    poussiere: v('--terre-200'),
    encre: v('--terre-900'),
    brume: v('--ocre-100'),
    ocre: v('--ocre-300'),
    or: v('--ocre-500'),
    laterite: v('--laterite-300'),
    braise: v('--laterite-500'),
    indigoPale: v('--indigo-100'),
    indigoClair: v('--indigo-300'),
    indigo: v('--indigo-500'),
    indigoNuit: v('--indigo-700'),
    indigoProfond: v('--indigo-900'),
    foretProfonde: v('--savane-900'),
  }
}

export type Reglages = ReturnType<typeof reglagesLumiere>

// Les réglages d'une heure : photo, ombrage, voile de couleur, ciel, et ce qu'en reflète l'eau.
export function reglagesLumiere(lumiere: Lumiere) {
  const p = palette()
  const eauProfonde = melanger(p.indigoNuit, p.foretProfonde, 0.45)

  if (lumiere === 'soir') {
    const horizon = melanger(p.or, p.laterite, 0.5)
    return {
      photo: { contraste: 0.16, saturation: 0.18, luminositeMax: 0.78, teinte: -6 },
      // ombrage : le soleil descend à l'ouest, les ombres s'allongent
      ombre: { direction: 275, hauteur: 18, opacite: 0.92, eclat: 0.24 },
      voile: { couleur: p.or, opacite: 0.12 },
      nuit: 0,
      ciel: {
        haut: melanger(p.indigoClair, p.laterite, 0.35),
        horizon,
        brouillard: melanger(horizon, p.braise, 0.25),
      },
      eau: {
        profonde: melanger(eauProfonde, p.braise, 0.12),
        soleil: melanger(p.ocre, p.clair, 0.3),
        intensite: 1.6,
        azimut: 262,
        hauteur: 10,
      },
    }
  }
  if (lumiere === 'nuit') {
    return {
      photo: { contraste: 0.04, saturation: -0.6, luminositeMax: 0.2, teinte: 0 },
      ombre: { direction: 300, hauteur: 38, opacite: 0.5, eclat: 0.05 },
      voile: { couleur: p.indigoProfond, opacite: 0.45 },
      nuit: 0.88,
      ciel: {
        haut: p.indigoProfond,
        horizon: melanger(p.indigoNuit, p.indigoProfond, 0.4),
        brouillard: melanger(p.indigoProfond, p.encre, 0.5),
      },
      eau: {
        profonde: melanger(p.indigoProfond, p.encre, 0.55),
        soleil: p.indigoPale, // reflet de la lune
        intensite: 0.45,
        azimut: 300,
        hauteur: 38,
      },
    }
  }
  const horizon = melanger(p.brume, p.poussiere, 0.4)
  return {
    photo: { contraste: 0.08, saturation: 0.04, luminositeMax: 1, teinte: 0 },
    ombre: { direction: 315, hauteur: 48, opacite: 0.75, eclat: 0.18 },
    voile: { couleur: p.brume, opacite: 0 },
    nuit: 0,
    ciel: {
      haut: melanger(p.indigoClair, p.brume, 0.45),
      horizon,
      brouillard: horizon,
    },
    eau: {
      profonde: eauProfonde,
      soleil: p.clair,
      intensite: 1.1,
      azimut: 160,
      hauteur: 62,
    },
  }
}

// Vecteur unitaire vers le soleil dans le repère de la carte (x vers l'est, y vers le sud, z vers le haut).
export function versSoleil(
  azimutDeg: number,
  hauteurDeg: number,
): [number, number, number] {
  const a = (azimutDeg * Math.PI) / 180
  const h = (hauteurDeg * Math.PI) / 180
  return [Math.sin(a) * Math.cos(h), -Math.cos(a) * Math.cos(h), Math.sin(h)]
}
