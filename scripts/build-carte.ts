// Génère les données de la carte interactive (`npm run build:carte`, à relancer seulement si les sources changent).
// Le Burkina est détaillé, les pays voisins sont seulement esquissés.
//   - pays voisins : geoBoundaries / World Bank (CC BY 4.0)
//   - cours d'eau, plans d'eau, sommets du Burkina : OpenStreetMap (ODbL), via Overpass
//   - grands fleuves, grands lacs et sommets des pays voisins : Natural Earth (domaine public)
// Les géométries vont dans public/geo (chargées par la carte), les noms dans src/content/geo/nature.json.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import osmtogeojson from 'osmtogeojson'
import { BBOX } from '../src/lib/projection.ts'
import {
  aireKm2,
  anneaux,
  arrondi,
  arrondiLonLat,
  decouper,
  ecrire,
  featureCollection,
  lignes,
  overpass,
  pointDansPolygones,
  racine,
  simplifier,
  simplifierAnneau,
  telecharger,
  type Feature,
  type Pt,
  type Ring,
} from './geo-utils.ts'

const publicGeo = join(racine, 'public/geo')
const contenuGeo = join(racine, 'src/content/geo')

// Fenêtre de la carte : tout ce qui est hors de cette boîte n'est ni affiché ni calculé.
const FENETRE = { w: -13, e: 9, s: 4, n: 23 }
const dansFenetre = ([x, y]: Pt) =>
  x > FENETRE.w && x < FENETRE.e && y > FENETRE.s && y < FENETRE.n
const dansBurkinaBBox = ([x, y]: Pt) =>
  x > BBOX.w && x < BBOX.e && y > BBOX.s && y < BBOX.n

// « Le Mouhoun / Mouhoun River » → « Mouhoun » ; les noms génériques (« Ruisseau ») ne désignent rien.
const GENERIQUE =
  /^(ruisseau|cours d'eau|marigot|rivi[eè]re|fleuve|kori|bras|canal|stream|river)s?$/i
function nomPropre(brut: unknown): string {
  const nom = String(brut ?? '')
    .split('/')[0]
    .replace(/^((le|la|les)\s+|l')/i, '')
    .trim()
  return GENERIQUE.test(nom) ? '' : nom
}
const cle = (nom: string) => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const json = (b: Buffer) => JSON.parse(b.toString()) as { features: Feature[] }

// ---------- le Burkina (pour savoir ce qui est « chez soi ») ----------
const paysBurkina = JSON.parse(
  readFileSync(join(contenuGeo, 'pays.geo.json'), 'utf8'),
) as { features: Feature[] }
const polygonesBurkina = paysBurkina.features.flatMap((f) => anneaux(f))
const dansBurkina = (p: Pt) => pointDansPolygones(p, polygonesBurkina)
const contourBurkina: Ring[] = polygonesBurkina.map((p) => p[0])

// Distance d'un point au contour du Burkina, en degrés.
function distanceAuContour([x, y]: Pt): number {
  let min = Infinity
  for (const c of contourBurkina) {
    for (let i = 1; i < c.length; i++) {
      const [ax, ay] = c[i - 1]
      const [bx, by] = c[i]
      const dx = bx - ax
      const dy = by - ay
      const t = Math.max(
        0,
        Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)),
      )
      min = Math.min(min, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)))
    }
  }
  return min
}

// ---------- pays voisins ----------
type Voisin = { iso: string; nom: string; etiquette: Pt }
const VOISINS: Voisin[] = [
  { iso: 'MLI', nom: 'Mali', etiquette: [-4.6, 16.4] },
  { iso: 'NER', nom: 'Niger', etiquette: [4.2, 15.2] },
  { iso: 'BEN', nom: 'Bénin', etiquette: [2.35, 8.9] },
  { iso: 'TGO', nom: 'Togo', etiquette: [1.0, 8.3] },
  { iso: 'GHA', nom: 'Ghana', etiquette: [-1.7, 7.7] },
  { iso: 'CIV', nom: "Côte d'Ivoire", etiquette: [-5.6, 7.5] },
  { iso: 'NGA', nom: 'Nigeria', etiquette: [6.3, 9.6] },
  { iso: 'DZA', nom: 'Algérie', etiquette: [3.0, 21.6] },
  { iso: 'GIN', nom: 'Guinée', etiquette: [-10.6, 10.6] },
  { iso: 'MRT', nom: 'Mauritanie', etiquette: [-10.2, 18.8] },
]

console.log('Pays voisins…')
const lignesVoisins: Pt[][] = []
for (const v of VOISINS) {
  const url = `https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/${v.iso}/ADM0/geoBoundaries-${v.iso}-ADM0_simplified.geojson`
  const pays = json(await telecharger(url, `adm0-${v.iso}.geojson`)).features
  const polygones = pays.flatMap((f) => anneaux(f))
  if (!pointDansPolygones(v.etiquette, polygones))
    throw new Error(`L'étiquette de ${v.nom} est hors du pays`)
  for (const [contour] of polygones) {
    const ligne = simplifierAnneau(contour, 0.012)
    // On retire ce qui longe le Burkina (déjà tracé par son propre contour) et ce qui sort de la fenêtre.
    lignesVoisins.push(
      ...decouper(ligne, (p) => dansFenetre(p) && distanceAuContour(p) > 0.05),
    )
  }
}
ecrire(
  join(publicGeo, 'voisins.geo.json'),
  featureCollection([
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiLineString',
        coordinates: lignesVoisins.map((l) => arrondiLonLat(l, 3)),
      },
    },
  ]),
)

