import HeroMap from '@/components/map/HeroMap'
import BoutonEchelle from '@/components/ui/BoutonEchelle'
import type { CarteHero } from '@/lib/carteHero'
import { contes, langues } from '@/lib/contenu'

const nombreDeContes = (code: string) => contes.filter((c) => c.langue === code).length

export default function Hero({ carte }: { carte: CarteHero | null }) {
  const languesPresentes = langues.filter((l) => nombreDeContes(l.code) > 0)
  return (
    <section
      aria-labelledby="titre-accueil"
      className="grid min-h-[calc(100svh-3.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <div className="order-2 flex flex-col justify-end gap-7 px-5 pb-10 pt-8 lg:order-1 lg:px-10 lg:pb-14">
        <h1
          id="titre-accueil"
          className="font-display text-[clamp(3rem,10vw,6rem)] font-bold uppercase leading-[0.88] text-balance"
        >
          Contes et légendes du <span className="text-r2">Burkina Faso</span>
        </h1>
        <p className="max-w-[34ch] font-serif text-xl leading-snug text-os/90">
          Parcourez le pays, écoutez les récits dans la langue des conteurs et choisissez
          la suite de l'histoire.
        </p>
        <BoutonEchelle to="/carte">Explorer la carte</BoutonEchelle>

        <ul
          aria-label="Langues des contes"
          className="flex flex-wrap gap-x-5 gap-y-2 pt-2"
        >
          {languesPresentes.map((l) => (
            <li
              key={l.code}
              className="flex items-center gap-2 font-display text-lg uppercase tracking-wider"
            >
              <span
                aria-hidden="true"
                className="size-3.5 rounded-full border-2 border-os/70"
                style={{ background: l.couleur }}
              />
              {l.nom}
              <span className="chiffres text-os/70">{nombreDeContes(l.code)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="order-1 flex items-center justify-center p-3 lg:order-2 lg:p-6">
        <HeroMap carte={carte} />
      </div>
    </section>
  )
}
