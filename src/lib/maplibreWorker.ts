// MapLibre 6 calcule les tuiles dans un worker distinct : sous Vite il faut lui donner son URL,
// sinon la carte ne se dessine jamais ("Worker failed to load"). À importer avant toute <Map>.
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(workerUrl)