// ---------- cours d'eau ----------
const [S, W, N, E] = [BBOX.s, BBOX.w, BBOX.n, BBOX.e]
const boite = `${S},${W},${N},${E}`

console.log("Cours d'eau (OpenStreetMap)…")
const osmRivieres = osmtogeojson(
  (await overpass(
    `[out:json][timeout:240];(way["waterway"="river"](${boite});way["waterway"="stream"]["name"](${boite}););out geom;`,
    'osm-rivieres.json',
  )) as never,
  { flatProperties: true },
) as unknown as { features: Feature[] }

type Cours = { nom: string; type: string; troncons: Pt[][] }
const cours: Cours[] = osmRivieres.features
  .filter((f) => f.geometry.type === 'LineString')
  .map((f) => ({
    nom: nomPropre(f.properties['name:fr'] ?? f.properties.name),
    type: String(f.properties.waterway),
    troncons: decouper(lignes(f)[0], dansBurkinaBBox),
  }))
  .filter((c) => c.troncons.length)

// Importance : un cours d'eau nommé et long est un grand cours d'eau (rang 3), nommé = moyen (2), sinon petit (1).
const longueurParNom = new Map<string, number>()
for (const c of cours) {
  if (!c.nom) continue
  const k = cle(c.nom)
  const l = c.troncons.reduce(
    (s, t) =>
      s +
      t.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - t[i][0], p[1] - t[i][1]), 0),
    0,
  )
  longueurParNom.set(k, (longueurParNom.get(k) ?? 0) + l)
}
const rang = (c: Cours) =>
  c.nom && (longueurParNom.get(cle(c.nom)) ?? 0) >= 1.2 ? 3 : c.type === 'river' ? 2 : 1

const featuresRivieres: unknown[] = cours.map((c) => ({
  type: 'Feature',
  properties: { rang: rang(c) },
  geometry: {
    type: 'MultiLineString',
    coordinates: c.troncons.map((t) => arrondiLonLat(simplifier(t, 0.004), 3)),
  },
}))

// Grands fleuves des pays voisins (Natural Earth), hors de la boîte du Burkina, déjà couverte ci-dessus.
const neRivieres = json(
  await telecharger(
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson',
    'rivieres.geo.json',
  ),
).features
let nbVoisines = 0
for (const f of neRivieres) {
  if (Number(f.properties.scalerank) > 7) continue
  const troncons = lignes(f).flatMap((l) =>
    decouper(l, (p) => dansFenetre(p) && !dansBurkinaBBox(p)),
  )
  if (!troncons.length) continue
  nbVoisines++
  featuresRivieres.push({
    type: 'Feature',
    properties: { rang: Number(f.properties.scalerank) <= 5 ? 3 : 2 },
    geometry: {
      type: 'MultiLineString',
      coordinates: troncons.map((t) => arrondiLonLat(simplifier(t, 0.01), 2)),
    },
  })
}
ecrire(join(publicGeo, 'rivieres.geo.json'), featureCollection(featuresRivieres))

// Un nom par grand cours d'eau du Burkina, posé au milieu de son plus long tronçon.
const nomsRivieres: { nom: string; centre: Pt }[] = []
const dejaNomme = new Set<string>()
for (const [k] of [...longueurParNom]
  .filter(([, l]) => l >= 1.2)
  .sort((x, y) => y[1] - x[1])) {
  if (dejaNomme.has(k)) continue
  dejaNomme.add(k)
  const morceaux = cours.filter((c) => c.nom && cle(c.nom) === k)
  const nom = morceaux.map((c) => c.nom).sort((x, y) => x.length - y.length)[0]
  const plusLong = morceaux
    .flatMap((c) => c.troncons)
    .flatMap((t) => decouper(t, dansBurkina))
    .sort((x, y) => y.length - x.length)[0]
  if (!plusLong) continue
  const m = plusLong[Math.floor(plusLong.length / 2)]
  nomsRivieres.push({ nom, centre: [arrondi(m[0], 3), arrondi(m[1], 3)] })
}

// ---------- plans d'eau ----------
console.log("Plans d'eau…")
const osmEaux = osmtogeojson(
  (await overpass(
    `[out:json][timeout:240];(way["natural"="water"]["name"](${boite});relation["natural"="water"]["name"](${boite}););out geom;`,
    'osm-eaux.json',
  )) as never,
  { flatProperties: true },
) as unknown as { features: Feature[] }

