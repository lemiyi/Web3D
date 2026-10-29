// Les objets de la maquette : le bloc du Burkina, ses tranches de terre, la table des pays voisins,
// les lacs, les arbres et les villes. Couleurs : token.css (couleurCss).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import pays from '@/content/geo/pays.geo.json'
import regionsContenu from '@/content/regions.json'
import { couleurCss } from './ambiances'
import {
  DOMAINE,
  EMPRISE_BLOC,
  K,
  MASQUE_PAS,
  hauteurBloc,
  hauteurVoisins,
  versLonLat,
  versScene,
  versUv,
} from './domaine'
import { type Donnees, altitudeEn, bordure, regionEn } from './donnees'

type Uniforme<T> = { value: T }

// Rend la main au navigateur entre deux morceaux de calcul : la page reste réactive pendant la construction.
export const souffler = () => new Promise<void>((r) => setTimeout(r, 0))

// ---------- relief ----------

async function grille(
  emprise: { w: number; e: number; s: number; n: number },
  nx: number,
  hauteur: (lon: number, lat: number) => number,
  garder?: (lon: number, lat: number) => boolean,
) {
  const { w, e, s, n } = emprise
  const nz = Math.round((nx * (n - s)) / ((e - w) * K))
  const positions = new Float32Array((nx + 1) * (nz + 1) * 3)
  const uvs = new Float32Array((nx + 1) * (nz + 1) * 2)
  const utile = garder ? new Uint8Array((nx + 1) * (nz + 1)) : null
  for (let j = 0; j <= nz; j++) {
    if (j % 48 === 47) await souffler()
    const lat = n - (j / nz) * (n - s)
    for (let i = 0; i <= nx; i++) {
      const lon = w + (i / nx) * (e - w)
      const k = j * (nx + 1) + i
      const [x, z] = versScene(lon, lat)
      positions.set([x, hauteur(lon, lat), z], k * 3)
      uvs.set(versUv(lon, lat), k * 2)
      if (utile) utile[k] = garder!(lon, lat) ? 1 : 0
    }
  }
  // Un carré n'est gardé que si l'un des sommets voisins est utile : la bordure reste couverte.
  const proche = (i: number, j: number) => {
    if (!utile) return true
    for (let b = -1; b <= 2; b++)
      for (let a = -1; a <= 2; a++) {
        const ii = Math.min(nx, Math.max(0, i + a))
        const jj = Math.min(nz, Math.max(0, j + b))
        if (utile[jj * (nx + 1) + ii]) return true
      }
    return false
  }
  const indices: number[] = []
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      if (!proche(i, j)) continue
      const a = j * (nx + 1) + i
      const b = a + 1
      const c = a + nx + 1
      const dd = c + 1
      indices.push(a, c, b, b, c, dd)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

// Le dessus du bloc : grille fine, découpée au bord exact du pays par le masque (distance au bord).
export async function creerBloc(
  d: Donnees,
  finesse: number,
  survol: Uniforme<number>,
): Promise<THREE.Mesh> {
  const g = await grille(
    EMPRISE_BLOC,
    finesse,
    (lon, lat) => hauteurBloc(altitudeEn(d, lon, lat)),
    (lon, lat) => regionEn(d, lon, lat) > 0,
  )
  const m = new THREE.MeshStandardMaterial({
    map: d.textures.couleur,
    normalMap: d.textures.normales,
    normalMapType: THREE.ObjectSpaceNormalMap,
    roughness: 0.93,
    metalness: 0,
    alphaToCoverage: true,
  })
  const surbrillance = couleurCss('--ocre-100')
  m.onBeforeCompile = (s) => {
    s.uniforms.uMasque = { value: d.textures.masque }
    s.uniforms.uRegions = { value: d.textures.regions }
    s.uniforms.uSurvol = survol
    s.uniforms.uSurbrillance = { value: surbrillance }
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vUvDomaine;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvUvDomaine = uv;')
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vUvDomaine;
        uniform sampler2D uMasque;
        uniform sampler2D uRegions;
        uniform float uSurvol;
        uniform vec3 uSurbrillance;`,
      )
      .replace(
        '#include <alphatest_fragment>',
        `// bord du pays : distance signée lue dans le masque, adoucie sur un pixel d'écran
        float bord = (texture2D(uMasque, vUvDomaine).r * 255.0 - 128.0) / ${MASQUE_PAS}.0;
        float flou = max(fwidth(bord), 1e-3);
        float couvre = smoothstep(-flou, flou, bord + 0.5);
        if (couvre < 0.02) discard;
        diffuseColor.a = couvre;
        // région survolée : un voile clair
        float region = floor(texture2D(uRegions, vUvDomaine).r * 255.0 / 16.0 + 0.5);
        if (uSurvol > 0.5 && abs(region - uSurvol) < 0.5)
          diffuseColor.rgb = mix(diffuseColor.rgb, uSurbrillance, 0.3);
        #include <alphatest_fragment>`,
      )
  }
  const mesh = new THREE.Mesh(g, m)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// La table : les pays voisins, à plus faible relief, qui redescendent au bord pour se fondre dans le papier.
export async function creerTable(d: Donnees, finesse: number): Promise<THREE.Group> {
  const g = await grille(
    DOMAINE,
    finesse,
    (lon, lat) => hauteurVoisins(altitudeEn(d, lon, lat)) * bordure(lon, lat),
  )
  const table = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({
      map: d.textures.couleur,
      normalMap: d.textures.normales,
      normalMapType: THREE.ObjectSpaceNormalMap,
      roughness: 0.96,
      metalness: 0,
    }),
  )
  table.receiveShadow = true
  // le papier qui continue la table jusqu'à l'horizon
  const papier = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: couleurCss('--terre-100'), roughness: 1 }),
  )
  papier.position.y = -0.004
  papier.receiveShadow = true
  const groupe = new THREE.Group()
  groupe.add(table, papier)
  return groupe
}

