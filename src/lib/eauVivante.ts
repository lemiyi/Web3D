import earcut from 'earcut'
import type * as GeoJSON from 'geojson'
import {
  type CustomLayerInterface,
  type CustomRenderMethodInput,
  type Map as CarteMapLibre,
  MercatorCoordinate,
} from 'maplibre-gl'
import pays from '@/content/geo/pays.geo.json'
import { type Lumiere, reglagesLumiere, versRgb, versSoleil } from './lumiere'
import { fichier } from './mapStyle'

// La surface des lacs et barrages, dessinée en WebGL au-dessus de la photo :
//   - des rides que pousse l'harmattan (vent du nord-est), plus fines à mesure qu'on s'approche ;
//   - le reflet du ciel, faible vu d'en haut, fort en vue rasante (loi de Fresnel) ;
//   - l'éclat du soleil (ou de la lune) quand le reflet tombe dans l'œil.
// En 3D, chaque lac est un plan posé à l'altitude de son rivage : le relief cache naturellement ce qui doit l'être.

const VERTEX = `#version 300 es
uniform mat4 u_matrice;
in vec2 a_merc;
in vec2 a_local;
in float a_alt;
in float a_burkina;
out vec3 v_monde;
out vec2 v_local;
out float v_burkina;
void main() {
  v_monde = vec3(a_merc, a_alt);
  v_local = a_local;
  v_burkina = a_burkina;
  gl_Position = u_matrice * vec4(v_monde, 1.0);
}`

const FRAGMENT = `#version 300 es
precision highp float;
in vec3 v_monde;
in vec2 v_local;
in float v_burkina;
uniform float u_temps;
uniform vec3 u_camera;
uniform vec3 u_profond;
uniform vec3 u_ciel_haut;
uniform vec3 u_horizon;
uniform vec3 u_soleil;
uniform vec3 u_couleur_soleil;
uniform float u_intensite;
uniform vec3 u_couleur_voile;
uniform float u_voile;
// distance (en unités de la carte) où l'eau s'est fondue dans la brume ; 0 = pas de brume (vue à plat)
uniform float u_brume;
uniform vec3 u_couleur_brume;
out vec4 couleur;

float hasard(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float bruit(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hasard(i), hasard(i + vec2(1.0, 0.0)), u.x),
             mix(hasard(i + vec2(0.0, 1.0)), hasard(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Hauteur des rides en mètres : deux trains de vagues croisés, poussés par l'harmattan (du nord-est) et par
// une brise de travers. Leur interférence change sans cesse : c'est ce qui fait scintiller les reflets.
// Une octave plus fine que deux pixels est éteinte : pas de fourmillement.
float rides(vec2 m, float metresParPixel) {
  vec2 vent = normalize(vec2(-0.7, 0.7)); // vers le sud-ouest (x : est, y : sud)
  vec2 brise = normalize(vec2(0.8, 0.6));
  float h = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float lambda = 420.0 / pow(2.5, fi);
    float visible = smoothstep(2.0, 7.0, lambda / metresParPixel);
    float a = fi * 1.9;
    mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec2 q = r * (m / lambda);
    float vitesse = 0.16 + 0.05 * fi; // en longueurs d'onde par seconde
    float train1 = bruit(q + vent * u_temps * vitesse);
    float train2 = bruit(q * 1.3 + brise * u_temps * vitesse * 0.8 + 17.0);
    h += (train1 + train2 - 1.0) * lambda * 0.075 * visible;
  }
  return h;
}
void main() {
  vec2 m = v_local;
  float mpp = max(length(fwidth(m)), 0.5);
  float e = max(mpp * 0.7, 0.5);
  float h0 = rides(m, mpp);
  float hx = rides(m + vec2(e, 0.0), mpp);
  float hy = rides(m + vec2(0.0, e), mpp);
  vec3 n = normalize(vec3(-(hx - h0) / e, -(hy - h0) / e, 1.0));

  vec3 v = normalize(u_camera - v_monde);
  float cosv = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - cosv, 5.0);
  vec3 r = reflect(-v, n);
  vec3 ciel = mix(u_horizon, u_ciel_haut, smoothstep(0.0, 0.45, r.z));

  vec3 c = mix(u_profond, ciel, fresnel);
  // Vues d'en haut, les rides tournées vers le soleil sont plus claires que celles qui lui tournent le dos :
  // c'est ce moiré qui rend la surface vivante.
  float vers = dot(n.xy, normalize(u_soleil.xy + vec2(1e-4)));
  c += vers * (0.55 * ciel + 0.35 * u_couleur_soleil) * 0.45 * u_intensite;
  float face = max(dot(r, u_soleil), 0.0);
  float eclat = (pow(face, 320.0) * 1.4 + pow(face, 28.0) * 0.08) * u_intensite;
  c += u_couleur_soleil * eclat;

  float alpha = clamp(mix(0.5, 0.9, fresnel) + eclat * 0.6, 0.0, 1.0);
  c = mix(c, u_couleur_voile, u_voile * (1.0 - v_burkina));
  // Comme le relief, l'eau lointaine se perd dans la brume.
  if (u_brume > 0.0) {
    float d = length(u_camera - v_monde) / u_brume;
    float b = smoothstep(0.35, 1.0, d);
    c = mix(c, u_couleur_brume, b);
    alpha *= 1.0 - smoothstep(0.8, 1.0, d);
  }
  couleur = vec4(c * alpha, alpha);
}`

