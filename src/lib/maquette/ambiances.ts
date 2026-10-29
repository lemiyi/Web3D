// Les trois heures de la maquette : soleil, ciel, brume et lumières des villes.
// Toutes les couleurs viennent de token.css ; on passe de l'une à l'autre en douceur (melanger).
import * as THREE from 'three'
import type { Lumiere } from '@/lib/lumiere'

export const couleurCss = (nom: string) =>
  new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(nom).trim())

const entre = (a: string, b: string, t: number) => couleurCss(a).lerp(couleurCss(b), t)

export type Ambiance = {
  soleil: { couleur: THREE.Color; intensite: number; azimut: number; hauteur: number }
  hemi: { ciel: THREE.Color; sol: THREE.Color; intensite: number }
  // fond du ciel (haut) et horizon, qui donne aussi la couleur de la brume
  ciel: THREE.Color
  horizon: THREE.Color
  environnement: number
  exposition: number
  // 0 le jour, 1 la nuit : fenêtres allumées, halo des villes, éclat
  nuit: number
}

export function ambiance(lumiere: Lumiere): Ambiance {
  if (lumiere === 'soir')
    return {
      // soleil bas à l'ouest : les ombres traversent le pays
      soleil: {
        couleur: entre('--ocre-300', '--laterite-300', 0.45),
        intensite: 4.2,
        azimut: 262,
        hauteur: 13,
      },
      hemi: {
        ciel: entre('--indigo-300', '--laterite-300', 0.5),
        sol: couleurCss('--laterite-700'),
        intensite: 0.55,
      },
      ciel: entre('--indigo-500', '--laterite-300', 0.42),
      horizon: entre('--ocre-300', '--laterite-300', 0.55),
      environnement: 0.35,
      exposition: 1.0,
      nuit: 0,
    }
  if (lumiere === 'nuit')
    return {
      // la lune, haute et froide
      soleil: {
        couleur: couleurCss('--indigo-300'),
        intensite: 1.15,
        azimut: 315,
        hauteur: 48,
      },
      hemi: {
        ciel: couleurCss('--indigo-700'),
        sol: couleurCss('--indigo-900'),
        intensite: 0.45,
      },
      ciel: couleurCss('--indigo-900'),
      horizon: entre('--indigo-700', '--indigo-900', 0.35),
      environnement: 0.12,
      exposition: 1.05,
      nuit: 1,
    }
  return {
    // fin de matinée : soleil au nord-ouest de la vue, comme sur les cartes en relief
    soleil: {
      couleur: entre('--ocre-100', '--terre-50', 0.5),
      intensite: 3.4,
      azimut: 292,
      hauteur: 36,
    },
    hemi: {
      ciel: entre('--indigo-100', '--terre-50', 0.4),
      sol: couleurCss('--ocre-300'),
      intensite: 0.75,
    },
    ciel: entre('--indigo-300', '--terre-50', 0.55),
    horizon: entre('--ocre-100', '--terre-100', 0.5),
    environnement: 0.45,
    exposition: 1.0,
    nuit: 0,
  }
}

const angle = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 360) + 540) % 360) - 180
  return a + d * t
}

export function melanger(a: Ambiance, b: Ambiance, t: number): Ambiance {
  const n = (x: number, y: number) => x + (y - x) * t
  const c = (x: THREE.Color, y: THREE.Color) => x.clone().lerp(y, t)
  return {
    soleil: {
      couleur: c(a.soleil.couleur, b.soleil.couleur),
      intensite: n(a.soleil.intensite, b.soleil.intensite),
      azimut: angle(a.soleil.azimut, b.soleil.azimut, t),
      hauteur: n(a.soleil.hauteur, b.soleil.hauteur),
    },
    hemi: {
      ciel: c(a.hemi.ciel, b.hemi.ciel),
      sol: c(a.hemi.sol, b.hemi.sol),
      intensite: n(a.hemi.intensite, b.hemi.intensite),
    },
    ciel: c(a.ciel, b.ciel),
    horizon: c(a.horizon, b.horizon),
    environnement: n(a.environnement, b.environnement),
    exposition: n(a.exposition, b.exposition),
    nuit: n(a.nuit, b.nuit),
  }
}

// Direction vers le soleil dans la scène (x vers l'est, y vers le haut, z vers le sud).
export function versSoleil(azimut: number, hauteur: number) {
  const a = THREE.MathUtils.degToRad(azimut)
  const h = THREE.MathUtils.degToRad(hauteur)
  return new THREE.Vector3(
    Math.sin(a) * Math.cos(h),
    Math.sin(h),
    -Math.cos(a) * Math.cos(h),
  )
}