// ---------- tranches de terre ----------

// Les bords du bloc : terre végétale, cuirasse de latérite, argiles tachetées, kaolin, puis le granite.
export function creerMurs(d: Donnees): THREE.Mesh {
  const contours = (pays.features[0].geometry.coordinates as number[][][][]).map(
    (polygone) => polygone[0],
  )
  const positions: number[] = []
  const normales: number[] = []
  const profondeurs: number[] = []
  const longueurs: number[] = []
  const bas: number[] = []
  const indices: number[] = []
  for (const contour of contours) {
    // densifié : le haut du mur suit le relief tous les ≈ 1,5 km
    const points: [number, number][] = []
    for (let i = 0; i < contour.length - 1; i++) {
      const [a, b] = [contour[i], contour[i + 1]]
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.013))
      for (let k = 0; k < n; k++)
        points.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])
    }
    points.push(points[0])
    // sens du contour, pour orienter les normales vers l'extérieur
    let aire = 0
    for (let i = 0; i < points.length - 1; i++)
      aire += points[i][0] * points[i + 1][1] - points[i + 1][0] * points[i][1]
    const sens = aire > 0 ? 1 : -1
    const scene = points.map(([lon, lat]) => versScene(lon, lat))
    const depart = positions.length / 3
    let longueur = 0
    for (let i = 0; i < points.length; i++) {
      const [lon, lat] = points[i]
      const [x, z] = scene[i]
      const precedent = scene[Math.max(0, i - 1)]
      const suivant = scene[Math.min(points.length - 1, i + 1)]
      if (i > 0) longueur += Math.hypot(x - precedent[0], z - precedent[1])
      // normale horizontale : perpendiculaire à la tangente, vers l'extérieur
      const tx = suivant[0] - precedent[0]
      const tz = suivant[1] - precedent[1]
      const l = Math.hypot(tx, tz) || 1
      const nx = (-tz / l) * sens
      const nz = (tx / l) * sens
      const alt = altitudeEn(d, lon, lat)
      const haut = hauteurBloc(alt)
      const pied = hauteurVoisins(alt) * bordure(lon, lat) - 0.02
      positions.push(x, haut, z, x, pied, z)
      normales.push(-nx, 0, -nz, -nx, 0, -nz)
      profondeurs.push(0, haut - pied)
      longueurs.push(longueur, longueur)
      bas.push(haut - pied, 0)
      if (i > 0) {
        const a = depart + (i - 1) * 2
        indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3))
  g.setAttribute('aProf', new THREE.Float32BufferAttribute(profondeurs, 1))
  g.setAttribute('aLong', new THREE.Float32BufferAttribute(longueurs, 1))
  g.setAttribute('aBas', new THREE.Float32BufferAttribute(bas, 1))
  g.setIndex(indices)

  const m = new THREE.MeshStandardMaterial({
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  const strates = {
    uHerbe: { value: couleurCss('--savane-700').lerp(couleurCss('--terre-600'), 0.3) },
    uVegetale: { value: couleurCss('--terre-800').lerp(couleurCss('--terre-600'), 0.4) },
    uLaterite: { value: couleurCss('--laterite-600') },
    uLateriteSombre: { value: couleurCss('--laterite-700') },
    uOcre: { value: couleurCss('--ocre-700').lerp(couleurCss('--laterite-300'), 0.35) },
    uArgile: { value: couleurCss('--terre-200').lerp(couleurCss('--ocre-100'), 0.4) },
    uRoche: { value: couleurCss('--terre-400').lerp(couleurCss('--terre-600'), 0.35) },
  }
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, strates)
    s.vertexShader = s.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aProf; attribute float aLong; attribute float aBas;
        varying float vProf; varying float vLong; varying float vBas;`,
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvProf = aProf; vLong = aLong; vBas = aBas;',
      )
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vProf; varying float vLong; varying float vBas;
        uniform vec3 uHerbe, uVegetale, uLaterite, uLateriteSombre, uOcre, uArgile, uRoche;
        float hasard1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
        float bruit1(float x) {
          float i = floor(x); float f = fract(x);
          return mix(hasard1(i), hasard1(i + 1.0), f * f * (3.0 - 2.0 * f));
        }
        float hasard2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float bruit2(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hasard2(i), hasard2(i + vec2(1, 0)), u.x),
                     mix(hasard2(i + vec2(0, 1)), hasard2(i + vec2(1, 1)), u.x), u.y);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // limites de couches ondulées, comme dans une vraie coupe de terrain
        float ondule = (bruit1(vLong * 7.0) - 0.5) * 0.014 + (bruit1(vLong * 41.0) - 0.5) * 0.005;
        float p = vProf + ondule;
        vec2 grain = vec2(vLong * 420.0, p * 900.0);
        vec3 c = uVegetale;
        vec3 laterite = mix(uLaterite, uLateriteSombre, smoothstep(0.35, 0.75, bruit2(grain * 0.08)));
        c = mix(c, laterite, smoothstep(0.009, 0.015, p));
        vec3 ocre = mix(uOcre, laterite, 0.35 * step(0.62, bruit2(grain * 0.05 + 7.0)));
        c = mix(c, ocre, smoothstep(0.068, 0.08, p));
        c = mix(c, uArgile, smoothstep(0.135, 0.15, p));
        c = mix(c, uRoche, smoothstep(0.205, 0.22, p));
        // fines strates et grain de la terre
        c *= 0.9 + 0.1 * bruit1(p * 240.0 + bruit1(vLong * 3.0) * 5.0);
        c *= 0.94 + 0.12 * bruit2(grain * 0.35);
        // l'herbe qui déborde sur la lèvre du haut
        c = mix(uHerbe, c, smoothstep(0.0015, 0.0045 + 0.003 * bruit1(vLong * 90.0), vProf));
        // ombre de contact au pied
        c *= mix(0.5, 1.0, smoothstep(0.0, 0.06, vBas));
        diffuseColor.rgb *= c;`,
      )
  }
  const mesh = new THREE.Mesh(g, m)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// ---------- eau ----------

