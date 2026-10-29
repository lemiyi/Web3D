import HeroMap from '@/components/map/HeroMap'
import BarreChiffres from '@/components/ui/BarreChiffres'
import BoutonEchelle from '@/components/ui/BoutonEchelle'
import LegendeAltitude from '@/components/ui/LegendeAltitude'
import type { CarteHero } from '@/lib/carteHero'
import { contes, couleurLangue, langues } from '@/lib/contenu'

const nombreDeContes = (code: string) => contes.filter((c) => c.langue === code).length

export default function Hero({ carte }: { carte: CarteHero | null }) {
  const languesPresentes = langues.filter((l) => nombreDeContes(l.code) > 0)
  return (
    <section
      aria-labelledby="titre-accueil"
      className="grid min-h-svh pt-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-20"
    >
      <div className="order-2 flex flex-col justify-end gap-7 px-5 pb-10 pt-6 lg:order-1 lg:px-10 lg:pb-16">
        <h1
          id="titre-accueil"
          className="font-display text-[clamp(2.75rem,8.5vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-balance"
        >
          Contes et légendes du <span className="text-primaire">Burkina Faso</span>
        </h1>
        <p className="max-w-[34ch] font-serif text-xl leading-snug text-discret">
          Parcourez le pays, écoutez les récits dans la langue des conteurs et choisissez
          la suite de l'histoire.
        </p>
        <BoutonEchelle to="/carte">Explorer la carte</BoutonEchelle>

        <ul aria-label="Langues des contes" className="flex flex-wrap gap-2 pt-2">
          {languesPresentes.map((l) => (
            <li
              key={l.code}
              className="flex items-center gap-2 rounded-full border border-ligne bg-surface px-3.5 py-1.5 text-sm font-semibold"
            >
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ background: couleurLangue(l.code) }}
              />
              {l.nom}
              <span className="chiffres text-discret">{nombreDeContes(l.code)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative order-1 flex flex-col items-center justify-center gap-3 p-3 lg:order-2 lg:p-6">
        <HeroMap carte={carte} />
        <BarreChiffres
          contes={contes}
          className="self-start lg:absolute lg:bottom-28 lg:right-10 lg:self-auto"
        />
        <LegendeAltitude className="w-full max-w-md self-end" />
      </div>
    </section>
  )
}
