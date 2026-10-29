// Ce que la page demande à la vue affichée (carte MapLibre ou maquette 3D) : voler vers un lieu,
// cadrer tout le pays, s'arrêter. Le survol guidé et les boutons passent par là, quelle que soit la vue.
import type { Map as CarteMapLibre } from 'maplibre-gl'

// sans `pitch` ni `bearing`, la vue garde son inclinaison et son orientation
export type Vue = {
  centre: [number, number]
  zoom: number
  pitch?: number
  bearing?: number
}
export type Marges = { top: number; bottom: number; left: number; right: number }

export type Pilote = {
  // `fin` est appelée à l'arrivée, jamais si le vol est interrompu ; une durée nulle saute directement
  voler: (vue: Vue, options: { duree: number; marges?: Marges }, fin?: () => void) => void
  cadrer: (pitch: number, duree: number, marges: Marges) => void
  arreter: () => void
  // l'élément touché par la personne : y toucher interrompt le survol
  surface: () => HTMLElement | null
  zoom: () => number
}

export function piloteMapLibre(
  map: CarteMapLibre,
  limites: () => [[number, number], [number, number]],
): Pilote {
  let jeton = 0
  return {
    voler(vue, { duree, marges }, fin) {
      const mien = ++jeton
      const options = {
        center: vue.centre,
        zoom: vue.zoom,
        ...(vue.pitch === undefined ? {} : { pitch: vue.pitch }),
        ...(vue.bearing === undefined ? {} : { bearing: vue.bearing }),
        padding: marges,
      }
      if (fin) map.once('moveend', () => mien === jeton && fin())
      if (duree <= 0) map.jumpTo(options)
      else map.flyTo({ ...options, duration: duree, curve: 1.5, essential: true })
    },
    cadrer(pitch, duree, marges) {
      jeton++
      map.fitBounds(limites(), { padding: marges, pitch, bearing: 0, duration: duree })
    },
    arreter() {
      jeton++
      map.stop()
    },
    surface: () => map.getCanvasContainer(),
    zoom: () => map.getZoom(),
  }
}
