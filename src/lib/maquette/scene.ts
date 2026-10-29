// La scène de la maquette 3D : rendu (ombres, reflets, flou de miniature), caméra, vols, et lecture du point visé.
// Elle ne redessine que lorsque quelque chose bouge : la maquette elle-même est immobile.
import * as THREE from 'three'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js'
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js'
import type { Lumiere } from '@/lib/lumiere'
import type { Marges, Pilote, Vue } from '@/lib/pilote'
import { type Ambiance, ambiance, melanger, versSoleil } from './ambiances'
import { EMPRISE_BLOC, K, SOCLE, versLonLat, versScene } from './domaine'
import { type Donnees, chargerDonnees, hauteurEn, regionEn } from './donnees'
import {
  type Villes,
  creerArbres,
  creerBloc,
  creerLacs,
  creerMurs,
  creerTable,
  creerVilles,
  souffler,
  texturesRides,
} from './objets'

export type Visee = { lon: number; lat: number; region: number }
export type CalquesMaquette = { arbres: boolean; villes: boolean; eau: boolean }

type Etat = { cible: THREE.Vector3; distance: number; polaire: number; azimut: number }
type Vol = {
  de: Etat
  vers: Etat
  margesDe: Marges
  margesVers: Marges
  t0: number
  duree: number
  arc: number
  fin?: () => void
}

// Correspondance avec le zoom de MapLibre, pour que le survol et les contes parlent la même langue.
const DISTANCE_ZOOM_6 = 13
const distancePour = (zoom: number) => DISTANCE_ZOOM_6 * 2 ** (6 - zoom)
const POLAIRE_MAX = 1.22
const DISTANCE = { min: 0.75, max: 48 }
const SANS_MARGE: Marges = { top: 0, bottom: 0, left: 0, right: 0 }