// Les grands lacs du Burkina : une eau lisse qui reflète le ciel. Les petits restent peints sur la carte.
export function creerLacs(d: Donnees, rides: THREE.Texture): THREE.Mesh | null {
  const formes: THREE.BufferGeometry[] = []
  for (const f of d.lacs.features) {
    const geo = f.geometry
    const polygones =
      geo.type === 'Polygon'
        ? [geo.coordinates]
        : geo.type === 'MultiPolygon'
          ? geo.coordinates
          : []
    for (const polygone of polygones) {
      const contour = polygone[0]
      if (contour.length < 4) continue
      const [cx, cy] = contour.reduce(
        (a, p) => [a[0] + p[0] / contour.length, a[1] + p[1] / contour.length],
        [0, 0],
      )
      if (!regionEn(d, cx, cy)) continue
      // le niveau de l'eau : les rives basses (premier quartile)
      const rives = contour
        .map(([lon, lat]) => hauteurBloc(altitudeEn(d, lon, lat)))
        .sort((a, b) => a - b)
      const niveau = rives[Math.floor(rives.length * 0.25)] + 0.0012
      const versForme = (anneau: number[][]) =>
        anneau.map(([lon, lat]) => {
          const [x, z] = versScene(lon, lat)
          return new THREE.Vector2(x, -z)
        })
      const forme = new THREE.Shape(versForme(contour))
      forme.holes = polygone.slice(1).map((t) => new THREE.Path(versForme(t)))
      const g = new THREE.ShapeGeometry(forme).rotateX(-Math.PI / 2)
      g.translate(0, niveau, 0)
      // coordonnées de texture en unités de scène : les rides gardent la même taille partout
      const pos = g.getAttribute('position')
      const uv = new Float32Array(pos.count * 2)
      for (let i = 0; i < pos.count; i++)
        uv.set([pos.getX(i) * 6, pos.getZ(i) * 6], i * 2)
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
      formes.push(g)
    }
  }
  if (!formes.length) return null
  const eau = couleurCss('--indigo-700').lerp(couleurCss('--savane-900'), 0.45)
  const mesh = new THREE.Mesh(
    mergeGeometries(formes),
    new THREE.MeshStandardMaterial({
      color: eau,
      roughness: 0.12,
      metalness: 0.05,
      normalMap: rides,
      normalScale: new THREE.Vector2(0.35, 0.35),
      envMapIntensity: 1.4,
    }),
  )
  mesh.receiveShadow = true
  return mesh
}

