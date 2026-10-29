import { useMemo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import nature from '@/content/geo/nature.json'
import { sites } from '@/content/geo/sites.json'
import type { Calques } from '@/lib/calques'
import { contes, regions } from '@/lib/contenu'
import { type Boite, largeurTexte, placer } from '@/lib/etiquettes'

type Pt = [number, number]
type Props = { zoom: number; calques: Calques }
type Candidat = Boite & { cle: string }

const halo = {
  WebkitTextStroke: '4px var(--etiquette-halo)',
  paintOrder: 'stroke',
} as const

// Sommets du Burkina du plus haut au plus bas : plus on zoome, plus on en montre.
const sommetsBurkina = nature.sommets.filter((s) => !s.voisin)
const sommetsVoisins = nature.sommets.filter((s) => s.voisin)
const combien = (zoom: number) => (zoom < 6 ? 0 : zoom < 7 ? 3 : zoom < 8 ? 6 : 99)

const nomLac = (nom: string) =>
  nom.replace(/^(Barrage|Lac du Barrage|Mare) (de |du |d')?/i, '')
const texteSommet = (s: { nom: string; alt: number }) => `${s.nom} ${s.alt} m`

// Les noms de la nature sont du texte HTML dans la police du site, comme ceux des régions.
// Le Burkina reçoit des noms plus précis (fleuves, barrages, sommets) que ses voisins (pays, grands sommets) ;
// un nom qui en gênerait un autre, un repère de conte ou une région est simplement masqué.
export default function EtiquettesNature({ zoom, calques }: Props) {
  const nbSommets = combien(zoom)
  const sommetsAffiches = useMemo(
    () =>
      calques.sommets
        ? [
            ...sommetsBurkina.slice(0, nbSommets),
            ...(calques.voisins && zoom < 7 ? sommetsVoisins : []),
          ]
        : [],
    [nbSommets, calques.sommets, calques.voisins, zoom],
  )

  const retenus = useMemo(() => {
    const fixes: Boite[] = [
      // repères de contes
      ...contes.map((c) => ({
        lon: c.coordonnees[0],
        lat: c.coordonnees[1],
        l: 34,
        h: 34,
      })),
      // noms de régions (posés sous leur centre, voir EtiquettesRegions)
      ...(zoom >= 5.4
        ? regions.map((r) => ({
            lon: r.centre[0],
            lat: r.centre[1],
            l: zoom >= 6.2 ? 100 : 72,
            h: 18,
            dy: 33,
          }))
        : []),
      // noms de pays et de mer
      ...(calques.voisins
        ? nature.pays.map((p) => ({
            lon: p.centre[0],
            lat: p.centre[1],
            l: largeurTexte(p.nom, 13),
            h: 14,
          }))
        : []),
      // les triangles des sommets
      ...sommetsAffiches.map((s) => ({
        lon: s.centre[0],
        lat: s.centre[1],
        l: 12,
        h: 12,
      })),
    ]
    const candidats: Candidat[] = [
      // Les sites naturels remarquables passent avant tout le reste, de près.
      ...(zoom >= 8
        ? sites.map((s) => {
            const l = largeurTexte(s.nom, 12)
            return {
              cle: `site-${s.id}`,
              lon: s.centre[0],
              lat: s.centre[1],
              l,
              h: 16,
              dx: 14 + l / 2,
            }
          })
        : []),
      ...sommetsAffiches.filter((s) => !s.voisin).map((s) => sommetCandidat(s)),
      ...(calques.eau && zoom >= 6.8
        ? nature.plansEau.map((e) => ({
            cle: `lac-${e.nom}`,
            lon: e.centre[0],
            lat: e.centre[1],
            l: Math.min(96, largeurTexte(nomLac(e.nom), 11)),
            h: 28,
          }))
        : []),
      ...(calques.eau && zoom >= 6.2
        ? nature.rivieres.map((r) => ({
            cle: `riv-${r.nom}`,
            lon: r.centre[0],
            lat: r.centre[1],
            l: largeurTexte(r.nom, 13),
            h: 14,
          }))
        : []),
      ...sommetsAffiches.filter((s) => s.voisin).map((s) => sommetCandidat(s)),
    ]
    return new Set(placer(fixes, candidats, zoom).map((c) => c.cle))
  }, [zoom, calques.voisins, calques.eau, sommetsAffiches])

  return (
    <>
      {calques.voisins &&
        nature.pays.map((p) => (
          <Marker
            key={p.nom}
            longitude={p.centre[0]}
            latitude={p.centre[1]}
            anchor="center"
          >
            <span
              className="pointer-events-none block whitespace-nowrap font-display text-[0.7rem] font-extrabold uppercase tracking-[0.32em] text-[var(--etiquette-discret)]"
              style={halo}
            >
              {p.nom}
            </span>
          </Marker>
        ))}

      {calques.relief &&
        nature.mers.map((m) => (
          <Marker
            key={m.nom}
            longitude={m.centre[0]}
            latitude={m.centre[1]}
            anchor="center"
          >
            <span
              className="pointer-events-none block whitespace-nowrap font-serif text-sm italic tracking-[0.2em] text-[var(--etiquette-eau)]"
              style={halo}
            >
              {m.nom}
            </span>
          </Marker>
        ))}

      {calques.eau &&
        nature.rivieres
          .filter((r) => retenus.has(`riv-${r.nom}`))
          .map((r) => (
            <Marker
              key={r.nom}
              longitude={r.centre[0]}
              latitude={r.centre[1]}
              anchor="center"
            >
              <span
                className="pointer-events-none block whitespace-nowrap font-serif text-[0.8rem] italic text-[var(--etiquette-eau)]"
                style={halo}
              >
                {r.nom}
              </span>
            </Marker>
          ))}

      {calques.eau &&
        nature.plansEau
          .filter((e) => retenus.has(`lac-${e.nom}`))
          .map((e) => (
            <Marker
              key={e.nom}
              longitude={e.centre[0]}
              latitude={e.centre[1]}
              anchor="center"
            >
              <span
                className="pointer-events-none block max-w-24 text-center font-serif text-[0.72rem] italic leading-tight text-[var(--etiquette-eau)]"
                style={halo}
              >
                {nomLac(e.nom)}
              </span>
            </Marker>
          ))}

      {zoom >= 8 &&
        sites
          .filter((s) => retenus.has(`site-${s.id}`))
          .map((s) => (
            <Marker
              key={s.id}
              longitude={s.centre[0]}
              latitude={s.centre[1]}
              anchor="left"
            >
              <span className="pointer-events-none flex items-center gap-1.5 whitespace-nowrap text-[var(--etiquette)]">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path
                    d="M5 0.8 9.2 5 5 9.2 0.8 5Z"
                    fill="currentColor"
                    stroke="var(--etiquette-halo)"
                    strokeWidth="1.4"
                    paintOrder="stroke"
                  />
                </svg>
                <span className="text-[0.78rem] font-bold leading-none" style={halo}>
                  {s.nom}
                </span>
              </span>
            </Marker>
          ))}

      {sommetsAffiches.map((s) => (
        <Sommet
          key={s.nom + s.alt}
          sommet={s}
          etiquette={retenus.has(`som-${s.nom}${s.alt}`)}
        />
      ))}
    </>
  )
}

// Le nom d'un sommet se lit à droite de son triangle.
function sommetCandidat(s: { nom: string; alt: number; centre: number[] }): Candidat {
  const l = largeurTexte(texteSommet(s), 11)
  return {
    cle: `som-${s.nom}${s.alt}`,
    lon: s.centre[0],
    lat: s.centre[1],
    l,
    h: 14,
    dx: 15 + l / 2,
  }
}

function Sommet({
  sommet,
  etiquette,
}: {
  sommet: { nom: string; alt: number; centre: number[] }
  etiquette: boolean
}) {
  const [lon, lat] = sommet.centre as Pt
  return (
    <Marker longitude={lon} latitude={lat} anchor="left">
      <span className="pointer-events-none flex items-center gap-1 whitespace-nowrap text-[var(--etiquette)]">
        <svg width="11" height="10" viewBox="0 0 11 10" aria-hidden="true">
          <path
            d="M5.5 0.8 10.2 9.2H0.8Z"
            fill="currentColor"
            stroke="var(--etiquette-halo)"
            strokeWidth="1.3"
            paintOrder="stroke"
          />
        </svg>
        {etiquette && (
          <span className="text-[0.72rem] font-bold leading-none" style={halo}>
            {sommet.nom}{' '}
            <span className="chiffres font-semibold text-[var(--etiquette-discret)]">
              {sommet.alt} m
            </span>
          </span>
        )}
      </span>
    </Marker>
  )
}
