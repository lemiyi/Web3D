import nature from '@/content/geo/nature.json'
import { sites } from '@/content/geo/sites.json'
import type { Lumiere } from './lumiere'

export type Etape = {
  nom: string
  detail: string
  centre: [number, number]
  zoom: number
  pitch: number
  bearing: number
  // durée du vol puis temps passé sur place, en millisecondes
  duree: number
  pause: number
  // l'heure qu'il fait à cette étape : le parcours va du plein jour à la nuit
  lumiere: Lumiere
  derniere?: boolean
}

const nomLac = (nom: string) =>
  nom.replace(/^(Lac du Barrage|Barrage|Mare) (de |du |d')?/i, '')
const km2 = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} km²`

// Centre de Ouagadougou, où le survol finit, à la nuit tombée.
const OUAGADOUGOU: [number, number] = [-1.5197, 12.3714]

// Le parcours est tiré des données de la carte : si un lieu manque après une régénération, l'étape saute.
export function creerEtapes(): Etape[] {
  const sommets = nature.sommets.filter((s) => !s.voisin)
  const plusHaut = sommets.reduce((a, b) => (b.alt > a.alt ? b : a), sommets[0])
  const eau = (nom: string) => nature.plansEau.find((e) => e.nom === nom)
  const site = (id: string) => sites.find((s) => s.id === id)
  const vol = (duree: number, pause = 2400) => ({ duree, pause })

  const lieuSite = (
    id: string,
    reglage: Pick<Etape, 'zoom' | 'bearing' | 'lumiere'> & { duree: number },
  ): Etape | undefined => {
    const s = site(id)
    if (!s) return undefined
    return {
      nom: s.nom,
      detail: s.detail,
      centre: s.centre as [number, number],
      pitch: 70,
      ...vol(reglage.duree),
      ...reglage,
    }
  }
  const lieuEau = (
    nom: string,
    detail: (aire: string) => string,
    reglage: Pick<Etape, 'zoom' | 'bearing' | 'lumiere'> & { duree: number },
  ): Etape | undefined => {
    const e = eau(nom)
    if (!e) return undefined
    return {
      nom: nomLac(nom),
      detail: detail(km2(e.aireKm2)),
      centre: e.centre as [number, number],
      pitch: 68,
      ...vol(reglage.duree),
      ...reglage,
    }
  }

  const etapes: (Etape | undefined)[] = [
    {
      nom: 'Le Burkina vu du ciel',
      detail: plusHaut
        ? `Un pays de plateaux dont le point le plus haut atteint ${plusHaut.alt} m`
        : 'Un pays de plateaux',
      centre: [-1.6, 12.4],
      zoom: 5.8,
      pitch: 55,
      bearing: 0,
      ...vol(3500, 1800),
      lumiere: 'jour',
    },
    plusHaut && {
      nom: plusHaut.nom,
      detail: `Point culminant du pays · ${plusHaut.alt} m`,
      centre: plusHaut.centre as [number, number],
      zoom: 11.2,
      pitch: 70,
      bearing: 35,
      ...vol(6500),
      lumiere: 'jour',
    },
    lieuSite('sindou', { zoom: 12.4, bearing: -20, lumiere: 'jour', duree: 4500 }),
    lieuSite('tengrela', { zoom: 12, bearing: 40, lumiere: 'jour', duree: 5000 }),
    lieuSite('karfiguela', { zoom: 12.6, bearing: 10, lumiere: 'jour', duree: 4000 }),
    lieuEau('Lac du Barrage de Samandéni', (a) => `Barrage sur le Mouhoun · ${a}`, {
      zoom: 10.6,
      bearing: -25,
      lumiere: 'soir',
      duree: 5500,
    }),
    lieuEau("Mare d'Oursi", (a) => `Mare du Sahel · ${a}`, {
      zoom: 10.8,
      bearing: -40,
      lumiere: 'soir',
      duree: 7000,
    }),
    lieuEau('Barrage de Bagré', (a) => `Le plus vaste plan d’eau cartographié · ${a}`, {
      zoom: 10.3,
      bearing: -30,
      lumiere: 'soir',
      duree: 6500,
    }),
    lieuEau('Barrage de Kompienga', (a) => `Barrage de l’est · ${a}`, {
      zoom: 10.4,
      bearing: 45,
      lumiere: 'soir',
      duree: 5500,
    }),
    lieuSite('arly', { zoom: 10.6, bearing: 20, lumiere: 'soir', duree: 4500 }),
    {
      nom: 'La nuit tombe sur Ouagadougou',
      detail: 'C’est l’heure où l’on raconte les contes',
      centre: OUAGADOUGOU,
      zoom: 9.6,
      pitch: 58,
      bearing: -15,
      ...vol(7000, 3000),
      lumiere: 'nuit',
      derniere: true,
    },
  ]
  return etapes.filter((e): e is Etape => Boolean(e))
}