// Petites rides de vent : une texture de normales calculée une fois, qui se répète.
export function texturesRides(): THREE.DataTexture {
  const T = 128
  const h = new Float32Array(T * T)
  const tirer = graine(7)
  // somme de quelques ondes de directions variées, périodiques sur la tuile
  const ondes = Array.from({ length: 14 }, () => ({
    kx: Math.round((tirer() - 0.5) * 16),
    ky: Math.round((tirer() - 0.5) * 16),
    phase: tirer() * Math.PI * 2,
    a: 0.4 + tirer(),
  }))
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++)
      h[y * T + x] = ondes.reduce(
        (s, o) => s + o.a * Math.sin(((o.kx * x + o.ky * y) / T) * Math.PI * 2 + o.phase),
        0,
      )
  const donnees = new Uint8Array(T * T * 4)
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const v = (xx: number, yy: number) => h[((yy + T) % T) * T + ((xx + T) % T)]
      const nx = (v(x - 1, y) - v(x + 1, y)) * 0.15
      const ny = (v(x, y - 1) - v(x, y + 1)) * 0.15
      const l = Math.hypot(nx, ny, 1)
      donnees.set(
        [
          ((nx / l) * 0.5 + 0.5) * 255,
          ((ny / l) * 0.5 + 0.5) * 255,
          ((1 / l) * 0.5 + 0.5) * 255,
          255,
        ],
        (y * T + x) * 4,
      )
    }
  const t = new THREE.DataTexture(donnees, T, T)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return t
}