const lisser = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const angleVers = (a: number, b: number, t: number) => {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a))
  return a + d * t
}
const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export class SceneMaquette {
  readonly toile: HTMLCanvasElement
  private rendu: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.03, 300)
  private controles: MapControls
  private composeur: EffectComposer
  private flouH = new ShaderPass(HorizontalTiltShiftShader)
  private flouV = new ShaderPass(VerticalTiltShiftShader)
  private eclat: UnrealBloomPass
  private soleil = new THREE.DirectionalLight()
  private hemi = new THREE.HemisphereLight()
  private pmrem: THREE.PMREMGenerator
  private environnement: THREE.WebGLRenderTarget | null = null
  private fond: { toile: HTMLCanvasElement; texture: THREE.CanvasTexture }
  private donnees: Donnees | null = null
  private survol = { value: 0 }
  private objets: {
    arbres?: THREE.Group
    villes?: Villes
    lacs?: THREE.Mesh | null
    rides?: THREE.Texture
  } = {}
  private actuelle: Ambiance = ambiance('jour')
  private transition: { de: Ambiance; vers: Ambiance; t0: number; duree: number } | null =
    null
  private vol: Vol | null = null
  private marges: Marges = SANS_MARGE
  private sale = true
  private eauAnimee = false
  private raf = 0
  private dernier = 0
  private ecouteurs = new Set<() => void>()
  private taille = { l: 1, h: 1 }
  private observateur: ResizeObserver
  private rayon = new THREE.Raycaster()

  private conteneur: HTMLElement
  private options: { leger: boolean; reduit: boolean; onPerte: () => void }

  constructor(
    conteneur: HTMLElement,
    options: { leger: boolean; reduit: boolean; onPerte: () => void },
  ) {
    this.conteneur = conteneur
    this.options = options
    this.rendu = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    })
    this.rendu.setPixelRatio(Math.min(window.devicePixelRatio, options.leger ? 1.5 : 2))
    this.rendu.toneMapping = THREE.NeutralToneMapping
    this.rendu.shadowMap.enabled = true
    this.rendu.shadowMap.type = THREE.PCFShadowMap
    // la maquette ne bouge pas : l'ombre n'est recalculée que si la lumière ou les objets changent
    this.rendu.shadowMap.autoUpdate = false
    this.toile = this.rendu.domElement
    this.toile.tabIndex = 0
    this.toile.setAttribute('aria-label', 'Maquette 3D du Burkina Faso')
    this.toile.style.outline = 'none'
    this.toile.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      options.onPerte()
    })
    conteneur.appendChild(this.toile)

    this.pmrem = new THREE.PMREMGenerator(this.rendu)

    // fond : dégradé vertical du ciel vers l'horizon
    const toileFond = document.createElement('canvas')
    toileFond.width = 2
    toileFond.height = 256
    const texture = new THREE.CanvasTexture(toileFond)
    texture.colorSpace = THREE.SRGBColorSpace
    this.fond = { toile: toileFond, texture }
    this.scene.background = texture
    this.scene.fog = new THREE.Fog(0xffffff, 10, 40)

    this.soleil.castShadow = true
    const ombre = this.soleil.shadow
    ombre.mapSize.setScalar(options.leger ? 2048 : 4096)
    Object.assign(ombre.camera, {
      left: -8,
      right: 8,
      top: 7,
      bottom: -7,
      near: 1,
      far: 90,
    })
    ombre.bias = -0.0004
    ombre.normalBias = 0.012
    ombre.radius = 2.5
    this.scene.add(this.soleil, this.soleil.target, this.hemi)

    this.controles = new MapControls(this.camera, this.toile)
    Object.assign(this.controles, {
      enableDamping: true,
      dampingFactor: 0.09,
      screenSpacePanning: false,
      minDistance: DISTANCE.min,
      maxDistance: DISTANCE.max,
      maxPolarAngle: POLAIRE_MAX,
      zoomToCursor: true,
      zoomSpeed: 1.1,
      rotateSpeed: 0.55,
      keyPanSpeed: 14,
    })
    this.controles.listenToKeyEvents(this.toile)
    this.controles.addEventListener('change', () => {
      // la caméra reste au-dessus du Burkina et de ses abords
      const [w, n] = versScene(EMPRISE_BLOC.w - 1, EMPRISE_BLOC.n + 1)
      const [e, s] = versScene(EMPRISE_BLOC.e + 1, EMPRISE_BLOC.s - 1)
      const c = this.controles.target
      c.set(borne(c.x, w, e), c.y, borne(c.z, n, s))
      this.sale = true
    })

    const cible = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    })
    this.composeur = new EffectComposer(this.rendu, cible)
    this.eclat = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.5, 0.9)
    this.eclat.enabled = false
    this.composeur.addPass(new RenderPass(this.scene, this.camera))
    this.composeur.addPass(this.flouH)
    this.composeur.addPass(this.flouV)
    this.composeur.addPass(this.eclat)
    this.composeur.addPass(new OutputPass())

    this.observateur = new ResizeObserver(() => this.redimensionner())
    this.observateur.observe(conteneur)
    this.redimensionner()
  }

  async charger(lumiere: Lumiere) {
    const leger = this.options.leger
    const d = await chargerDonnees(leger)
    this.donnees = d
    // construite morceau par morceau, sans bloquer la page plus de quelques dizaines de millisecondes
    await souffler()
    this.scene.add(await creerTable(d, leger ? 220 : 360))
    this.scene.add(await creerBloc(d, leger ? 420 : 760, this.survol))
    await souffler()
    this.scene.add(creerMurs(d))
    await souffler()
    const rides = texturesRides()
    const lacs = creerLacs(d, rides)
    if (lacs) this.scene.add(lacs)
    await souffler()
    const arbres = creerArbres(d, leger ? 0.5 : 1)
    await souffler()
    const villes = creerVilles(d)
    this.scene.add(arbres, villes.groupe)
    this.objets = { arbres, villes, lacs, rides }

    this.actuelle = ambiance(lumiere)
    this.appliquerAmbiance(this.actuelle)
    this.calculerEnvironnement()
    this.cadrer(45, 0, SANS_MARGE)
    // textures envoyées une à une, shaders compilés en parallèle quand le navigateur le permet
    for (const t of Object.values(d.textures)) {
      this.rendu.initTexture(t)
      await souffler()
    }
    await this.rendu.compileAsync(this.scene, this.camera)
    this.raf = requestAnimationFrame(this.boucle)
  }

  // ---------- réglages ----------

  definirLumiere(lumiere: Lumiere) {
    const vers = ambiance(lumiere)
    if (this.options.reduit) {
      this.actuelle = vers
      this.appliquerAmbiance(vers)
      this.calculerEnvironnement()
      return
    }
    this.transition = { de: this.actuelle, vers, t0: performance.now(), duree: 1600 }
  }

  definirCalques(c: CalquesMaquette) {
    const { arbres, villes, lacs } = this.objets
    if (arbres) arbres.visible = c.arbres
    if (villes) villes.groupe.visible = c.villes
    if (lacs) lacs.visible = c.eau
    this.rendu.shadowMap.needsUpdate = true
    this.sale = true
  }

  // numéro de la région à éclairer (0 : aucune)
  definirRegionSurvolee(numero: number) {
    if (this.survol.value === numero) return
    this.survol.value = numero
    this.sale = true
  }

  numeroDeRegion(id: string) {
    return (this.donnees?.infos.regions.indexOf(id) ?? -1) + 1
  }

  idDeRegion(numero: number) {
    return this.donnees?.infos.regions[numero - 1] ?? null
  }

  // ---------- caméra ----------

  private etat(): Etat {
    const decalage = this.camera.position.clone().sub(this.controles.target)
    const s = new THREE.Spherical().setFromVector3(decalage)
    return {
      cible: this.controles.target.clone(),
      distance: s.radius,
      polaire: s.phi,
      azimut: s.theta,
    }
  }

  private poser(e: Etat) {
    const s = new THREE.Spherical(e.distance, e.polaire, e.azimut)
    this.controles.target.copy(e.cible)
    this.camera.position.setFromSpherical(s).add(e.cible)
    this.camera.lookAt(e.cible)
    this.sale = true
  }

  private etatPour(vue: Vue): Etat {
    const [x, z] = versScene(...vue.centre)
    const y = this.donnees ? hauteurEn(this.donnees, ...vue.centre) : SOCLE
    const actuel = this.etat()
    return {
      cible: new THREE.Vector3(x, y, z),
      distance: borne(distancePour(vue.zoom), DISTANCE.min, DISTANCE.max),
      polaire:
        vue.pitch === undefined
          ? actuel.polaire
          : borne(THREE.MathUtils.degToRad(vue.pitch), 0.001, POLAIRE_MAX),
      azimut:
        vue.bearing === undefined
          ? actuel.azimut
          : -THREE.MathUtils.degToRad(vue.bearing),
    }
  }

  // Le décalage de la vue tient compte des panneaux posés sur la carte (comme le « padding » de MapLibre).
  private poserMarges(m: Marges) {
    this.marges = m
    const { l, h } = this.taille
    const x = -(m.left - m.right) / 2
    const y = -(m.top - m.bottom) / 2
    if (!x && !y) this.camera.clearViewOffset()
    else this.camera.setViewOffset(l, h, x, y, l, h)
    this.sale = true
  }

  voler(vue: Vue, options: { duree: number; marges?: Marges }, fin?: () => void) {
    this.lancer(this.etatPour(vue), options.duree, options.marges ?? this.marges, fin)
  }

  sauter(vue: Vue, marges?: Marges) {
    this.arreter()
    if (marges) this.poserMarges(marges)
    this.poser(this.etatPour(vue))
    this.controles.update()
  }

  // Tout le pays dans la partie libre de l'écran.
  cadrer(pitch: number, duree: number, marges: Marges, fin?: () => void) {
    const { l, h } = this.taille
    const libreL = Math.max(120, l - marges.left - marges.right)
    const libreH = Math.max(120, h - marges.top - marges.bottom)
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))
    const [w, n] = versScene(EMPRISE_BLOC.w, EMPRISE_BLOC.n)
    const [e, s] = versScene(EMPRISE_BLOC.e, EMPRISE_BLOC.s)
    const p = THREE.MathUtils.degToRad(pitch)
    const largeur = e - w
    const profondeur = s - n
    const distance =
      1.04 *
      Math.max(
        largeur / 2 / ((t * libreL) / h),
        (profondeur * Math.cos(p) + 0.6 * Math.sin(p)) / 2 / ((t * libreH) / h),
      )
    const vers: Etat = {
      cible: new THREE.Vector3((w + e) / 2, SOCLE, (n + s) / 2 + 0.25 * Math.sin(p)),
      distance: borne(distance, DISTANCE.min, DISTANCE.max),
      polaire: Math.max(0.001, p),
      azimut: 0,
    }
    if (!duree || this.options.reduit) {
      this.arreter()
      this.poserMarges(marges)
      this.poser(vers)
      this.controles.update()
      fin?.()
      return
    }
    this.lancer(vers, duree, marges, fin)
  }

  private lancer(vers: Etat, duree: number, marges: Marges, fin?: () => void) {
    this.arreter()
    if (this.options.reduit || duree <= 0) {
      this.poserMarges(marges)
      this.poser(vers)
      this.controles.update()
      fin?.()
      return
    }
    const de = this.etat()
    // un long déplacement prend de la hauteur au milieu du vol, comme un avion
    const ecart = de.cible.distanceTo(vers.cible)
    const arc = borne(ecart / Math.max(de.distance, vers.distance) - 0.3, 0, 1.2)
    this.vol = {
      de,
      vers,
      margesDe: this.marges,
      margesVers: marges,
      t0: performance.now(),
      duree,
      arc,
      fin,
    }
    this.controles.enabled = false
  }

  arreter() {
    if (!this.vol) return
    this.vol = null
    this.controles.enabled = true
    this.controles.update()
  }

  enVol() {
    return Boolean(this.vol)
  }

  // Zoom et inclinaison actuels, dans les unités de MapLibre.
  vueActuelle() {
    const e = this.etat()
    return {
      zoom: 6 - Math.log2(e.distance / DISTANCE_ZOOM_6),
      pitch: THREE.MathUtils.radToDeg(e.polaire),
    }
  }

  // ---------- lecture ----------

  // Le point du terrain sous un pixel de l'écran (coordonnées de la fenêtre).
  viser(clientX: number, clientY: number): Visee | null {
    const d = this.donnees
    if (!d) return null
    const r = this.toile.getBoundingClientRect()
    this.rayon.setFromCamera(
      new THREE.Vector2(
        ((clientX - r.left) / r.width) * 2 - 1,
        -((clientY - r.top) / r.height) * 2 + 1,
      ),
      this.camera,
    )
    const { origin: o, direction: dir } = this.rayon.ray
    if (dir.y >= -1e-4) return null
    const haut = SOCLE + 0.3
    let t = Math.max(0, (o.y - haut) / -dir.y)
    const fin = (o.y + 0.05) / -dir.y
    const pas = Math.max(0.002, this.etat().distance * 0.003)
    const sous = (tt: number) => {
      const x = o.x + dir.x * tt
      const z = o.z + dir.z * tt
      const [lon, lat] = versLonLat(x, z)
      return o.y + dir.y * tt <= hauteurEn(d, lon, lat)
    }
    while (t < fin && !sous(t)) t += pas
    if (t >= fin) return null
    let a = Math.max(0, t - pas)
    let b = t
    for (let i = 0; i < 12; i++) {
      const m = (a + b) / 2
      if (sous(m)) b = m
      else a = m
    }
    const [lon, lat] = versLonLat(o.x + dir.x * b, o.z + dir.z * b)
    return { lon, lat, region: regionEn(d, lon, lat) }
  }

  // Position à l'écran (en pixels du conteneur) d'un point du terrain ; `devant` est faux s'il est derrière la caméra.
  projeter(lon: number, lat: number, dessus = 0) {
    const [x, z] = versScene(lon, lat)
    const y = (this.donnees ? hauteurEn(this.donnees, lon, lat) : SOCLE) + dessus
    const v = new THREE.Vector3(x, y, z).project(this.camera)
    return {
      x: ((v.x + 1) / 2) * this.taille.l,
      y: ((1 - v.y) / 2) * this.taille.h,
      devant: v.z > -1 && v.z < 1,
    }
  }

  // Appelé après chaque image : les repères HTML suivent la maquette.
  surRendu(ecouteur: () => void) {
    this.ecouteurs.add(ecouteur)
    return () => {
      this.ecouteurs.delete(ecouteur)
    }
  }

  // ---------- rendu ----------

  private redimensionner() {
    const l = Math.max(1, this.conteneur.clientWidth)
    const h = Math.max(1, this.conteneur.clientHeight)
    this.taille = { l, h }
    this.rendu.setSize(l, h)
    this.composeur.setPixelRatio(this.rendu.getPixelRatio())
    this.composeur.setSize(l, h)
    this.camera.aspect = l / h
    this.camera.updateProjectionMatrix()
    this.poserMarges(this.marges)
    this.sale = true
  }

  private dessinerFond(a: Ambiance) {
    const ctx = this.fond.toile.getContext('2d')
    if (!ctx) return
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, a.ciel.getStyle())
    g.addColorStop(0.62, a.horizon.getStyle())
    g.addColorStop(1, a.horizon.getStyle())
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 2, 256)
    this.fond.texture.needsUpdate = true
  }

  private appliquerAmbiance(a: Ambiance) {
    const dir = versSoleil(a.soleil.azimut, a.soleil.hauteur)
    this.soleil.position.copy(dir.multiplyScalar(40))
    this.soleil.color.copy(a.soleil.couleur)
    this.soleil.intensity = a.soleil.intensite
    this.hemi.color.copy(a.hemi.ciel)
    this.hemi.groundColor.copy(a.hemi.sol)
    this.hemi.intensity = a.hemi.intensite
    ;(this.scene.fog as THREE.Fog).color.copy(a.horizon)
    this.scene.environmentIntensity = a.environnement
    this.rendu.toneMappingExposure = a.exposition
    this.dessinerFond(a)
    const villes = this.objets.villes
    if (villes) {
      villes.maisons.emissiveIntensity = a.nuit * 0.5
      villes.halos.opacity = a.nuit * 0.4
    }
    this.eclat.enabled = a.nuit > 0.05
    this.eclat.strength = 0.4 * a.nuit
    this.rendu.shadowMap.needsUpdate = true
    this.sale = true
  }

  // Le ciel que reflètent l'eau et les surfaces : recalculé quand l'heure a fini de changer.
  private calculerEnvironnement() {
    const a = this.actuelle
    const ciel = new THREE.Scene()
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          uHaut: { value: a.ciel },
          uHorizon: { value: a.horizon },
          uSol: { value: a.hemi.sol },
          uSoleil: { value: versSoleil(a.soleil.azimut, a.soleil.hauteur) },
          uCouleurSoleil: {
            value: a.soleil.couleur.clone().multiplyScalar(a.soleil.intensite),
          },
        },
        vertexShader: `varying vec3 vDir;
          void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vDir;
          uniform vec3 uHaut, uHorizon, uSol, uSoleil, uCouleurSoleil;
          void main() {
            vec3 c = vDir.y > 0.0 ? mix(uHorizon, uHaut, pow(vDir.y, 0.6)) : mix(uHorizon, uSol, min(1.0, -vDir.y * 4.0));
            c += uCouleurSoleil * pow(max(dot(vDir, uSoleil), 0.0), 220.0) * 6.0;
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    )
    ciel.add(sphere)
    const ancien = this.environnement
    this.environnement = this.pmrem.fromScene(ciel, 0, 0.1, 50)
    this.scene.environment = this.environnement.texture
    ancien?.dispose()
    sphere.geometry.dispose()
    sphere.material.dispose()
    this.sale = true
  }

  private boucle = (maintenant: number) => {
    this.raf = requestAnimationFrame(this.boucle)
    if (document.hidden) return
    let anime = false

    if (this.transition) {
      const { de, vers, t0, duree } = this.transition
      const k = Math.min(1, (maintenant - t0) / duree)
      this.actuelle = melanger(de, vers, lisser(k))
      this.appliquerAmbiance(this.actuelle)
      if (k >= 1) {
        this.transition = null
        this.calculerEnvironnement()
      }
      anime = true
    }

    if (this.vol) {
      const v = this.vol
      const t = Math.min(1, (maintenant - v.t0) / v.duree)
      const k = lisser(t)
      const distance =
        Math.exp(
          Math.log(v.de.distance) +
            (Math.log(v.vers.distance) - Math.log(v.de.distance)) * k,
        ) *
        (1 + v.arc * Math.sin(Math.PI * t))
      this.poser({
        cible: v.de.cible.clone().lerp(v.vers.cible, k),
        distance,
        polaire: v.de.polaire + (v.vers.polaire - v.de.polaire) * k,
        azimut: angleVers(v.de.azimut, v.vers.azimut, k),
      })
      const m = (c: keyof Marges) => v.margesDe[c] + (v.margesVers[c] - v.margesDe[c]) * k
      this.poserMarges({
        top: m('top'),
        bottom: m('bottom'),
        left: m('left'),
        right: m('right'),
      })
      if (t >= 1) {
        this.vol = null
        this.controles.enabled = true
        this.controles.update()
        v.fin?.()
      }
      anime = true
    } else if (this.controles.update()) anime = true

    // les rides des lacs ne bougent que de près, et pas si la personne préfère moins d'animations
    const distance = this.camera.position.distanceTo(this.controles.target)
    const eau = !this.options.reduit && distance < 5 && Boolean(this.objets.lacs?.visible)
    if (eau && this.objets.rides && maintenant - this.dernier > 33) {
      this.objets.rides.offset.set(maintenant * 0.00002, maintenant * 0.000013)
      anime = true
    }
    this.eauAnimee = eau

    if (!anime && !this.sale) return
    this.sale = false
    this.dernier = maintenant

    // la brume suit la distance de la caméra : le lointain se fond dans l'horizon
    const fog = this.scene.fog as THREE.Fog
    fog.near = distance * 1.1
    fog.far = distance * 4.2 + 6
    // flou de miniature : nul vu d'en haut, plus marqué quand on incline
    const polaire = new THREE.Spherical().setFromVector3(
      this.camera.position.clone().sub(this.controles.target),
    ).phi
    const force =
      THREE.MathUtils.smoothstep(polaire, 0.35, 1.15) * (this.options.leger ? 2.2 : 3.2)
    const foyer = this.controles.target.clone().project(this.camera)
    const r = borne((foyer.y + 1) / 2, 0.2, 0.8)
    this.flouH.uniforms.h.value = force / this.taille.l
    this.flouH.uniforms.r.value = r
    this.flouV.uniforms.v.value = force / this.taille.h
    this.flouV.uniforms.r.value = r
    this.flouH.enabled = this.flouV.enabled = force > 0.05

    this.composeur.render()
    for (const e of this.ecouteurs) e()
  }

  detruire() {
    cancelAnimationFrame(this.raf)
    this.observateur.disconnect()
    this.controles.dispose()
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose()
      const matieres = Array.isArray(m.material)
        ? m.material
        : m.material
          ? [m.material]
          : []
      for (const mat of matieres) mat.dispose()
    })
    if (this.donnees) for (const t of Object.values(this.donnees.textures)) t.dispose()
    this.objets.rides?.dispose()
    this.fond.texture.dispose()
    this.environnement?.dispose()
    this.pmrem.dispose()
    this.composeur.dispose()
    this.rendu.dispose()
    this.toile.remove()
  }

  // Ce que la page pilote : les mêmes gestes que sur la carte MapLibre.
  pilote(): Pilote {
    return {
      voler: (vue, options, fin) => this.voler(vue, options, fin),
      cadrer: (pitch, duree, marges) => this.cadrer(pitch, duree, marges),
      arreter: () => this.arreter(),
      surface: () => this.toile,
      zoom: () => this.vueActuelle().zoom,
    }
  }

  // Pour les mesures automatisées en développement.
  get diagnostic() {
    return { eauAnimee: this.eauAnimee, K, camera: this.camera, rendu: this.rendu }
  }
}