type Lac = {
  premierIndice: number
  nbIndices: number
  premierSommet: number
  nbSommets: number
  echantillons: [number, number][]
  boite: [number, number, number, number]
  // en 3D : l'altitude du rivage a pu être lue sur le relief chargé
  altitudeConnue: boolean
}

const ORIGINE = MercatorCoordinate.fromLngLat([-1.5, 12.3])
const METRES_PAR_UNITE = 1 / ORIGINE.meterInMercatorCoordinateUnits()

// Point dans le Burkina ? (rayons, contours seulement : suffisant pour savoir si un lac est chez soi)
const contoursBurkina = (
  (pays as unknown as GeoJSON.FeatureCollection).features[0]
    .geometry as GeoJSON.MultiPolygon
).coordinates.map((p) => p[0])
function dansBurkina([x, y]: number[]) {
  return contoursBurkina.some((anneau) => {
    let dedans = false
    for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
      const [xi, yi] = anneau[i]
      const [xj, yj] = anneau[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        dedans = !dedans
    }
    return dedans
  })
}

// Inverse d'une matrice 4 × 4 (ordre colonnes), pour retrouver la position de la caméra.
function inverser(m: ArrayLike<number>): Float64Array | null {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] =
    Array.from(m)
  const b00 = a00 * a11 - a01 * a10
  const b01 = a00 * a12 - a02 * a10
  const b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11
  const b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30
  const b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31
  const b10 = a21 * a33 - a23 * a31
  const b11 = a22 * a33 - a23 * a32
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
  if (!det) return null
  const d = 1 / det
  return new Float64Array([
    (a11 * b11 - a12 * b10 + a13 * b09) * d,
    (a02 * b10 - a01 * b11 - a03 * b09) * d,
    (a31 * b05 - a32 * b04 + a33 * b03) * d,
    (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d,
    (a00 * b11 - a02 * b08 + a03 * b07) * d,
    (a32 * b02 - a30 * b05 - a33 * b01) * d,
    (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d,
    (a01 * b08 - a00 * b10 - a03 * b06) * d,
    (a30 * b04 - a31 * b02 + a33 * b00) * d,
    (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d,
    (a00 * b09 - a01 * b07 + a02 * b06) * d,
    (a31 * b01 - a30 * b03 - a32 * b00) * d,
    (a20 * b03 - a21 * b01 + a22 * b00) * d,
  ])
}

const ZOOM_ANIMATION = 8.5
const BRUME_KM = 140 // plus loin, les rides sont invisibles : on ne redessine pas la carte pour rien

export class EauVivante implements CustomLayerInterface {
  id = 'eau-vivante'
  type = 'custom' as const
  renderingMode = '3d' as const

  private animer = true
  private actif = true
  private voile = 0.48
  private reglages = reglagesLumiere('jour')
  private carte?: CarteMapLibre
  private gl?: WebGL2RenderingContext
  private programme?: WebGLProgram
  private vao?: WebGLVertexArrayObject
  private tamponAlt?: WebGLBuffer
  private altitudes = new Float32Array(0)
  private lacs: Lac[] = []
  private casse = false
  private debut = performance.now()
  private derniereAltitude = 0
  private prochaineImage?: number
  private surTerrain = () => this.mettreAJourAltitudes(true)

  // Sans animation (préférence « réduire les animations ») : les rides restent figées.
  definirAnimation(animer: boolean) {
    this.animer = animer
    this.carte?.triggerRepaint()
  }

  definirLumiere(lumiere: Lumiere) {
    this.reglages = reglagesLumiere(lumiere)
    this.carte?.triggerRepaint()
  }

  definirActif(actif: boolean) {
    this.actif = actif
    this.carte?.triggerRepaint()
  }

  definirVoile(opacite: number) {
    this.voile = opacite
    this.carte?.triggerRepaint()
  }

  onAdd(carte: CarteMapLibre, gl: WebGL2RenderingContext) {
    this.carte = carte
    this.gl = gl
    try {
      this.programme = this.compiler(gl)
    } catch (e) {
      this.casse = true
      console.warn('Eau des lacs désactivée :', (e as Error).message)
      return
    }
    carte.on('terrain', this.surTerrain)
    carte.on('idle', this.surTerrain)
    void this.charger()
  }

  onRemove(carte: CarteMapLibre, gl: WebGL2RenderingContext) {
    carte.off('terrain', this.surTerrain)
    carte.off('idle', this.surTerrain)
    window.clearTimeout(this.prochaineImage)
    if (this.programme) gl.deleteProgram(this.programme)
    if (this.vao) gl.deleteVertexArray(this.vao)
    this.vao = undefined
  }

  private compiler(gl: WebGL2RenderingContext) {
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, source)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, shader(gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(p) ?? 'programme')
    return p
  }

  // Lit les plans d'eau (le même fichier que la carte, déjà en cache) et les découpe en triangles.
  private async charger() {
    const reponse = await fetch(fichier('plans-eau')).catch(() => null)
    if (!reponse?.ok || !this.gl || !this.programme) return
    const donnees = (await reponse.json()) as GeoJSON.FeatureCollection
    const merc: number[] = []
    const local: number[] = []
    const burkina: number[] = []
    const indices: number[] = []
    for (const f of donnees.features) {
      const g = f.geometry as GeoJSON.MultiPolygon
      for (const polygone of g.coordinates) {
        const premierSommet = merc.length / 2
        const premierIndice = indices.length
        const plat: number[] = []
        const trous: number[] = []
        let n = 0
        polygone.forEach((anneau, k) => {
          if (k > 0) trous.push(n)
          for (const [lon, lat] of anneau) {
            plat.push(lon, lat)
            n++
          }
        })
        const triangles = earcut(plat, trous.length ? trous : null, 2)
        if (!triangles.length) continue
        const chezSoi = dansBurkina(polygone[0][0]) ? 1 : 0
        let [w, s, e, nn] = [180, 90, -180, -90]
        for (let i = 0; i < plat.length; i += 2) {
          const c = MercatorCoordinate.fromLngLat([plat[i], plat[i + 1]])
          merc.push(c.x, c.y)
          local.push(
            (c.x - ORIGINE.x) * METRES_PAR_UNITE,
            (c.y - ORIGINE.y) * METRES_PAR_UNITE,
          )
          burkina.push(chezSoi)
          w = Math.min(w, plat[i])
          e = Math.max(e, plat[i])
          s = Math.min(s, plat[i + 1])
          nn = Math.max(nn, plat[i + 1])
        }
        for (const t of triangles) indices.push(premierSommet + t)
        // De quoi trouver l'altitude du rivage : quelques sommets du contour.
        const contour = polygone[0]
        const pas = Math.max(1, Math.floor(contour.length / 14))
        const echantillons = contour
          .filter((_, i) => i % pas === 0)
          .map(([x, y]) => [x, y] as [number, number])
        this.lacs.push({
          premierIndice,
          nbIndices: indices.length - premierIndice,
          premierSommet,
          nbSommets: merc.length / 2 - premierSommet,
          echantillons,
          boite: [w, s, e, nn],
          altitudeConnue: false,
        })
      }
    }

    const gl = this.gl
    const p = this.programme
    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)
    const attribut = (nom: string, valeurs: Float32Array, taille: number) => {
      const tampon = gl.createBuffer()!
      gl.bindBuffer(gl.ARRAY_BUFFER, tampon)
      gl.bufferData(gl.ARRAY_BUFFER, valeurs, gl.STATIC_DRAW)
      const lieu = gl.getAttribLocation(p, nom)
      gl.enableVertexAttribArray(lieu)
      gl.vertexAttribPointer(lieu, taille, gl.FLOAT, false, 0, 0)
      return tampon
    }
    attribut('a_merc', new Float32Array(merc), 2)
    attribut('a_local', new Float32Array(local), 2)
    attribut('a_burkina', new Float32Array(burkina), 1)
    this.altitudes = new Float32Array(merc.length / 2)
    this.tamponAlt = attribut('a_alt', this.altitudes, 1)
    const tamponIndices = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tamponIndices)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW)
    gl.bindVertexArray(null)
    this.mettreAJourAltitudes(true)
    this.carte?.triggerRepaint()
  }

  // En 3D, chaque lac prend l'altitude médiane de son rivage telle que le relief la dessine (exagération comprise).
  private mettreAJourAltitudes(tous = false) {
    const carte = this.carte
    const gl = this.gl
    if (!carte || !gl || !this.tamponAlt || !this.lacs.length) return
    const terrain = carte.getTerrain()
    const exageration = terrain?.exaggeration ?? 0
    const vue = carte.getBounds()
    for (const lac of this.lacs) {
      const [w, s, e, n] = lac.boite
      const visible =
        e > vue.getWest() && w < vue.getEast() && n > vue.getSouth() && s < vue.getNorth()
      if (!tous && !visible) continue
      let z = 0
      lac.altitudeConnue = !terrain
      if (terrain) {
        // 0 m veut dire « relief pas encore chargé ici » (le Burkina est partout à plus de 100 m).
        const hauteurs = lac.echantillons
          .map((p) => carte.queryTerrainElevation(p) ?? 0)
          .filter((h) => h > 1)
          .sort((a, b) => a - b)
        lac.altitudeConnue = hauteurs.length >= Math.ceil(lac.echantillons.length / 2)
        if (!lac.altitudeConnue) {
          this.altitudes.fill(0, lac.premierSommet, lac.premierSommet + lac.nbSommets)
          continue
        }
        const mediane = hauteurs[Math.floor(hauteurs.length / 2)]
        // Un peu au-dessus du sol, pour que l'eau ne se perde pas dans les irrégularités du relief.
        const centre = MercatorCoordinate.fromLngLat(
          [(w + e) / 2, (s + n) / 2],
          mediane + 3 * exageration,
        )
        z = centre.z
      }
      this.altitudes.fill(z, lac.premierSommet, lac.premierSommet + lac.nbSommets)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tamponAlt)
    gl.bufferData(gl.ARRAY_BUFFER, this.altitudes, gl.DYNAMIC_DRAW)
    this.derniereAltitude = performance.now()
  }

  render(gl: WebGL2RenderingContext, args: CustomRenderMethodInput) {
    const carte = this.carte
    if (this.casse || !this.actif || !this.vao || !this.programme || !carte) return
    if (carte.getTerrain() && performance.now() - this.derniereAltitude > 1200)
      this.mettreAJourAltitudes()

    const matrice = args.defaultProjectionData.mainMatrix
    const inverse = inverser(matrice)
    if (!inverse) return
    // La caméra est le point que la projection envoie à l'infini : M⁻¹ · (0, 0, 1, 0).
    const w = inverse[11]
    const camera = [inverse[8] / w, inverse[9] / w, inverse[10] / w]

    const r = this.reglages
    const temps = this.animer ? (performance.now() - this.debut) / 1000 : 0
    const p = this.programme
    gl.useProgram(p)
    const u = (nom: string) => gl.getUniformLocation(p, nom)
    gl.uniformMatrix4fv(u('u_matrice'), false, new Float32Array(matrice))
    gl.uniform1f(u('u_temps'), temps)
    gl.uniform3fv(u('u_camera'), camera)
    gl.uniform3fv(u('u_profond'), versRgb(r.eau.profonde))
    gl.uniform3fv(u('u_ciel_haut'), versRgb(r.ciel.haut))
    gl.uniform3fv(u('u_horizon'), versRgb(r.ciel.horizon))
    gl.uniform3fv(u('u_soleil'), versSoleil(r.eau.azimut, r.eau.hauteur))
    gl.uniform3fv(u('u_couleur_soleil'), versRgb(r.eau.soleil))
    gl.uniform1f(u('u_intensite'), r.eau.intensite)
    gl.uniform3fv(u('u_couleur_voile'), versRgb(r.ciel.brouillard))
    gl.uniform1f(u('u_voile'), this.voile)
    // En 3D, la brume commence à quelques dizaines de kilomètres : comme celle du ciel de la carte.
    const terrain = Boolean(carte.getTerrain())
    const brume = terrain ? (BRUME_KM * 1000) / METRES_PAR_UNITE : 0
    gl.uniform1f(u('u_brume'), brume)
    gl.uniform3fv(u('u_couleur_brume'), versRgb(r.ciel.brouillard))
    gl.disable(gl.CULL_FACE)
    gl.bindVertexArray(this.vao)
    const vue = carte.getBounds()
    const centre = carte.getCenter()
    for (const lac of this.lacs) {
      const [w, s, e, n] = lac.boite
      if (
        e < vue.getWest() ||
        w > vue.getEast() ||
        n < vue.getSouth() ||
        s > vue.getNorth()
      )
        continue
      if (terrain) {
        // Seuls les lacs dont l'altitude est connue, et pas au-delà de la brume.
        const dx = ((w + e) / 2 - centre.lng) * 108
        const dy = ((s + n) / 2 - centre.lat) * 111
        if (!lac.altitudeConnue || Math.hypot(dx, dy) > BRUME_KM * 1.1) continue
      }
      gl.drawElements(gl.TRIANGLES, lac.nbIndices, gl.UNSIGNED_INT, lac.premierIndice * 4)
    }
    gl.bindVertexArray(null)

    // Les rides bougent : on redessine à 30 images par seconde, seulement de près, onglet visible.
    if (
      this.animer &&
      carte.getZoom() >= ZOOM_ANIMATION &&
      !document.hidden &&
      !this.prochaineImage
    ) {
      this.prochaineImage = window.setTimeout(() => {
        this.prochaineImage = undefined
        carte.triggerRepaint()
      }, 33)
    }
  }
}