// ---------- arbres ----------

function graine(n: number) {
  let a = n >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const teinter = (g: THREE.BufferGeometry, c: THREE.Color) => {
  const n = g.getAttribute('position').count
  const couleurs = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) couleurs.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(couleurs, 3))
  return g
}

// Un arbre fait une unité de haut ; le tronc est foncé, la couronne prend la couleur de chaque arbre.
function modeleArbre(sorte: 0 | 1) {
  const tronc = couleurCss('--terre-800')
  const blanc = new THREE.Color(1, 1, 1)
  if (sorte === 0) {
    const t = new THREE.CylinderGeometry(0.07, 0.1, 0.5, 5).translate(0, 0.25, 0)
    const c = new THREE.IcosahedronGeometry(0.42, 1)
      .scale(1, 0.82, 1)
      .translate(0, 0.66, 0)
    return mergeGeometries([
      teinter(t.toNonIndexed(), tronc),
      teinter(c.toNonIndexed(), blanc),
    ])
  }
  // acacia : tronc élancé, couronne en parasol
  const t = new THREE.CylinderGeometry(0.045, 0.07, 0.62, 5).translate(0, 0.31, 0)
  const c = new THREE.CylinderGeometry(0.5, 0.36, 0.16, 8).translate(0, 0.68, 0)
  return mergeGeometries([
    teinter(t.toNonIndexed(), tronc),
    teinter(c.toNonIndexed(), blanc),
  ])
}

export const TAILLE_ARBRE = 0.021

export function creerArbres(d: Donnees, part: number): THREE.Group {
  const groupe = new THREE.Group()
  const tirer = graine(11)
  const a = d.infos.arbres
  const parSorte: number[][] = [[], []]
  for (let i = 0; i < a.length; i += 4) if (tirer() < part) parSorte[a[i + 2]].push(i)
  const verts = [
    [couleurCss('--savane-700'), couleurCss('--savane-900'), couleurCss('--terre-600')],
    [couleurCss('--savane-500'), couleurCss('--ocre-700'), couleurCss('--savane-700')],
  ]
  const matiere = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.9,
  })
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const axe = new THREE.Vector3(0, 1, 0)
  const c = new THREE.Color()
  ;([0, 1] as const).forEach((sorte) => {
    const liste = parSorte[sorte]
    if (!liste.length) return
    const arbres = new THREE.InstancedMesh(modeleArbre(sorte), matiere, liste.length)
    liste.forEach((i, k) => {
      const [lon, lat, , taille] = a.slice(i, i + 4)
      const [x, z] = versScene(lon, lat)
      const y = hauteurBloc(altitudeEn(d, lon, lat)) - 0.002
      const s = TAILLE_ARBRE * taille
      q.setFromAxisAngle(axe, tirer() * Math.PI * 2)
      m.compose(
        new THREE.Vector3(x, y, z),
        q,
        new THREE.Vector3(
          s * (0.9 + tirer() * 0.2),
          s * (0.85 + tirer() * 0.3),
          s * (0.9 + tirer() * 0.2),
        ),
      )
      arbres.setMatrixAt(k, m)
      const [c1, c2, c3] = verts[sorte]
      c.copy(c1).lerp(tirer() < 0.5 ? c2 : c3, tirer() * 0.6)
      arbres.setColorAt(k, c)
    })
    arbres.castShadow = true
    arbres.computeBoundingSphere()
    groupe.add(arbres)
  })
  return groupe
}

// ---------- villes ----------