type Plan = { nom: string; aire: number; polygones: Ring[][] }
const plans: Plan[] = []
for (const f of osmEaux.features) {
  if (!['Polygon', 'MultiPolygon'].includes(f.geometry.type)) continue
  const polygones = anneaux(f)
  const aire = polygones.reduce((s, p) => s + aireKm2(p[0]), 0)
  const premier = polygones[0][0][0]
  if (!dansBurkinaBBox(premier) || aire < 0.15) continue
  plans.push({
    nom: nomPropre(f.properties['name:fr'] ?? f.properties.name),
    aire,
    polygones,
  })
}

const neLacs = json(
  await telecharger(
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson',
    'lacs.geojson',
  ),
).features
const lacsVoisins: Plan[] = []
for (const f of neLacs) {
  const polygones = anneaux(f)
  const [x, y] = polygones[0][0][0]
  if (!dansFenetre([x, y]) || dansBurkinaBBox([x, y])) continue
  lacsVoisins.push({ nom: String(f.properties.name ?? ''), aire: 0, polygones })
}

const toutesEaux = [...plans, ...lacsVoisins]
ecrire(
  join(publicGeo, 'plans-eau.geo.json'),
  featureCollection(
    toutesEaux.map((p) => ({
      type: 'Feature',
      properties: { grand: p.aire >= 5 ? 1 : 0 },
      geometry: {
        type: 'MultiPolygon',
        coordinates: p.polygones.map((poly) =>
          poly.map((a) => arrondiLonLat(simplifierAnneau(a, 0.0015), 3)),
        ),
      },
    })),
  ),
)

// Les plus grands plans d'eau du Burkina portent leur nom sur la carte.
const nomsEaux = plans
  .filter((p) => p.nom && p.nom !== p.nom.toUpperCase() && p.aire >= 8)
  .sort((a, b) => b.aire - a.aire)
  .map((p) => {
    const pts = p.polygones.flatMap((poly) => poly[0])
    const centre: Pt = [
      pts.reduce((s, q) => s + q[0], 0) / pts.length,
      pts.reduce((s, q) => s + q[1], 0) / pts.length,
    ]
    return {
      nom: p.nom,
      aireKm2: Math.round(p.aire),
      centre: [arrondi(centre[0], 3), arrondi(centre[1], 3)] as Pt,
    }
  })
  .filter((e) => dansBurkina(e.centre))
  .slice(0, 8)

// ---------- sommets ----------
console.log('Sommets…')
const osmSommets = osmtogeojson(
  (await overpass(
    `[out:json][timeout:240];node["natural"="peak"]["ele"](${boite});out;`,
    'osm-sommets.json',
  )) as never,
  { flatProperties: true },
) as unknown as { features: (Feature & { geometry: { coordinates: Pt } })[] }

type Sommet = { nom: string; alt: number; centre: Pt; voisin: boolean }
const sommets: Sommet[] = []
for (const f of osmSommets.features) {
  const alt = Math.round(parseFloat(String(f.properties.ele)))
  const nom = String(f.properties['name:fr'] ?? f.properties.name ?? '').trim()
  const centre = f.geometry.coordinates
  if (!Number.isFinite(alt) || !nom || !dansBurkina(centre)) continue
  sommets.push({
    nom,
    alt,
    centre: [arrondi(centre[0], 4), arrondi(centre[1], 4)],
    voisin: false,
  })
}
sommets.sort((a, b) => b.alt - a.alt)

const neSommets = json(
  await telecharger(
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_regions_elevation_points.geojson',
    'sommets.geojson',
  ),
).features
for (const f of neSommets) {
  const [x, y] = f.geometry.coordinates as Pt
  if (!dansFenetre([x, y]) || dansBurkinaBBox([x, y])) continue
  const alt = Math.round(Number(f.properties.elevation))
  if (!Number.isFinite(alt) || alt < 600 || !f.properties.name) continue
  sommets.push({
    nom: String(f.properties.name).replace(/^Mount /, 'Mont '),
    alt,
    centre: [arrondi(x, 3), arrondi(y, 3)],
    voisin: true,
  })
}

// ---------- noms posés sur la carte ----------
ecrire(
  join(contenuGeo, 'nature.json'),
  JSON.stringify({
    pays: VOISINS.map((v) => ({ nom: v.nom, centre: v.etiquette })),
    mers: [{ nom: 'Golfe de Guinée', centre: [-1.5, 4.55] }],
    rivieres: nomsRivieres,
    plansEau: nomsEaux,
    sommets,
  }),
)

console.log(
  `✓ voisins ${lignesVoisins.length} tracés · rivières ${cours.length} (+${nbVoisines} voisines) · ` +
    `plans d'eau ${plans.length} (+${lacsVoisins.length}) · sommets ${sommets.length}`,
)
console.log('  fleuves nommés :', nomsRivieres.map((r) => r.nom).join(', '))
console.log(
  "  grands plans d'eau :",
  nomsEaux.map((e) => `${e.nom} ${e.aireKm2} km²`).join(', '),
)
console.log(
  '  sommets du Burkina :',
  sommets
    .filter((s) => !s.voisin)
    .slice(0, 8)
    .map((s) => `${s.nom} ${s.alt} m`)
    .join(', '),
)