// Poids de chaque chef-lieu, d'après sa population (recensement 2019, arrondi).
const POIDS: Record<string, number> = {
  Ouagadougou: 1,
  'Bobo-Dioulasso': 0.62,
  Koudougou: 0.3,
  Ouahigouya: 0.24,
  Banfora: 0.22,
  Kaya: 0.22,
  "Fada N'Gourma": 0.2,
}

export const VILLES = regionsContenu.map((r) => ({
  nom: r.chefLieu,
  centre: r.centre as [number, number],
  poids: POIDS[r.chefLieu] ?? 0.14,
}))

export type Villes = {
  groupe: THREE.Group
  maisons: THREE.MeshStandardMaterial
  halos: THREE.SpriteMaterial
}

export function creerVilles(d: Donnees): Villes {
  const tirer = graine(23)
  const teintes = [
    couleurCss('--terre-200'),
    couleurCss('--terre-50'),
    couleurCss('--ocre-300').lerp(couleurCss('--terre-200'), 0.5),
    couleurCss('--laterite-300'),
    couleurCss('--terre-400'),
  ]
  const maisons = new THREE.MeshStandardMaterial({
    roughness: 0.85,
    emissive: couleurCss('--ocre-300'),
    emissiveIntensity: 0,
  })
  const total = VILLES.reduce((s, v) => s + Math.round(40 + 380 * v.poids), 0)
  const boites = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    maisons,
    total,
  )
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const axe = new THREE.Vector3(0, 1, 0)
  let k = 0
  // halo des villes la nuit : une tache de lumière douce, plus grande pour les grandes villes
  const toile = document.createElement('canvas')
  toile.width = toile.height = 64
  const ctx = toile.getContext('2d')!
  const degrade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  degrade.addColorStop(0, 'rgba(255,255,255,1)')
  degrade.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  degrade.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = degrade
  ctx.fillRect(0, 0, 64, 64)
  const halos = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(toile),
    color: couleurCss('--ocre-300'),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  })
  const groupe = new THREE.Group()
  for (const ville of VILLES) {
    const n = Math.round(40 + 380 * ville.poids)
    const rayon = 0.018 + 0.075 * ville.poids
    const orientation = tirer() * Math.PI
    const [cx, cz] = versScene(...ville.centre)
    for (let i = 0; i < n; i++) {
      // plus dense au centre, comme une vraie ville
      const r = rayon * Math.sqrt(-2 * Math.log(1 - tirer() * 0.98)) * 0.45
      const t = tirer() * Math.PI * 2
      const x = cx + Math.cos(t) * r
      const z = cz + Math.sin(t) * r
      const centre = 1 - Math.min(1, r / rayon)
      const largeur = 0.0035 + tirer() * 0.004
      const haut =
        0.0018 +
        tirer() * 0.003 +
        (ville.poids > 0.5 ? centre * centre * tirer() * 0.012 : 0)
      const [lon, lat] = versLonLat(x, z)
      const y = hauteurBloc(altitudeEn(d, lon, lat)) - 0.0008
      q.setFromAxisAngle(axe, orientation + (tirer() < 0.8 ? 0 : Math.PI / 4))
      m.compose(
        new THREE.Vector3(x, y, z),
        q,
        new THREE.Vector3(largeur, haut, largeur * (0.7 + tirer() * 0.6)),
      )
      boites.setMatrixAt(k, m)
      boites.setColorAt(k, teintes[Math.floor(tirer() * teintes.length)])
      k++
    }
    const halo = new THREE.Sprite(halos)
    const y = hauteurBloc(altitudeEn(d, ...ville.centre))
    halo.position.set(cx, y + 0.01, cz)
    halo.scale.setScalar(rayon * 3.2)
    groupe.add(halo)
  }
  boites.castShadow = true
  boites.receiveShadow = true
  boites.computeBoundingSphere()
  groupe.add(boites)
  return { groupe, maisons, halos }
}
